import { clean, getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody } from './auth-utils.mjs';

const DEFAULT_MODULES = [
  ['admin.photo-estimate','photo-estimate','admin','AI Photo Estimate','AI-assisted image intake and estimating.',true,['ai.photo-estimate.use'],[],'AI Photo Estimate','📸','/dashboard/modules/admin/photo-estimate',20],
  ['admin.quotes','estimate-management-center','admin','Estimate & Quote Center','Quote review, approval, and customer quote workflow.',true,['quotes.manage'],[],'Estimate & Quote Center','💰','/dashboard/modules/admin/quotes',30],
  ['admin.work-orders','work-orders','admin','Work Orders','Assignment, production, completion review, and closeout.',true,['requests.manage'],['admin.quotes'],'Work Orders','🔧','/dashboard/modules/admin/work-orders',40],
  ['admin.inventory','inventory','admin','Inventory','Inventory items, reservations, and usage reconciliation.',true,['inventory.manage'],[],'Inventory','📦','/dashboard/modules/admin/inventory',50],
  ['admin.invoices','invoices','admin','Invoices','Invoice creation, payment tracking, and closeout.',true,['invoices.manage'],['admin.work-orders'],'Invoices','🧾','/dashboard/modules/admin/invoices',60],
  ['worker.troubleshooting','troubleshooting','worker','AI Troubleshooting','Worker troubleshooting assistant and diagnostic tools.',true,['ai.troubleshooting.use'],[],'Troubleshooting','🤖','/dashboard/modules/worker/troubleshooting',70],
  ['admin.customers','customers','admin','Customers','Customer/property records and request history.',true,['customers.manage'],[],'Customers','👥','/dashboard/modules/admin/customers',80],
  ['admin.reports','reports','admin','Reports','Operational reporting and business metrics.',true,['reports.view'],[],'Reports','📈','/dashboard/modules/admin/reports',90],
  ['admin.homepage-editor','homepage-editor','admin','Homepage Editor','Public homepage content management.',true,['homepage.manage'],[],'Homepage Editor','🏠','/dashboard/modules/admin/homepage-editor',100],
  ['admin.brand-settings','theme-manager','admin','Theme Manager','Brand and theme controls for the dashboard and public site.',true,['branding.manage'],[],'Theme Manager','🎨','/dashboard/modules/admin/brand-settings',110],
  ['admin.maintenance-plans','maintenance-plans','admin','Maintenance Plans','Recurring maintenance plan management.',true,['requests.manage'],[],'Maintenance Plans','🛠','/dashboard/modules/admin/maintenance-plans',120],
  ['admin.module-manager','module-manager','admin','Module Manager','Enable or disable drop-in modules by workspace.',true,['settings.manage'],[],'Module Manager','🧩','/dashboard/modules/admin/module-manager',10]
];

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
  await db.sql`create table if not exists module_registry (id text primary key, module_key text, workspace text, title text not null, description text, enabled boolean not null default true, required_permissions jsonb not null default '[]'::jsonb, dependencies jsonb not null default '[]'::jsonb, nav_label text, nav_icon text, module_path text, sort_order integer not null default 100, last_loaded_status text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`alter table module_registry add column if not exists module_key text`;
  await db.sql`alter table module_registry add column if not exists workspace text`;
  await db.sql`alter table module_registry add column if not exists description text`;
  await db.sql`alter table module_registry add column if not exists required_permissions jsonb not null default '[]'::jsonb`;
  await db.sql`alter table module_registry add column if not exists dependencies jsonb not null default '[]'::jsonb`;
  await db.sql`alter table module_registry add column if not exists nav_icon text`;
  await db.sql`alter table module_registry add column if not exists module_path text`;
  await db.sql`alter table module_registry add column if not exists sort_order integer not null default 100`;
  await db.sql`alter table module_registry add column if not exists last_loaded_status text`;
  for (const module of DEFAULT_MODULES) {
    const [id, moduleKey, workspace, title, description, enabled, requiredPermissions, dependencies, navLabel, navIcon, modulePath, sortOrder] = module;
    await db.sql`
      insert into module_registry (id, module_key, workspace, title, description, enabled, required_permissions, dependencies, nav_label, nav_icon, module_path, sort_order, last_loaded_status)
      values (${id}, ${moduleKey}, ${workspace}, ${title}, ${description}, ${enabled}, ${JSON.stringify(requiredPermissions)}::jsonb, ${JSON.stringify(dependencies)}::jsonb, ${navLabel}, ${navIcon}, ${modulePath}, ${sortOrder}, 'registered')
      on conflict (id) do update set module_key = coalesce(module_registry.module_key, excluded.module_key), workspace = coalesce(module_registry.workspace, excluded.workspace), description = coalesce(module_registry.description, excluded.description), required_permissions = coalesce(module_registry.required_permissions, excluded.required_permissions), dependencies = coalesce(module_registry.dependencies, excluded.dependencies), nav_label = coalesce(module_registry.nav_label, excluded.nav_label), nav_icon = coalesce(module_registry.nav_icon, excluded.nav_icon), module_path = coalesce(module_registry.module_path, excluded.module_path), sort_order = coalesce(module_registry.sort_order, excluded.sort_order), updated_at = now()`;
  }
};
const mapModule = (row) => ({ id: row.id, moduleKey: row.module_key || row.id, workspace: row.workspace || row.role_key || 'admin', title: row.title, description: row.description || '', enabled: row.enabled !== false, requiredPermissions: Array.isArray(row.required_permissions) ? row.required_permissions : (Array.isArray(row.permissions) ? row.permissions : []), dependencies: Array.isArray(row.dependencies) ? row.dependencies : [], navLabel: row.nav_label || row.title, navIcon: row.nav_icon || '', modulePath: row.module_path || '', sortOrder: row.sort_order ?? 100, lastLoadedStatus: row.last_loaded_status || 'registered', updatedAt: row.updated_at });
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
      if (typeof body.enabled !== 'boolean') return json(422, { ok:false, field:'enabled', missing:['enabled'], message:'Missing required field: enabled must be true or false.' });
      const [updated] = await db.sql`update module_registry set enabled = ${body.enabled}, last_loaded_status = ${body.enabled ? 'enabled' : 'disabled'}, updated_at = now() where id = ${id} returning *`;
      if (!updated) return json(404, { ok:false, message:'Module not found.' });
      return json(200, { ok:true, module: mapModule(updated), message: `${updated.title} ${body.enabled ? 'enabled' : 'disabled'}.` });
    }
    const rows = await db.sql`select * from module_registry order by workspace, sort_order, title`;
    return json(200, { ok:true, modules: rows.map(mapModule), user:{ roles: roleKeys } });
  } catch (error) {
    console.error('Failed to manage modules', error);
    return json(500, { ok:false, message:'Could not load module manager right now.' });
  }
};

export const config = { path:'/api/admin/modules' };
