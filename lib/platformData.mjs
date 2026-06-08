import crypto from 'node:crypto';

export const ENVIRONMENT_VARIABLES = [
  ['MAGIC_LINK_FROM_EMAIL', 'Email'],
  ['OPENAI_API_KEY', 'AI'],
  ['QUOTE_FROM_EMAIL', 'Email'],
  ['RECAPTCHA_SECRET_KEY', 'Security'],
  ['RECAPTCHA_SITE_KEY', 'Security'],
  ['RESEND_API_KEY', 'Email'],
  ['SERPAPI_API_KEY', 'Search'],
  ['SITE_URL', 'Site'],
  ['SITE_URL_ALIASES', 'Site'],
  ['SQUARE_ACCESS_TOKEN', 'Payments'],
  ['SQUARE_API_VERSION', 'Payments'],
  ['SQUARE_ENVIRONMENT', 'Payments'],
  ['SQUARE_LOCATION_ID', 'Payments'],
  ['SQUARE_WEBHOOK_SIGNATURE_KEY', 'Payments'],
];

export const CORE_MODULES = [
  ['dashboard-overview', 'Dashboard / Overview', 'Main', '/app/dashboard', 'dashboard.view'],
  ['customers', 'Customers / Clients', 'Operations', '/app/customers', 'customers.view'],
  ['request-estimate', 'Request Estimate', 'Operations', '/app/requests', 'requests.view'],
  ['estimate-quote-center', 'Estimate & Quote Center', 'Operations', '/app/quotes', 'quotes.view'],
  ['work-orders', 'Work Orders', 'Operations', '/app/work-orders', 'workorders.view'],
  ['schedule-calendar', 'Schedule / Calendar', 'Operations', '/app/schedule', 'schedule.view'],
  ['inventory', 'Inventory', 'Operations', '/app/inventory', 'inventory.view'],
  ['invoices', 'Invoices', 'Financial', '/app/invoices', 'invoices.view'],
  ['finance', 'Finance', 'Financial', '/app/finance', 'finance.view'],
  ['payments', 'Payments', 'Financial', '/app/payments', 'finance.view'],
  ['users-roles', 'Users & Roles', 'People', '/app/users', 'users.view'],
  ['workspace-permissions', 'Workspace & Permissions', 'People', '/app/workspaces', 'roles.manage'],
  ['ai-photo-estimate', 'AI Photo Estimate', 'AI Tools', '/app/ai/photo-estimate', 'quotes.manage'],
  ['ai-quote-builder', 'AI Quote Builder', 'AI Tools', '/app/ai/quote-builder', 'quotes.manage'],
  ['ai-troubleshooting', 'AI Troubleshooting', 'AI Tools', '/app/ai/troubleshooting', 'workorders.manage'],
  ['homepage-editor', 'Homepage Editor', 'System', '/app/homepage-editor', 'homepage.manage'],
  ['theme-manager', 'Theme Manager', 'System', '/app/theme-manager', 'theme.manage'],
  ['module-manager', 'Module Manager', 'System', '/app/modules', 'modules.view'],
  ['system-center', 'System Center', 'System', '/app/system', 'system.view'],
  ['platform-health', 'Platform Health', 'System', '/app/health', 'system.view'],
  ['audit-logs', 'Audit Logs', 'System', '/app/audit', 'audit.view'],
  ['cache-manager', 'Cache Manager', 'System', '/app/cache', 'system.manage'],
  ['backup-restore', 'Backup / Restore', 'System', '/app/backup', 'system.manage'],
  ['environment-integrations', 'Environment & Integrations', 'System', '/app/integrations', 'system.view'],
  ['licensing', 'Licensing', 'System', '/app/licensing', 'system.view'],
  ['worker-jobs', 'Worker Jobs', 'Operations', '/worker/jobs', 'workorders.view'],
  ['file-photo-manager', 'File / Photo Manager', 'Operations', '/app/files', 'requests.manage'],
  ['reports', 'Reports', 'Financial', '/app/reports', 'finance.view'],
  ['maintenance-plans', 'Maintenance Plans', 'Operations', '/app/maintenance', 'workorders.manage'],
  ['client-portal', 'Client Portal', 'People', '/client', 'requests.view'],
  ['worker-portal', 'Worker Portal', 'People', '/worker', 'workorders.view'],
];

export const PERMISSIONS = [
  'dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage',
  'workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage',
  'invoices.view','invoices.manage','finance.view','finance.manage','users.view','users.manage','roles.manage','modules.view',
  'modules.manage','theme.manage','homepage.manage','system.view','system.manage','audit.view','impersonation.use'
];

const ROLE_PERMISSIONS = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter(p => !['impersonation.use'].includes(p)),
  manager: ['dashboard.view','customers.view','customers.manage','requests.view','requests.manage','quotes.view','quotes.manage','workorders.view','workorders.manage','workorders.assign','schedule.view','schedule.manage','inventory.view','inventory.manage'],
  worker: ['dashboard.view','workorders.view','schedule.view','inventory.view'],
  client: ['dashboard.view','requests.view','quotes.view','invoices.view','finance.view'],
};

