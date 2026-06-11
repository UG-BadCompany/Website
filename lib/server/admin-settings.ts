import { hasPermission, type AuthUser, HttpError } from './auth';
import { createDatabase, type Queryable } from './database';
import { DEFAULT_PERMISSION_KEYS, getPublicSiteSettings, getSystemDiagnostics } from './installation';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
type SettingsBody = Record<string, unknown>;

const foundationComponents = [
  'System Foundation','Authentication Foundation','Website Foundation','CRM Foundation','Operations Foundation','Estimating Foundation','Financial Foundation','Payment Gateway Framework','CMMS Foundation','Communications Foundation','Service Catalog Foundation','Media Foundation'
];

export async function ensureAdminFoundation(db: Queryable = createDatabase()) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS dashboard_layouts (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      layout_json jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz DEFAULT now()
    )
  `);
  await db.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS display_name text, ADD COLUMN IF NOT EXISTS service_area text, ADD COLUMN IF NOT EXISTS business_hours text`);
  await seedMissingPermissions(db);
}

async function seedMissingPermissions(db: Queryable) {
  const keys = [...new Set([...DEFAULT_PERMISSION_KEYS,
    'portal.view','portal.manage','account.view','account.manage','company.view','company.manage','branding.view','branding.manage','theme.view','theme.manage','foundation.view','foundation.manage','payment.view','payment.manage','email.view','email.manage','license.view','license.manage','media.view','media.manage','homepage.view','homepage.manage','diagnostics.view'
  ])];
  for (const key of keys) {
    const group = key === '*' ? 'system' : key.split('.')[0];
    await db.query(
      `insert into permissions (key, group_name, description) values ($1, $2, $3)
       on conflict (key) do update set group_name = excluded.group_name, description = coalesce(permissions.description, excluded.description)`,
      [key, group, `${key} permission`]
    );
  }
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r cross join permissions p where r.name = 'Owner' on conflict do nothing`);
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r join permissions p on p.key = any($1) where r.name = 'Admin' on conflict do nothing`, [[
    'portal.view','portal.manage','account.view','account.manage','settings.view','company.view','company.manage','branding.view','branding.manage','theme.view','theme.manage','users.view','users.manage','roles.view','roles.manage','permissions.view','foundation.view','foundation.manage','payment.view','payment.manage','email.view','email.manage','license.view','media.view','media.manage','homepage.view','homepage.manage','diagnostics.view'
  ]]);
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r join permissions p on p.key = any($1) where r.name = 'Client' on conflict do nothing`, [['portal.view','account.view','dashboard.view']]);
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r join permissions p on p.key = any($1) where r.name in ('Office','Dispatcher','Technician','Vendor') on conflict do nothing`, [['account.view']]);
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r join permissions p on p.key = any($1) where r.name = 'Office' on conflict do nothing`, [['portal.manage','settings.view','company.view','branding.view','theme.view','users.view','roles.view','permissions.view','foundation.view','payment.view','email.view','license.view','media.view','homepage.view','diagnostics.view']]);
}

async function getSetting<T = unknown>(db: Queryable, key: string, fallback: T): Promise<T> {
  const result = await db.query<{ value: T }>(`select value from app_settings where key = $1 limit 1`, [key]);
  return result.rows[0]?.value ?? fallback;
}

async function upsertSetting(db: Queryable, key: string, value: Json) {
  await db.query(
    `insert into app_settings (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

function managePermissionFor(section: string) {
  if (section === 'homepage-builder') return 'homepage.manage';
  return `${section}.manage`;
}

function requireManage(user: AuthUser, permission: string) {
  if (!hasPermission(user, permission)) throw new HttpError(403, `Missing permission ${permission}`);
}

export async function handleSettingsRoute(path: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  const idMatch = path.match(/^\/settings\/(users|roles)\/([^/]+)$/);
  if (idMatch) return handleSettingsPatch(idMatch[1], idMatch[2], method, body, user, db);
  const section = path.replace(/^\/settings\//, '');
  if (method !== 'GET' && method !== 'POST') throw new HttpError(405, 'Method not allowed');
  if (method === 'POST') requireManage(user, managePermissionFor(section));

  if (section === 'company') return method === 'POST' ? saveCompany(body, db) : getCompany(db);
  if (section === 'branding') return method === 'POST' ? saveBranding(body, db) : getBranding(db);
  if (section === 'theme') return method === 'POST' ? saveThemeSettings(body, db) : getThemeSettings(db);
  if (section === 'users') return method === 'POST' ? createUser(body, db) : getUsers(db);
  if (section === 'roles') return method === 'POST' ? createRole(body, db) : getRoles(db);
  if (section === 'permissions') return getPermissions(db);
  if (section === 'foundation') return getFoundation(db);
  if (section === 'payment') return method === 'POST' ? savePayment(body, db) : getPayment(db);
  if (section === 'email') return { ok: true, email: await getSetting(db, 'email.settings', { provider: 'resend', configured: Boolean(process.env.RESEND_API_KEY), from: process.env.EMAIL_FROM || '' }) };
  if (section === 'license') return { ok: true, license: await getSetting(db, 'license.settings', { status: 'not_checked' }) };
  if (section === 'media') return getMedia(db);
  if (section === 'homepage-builder') return method === 'POST' ? saveHomepageBuilder(body, db) : getHomepageBuilder(db);
  throw new HttpError(404, 'Unknown settings section');
}

async function handleSettingsPatch(kind: string, id: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable) {
  if (method !== 'PATCH') throw new HttpError(405, 'Method not allowed');
  requireManage(user, kind === 'users' ? 'users.manage' : 'roles.manage');
  if (kind === 'users') {
    await db.query(`update users set name = coalesce(nullif($2, ''), name), status = coalesce(nullif($3, ''), status), updated_at = now() where id = $1`, [id, String(body.name || ''), String(body.status || '')]);
    if (typeof body.roleId === 'string' && body.roleId) {
      await db.query(`delete from user_roles where user_id = $1`, [id]);
      await db.query(`insert into user_roles (user_id, role_id) values ($1, $2) on conflict do nothing`, [id, body.roleId]);
    }
    return getUsers(db);
  }
  await db.query(`update roles set description = coalesce($2, description) where id = $1 and system_role = false`, [id, typeof body.description === 'string' ? body.description : null]);
  return getRoles(db);
}

async function getCompany(db: Queryable) {
  const settings = await getPublicSiteSettings(db);
  const row = (await db.query<any>(`select company_name, display_name, company_phone, company_email, address, website_url, service_area, business_hours from company_settings order by created_at asc limit 1`)).rows[0] || {};
  return { ok: true, company: { companyName: row.company_name || settings.companyName || '', displayName: row.display_name || settings.companyDisplayName || '', phone: row.company_phone || '', email: row.company_email || '', address: row.address || '', website: row.website_url || '', serviceArea: row.service_area || settings.homepage?.serviceArea || '', businessHours: row.business_hours || settings.homepage?.businessHours || '' } };
}

async function saveCompany(body: SettingsBody, db: Queryable) {
  await db.query(`insert into company_settings (company_name, display_name, company_phone, company_email, address, website_url, service_area, business_hours) select '', '', '', '', '', '', '', '' where not exists (select 1 from company_settings)`);
  await db.query(`update company_settings set company_name=$1, display_name=$2, company_phone=$3, company_email=$4, address=$5, website_url=$6, service_area=$7, business_hours=$8, updated_at=now() where id=(select id from company_settings order by created_at asc limit 1)`, [body.companyName || '', body.displayName || body.companyName || '', body.phone || '', body.email || '', body.address || '', body.website || '', body.serviceArea || '', body.businessHours || '']);
  await upsertSetting(db, 'company.name', String(body.companyName || ''));
  await upsertSetting(db, 'company.display_name', String(body.displayName || body.companyName || ''));
  await upsertSetting(db, 'homepage.service_area', String(body.serviceArea || ''));
  await upsertSetting(db, 'homepage.business_hours', String(body.businessHours || ''));
  await upsertSetting(db, 'company.updated_at', new Date().toISOString());
  return getCompany(db);
}

async function getBranding(db: Queryable) {
  const publicSettings = await getPublicSiteSettings(db);
  return { ok: true, branding: publicSettings.branding };
}
async function saveBranding(body: SettingsBody, db: Queryable) {
  await db.query(`insert into company_settings (company_name) select '' where not exists (select 1 from company_settings)`);
  const now = new Date().toISOString();
  await db.query(`update company_settings set logo_media_id=nullif($1,'')::uuid, logo_url=nullif($2,''), logo_resolved_url=nullif($3,''), favicon_media_id=nullif($4,'')::uuid, favicon_url=nullif($5,''), favicon_resolved_url=nullif($6,''), branding_updated_at=now(), updated_at=now() where id=(select id from company_settings order by created_at asc limit 1)`, [body.logoMediaId || '', body.logoUrl || '', body.logoResolvedUrl || '', body.faviconMediaId || '', body.faviconUrl || '', body.faviconResolvedUrl || '']);
  await upsertSetting(db, 'branding.tagline', String(body.tagline || ''));
  await upsertSetting(db, 'branding.updated_at', now);
  return getBranding(db);
}
async function getThemeSettings(db: Queryable) { return { ok: true, theme: await getSetting(db, 'theme.settings', { mode: 'system', presetId: 'contractoros_default', custom: {} }) }; }
async function saveThemeSettings(body: SettingsBody, db: Queryable) { await upsertSetting(db, 'theme.settings', body.theme as Json || body as Json); return getThemeSettings(db); }

async function getUsers(db: Queryable) {
  const users = await db.query<any>(`select u.id::text, u.name, u.email::text, u.status, u.created_at::text as "createdAt", r.id::text as "roleId", r.name as role from users u left join user_roles ur on ur.user_id=u.id left join roles r on r.id=ur.role_id order by u.created_at desc`);
  const roles = await db.query<any>(`select id::text, name from roles order by name`);
  return { ok: true, users: users.rows, roles: roles.rows };
}
async function createUser(body: SettingsBody, db: Queryable) {
  const email = String(body.email || '').trim();
  if (!email) throw new HttpError(400, 'Email is required');
  const result = await db.query<{ id: string }>(`insert into users (name, email, status) values ($1, $2, 'active') on conflict (email) do update set name=excluded.name, updated_at=now() returning id`, [String(body.name || email), email]);
  if (body.roleId) await db.query(`insert into user_roles (user_id, role_id) values ($1, $2) on conflict do nothing`, [result.rows[0].id, body.roleId]);
  return getUsers(db);
}
async function getRoles(db: Queryable) {
  const roles = await db.query<any>(`select r.id::text, r.name, r.description, r.system_role as "systemRole", count(rp.permission_id)::int as "permissionsCount" from roles r left join role_permissions rp on rp.role_id=r.id group by r.id order by r.system_role desc, r.name`);
  return { ok: true, roles: roles.rows };
}
async function createRole(body: SettingsBody, db: Queryable) { await db.query(`insert into roles (name, description, system_role) values ($1, $2, false) on conflict (name) do update set description=excluded.description`, [String(body.name || '').trim(), String(body.description || '')]); return getRoles(db); }
async function getPermissions(db: Queryable) { const rows = await db.query<any>(`select key, description, group_name as "group" from permissions order by group_name, key`); return { ok: true, permissions: rows.rows }; }
async function getFoundation(db: Queryable) { return { ok: true, foundation: foundationComponents.map((name) => ({ name, status: 'installed', locked: true })) }; }
async function getPayment(db: Queryable) { const rows = await db.query<any>(`select provider, enabled, key_mapping as "keyMapping" from payment_provider_settings order by provider`).catch(() => ({ rows: [] } as any)); return { ok: true, payment: { providers: rows.rows, settings: await getSetting(db, 'payment.settings', {}) } }; }
async function savePayment(body: SettingsBody, db: Queryable) { await upsertSetting(db, 'payment.settings', body as Json); return getPayment(db); }
async function getMedia(db: Queryable) { const rows = await db.query<any>(`select m.id::text, f.file_name as "fileName", f.mime_type as "mimeType", f.size_bytes as "sizeBytes", m.visibility, m.created_at::text as "createdAt" from media_assets m left join files f on f.id=m.file_id order by m.created_at desc limit 50`).catch(() => ({ rows: [] } as any)); return { ok: true, media: rows.rows }; }
async function getHomepageBuilder(db: Queryable) { return { ok: true, homepageBuilder: await getSetting(db, 'homepage.builder', { status: 'draft', sections: [] }) }; }
async function saveHomepageBuilder(body: SettingsBody, db: Queryable) { const value = { status: body.status === 'published' ? 'published' : 'draft', sections: Array.isArray(body.sections) ? body.sections : [] }; await upsertSetting(db, 'homepage.builder', value); return getHomepageBuilder(db); }

export async function handleDiagnostics(user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  return getSystemDiagnostics(user, db);
}

export async function getDashboardOverview(user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  const clientFilter = user.role === 'Client' && user.clientId ? ' and client_id = $1' : '';
  const clientParams = user.role === 'Client' && user.clientId ? [user.clientId] : [];
  const jobFilter = user.role === 'Technician' ? ' and assigned_user_id = $1' : clientFilter;
  const jobParams = user.role === 'Technician' ? [user.id] : clientParams;
  const [requests, quotes, jobs, invoices, messages, activity] = await Promise.all([
    db.query<any>(`select count(*) filter (where lower(status)='new')::int as new, count(*) filter (where lower(status) not in ('closed','completed','cancelled'))::int as open, count(*) filter (where lower(priority) in ('high','emergency','urgent'))::int as "highPriority" from work_requests where true${clientFilter}`, clientParams),
    db.query<any>(`select count(*) filter (where lower(status) in ('draft','sent','pending'))::int as pending, count(*) filter (where approved_at is not null or lower(status)='approved')::int as approved, coalesce(sum(total_cents) filter (where lower(status) in ('draft','sent','pending')),0)::int as "totalPendingValue" from quotes where true${clientFilter}`, clientParams),
    db.query<any>(`select count(*) filter (where lower(status) not in ('completed','cancelled'))::int as active, count(*) filter (where lower(status)='completed')::int as completed, (select count(*)::int from schedules s join jobs j on j.id=s.job_id where s.starts_at::date=current_date${user.role === 'Technician' ? ' and s.assigned_user_id = $1' : clientFilter ? ' and j.client_id = $1' : ''}) as "scheduledToday" from jobs where true${jobFilter}`, jobParams),
    db.query<any>(`select count(*) filter (where lower(status) in ('open','sent','overdue'))::int as open, coalesce(sum(balance_cents) filter (where lower(status) in ('open','sent','overdue')),0)::int as "outstandingBalance", count(*) filter (where due_at < now() and balance_cents > 0)::int as overdue from invoices where true${clientFilter}`, clientParams),
    db.query<any>(`select count(*)::int as unread, count(*)::int as "needsReply" from messages where read_at is null${clientFilter}`, clientParams).catch(() => ({ rows: [{ unread: 0, needsReply: 0 }] } as any)),
    db.query<any>(`select entity_type as type, summary, created_at::text as "createdAt" from activity_timeline ${clientFilter ? 'where client_id = $1' : ''} order by created_at desc limit 8`, clientParams).catch(() => ({ rows: [] } as any)),
  ]);
  const snapshot = await getOperationalSnapshot(user, db, clientFilter, clientParams, jobFilter, jobParams);
  return { ok: true, range: 'this_month', requests: requests.rows[0], quotes: quotes.rows[0], jobs: jobs.rows[0], invoices: invoices.rows[0], messages: messages.rows[0], snapshot, activity: activity.rows };
}

async function getOperationalSnapshot(user: AuthUser, db: Queryable, clientFilter: string, clientParams: unknown[], jobFilter: string, jobParams: unknown[]) {
  const nextJob = await db.query<any>(`select j.id::text, j.status, s.starts_at::text as date from schedules s join jobs j on j.id=s.job_id where s.starts_at >= now()${user.role === 'Technician' ? ' and s.assigned_user_id = $1' : clientFilter ? ' and j.client_id = $1' : ''} order by s.starts_at asc limit 1`, jobParams).catch(() => ({ rows: [] } as any));
  const newestRequest = await db.query<any>(`select id::text, status, priority, created_at::text as date from work_requests where true${clientFilter} order by created_at desc limit 1`, clientParams);
  const highPriority = await db.query<any>(`select id::text, status, priority, created_at::text as date from work_requests where lower(priority) in ('high','emergency','urgent')${clientFilter} order by created_at desc limit 1`, clientParams);
  const approvedQuote = await db.query<any>(`select id::text, status, total_cents as total, approved_at::text as date from quotes where (approved_at is not null or lower(status)='approved')${clientFilter} order by approved_at desc nulls last, created_at desc limit 1`, clientParams);
  const overdueInvoice = await db.query<any>(`select id::text, status, balance_cents as balance, due_at::text as date from invoices where due_at < now() and balance_cents > 0${clientFilter} order by due_at asc limit 1`, clientParams);
  return { nextScheduledJob: nextJob.rows[0] || null, newestRequest: newestRequest.rows[0] || null, highestPriorityItem: highPriority.rows[0] || null, latestApprovedQuote: approvedQuote.rows[0] || null, overdueInvoice: overdueInvoice.rows[0] || null };
}

export async function getDashboardLayout(user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  const result = await db.query<any>(`select layout_json as layout, updated_at::text as "updatedAt" from dashboard_layouts where user_id = $1`, [user.id]);
  return { ok: true, layout: result.rows[0]?.layout ?? null, updatedAt: result.rows[0]?.updatedAt || null };
}
export async function saveDashboardLayout(user: AuthUser, layout: unknown, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  await db.query(`insert into dashboard_layouts (user_id, layout_json, updated_at) values ($1, $2::jsonb, now()) on conflict (user_id) do update set layout_json=excluded.layout_json, updated_at=now()`, [user.id, JSON.stringify(Array.isArray(layout) ? layout : [])]);
  return getDashboardLayout(user, db);
}

export async function getPortalOverview(user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  if (user.role === 'Client' && !user.clientId) return { ok: true, scope: 'own-client-records', properties: [], requests: [], quotes: [], invoices: [], messages: [] };
  const allowCompany = ['Owner','Admin'].includes(user.role) || hasPermission(user, 'portal.manage');
  const filter = allowCompany ? '' : ' where client_id = $1';
  const params = allowCompany ? [] : [user.clientId];
  const [properties, requests, quotes, invoices] = await Promise.all([
    db.query<any>(`select id::text, address from properties${filter} order by created_at desc limit 10`, params),
    db.query<any>(`select id::text, status, priority, created_at::text as "createdAt" from work_requests${filter} order by created_at desc limit 10`, params),
    db.query<any>(`select id::text, status, total_cents as total from quotes${filter} order by created_at desc limit 10`, params),
    db.query<any>(`select id::text, status, balance_cents as balance from invoices${filter} order by created_at desc limit 10`, params),
  ]);
  return { ok: true, scope: allowCompany ? 'company-support' : 'own-client-records', properties: properties.rows, requests: requests.rows, quotes: quotes.rows, invoices: invoices.rows, messages: [] };
}
