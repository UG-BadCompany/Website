import { auditLog, hasPermission, type AuthUser, HttpError } from './auth';
import { createDatabase, type Queryable } from './database';
import { DEFAULT_PERMISSION_KEYS, getPublicSiteSettings, getSystemDiagnostics, runMigrations } from './installation';
import { ensureModuleFoundation } from './modules';

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
  await db.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS display_name text, ADD COLUMN IF NOT EXISTS service_area text, ADD COLUMN IF NOT EXISTS business_hours text, ADD COLUMN IF NOT EXISTS logo_media_id uuid NULL, ADD COLUMN IF NOT EXISTS logo_url text NULL, ADD COLUMN IF NOT EXISTS logo_resolved_url text NULL, ADD COLUMN IF NOT EXISTS favicon_media_id uuid NULL, ADD COLUMN IF NOT EXISTS favicon_url text NULL, ADD COLUMN IF NOT EXISTS favicon_resolved_url text NULL, ADD COLUMN IF NOT EXISTS branding_updated_at timestamptz NULL`);
  await db.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL, ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL, ADD COLUMN IF NOT EXISTS disabled_at timestamptz NULL, ADD COLUMN IF NOT EXISTS client_id uuid NULL REFERENCES clients(id), ADD COLUMN IF NOT EXISTS phone text NULL`);
  await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES users(id), ADD COLUMN IF NOT EXISTS normalized_email text NULL, ADD COLUMN IF NOT EXISTS normalized_phone text NULL`).catch(() => undefined);
  await db.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS system_permission boolean DEFAULT true, ADD COLUMN IF NOT EXISTS dangerous_permission boolean DEFAULT false`);
  await db.query(`UPDATE permissions SET system_permission = true WHERE system_permission IS NULL`);
  await db.query(`UPDATE permissions SET dangerous_permission = true WHERE key = '*' OR key LIKE '%.manage'`);
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
  if (section === 'workflow-automation') return 'settings.manage';
  return `${section}.manage`;
}

function requireManage(user: AuthUser, permission: string) {
  if (!hasPermission(user, permission)) throw new HttpError(403, `Missing permission ${permission}`);
}

