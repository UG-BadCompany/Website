import { clean, getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody } from './auth-utils.mjs';

const DEFAULT_MODULES = [
  ['admin.estimate-management-center','admin.quotes','admin','Estimate & Quote Center','Request intake, draft quotes, sent quotes awaiting client response, declined/cancelled quote history.',true,['quotes.manage'],[],'Estimate & Quote Center','💰','/dashboard/modules/admin/quotes',10],
  ['admin.photo-estimate','admin.photo-estimate','admin','AI Photo Estimate','AI-assisted image intake and estimating.',true,['ai.photo-estimate.use'],[],'AI Photo Estimate','📸','/dashboard/modules/admin/photo-estimate',20],
  ['worker.troubleshooting','worker.troubleshooting','worker','AI Troubleshooting','Diagnostic assistant for field troubleshooting.',true,[],[],'AI Troubleshooting','🤖','/dashboard/modules/worker/troubleshooting',30],
  ['admin.work-orders','admin.work-orders','admin','Work Orders','Accepted quotes converted into assignment, scheduling, progress, and completion review.',true,['requests.manage'],['admin.quotes'],'Work Orders','🔧','/dashboard/modules/admin/work-orders',40],
  ['admin.schedule','admin.schedule','admin','Schedule','Calendar and dispatch scheduling for work orders.',true,['scheduling.manage'],['admin.work-orders'],'Schedule','📅','/dashboard/modules/admin/schedule',50],
  ['admin.customers','admin.customers','admin','Customers','Customer/property records and request history.',true,['customers.manage'],[],'Customers','👥','/dashboard/modules/admin/customers',60],
  ['admin.invoices','admin.invoices','admin','Invoices','Invoice-ready work, sent invoices, Square payment links, payment verification, and voided/cancelled invoices.',true,['invoices.manage'],['admin.work-orders'],'Invoices','🧾','/dashboard/modules/admin/invoices',70],
  ['admin.inventory','admin.inventory','admin','Inventory','Inventory items, reservations, and usage reconciliation.',true,['inventory.manage'],[],'Inventory','📦','/dashboard/modules/admin/inventory',80],
  ['admin.finance','admin.finance','admin','Finance','Financial overview and payment status.',true,[],['admin.invoices'],'Finance','📊','/dashboard/modules/admin/finance',90],
  ['admin.reports','admin.reports','admin','Reports','Operational reporting and business metrics.',true,['reports.view'],[],'Reports','📈','/dashboard/modules/admin/reports',100],
  ['admin.users','admin.users','admin','Users / Company Management','Company users, roles, workers, and team access.',true,['users.manage'],[],'Users / Company Management','👥','/dashboard/modules/admin/users',110],
  ['admin.roles','admin.roles','admin','Workspace & Permissions','Workspace visibility and permission controls.',true,['roles.manage'],[],'Workspace & Permissions','🛡','/dashboard/modules/admin/roles',120],
  ['admin.brand-settings','admin.brand-settings','admin','Theme Manager','Brand and theme controls for dashboard surfaces.',true,['branding.manage'],[],'Theme Manager','🎨','/dashboard/modules/admin/brand-settings',130],
  ['admin.homepage-editor','admin.homepage-editor','admin','Homepage Editor','Public homepage content management.',true,['homepage.manage'],[],'Homepage Editor','🏠','/dashboard/modules/admin/homepage-editor',140],
  ['admin.module-manager','admin.module-manager','admin','Module Manager','Enable, disable, and review major drop-in dashboard modules only.',true,['settings.manage'],[],'Module Manager','🧩','/dashboard/modules/admin/module-manager',150],
  ['admin.maintenance-plans','admin.maintenance-plans','admin','Maintenance Plans','Recurring maintenance plan setup and customer plan tracking.',true,['maintenance.manage'],[],'Maintenance Plans','🛠️','/dashboard/modules/admin/maintenance-plans',160]
];

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};
const defaultModuleToObject = ([id, moduleKey, workspace, title, description, enabled, requiredPermissions, dependencies, navLabel, navIcon, modulePath, sortOrder]) => ({
  id, moduleKey, workspace, title, description, enabled, requiredPermissions, dependencies, navLabel, navIcon, modulePath, sortOrder, lastLoadedStatus: 'default', updatedAt: null,
});

