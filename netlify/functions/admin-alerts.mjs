import {
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const loadSession = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load admin alerts permissions; using role defaults',
  });
  return getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
};

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });
    const permissionKeys = await loadAccess(db, session.user_id);
    if (!permissionKeys.includes('admin.activity.view') && !permissionKeys.includes('admin.inventory.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin alert access is required.' });
    }

    const [lowStock] = await db.sql`
      select count(*)::int as count
      from inventory_items
      where is_active = true
        and quantity_on_hand <= reorder_point
    `;
    const [pendingReview] = await db.sql`
      select count(*)::int as count
      from job_requests
      where status = 'pending_review'
    `;
    const [unpaidInvoices] = await db.sql`
      select count(*)::int as count
      from invoices
      where status = 'open'
    `;

    const lowStockItems = await db.sql`
      select id, name, unit, quantity_on_hand, reorder_point
      from inventory_items
      where is_active = true
        and quantity_on_hand <= reorder_point
      order by quantity_on_hand asc, name
      limit 10
    `;

    return json(200, {
      ok: true,
      summary: {
        lowStock: Number(lowStock?.count || 0),
        pendingReview: Number(pendingReview?.count || 0),
        unpaidInvoices: Number(unpaidInvoices?.count || 0),
      },
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit || 'each',
        quantityOnHand: Number(item.quantity_on_hand || 0),
        reorderPoint: Number(item.reorder_point || 0),
      })),
    });
  } catch (error) {
    console.error('Failed to load admin alerts', error);
    return json(500, { ok: false, message: 'We could not load alerts right now.' });
  }
};

export const config = { path: '/api/admin/alerts' };