export async function handleSettingsRoute(path: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  if (path === '/settings/users/invite') {
    if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
    requireManage(user, 'users.manage');
    return createUser(body, user, db);
  }
  const rolePermissionMatch = path.match(/^\/settings\/roles\/([^/]+)\/permissions$/);
  if (rolePermissionMatch) return handleRolePermissions(rolePermissionMatch[1], method, body, user, db);
  const roleActionMatch = path.match(/^\/settings\/roles\/([^/]+)\/(duplicate|archive)$/);
  if (roleActionMatch) return handleRoleAction(roleActionMatch[1], roleActionMatch[2], method, body, user, db);
  const userActionMatch = path.match(/^\/settings\/users\/([^/]+)\/(resend-invite|archive|restore)$/);
  if (userActionMatch) return handleUserAction(userActionMatch[1], userActionMatch[2], method, user, db);
  const userDeleteMatch = path.match(/^\/settings\/users\/([^/]+)$/);
  if (userDeleteMatch && method === 'DELETE') return deleteUser(userDeleteMatch[1], body, user, db);
  const idMatch = path.match(/^\/settings\/(users|roles|permissions)\/([^/]+)$/);
  if (idMatch) return handleSettingsPatch(idMatch[1], idMatch[2], method, body, user, db);
  const section = path.replace(/^\/settings\//, '');
  if (method !== 'GET' && method !== 'POST') throw new HttpError(405, 'Method not allowed');
  if (method === 'POST') requireManage(user, managePermissionFor(section));

  if (section === 'company') return method === 'POST' ? saveCompany(body, db) : getCompany(db);
  if (section === 'branding') return method === 'POST' ? saveBranding(body, db) : getBranding(db);
  if (section === 'theme') return method === 'POST' ? saveThemeSettings(body, db) : getThemeSettings(db);
  if (section === 'users') return method === 'POST' ? createUser(body, user, db) : getUsers(db);
  if (section === 'roles') return method === 'POST' ? createRole(body, user, db) : getRoles(db);
  if (section === 'roles-permissions') return getRoles(db);
  if (section === 'permissions') return method === 'POST' ? createPermission(body, user, db) : getPermissions(db);
  if (section === 'foundation') return getFoundation(db);
  if (section === 'payment') return method === 'POST' ? savePayment(body, db) : getPayment(db);
  if (section === 'email') return { ok: true, email: await getSetting(db, 'email.settings', { provider: 'resend', configured: Boolean(process.env.RESEND_API_KEY), from: process.env.EMAIL_FROM || '' }) };
  if (section === 'license') return { ok: true, license: await getSetting(db, 'license.settings', { status: 'not_checked' }) };
  if (section === 'media') return getMedia(db);
  if (section === 'homepage-builder') return method === 'POST' ? saveHomepageBuilder(body, db) : getHomepageBuilder(db);
  if (section === 'workflow-automation') return { ok: true, workflowAutomation: await getSetting(db, 'workflow.automation', { autoCreateJobOnQuoteApproval: true, autoCreateInvoiceOnJobCompletion: true, requestIntakeNotifications: [] }) };
  throw new HttpError(404, 'Unknown settings section');
}

async function handleSettingsPatch(kind: string, id: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable) {
  if (method !== 'PATCH') throw new HttpError(405, 'Method not allowed');
  requireManage(user, kind === 'users' ? 'users.manage' : kind === 'permissions' ? 'permissions.manage' : 'roles.manage');
  if (kind === 'users') {
    const current = (await db.query<any>(`select u.id::text, u.status, coalesce(r.name, '') as role from users u left join user_roles ur on ur.user_id=u.id left join roles r on r.id=ur.role_id where u.id=$1`, [id])).rows[0];
    if (!current) throw new HttpError(404, 'User not found');
    if ((body.status === 'inactive' || body.status === 'deactivated') && current.role === 'Owner') await assertNotLastOwner(id, db);
    const requestedRoleIds = Array.isArray(body.roleIds) ? body.roleIds.map(String).filter(Boolean) : (typeof body.roleId === 'string' && body.roleId ? [body.roleId] : []);
    if (requestedRoleIds.length) {
      const nextRoles = (await db.query<{ name: string }>(`select name from roles where id = any($1)`, [requestedRoleIds])).rows.map((r) => r.name);
      if (nextRoles.includes('Owner') && user.role !== 'Owner') throw new HttpError(403, 'Only an Owner can assign Owner role');
      if (current.role === 'Owner' && !nextRoles.includes('Owner')) await assertNotLastOwner(id, db);
    }
    await db.query(`update users set name = coalesce(nullif($2, ''), name), status = coalesce(nullif($3, ''), status), updated_at = now() where id = $1`, [id, String(body.name || ''), String(body.status || '')]);
    if (requestedRoleIds.length) {
      await db.query(`delete from user_roles where user_id = $1`, [id]);
      for (const roleId of [...new Set(requestedRoleIds)]) await db.query(`insert into user_roles (user_id, role_id) values ($1, $2) on conflict do nothing`, [id, roleId]);
      await auditLog('user roles changed', { targetUserId: id, roleIds: requestedRoleIds }, user.id, db).catch(() => undefined);
    }
    if (body.status === 'inactive' || body.status === 'deactivated') await auditLog('user deactivated', { targetUserId: id }, user.id, db).catch(() => undefined);
    return getUsers(db);
  }
  if (kind === 'permissions') {
    await db.query(`update permissions set description = coalesce(nullif($2,''), description), group_name = coalesce(nullif($3,''), group_name), dangerous_permission = coalesce($4, dangerous_permission) where id::text = $1 or key = $1`, [id, String(body.description || ''), String(body.group || ''), typeof body.dangerousPermission === 'boolean' ? body.dangerousPermission : null]);
    await auditLog('permission edited', { permissionId: id }, user.id, db).catch(() => undefined);
    return getPermissions(db);
  }
  const existing = (await db.query<any>(`select name, system_role as "systemRole" from roles where id=$1`, [id])).rows[0];
  if (!existing) throw new HttpError(404, 'Role not found');
  if (existing.name === 'Owner' && body.name && body.name !== 'Owner') throw new HttpError(400, 'Owner role cannot be renamed');
  await db.query(`update roles set name = case when system_role = false then coalesce(nullif($2,''), name) else name end, description = coalesce($3, description) where id = $1`, [id, typeof body.name === 'string' ? body.name.trim() : '', typeof body.description === 'string' ? body.description : null]);
  await auditLog('role edited', { roleId: id }, user.id, db).catch(() => undefined);
  return getRoles(db);
}


async function assertNotLastOwner(targetUserId: string, db: Queryable) {
  const result = await db.query<{ count: string }>(`select count(*)::text from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.name='Owner' and u.status='active' and u.id <> $1`, [targetUserId]);
  if (Number(result.rows[0]?.count || 0) < 1) throw new HttpError(400, 'Cannot demote or deactivate the last active Owner');
}

async function replaceRolePermissions(roleId: string, permissionKeys: string[], db: Queryable) {
  const role = (await db.query<{ name: string }>(`select name from roles where id=$1`, [roleId])).rows[0];
  if (!role) throw new HttpError(404, 'Role not found');
  const keys = [...new Set(role.name === 'Owner' ? ['*', ...permissionKeys] : permissionKeys.filter((key) => key !== '*'))];
  await db.query(`delete from role_permissions where role_id=$1`, [roleId]);
  await db.query(`insert into role_permissions (role_id, permission_id) select $1, id from permissions where key = any($2) on conflict do nothing`, [roleId, keys]);
  if (role.name === 'Owner') await db.query(`insert into role_permissions (role_id, permission_id) select $1, id from permissions where key='*' on conflict do nothing`, [roleId]);
}

async function handleRolePermissions(id: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable) {
  requireManage(user, 'roles.manage');
  if (method === 'GET') {
    const role = (await db.query<any>(`select r.id::text, r.name, r.description, r.system_role as "systemRole", coalesce(array_agg(p.key order by p.key) filter (where p.key is not null), '{}') as permissions from roles r left join role_permissions rp on rp.role_id=r.id left join permissions p on p.id=rp.permission_id where r.id=$1 group by r.id`, [id])).rows[0];
    if (!role) throw new HttpError(404, 'Role not found');
    return { ok: true, role };
  }
  if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const role = (await db.query<any>(`select name, system_role as "systemRole" from roles where id=$1`, [id])).rows[0];
  if (!role) throw new HttpError(404, 'Role not found');
  const permissionKeys = Array.isArray(body.permissionKeys) ? body.permissionKeys.map(String) : [];
  if (role.name === 'Owner' && !permissionKeys.includes('*')) throw new HttpError(400, 'Owner must always keep wildcard permission');
  if (user.role !== 'Owner' && user.permissions.includes('roles.manage') && !permissionKeys.includes('roles.manage') && role.name === user.role) throw new HttpError(400, 'You cannot remove your own roles.manage permission');
  await replaceRolePermissions(id, permissionKeys, db);
  await auditLog('permissions changed', { roleId: id, role: role.name, permissionKeys }, user.id, db).catch(() => undefined);
  return getRoles(db);
}

async function handleRoleAction(id: string, action: string, method: string, body: SettingsBody, user: AuthUser, db: Queryable) {
  if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
  requireManage(user, 'roles.manage');
  const role = (await db.query<any>(`select id::text, name, description, system_role as "systemRole" from roles where id=$1`, [id])).rows[0];
  if (!role) throw new HttpError(404, 'Role not found');
  if (action === 'archive') {
    if (role.systemRole) throw new HttpError(400, 'System roles cannot be archived');
    await db.query(`update roles set archived_at=now() where id=$1`, [id]);
    await auditLog('role archived', { roleId: id, role: role.name }, user.id, db).catch(() => undefined);
    return getRoles(db);
  }
  const name = String(body.name || `${role.name} Copy`).trim();
  const result = await db.query<{ id: string }>(`insert into roles (name, description, system_role) values ($1, $2, false) returning id`, [name, role.description || `Duplicated from ${role.name}`]);
  await db.query(`insert into role_permissions (role_id, permission_id) select $1, permission_id from role_permissions where role_id=$2 on conflict do nothing`, [result.rows[0].id, id]);
  await auditLog('role duplicated', { sourceRoleId: id, newRoleId: result.rows[0].id }, user.id, db).catch(() => undefined);
  return getRoles(db);
}

async function handleUserAction(id: string, action: string, method: string, user: AuthUser, db: Queryable) {
  if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
  requireManage(user, 'users.manage');
  if (action === 'resend-invite') {
    await auditLog('user invite resent', { targetUserId: id }, user.id, db).catch(() => undefined);
    return { ok: true };
  }
  const target = (await db.query<any>(`select u.id::text, u.status, coalesce(r.name, '') as role from users u left join user_roles ur on ur.user_id=u.id left join roles r on r.id=ur.role_id where u.id=$1`, [id])).rows[0];
  if (!target) throw new HttpError(404, 'User not found');
  if (target.role === 'Owner') await assertNotLastOwner(id, db);
  if (action === 'archive') await db.query(`update users set archived_at=now(), disabled_at=coalesce(disabled_at, now()), status='inactive', updated_at=now() where id=$1`, [id]);
  else if (action === 'restore') await db.query(`update users set archived_at=null, deleted_at=null, disabled_at=null, status='active', updated_at=now() where id=$1`, [id]);
  else throw new HttpError(405, 'Method not allowed');
  await auditLog(`user ${action}`, { targetUserId: id }, user.id, db).catch(() => undefined);
  return getUsers(db);
}

async function deleteUser(id: string, body: SettingsBody, user: AuthUser, db: Queryable) {
  requireManage(user, 'users.manage');
  if (user.role !== 'Owner' && user.role !== 'Admin' && !user.permissions.includes('*')) throw new HttpError(403, 'Owner/Admin only');
  const target = (await db.query<any>(`select u.id::text, coalesce(r.name, '') as role from users u left join user_roles ur on ur.user_id=u.id left join roles r on r.id=ur.role_id where u.id=$1`, [id])).rows[0];
  if (!target) throw new HttpError(404, 'User not found');
  if (target.role === 'Owner') await assertNotLastOwner(id, db);
  if (id === user.id && body.confirmCurrentUser !== true) throw new HttpError(400, 'Confirm before deleting your own user');
  const linked = await db.query<any>(`select (select count(*) from work_requests where assigned_user_id=$1)::int + (select count(*) from jobs where assigned_user_id=$1)::int as count`, [id]).catch(() => ({ rows: [{ count: 0 }] } as any));
  if (Number(linked.rows[0]?.count || 0) > 0 && body.force !== true) throw new HttpError(409, 'Linked business data exists. Archive user or retry with force=true after Owner confirmation.');
  await db.query(`update users set deleted_at=now(), disabled_at=coalesce(disabled_at, now()), status='deleted', updated_at=now() where id=$1`, [id]);
  await auditLog('user deleted', { targetUserId: id, linkedRecords: linked.rows[0]?.count || 0 }, user.id, db).catch(() => undefined);
  return getUsers(db);
}

export async function getViewAsOptions(user: AuthUser, db: Queryable = createDatabase()) {
  await ensureAdminFoundation(db);
  if (!(user.role === 'Owner' || user.permissions.includes('*'))) throw new HttpError(403, 'Owner access required');
  const roles = (await getRoles(db)).roles;
  const clients = await db.query<any>(`select c.id::text, c.display_name as name, cc.email::text from clients c left join client_contacts cc on cc.client_id=c.id and cc.primary_contact=true order by c.display_name limit 200`).catch(() => ({ rows: [] } as any));
  const technicians = await db.query<any>(`select u.id::text, u.name, u.email::text from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.name='Technician' and u.status='active' order by u.name limit 200`).catch(() => ({ rows: [] } as any));
  await auditLog('view as options opened', { roles: roles.length }, user.id, db).catch(() => undefined);
  return { ok: true, roles, clients: clients.rows, technicians: technicians.rows };
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
  const users = await db.query<any>(`select u.id::text, u.name, u.email::text, u.status, u.phone, u.client_id::text as "clientId", u.archived_at::text as "archivedAt", u.deleted_at::text as "deletedAt", u.disabled_at::text as "disabledAt", u.created_at::text as "createdAt", u.updated_at::text as "lastLogin",
    (array_agg(distinct r.id::text) filter (where r.id is not null))[1] as "roleId",
    coalesce((array_agg(distinct r.name) filter (where r.name is not null))[1], 'Client') as role,
    coalesce(jsonb_agg(distinct jsonb_build_object('id', r.id::text, 'name', r.name)) filter (where r.id is not null), '[]'::jsonb) as roles,
    coalesce(array_agg(distinct r.id::text) filter (where r.id is not null), '{}') as "roleIds",
    coalesce(array_agg(distinct p.key) filter (where p.key is not null), '{}') as permissions
    from users u left join user_roles ur on ur.user_id=u.id left join roles r on r.id=ur.role_id left join role_permissions rp on rp.role_id=r.id left join permissions p on p.id=rp.permission_id
    where u.deleted_at is null group by u.id order by u.created_at desc`);
  const roles = await db.query<any>(`select id::text, name from roles where archived_at is null order by system_role desc, name`);
  return { ok: true, users: users.rows, roles: roles.rows };
}
async function createUser(body: SettingsBody, user: AuthUser, db: Queryable) {
  const email = String(body.email || '').trim();
  if (!email) throw new HttpError(400, 'Email is required');
  const result = await db.query<{ id: string }>(`insert into users (name, email, status) values ($1, $2, 'active') on conflict (email) do update set name=excluded.name, updated_at=now() returning id`, [String(body.name || email), email]);
  const roleIds = Array.isArray(body.roleIds) ? body.roleIds.map(String).filter(Boolean) : (body.roleId ? [String(body.roleId)] : []);
  for (const roleId of [...new Set(roleIds)]) await db.query(`insert into user_roles (user_id, role_id) values ($1, $2) on conflict do nothing`, [result.rows[0].id, roleId]);
  await auditLog('user invited', { targetUserId: result.rows[0].id, email, roleIds }, user.id, db).catch(() => undefined);
  return getUsers(db);
}
async function getRoles(db: Queryable) {
  const roles = await db.query<any>(`select r.id::text, r.name, r.description, r.system_role as "systemRole", r.archived_at is not null as archived,
    count(distinct rp.permission_id)::int as "permissionsCount", count(distinct ur.user_id)::int as "userCount",
    coalesce(array_agg(distinct p.key order by p.key) filter (where p.key is not null), '{}') as permissions
    from roles r left join role_permissions rp on rp.role_id=r.id left join permissions p on p.id=rp.permission_id left join user_roles ur on ur.role_id=r.id
    where r.archived_at is null group by r.id order by r.system_role desc, r.name`);
  const permissions = await getPermissions(db);
  return { ok: true, roles: roles.rows, permissions: permissions.permissions };
}
async function createRole(body: SettingsBody, user: AuthUser, db: Queryable) {
  const name = String(body.name || '').trim();
  if (!name) throw new HttpError(400, 'Role name is required');
  if (name.toLowerCase() === 'owner') throw new HttpError(400, 'Owner role already exists and is locked');
  const permissionKeys = Array.isArray(body.permissionKeys) ? body.permissionKeys.map(String).filter(Boolean) : [];
  const result = await db.query<{ id: string }>(`insert into roles (name, description, system_role) values ($1, $2, false) on conflict (name) do update set description=excluded.description, archived_at=null returning id`, [name, String(body.description || '')]);
  if (permissionKeys.length) await replaceRolePermissions(result.rows[0].id, permissionKeys, db);
  await auditLog('role created', { roleId: result.rows[0].id, name, permissionKeys }, user.id, db).catch(() => undefined);
  return getRoles(db);
}
async function getPermissions(db: Queryable) {
  const rows = await db.query<any>(`select p.id::text, p.key, p.description, p.group_name as "group", p.system_permission as "systemPermission", p.dangerous_permission as "dangerousPermission", coalesce(array_agg(distinct r.name order by r.name) filter (where r.name is not null), '{}') as roles
    from permissions p left join role_permissions rp on rp.permission_id=p.id left join roles r on r.id=rp.role_id and r.archived_at is null group by p.id order by p.group_name, p.key`);
  return { ok: true, permissions: rows.rows };
}
async function createPermission(body: SettingsBody, user: AuthUser, db: Queryable) {
  const key = String(body.key || '').trim();
  if (!key) throw new HttpError(400, 'Permission key is required');
  if (key === '*') throw new HttpError(400, 'Wildcard permission already exists and cannot be recreated');
  const group = String(body.group || key.split('.')[0] || 'custom').trim();
  await db.query(`insert into permissions (key, group_name, description, system_permission, dangerous_permission) values ($1,$2,$3,false,$4) on conflict (key) do update set description=excluded.description, group_name=excluded.group_name, dangerous_permission=excluded.dangerous_permission`, [key, group, String(body.description || `${key} permission`), Boolean(body.dangerousPermission)]);
  await auditLog('permission created', { key, group }, user.id, db).catch(() => undefined);
  return getPermissions(db);
}
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

type DashboardRange = 'today' | 'this_week' | 'this_month' | 'quarter' | 'year';

function dashboardRange(value?: string): DashboardRange {
  return ['today', 'this_week', 'this_month', 'quarter', 'year'].includes(value || '') ? value as DashboardRange : 'today';
}

function rangeSql(range: DashboardRange, column = 'created_at') {
  if (range === 'today') return `${column} >= current_date and ${column} < current_date + interval '1 day'`;
  if (range === 'this_week') return `${column} >= date_trunc('week', now())`;
  if (range === 'this_month') return `${column} >= date_trunc('month', now())`;
  if (range === 'quarter') return `${column} >= date_trunc('quarter', now())`;
  return `${column} >= date_trunc('year', now())`;
}

async function ensureDashboardReady(db: Queryable) {
  await runMigrations(db);
  await ensureAdminFoundation(db);
  await ensureModuleFoundation(db);
}

function safeUuidParam(value?: string | null) { return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null; }

function scopeForDashboard(user: AuthUser, alias: string, kind: 'client' | 'request' | 'job' | 'quote' | 'invoice' | 'messageThread' = 'client') {
  if (user.role === 'Client' && user.clientId) return { sql: ` and ${alias}.client_id = $1`, params: [safeUuidParam(user.clientId)] as unknown[] };
  if (user.role !== 'Technician') return { sql: '', params: [] as unknown[] };
  if (kind === 'request' || kind === 'job') return { sql: ` and ${alias}.assigned_user_id = $1`, params: [safeUuidParam(user.id)] as unknown[] };
  if (kind === 'quote') return { sql: ` and exists (select 1 from jobs dash_j where dash_j.quote_id = ${alias}.id and dash_j.assigned_user_id = $1)`, params: [safeUuidParam(user.id)] as unknown[] };
  if (kind === 'invoice') return { sql: ` and exists (select 1 from jobs dash_j where dash_j.id = ${alias}.job_id and dash_j.assigned_user_id = $1)`, params: [safeUuidParam(user.id)] as unknown[] };
  if (kind === 'messageThread') return { sql: ` and (${alias}.entity_type = 'job' and exists (select 1 from jobs dash_j where dash_j.id = ${alias}.entity_id and dash_j.assigned_user_id = $1))`, params: [safeUuidParam(user.id)] as unknown[] };
  return { sql: '', params: [] as unknown[] };
}

async function dashboardQuery<T extends Record<string, unknown>>(db: Queryable, step: string, sql: string, params: unknown[], fallback: T): Promise<T> {
  try {
    return (await db.query<T>(sql, params)).rows[0] || fallback;
  } catch (error) {
    console.error('Dashboard overview query failed', { step, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function dashboardRows<T extends Record<string, unknown>>(db: Queryable, step: string, sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await db.query<T>(sql, params)).rows;
  } catch (error) {
    console.error('Dashboard overview query failed', { step, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getDashboardOverview(user: AuthUser, rangeValue = 'today', db: Queryable = createDatabase()) {
  const range = dashboardRange(rangeValue);
  let step = 'start';
  try {
    step = 'verify_migrations';
    await ensureDashboardReady(db);

    const requestScope = scopeForDashboard(user, 'wr', 'request');
    const quoteScope = scopeForDashboard(user, 'q', 'quote');
    const jobScope = scopeForDashboard(user, 'j', 'job');
    const invoiceScope = scopeForDashboard(user, 'i', 'invoice');
    const threadScope = scopeForDashboard(user, 'mt', 'messageThread');
    const clientScope = scopeForDashboard(user, 'x', 'client');

    step = 'requests_metrics';
    const requests = await dashboardQuery(db, step, `
      select
        count(*) filter (where ${rangeSql(range, 'wr.created_at')})::int as "newRequestsInRange",
        count(*) filter (where lower(wr.status) in ('new','reviewing','needs_info'))::int as "requestsNeedingReview",
        count(*) filter (where wr.assigned_user_id is null and lower(wr.status) not in ('completed','cancelled','inactive'))::int as "unassignedRequests",
        count(*) filter (where lower(wr.status) = 'new')::int as "newRequests",
        count(*) filter (where lower(wr.status) = 'reviewing')::int as reviewing,
        count(*) filter (where lower(wr.status) = 'quoted')::int as quoted,
        count(*) filter (where lower(wr.status) in ('approved'))::int as approved,
        count(*) filter (where lower(wr.status) in ('scheduled'))::int as scheduled,
        count(*) filter (where lower(wr.status) in ('in_progress'))::int as "inProgress",
        count(*) filter (where lower(wr.status) in ('completed'))::int as completed,
        count(*) filter (where lower(wr.priority) in ('high','urgent','emergency'))::int as "urgentRequests",
        count(*) filter (where lower(wr.status) in ('needs_info'))::int as "waitingOnCustomer"
      from work_requests wr where true${requestScope.sql}`, requestScope.params, {
        newRequestsInRange: 0, requestsNeedingReview: 0, unassignedRequests: 0, newRequests: 0, reviewing: 0, quoted: 0, approved: 0, scheduled: 0, inProgress: 0, completed: 0, urgentRequests: 0, waitingOnCustomer: 0,
      });

    step = 'quotes_metrics';
    const quotes = await dashboardQuery(db, step, `
      select
        count(*) filter (where lower(q.status) in ('draft','ready_to_send','sent','viewed','pending'))::int as "pendingQuotes",
        count(*) filter (where q.approved_at is not null or lower(q.status) = 'approved')::int as "approvedQuotes",
        coalesce(sum(q.total_cents) filter (where lower(q.status) in ('draft','ready_to_send','sent','viewed','pending')),0)::int as "pendingQuoteValue",
        coalesce(sum(q.total_cents) filter (where q.approved_at is not null or lower(q.status) = 'approved'),0)::int as "approvedQuoteValue",
        count(*) filter (where lower(q.status) in ('sent','viewed','approved','declined'))::int as "decisionQuotes",
        count(*) filter (where lower(q.status) = 'approved' or q.approved_at is not null)::int as "wonQuotes"
      from quotes q where true${quoteScope.sql}`, quoteScope.params, { pendingQuotes: 0, approvedQuotes: 0, pendingQuoteValue: 0, approvedQuoteValue: 0, decisionQuotes: 0, wonQuotes: 0 });

    step = 'jobs_metrics';
    const jobs = await dashboardQuery(db, step, `
      select
        count(*) filter (where lower(j.status) not in ('completed','cancelled','canceled'))::int as "activeJobs",
        count(*) filter (where lower(j.status) = 'completed' and ${rangeSql(range, 'coalesce(j.completed_at,j.updated_at,j.created_at)')})::int as "completedJobs",
        count(*) filter (where lower(j.status) = 'waiting_parts')::int as "jobsWaitingOnParts",
        count(*) filter (where lower(j.status) in ('blocked','waiting_parts','waiting_customer'))::int as "blockedJobs",
        count(*) filter (where j.assigned_user_id is not null and lower(j.status) not in ('completed','cancelled','canceled'))::int as "assignedTechnicians",
        count(*) filter (where j.assigned_user_id is null and lower(j.status) not in ('completed','cancelled','canceled'))::int as "unassignedJobs",
        (select count(*)::int from schedules s join jobs sj on sj.id = s.job_id where s.starts_at::date = current_date${user.role === 'Technician' ? ' and s.assigned_user_id = $1' : user.role === 'Client' && user.clientId ? ' and sj.client_id = $1' : ''}) as "todayScheduledJobs"
      from jobs j where true${jobScope.sql}`, jobScope.params, { activeJobs: 0, completedJobs: 0, jobsWaitingOnParts: 0, blockedJobs: 0, assignedTechnicians: 0, unassignedJobs: 0, todayScheduledJobs: 0 });

    step = 'invoice_metrics';
    const invoices = await dashboardQuery(db, step, `
      select
        count(*) filter (where lower(i.status) in ('open','sent','viewed','partially_paid','overdue'))::int as "openInvoices",
        coalesce(sum(i.balance_cents) filter (where lower(i.status) in ('open','sent','viewed','partially_paid','overdue') and i.balance_cents > 0),0)::int as "outstandingBalance",
        count(*) filter (where (lower(i.status) = 'overdue' or i.due_at < now()) and i.balance_cents > 0)::int as "overdueInvoices",
        coalesce(sum(i.balance_cents) filter (where (lower(i.status) = 'overdue' or i.due_at < now()) and i.balance_cents > 0),0)::int as "overdueInvoiceBalance",
        coalesce(sum(i.deposit_cents),0)::int as "depositsCollected"
      from invoices i where true${invoiceScope.sql}`, invoiceScope.params, { openInvoices: 0, outstandingBalance: 0, overdueInvoices: 0, overdueInvoiceBalance: 0, depositsCollected: 0 });

    step = 'payment_metrics';
    const paymentScopeSql = user.role === 'Client' && user.clientId ? ' and p.client_id = $1' : user.role === 'Technician' ? ' and exists (select 1 from invoices pi join jobs pj on pj.id=pi.job_id where pi.id=p.invoice_id and pj.assigned_user_id=$1)' : '';
    const paymentParams = user.role === 'Client' && user.clientId ? [user.clientId] : user.role === 'Technician' ? [safeUuidParam(user.id)] : [];
    const payments = await dashboardQuery(db, step, `select coalesce(sum(p.amount_cents) filter (where lower(p.status) = 'completed' and ${rangeSql(range, 'p.received_at')}),0)::int as "paymentsCollected", coalesce(sum(p.amount_cents) filter (where lower(p.status) = 'completed' and p.received_at >= date_trunc('month', now())),0)::int as "collectedThisMonth" from payments p where true${paymentScopeSql}`, paymentParams, { paymentsCollected: 0, collectedThisMonth: 0 });

    step = 'message_metrics';
    const messages = await dashboardQuery(db, step, `select coalesce(sum(mt.unread_count),0)::int as "unreadMessages", count(*) filter (where mt.needs_reply or lower(mt.status) = 'waiting_on_staff')::int as "messagesNeedingReply" from message_threads mt where true${threadScope.sql}`, threadScope.params, { unreadMessages: 0, messagesNeedingReply: 0 });

    step = 'activity_feed';
    const activityWhere = user.role === 'Client' && user.clientId ? 'where at.client_id = $1' : '';
    const activityParams = user.role === 'Client' && user.clientId ? [user.clientId] : [];
    const activity = await dashboardRows(db, step, `select at.entity_type as type, at.summary, at.created_at::text as "createdAt" from activity_timeline at ${activityWhere} order by at.created_at desc limit 12`, activityParams);

    step = 'snapshot';
    const snapshot = await getOperationalSnapshot(user, db, clientScope.sql.replaceAll('x.', ''), clientScope.params, jobScope.sql.replaceAll('j.', ''), jobScope.params);

    const quoteCloseRate = Number(quotes.decisionQuotes || 0) ? Math.round((Number(quotes.wonQuotes || 0) / Number(quotes.decisionQuotes || 1)) * 100) : 0;
    const metrics = {
      newRequests: Number(requests.newRequestsInRange || 0),
      pendingQuotes: Number(quotes.pendingQuotes || 0),
      approvedQuotes: Number(quotes.approvedQuotes || 0),
      activeJobs: Number(jobs.activeJobs || 0),
      completedJobs: Number(jobs.completedJobs || 0),
      openInvoices: Number(invoices.openInvoices || 0),
      outstandingBalance: Number(invoices.outstandingBalance || 0),
      messagesNeedingReply: Number(messages.messagesNeedingReply || 0),
      todayScheduledJobs: Number(jobs.todayScheduledJobs || 0),
      overdueInvoices: Number(invoices.overdueInvoices || 0),
      unassignedRequests: Number(requests.unassignedRequests || 0),
      waitingOnCustomer: Number(requests.waitingOnCustomer || 0),
    };

    return {
      ok: true,
      range,
      metrics,
      snapshot,
      activity,
      kpis: {
        requestsNeedingReview: Number(requests.requestsNeedingReview || 0),
        pendingQuoteValue: Number(quotes.pendingQuoteValue || 0),
        approvedQuoteValue: Number(quotes.approvedQuoteValue || 0),
        quoteCloseRate,
        jobsWaitingOnParts: Number(jobs.jobsWaitingOnParts || 0),
        overdueInvoiceBalance: Number(invoices.overdueInvoiceBalance || 0),
        paymentsCollected: Number(payments.paymentsCollected || 0),
        unreadMessages: Number(messages.unreadMessages || 0),
        customerRepliesNeeded: Number(messages.messagesNeedingReply || 0),
      },
      operationsBoard: [
        { key: 'new', label: 'New requests', count: Number(requests.newRequests || 0), href: '/requests?status=new' },
        { key: 'reviewing', label: 'Reviewing', count: Number(requests.reviewing || 0), href: '/requests?status=reviewing' },
        { key: 'quoted', label: 'Quoted', count: Number(requests.quoted || 0), href: '/requests?status=quoted' },
        { key: 'approved', label: 'Approved', count: Number(requests.approved || quotes.approvedQuotes || 0), href: '/quotes?status=approved' },
        { key: 'scheduled', label: 'Scheduled', count: Number(requests.scheduled || jobs.todayScheduledJobs || 0), href: '/jobs?status=scheduled' },
        { key: 'in_progress', label: 'In progress', count: Number(requests.inProgress || 0), href: '/jobs?status=in_progress' },
        { key: 'completed', label: 'Completed', count: Number(requests.completed || jobs.completedJobs || 0), href: '/jobs?status=completed' },
      ],
      financialSnapshot: {
        openInvoices: metrics.openInvoices,
        overdueInvoices: metrics.overdueInvoices,
        collectedThisMonth: Number(payments.collectedThisMonth || 0),
        outstandingBalance: metrics.outstandingBalance,
        depositsCollected: Number(invoices.depositsCollected || 0),
        paymentProviderHealth: 'not_configured',
      },
      fieldSnapshot: {
        jobsScheduledToday: metrics.todayScheduledJobs,
        assignedTechnicians: Number(jobs.assignedTechnicians || 0),
        unassignedJobs: Number(jobs.unassignedJobs || 0),
        blockedJobs: Number(jobs.blockedJobs || 0),
        urgentRequests: Number(requests.urgentRequests || 0),
      },
      alerts: [
        ...(metrics.overdueInvoices > 0 ? [{ tone: 'danger', message: `${metrics.overdueInvoices} invoice${metrics.overdueInvoices === 1 ? '' : 's'} overdue` }] : []),
        ...(metrics.unassignedRequests > 0 ? [{ tone: 'warning', message: `${metrics.unassignedRequests} request${metrics.unassignedRequests === 1 ? '' : 's'} unassigned` }] : []),
        ...(Number(jobs.blockedJobs || 0) > 0 ? [{ tone: 'warning', message: `${jobs.blockedJobs} job${Number(jobs.blockedJobs) === 1 ? '' : 's'} blocked or waiting` }] : []),
      ],
    };
  } catch (error) {
    console.error('Dashboard overview failed', { step, role: user.role, userId: user.id, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function getOperationalSnapshot(user: AuthUser, db: Queryable, clientFilter: string, clientParams: unknown[], jobFilter: string, jobParams: unknown[]) {
  const nextJob = await db.query<any>(`select j.id::text, coalesce(j.title, 'Scheduled job') as title, j.status, s.starts_at::text as date from schedules s join jobs j on j.id=s.job_id where s.starts_at >= now()${user.role === 'Technician' ? ' and s.assigned_user_id = $1' : clientFilter ? ' and j.client_id = $1' : ''} order by s.starts_at asc limit 1`, jobParams).catch(() => ({ rows: [] } as any));
  const newestRequest = await db.query<any>(`select id::text, coalesce(title, description, 'Work request') as title, status, priority, created_at::text as date from work_requests where true${clientFilter ? ` and ${clientFilter.replace(/^ and /, '')}` : ''} order by created_at desc limit 1`, clientParams).catch(() => ({ rows: [] } as any));
  const highPriority = await db.query<any>(`select id::text, coalesce(title, description, 'Priority request') as title, status, priority, created_at::text as date from work_requests where lower(priority) in ('high','emergency','urgent')${clientFilter ? ` and ${clientFilter.replace(/^ and /, '')}` : ''} order by created_at desc limit 1`, clientParams).catch(() => ({ rows: [] } as any));
  const approvedQuote = await db.query<any>(`select id::text, status, total_cents as total, approved_at::text as date from quotes where (approved_at is not null or lower(status)='approved')${clientFilter ? ` and ${clientFilter.replace(/^ and /, '')}` : ''} order by approved_at desc nulls last, created_at desc limit 1`, clientParams).catch(() => ({ rows: [] } as any));
  const oldestOpenInvoice = await db.query<any>(`select id::text, status, balance_cents as balance, due_at::text as date from invoices where balance_cents > 0 and lower(status) not in ('paid','void')${clientFilter ? ` and ${clientFilter.replace(/^ and /, '')}` : ''} order by due_at asc nulls last, created_at asc limit 1`, clientParams).catch(() => ({ rows: [] } as any));
  return { nextScheduledJob: nextJob.rows[0] || null, newestRequest: newestRequest.rows[0] || null, highestPriorityItem: highPriority.rows[0] || null, latestApprovedQuote: approvedQuote.rows[0] || null, oldestOpenInvoice: oldestOpenInvoice.rows[0] || null };
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
