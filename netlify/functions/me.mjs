import {
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const buildPermissions = (roles) => {
  const roleSet = new Set(roles);
  const isAdmin = roleSet.has('admin');

  return {
    canViewClientTools: isAdmin || roleSet.has('client'),
    canViewWorkerTools: isAdmin || roleSet.has('worker'),
    canViewAdminTools: isAdmin,
    canSwitchDashboardView: isAdmin,
    defaultView: isAdmin ? 'admin' : (roleSet.has('worker') ? 'worker' : 'client'),
    availableViews: isAdmin ? ['admin', 'client', 'worker'] : roles,
  };
};

export const createMeHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with a magic link to access the dashboard.' });
  }

  try {
    const db = await getDatabase();
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

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    await db.sql`
      update auth_sessions
      set last_seen_at = now()
      where id = ${session.id}
    `;

    const roles = await db.sql`
      select roles.key, roles.name
      from user_roles
      join roles on roles.id = user_roles.role_id
      where user_roles.user_id = ${session.user_id}
      order by roles.key
    `;

    const roleKeys = roles.map((role) => role.key);

    return json(200, {
      ok: true,
      authenticated: true,
      user: {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        roles: roleKeys,
        permissions: buildPermissions(roleKeys),
      },
    });
  } catch (error) {
    console.error('Failed to load current user', error);

    return json(500, { ok: false, authenticated: false, message: 'We could not load your session right now.' });
  }
};

export default createMeHandler();

export const config = {
  path: '/api/me',
};