const loadSession = async (db, token) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true
    limit 1`;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};
const loadRoleKeys = async (db, userId) => (await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${userId} order by roles.key`).map((r) => r.key);
const ensureRegistry = async (db) => {
  await db.sql`create table if not exists module_registry (id text primary key, role_key text, module_key text, workspace text, title text not null, description text, enabled boolean not null default true, permissions jsonb not null default '[]'::jsonb, required_permissions jsonb not null default '[]'::jsonb, dependencies jsonb not null default '[]'::jsonb, nav_label text, nav_icon text, module_path text, sort_order integer not null default 100, last_loaded_status text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`alter table module_registry add column if not exists role_key text`;
  await db.sql`alter table module_registry alter column role_key drop not null`;
  await db.sql`alter table module_registry add column if not exists module_key text`;
  await db.sql`alter table module_registry add column if not exists workspace text`;
  await db.sql`alter table module_registry add column if not exists description text`;
  await db.sql`alter table module_registry add column if not exists permissions jsonb not null default '[]'::jsonb`;
  await db.sql`alter table module_registry add column if not exists required_permissions jsonb not null default '[]'::jsonb`;
  await db.sql`alter table module_registry add column if not exists dependencies jsonb not null default '[]'::jsonb`;
  await db.sql`alter table module_registry add column if not exists nav_label text`;
  await db.sql`alter table module_registry add column if not exists nav_icon text`;
  await db.sql`alter table module_registry add column if not exists module_path text`;
  await db.sql`alter table module_registry add column if not exists sort_order integer not null default 100`;
  await db.sql`alter table module_registry add column if not exists last_loaded_status text`;
  await db.sql`update module_registry set workspace = coalesce(workspace, role_key, split_part(id, '.', 1)), module_key = coalesce(module_key, id), nav_label = coalesce(nav_label, title), role_key = coalesce(role_key, workspace, split_part(id, '.', 1)), updated_at = now()`;
  for (const module of DEFAULT_MODULES) {
    const [id, moduleKey, workspace, title, description, enabled, requiredPermissions, dependencies, navLabel, navIcon, modulePath, sortOrder] = module;
    await db.sql`
      insert into module_registry (id, role_key, module_key, workspace, title, description, enabled, permissions, required_permissions, dependencies, nav_label, nav_icon, module_path, sort_order, last_loaded_status)
      values (${id}, ${workspace}, ${moduleKey}, ${workspace}, ${title}, ${description}, ${enabled}, ${JSON.stringify(requiredPermissions)}::jsonb, ${JSON.stringify(requiredPermissions)}::jsonb, ${JSON.stringify(dependencies)}::jsonb, ${navLabel}, ${navIcon}, ${modulePath}, ${sortOrder}, 'registered')
      on conflict (id) do update set role_key = coalesce(module_registry.role_key, excluded.role_key), module_key = coalesce(module_registry.module_key, excluded.module_key), workspace = coalesce(module_registry.workspace, excluded.workspace), title = coalesce(module_registry.title, excluded.title), description = coalesce(module_registry.description, excluded.description), permissions = coalesce(module_registry.permissions, excluded.permissions), required_permissions = coalesce(module_registry.required_permissions, excluded.required_permissions), dependencies = coalesce(module_registry.dependencies, excluded.dependencies), nav_label = coalesce(module_registry.nav_label, excluded.nav_label), nav_icon = coalesce(module_registry.nav_icon, excluded.nav_icon), module_path = coalesce(module_registry.module_path, excluded.module_path), sort_order = coalesce(module_registry.sort_order, excluded.sort_order), updated_at = now()`;
  }
};
const mapModule = (row) => ({ id: row.id, moduleKey: row.module_key || row.id, workspace: row.workspace || row.role_key || 'admin', title: row.title, description: row.description || '', enabled: row.enabled !== false, requiredPermissions: parseJsonArray(row.required_permissions).length ? parseJsonArray(row.required_permissions) : parseJsonArray(row.permissions), dependencies: parseJsonArray(row.dependencies), navLabel: row.nav_label || row.title, navIcon: row.nav_icon || '', modulePath: row.module_path || '', sortOrder: row.sort_order ?? 100, lastLoadedStatus: row.last_loaded_status || (row.enabled === false ? 'disabled' : 'registered'), updatedAt: row.updated_at });
const authorize = async (request) => {
  const token = getSessionToken(request);
  if (!token) return { error: json(401, { ok:false, authenticated:false, message:'Sign in with an owner or admin account.' }) };
  const db = await loadDatabase();
  const session = await loadSession(db, token);
  if (!session) return { error: json(401, { ok:false, authenticated:false, message:'Session expired. Request a new magic link.' }) };
  const roleKeys = await loadRoleKeys(db, session.user_id);
  const assigned = await loadRolePermissionKeys(db, session.user_id, { logPrefix:'Failed to load module manager permissions; using role defaults' });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assigned);
  const canManage = roleKeys.includes('owner') || ((roleKeys.includes('admin') || roleKeys.includes('manager')) && permissionKeys.includes('settings.manage'));
  return { db, session, roleKeys, permissionKeys, canManage };
};

export default async (request) => {
  if (!['GET','PATCH'].includes(request.method)) return json(405, { ok:false, message:'Method not allowed.' });
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const { db, roleKeys, canManage } = auth;
    await ensureRegistry(db);
    if (request.method === 'PATCH') {
      if (!canManage) return json(403, { ok:false, authenticated:true, authorized:false, message:'Owner or admin settings permission required.' });
      const body = await parseJsonBody(request);
      if (!body) return json(400, { ok:false, message:'Request body must be valid JSON.' });
      const id = clean(body.id || body.moduleId, 140);
      if (!id) return json(422, { ok:false, field:'id', missing:['id'], message:'Missing required field: id.' });
      const workspace = clean(body.workspace, 40);
      const enabled = typeof body.enabled === 'boolean' ? body.enabled : null;
      if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return json(422, { ok:false, field:'enabled', message:'enabled must be true or false when provided.' });
      if (workspace && !['owner','admin','manager','worker','client'].includes(workspace)) return json(422, { ok:false, field:'workspace', message:'workspace must be owner, admin, manager, worker, or client.' });
      const [updated] = await db.sql`update module_registry set enabled = coalesce(${enabled}, enabled), workspace = coalesce(${workspace || null}, workspace), role_key = coalesce(${workspace || null}, role_key), last_loaded_status = case when ${enabled === false} then 'disabled' when ${enabled === true} then 'enabled' else last_loaded_status end, updated_at = now() where id = ${id} returning *`;
      if (!updated) return json(404, { ok:false, message:'Module not found.' });
      return json(200, { ok:true, module: mapModule(updated), message: `${updated.title} settings saved.` });
    }
    const allowedIds = DEFAULT_MODULES.map(([id]) => id);
    const rows = await db.sql`select * from module_registry where id = any(${allowedIds}) order by sort_order, title`;
    const modules = rows.length ? rows.map(mapModule) : DEFAULT_MODULES.map(defaultModuleToObject);
    return json(200, { ok:true, modules, defaulted: rows.length === 0, user:{ roles: roleKeys } });
  } catch (error) {
    console.error('Failed to manage modules', error);
    const details = error?.message || 'Unknown module registry error';
    const missingRelation = /relation .*module_registry|does not exist/i.test(details);
    return json(missingRelation ? 503 : 500, { ok:false, message:'Could not load module manager.', error:details, hint: missingRelation ? 'Run the latest module_registry migration or allow the function to create the table.' : 'Check module_registry columns and permissions.' });
  }
};

export const config = { path:'/api/admin/modules' };
