import { getPermissionKeysForRoles, getSessionToken, grantablePermissionKeys, hashToken, json, loadDatabase, loadRolePermissionKeys, PORTAL_PERMISSIONS } from './auth-utils.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  const token = getSessionToken(request);
  if (!token) return json(401, { ok: false, authenticated: false, message: 'Sign in required.' });
  const db = await loadDatabase();
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(token)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
  const roles = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id}`;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load grantable permissions' });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
  const grantable = grantablePermissionKeys(roleKeys, assignedPermissionKeys);
  if (!permissionKeys.includes('admin.roles.manage') && !permissionKeys.includes('permissions.manage')) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Permission management access is required.' });
  return json(200, { ok: true, permissions: PORTAL_PERMISSIONS.map((permission) => ({ ...permission, canGrant: roleKeys.includes('owner') || grantable.includes(permission.key) })), grantablePermissions: grantable });
};