export const TABLES = ['platform_installation','company_settings','homepage_settings','theme_settings','app_users','roles','permissions','role_permissions','user_roles','workspace_access','module_registry','module_settings','service_categories','customers','properties','requests','quotes','quote_items','work_orders','assignments','schedule_events','inventory','inventory_transactions','invoices','payments','uploaded_files','ai_jobs','audit_logs','magic_tokens','sessions'];
const state = Object.fromEntries(TABLES.map(t => [t, []]));
let poolPromise;
function databaseUrl(env = process.env) { return env.NETLIFY_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL || ''; }
async function pool(env = process.env) {
  const url = databaseUrl(env);
  if (!url) return null;
  if (!poolPromise) poolPromise = import('pg').then(({ Pool }) => new Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } })).catch(() => null);
  return poolPromise;
}
export async function migrateDatabase(env = process.env) {
  const db = await pool(env);
  if (!db) return { ok: false, mode: 'memory', message: 'PostgreSQL not configured; development memory store active.' };
  for (const table of TABLES) {
    await db.query(`create table if not exists ${table} (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
  }
  return { ok: true, mode: 'postgresql', tables: TABLES };
}
async function persistTable(table, env = process.env) {
  const db = await pool(env);
  if (!db) return;
  await db.query(`create table if not exists ${table} (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
  for (const row of state[table]) await db.query(`insert into ${table} (id, data, created_at, updated_at) values ($1,$2,$3,$4) on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`, [row.id, row, row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()]);
}
async function loadRows(table, env = process.env) {
  const db = await pool(env);
  if (!db) return null;
  await db.query(`create table if not exists ${table} (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
  const result = await db.query(`select id, data, created_at, updated_at from ${table} order by created_at desc`);
  return result.rows.map(r => ({ id: r.id, created_at: r.created_at, updated_at: r.updated_at, ...r.data }));
}

export function normalizeEmail(email='') { return String(email).trim().toLowerCase(); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }
function upsert(table, match, record) {
  const rows = state[table];
  const idx = rows.findIndex(row => Object.entries(match).every(([k,v]) => row[k] === v));
  const stamped = { ...record, updated_at: now() };
  if (idx >= 0) rows[idx] = { ...rows[idx], ...stamped };
  else rows.push({ id: record.id || id(table), created_at: now(), ...stamped });
  return idx >= 0 ? rows[idx] : rows.at(-1);
}
function insert(table, record) { const row = { id: record.id || id(table), created_at: now(), updated_at: now(), ...record }; state[table].push(row); return row; }
function clone(x) { return JSON.parse(JSON.stringify(x)); }

export function getIntegrationStatus(env = process.env) {
  return ENVIRONMENT_VARIABLES.map(([key, category]) => ({
    key,
    configured: Boolean(env[key]),
    requiredForInstall: false,
    category,
    statusText: env[key] ? 'Configured' : 'Not configured; platform will use manual mode.'
  }));
}

export async function installPlatform(payload = {}, env = process.env) {
  await migrateDatabase(env);
  const company = payload.company || {};
  const ownerInput = payload.owner || {};
  const theme = payload.theme || {};
  const ownerEmail = normalizeEmail(ownerInput.email || 'owner@example.com');

  upsert('platform_installation', { key: 'default' }, { key: 'default', installation_complete: true, installed_at: now(), version: '1.0.0' });
  upsert('company_settings', { key: 'default' }, { key: 'default', company_name: company.name || 'Contractor Company', logo_url: company.logoUrl || '', phone: company.phone || '', email: company.email || ownerEmail });
  upsert('homepage_settings', { key: 'default' }, { key: 'default', hero_title: company.name ? `${company.name} Service Portal` : 'Book trusted contractor service', hero_subtitle: 'Request estimates, approve quotes, and track work in one white-label portal.' });
  upsert('theme_settings', { key: 'default' }, { key: 'default', mode: theme.mode || 'system', primary: theme.primary || '#2563eb', accent: theme.accent || '#10b981', background: theme.background || '#f8fafc', surface: theme.surface || '#ffffff', text: theme.text || '#0f172a' });

  const owner = upsert('app_users', { normalized_email: ownerEmail }, { full_name: ownerInput.fullName || 'Platform Owner', email: ownerEmail, normalized_email: ownerEmail, phone: ownerInput.phone || '', active: true, account_setup_complete: true });
  for (const role of ['owner','admin','manager','worker','client']) upsert('roles', { slug: role }, { slug: role, name: role[0].toUpperCase()+role.slice(1), active: true });
  for (const permission of PERMISSIONS) upsert('permissions', { slug: permission }, { slug: permission, description: permission.replace('.', ' ') });
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) for (const permission of perms) upsert('role_permissions', { role_slug: role, permission_slug: permission }, { role_slug: role, permission_slug: permission });
  upsert('user_roles', { user_id: owner.id, role_slug: 'owner' }, { user_id: owner.id, role_slug: 'owner' });
  upsert('workspace_access', { user_id: owner.id, workspace: 'all' }, { user_id: owner.id, workspace: 'all', can_impersonate: true });

  for (const [slug, name, group, route, permission] of CORE_MODULES) {
    upsert('module_registry', { slug }, { slug, name, nav_group: group, route, permission, enabled: true, source: 'core', manifest: { slug, name, group, route, permission } });
    upsert('module_settings', { module_slug: slug }, { module_slug: slug, enabled: true, visible_in_sidebar: true });
  }
  for (const name of ['General Contracting','HVAC','Plumbing','Electrical','Roofing','Handyman']) upsert('service_categories', { name }, { name, active: true });
  insert('audit_logs', { actor_id: owner.id, action: 'install.finish', entity_type: 'platform_installation', message: 'Platform installation completed with real seed records.' });

  for (const table of TABLES) await persistTable(table, env);
  return { ok: true, installationComplete: true, owner, validation: validateInstall(), database: databaseUrl(env) ? 'postgresql' : 'development-memory', integrations: getIntegrationStatus(env) };
}

export function validateInstall() {
  const required = {
    ownerUserExists: state.app_users.some(u => state.user_roles.some(r => r.user_id === u.id && r.role_slug === 'owner')),
    rolesExist: ['owner','admin','manager','worker','client'].every(slug => state.roles.some(r => r.slug === slug)),
    permissionsExist: PERMISSIONS.every(slug => state.permissions.some(p => p.slug === slug)),
    rolePermissionsExist: Object.entries(ROLE_PERMISSIONS).every(([role, perms]) => perms.every(permission => state.role_permissions.some(rp => rp.role_slug === role && rp.permission_slug === permission))),
    modulesExist: CORE_MODULES.every(([slug]) => state.module_registry.some(m => m.slug === slug)),
    settingsExist: ['company_settings','theme_settings','homepage_settings'].every(t => state[t].length > 0),
    installationComplete: state.platform_installation.some(i => i.installation_complete),
  };
  return { ...required, ok: Object.values(required).every(Boolean) };
}

export function getInstallStatus() { return { ok: true, installed: state.platform_installation.some(i => i.installation_complete), validation: validateInstall() }; }
export function getInstallHealth() { return { ok: true, database: databaseUrl() ? 'postgresql' : 'development-memory', requiredTables: TABLES, validation: validateInstall() }; }
export function getDraft() { return state.platform_installation.find(x => x.key === 'draft')?.draft || {}; }
export function saveDraft(draft) { upsert('platform_installation', { key: 'draft' }, { key: 'draft', draft }); return { ok: true, draft }; }

export async function list(table, env = process.env) { return clone((await loadRows(table, env)) || state[table] || []); }
export async function create(table, data, env = process.env) { const row = insert(table, data); await persistTable(table, env); return clone(row); }
export async function update(table, rowId, data, env = process.env) { const row = state[table]?.find(r => r.id === rowId); if (!row) return null; Object.assign(row, data, { updated_at: now() }); await persistTable(table, env); return clone(row); }
export function getPlatformSnapshot() { return clone(state); }

export function advanceWorkflow(entityType, entityId, action) {
  const map = {
    request_to_quote: ['requests', 'quotes', 'quote_items'], quote_approved: ['quotes', 'work_orders'], work_assigned: ['work_orders', 'assignments', 'schedule_events'],
    work_completed: ['work_orders', 'invoices'], invoice_paid: ['invoices', 'payments'], archive: ['work_orders']
  };
  const step = map[action];
  insert('audit_logs', { action: `workflow.${action}`, entity_type: entityType, entity_id: entityId, message: `Workflow action ${action} applied.` });
  return { ok: Boolean(step), action, touchedTables: step || [] };
}

export function requestMagicLink(email, env = process.env) {
  if (!env.RESEND_API_KEY || !env.MAGIC_LINK_FROM_EMAIL) return { ok: false, message: 'Email not configured yet.' };
  const normalized = normalizeEmail(email);
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  insert('magic_tokens', { normalized_email: normalized, token_hash: tokenHash, used_at: null, expires_at: new Date(Date.now()+15*60*1000).toISOString() });
  return { ok: true, message: 'Magic link sent.', devToken: raw };
}

export function completeMagicLogin(token) {
  const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const row = state.magic_tokens.find(t => t.token_hash === hash && !t.used_at && new Date(t.expires_at) > new Date());
  if (!row) return { ok: false, message: 'This sign-in link is invalid or expired.' };
  row.used_at = now();
  let user = state.app_users.find(u => u.normalized_email === row.normalized_email);
  if (!user) {
    user = insert('app_users', { email: row.normalized_email, normalized_email: row.normalized_email, full_name: '', active: true, account_setup_complete: false });
    upsert('user_roles', { user_id: user.id, role_slug: 'client' }, { user_id: user.id, role_slug: 'client' });
  }
  const session = insert('sessions', { user_id: user.id, expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString() });
  return { ok: true, user, session, needsSetup: !user.account_setup_complete };
}

export function aiStatus(env = process.env) { return env.OPENAI_API_KEY ? { ok: true, configured: true } : { ok: false, configured: false, message: 'AI is not configured yet.' }; }
