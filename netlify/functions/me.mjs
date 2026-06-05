import {
  clean,
  createExpiredSessionCookie,
  createSessionCookie,
  getPermissionKeysForRoles,
  getSessionTokens,
  getSessionTtlMinutesForRoles,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  minutesFromNow,
  parseJsonBody,
} from './auth-utils.mjs';

const buildPermissions = (roles, assignedPermissionKeys = null, workspaceAccess = []) => {
  const permissionKeys = [...new Set([
    ...getPermissionKeysForRoles(roles, assignedPermissionKeys),
    ...workspaceAccess.map((workspace) => `dashboard.view.${workspace}`),
  ])].sort();
  const permissionSet = new Set(permissionKeys);
  const canViewAdminTools = permissionSet.has('admin.tools');
  const canViewWorkerTools = permissionSet.has('worker.tools');
  const canViewClientTools = permissionSet.has('client.tools');
  const canViewOwnerWorkspace = roles.includes('owner') || permissionSet.has('dashboard.view.owner');
  const canViewManagerWorkspace = roles.includes('manager') || permissionSet.has('dashboard.view.manager');
  const availableViews = [
    ...(canViewOwnerWorkspace ? ['owner'] : []),
    ...(canViewAdminTools || permissionSet.has('dashboard.view.admin') ? ['admin'] : []),
    ...(canViewManagerWorkspace ? ['manager'] : []),
    ...(canViewClientTools || permissionSet.has('dashboard.view.client') ? ['client'] : []),
    ...(canViewWorkerTools || permissionSet.has('dashboard.view.worker') ? ['worker'] : []),
  ];

  return {
    canViewClientTools,
    canViewWorkerTools,
    canViewAdminTools,
    canSwitchDashboardView: permissionSet.has('dashboard.switch_views'),
    canManageUsers: permissionSet.has('admin.users.manage'),
    canManageRoles: permissionSet.has('admin.roles.manage'),
    canManageRequests: permissionSet.has('admin.requests.manage'),
    canManageQuotes: permissionSet.has('admin.quotes.manage'),
    canViewInvoices: permissionSet.has('client.invoices.manage'),
    canManageInvoices: permissionSet.has('admin.invoices.manage'),
    canViewAdminActivity: permissionSet.has('admin.activity.view'),
    canManageInventory: permissionSet.has('admin.inventory.manage'),
    defaultView: canViewOwnerWorkspace ? 'owner' : (canViewAdminTools ? 'admin' : (canViewManagerWorkspace ? 'manager' : (canViewWorkerTools ? 'worker' : 'client'))),
    availableViews: availableViews.length ? availableViews : roles,
    permissionKeys,
  };
};


const normalizeProfilePayload = (body = {}) => ({
  fullName: clean(body.fullName || body.name, 140),
  phone: clean(body.phone, 60),
  secondaryPhone: clean(body.secondaryPhone, 60),
  companyName: clean(body.companyName, 160),
  mailingAddress: clean(body.mailingAddress, 500),
});

const isOptionalSessionCheck = (request) => (
  request.method === 'GET' && new URL(request.url).searchParams.get('optional') === '1'
);

const unauthenticatedSessionResponse = (message, status = 401, headers = {}) => json(status, {
  ok: status === 200,
  authenticated: false,
  message,
}, headers);


const isSessionUsable = (session) => {
  if (!session) return false;
  if (session.revoked_at) return false;
  if (session.is_active === false || session.is_active === null) return false;
  if (session.expires_at === null) return false;
  if (session.expires_at === undefined) return true;

  const expiresAt = new Date(session.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

const queryCurrentUserSession = async (db, sessionToken, { profileFieldSet = 'full' } = {}) => {
  if (profileFieldSet === 'minimal') {
    const [session] = await db.sql`
      select auth_sessions.id, auth_sessions.user_id, auth_sessions.expires_at, auth_sessions.revoked_at,
        app_users.email, app_users.full_name, app_users.account_setup_complete, app_users.is_active
      from auth_sessions
      left join app_users on app_users.id = auth_sessions.user_id
      where auth_sessions.session_hash = ${hashToken(sessionToken)}
      order by auth_sessions.created_at desc
      limit 1
    `;
    return session || null;
  }

  if (profileFieldSet === 'base') {
    const [session] = await db.sql`
      select auth_sessions.id, auth_sessions.user_id, auth_sessions.expires_at, auth_sessions.revoked_at,
        app_users.email, app_users.full_name, app_users.phone, app_users.account_setup_complete, app_users.is_active
      from auth_sessions
      left join app_users on app_users.id = auth_sessions.user_id
      where auth_sessions.session_hash = ${hashToken(sessionToken)}
      order by auth_sessions.created_at desc
      limit 1
    `;
    return session || null;
  }

  const [session] = await db.sql`
      select auth_sessions.id, auth_sessions.user_id, auth_sessions.expires_at, auth_sessions.revoked_at,
        app_users.email, app_users.full_name, app_users.phone,
        app_users.secondary_phone, app_users.company_name, app_users.mailing_address,
        app_users.account_setup_complete, app_users.is_active
      from auth_sessions
      left join app_users on app_users.id = auth_sessions.user_id
      where auth_sessions.session_hash = ${hashToken(sessionToken)}
      order by auth_sessions.created_at desc
      limit 1
    `;
  return session || null;
};

const loadCurrentUserSession = async (db, sessionTokens, { profileFieldSet = 'full' } = {}) => {
  const tokens = Array.isArray(sessionTokens) ? sessionTokens : [sessionTokens].filter(Boolean);
  let fallbackSession = null;
  let fallbackToken = tokens[0] || '';

  for (const sessionToken of tokens) {
    let session;

    try {
      session = await queryCurrentUserSession(db, sessionToken, { profileFieldSet });
    } catch (profileColumnError) {
      console.error('Failed to load optional profile columns during /api/me; retrying with base session fields', profileColumnError);
      try {
        session = await queryCurrentUserSession(db, sessionToken, { profileFieldSet: 'base' });
      } catch (baseProfileError) {
        console.error('Failed to load base profile columns during /api/me; retrying with debug-compatible session fields', baseProfileError);
        session = await queryCurrentUserSession(db, sessionToken, { profileFieldSet: 'minimal' });
      }
    }

    if (!session) continue;

    if (!fallbackSession) {
      fallbackSession = session;
      fallbackToken = sessionToken;
    }

    if (isSessionUsable(session)) {
      return { session, sessionToken };
    }
  }

  return { session: fallbackSession, sessionToken: fallbackToken };
};

const queryCurrentUserRoles = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  return roleKeys.length ? roleKeys : ['client'];
};

const loadCurrentUserRoles = async (db, userId, { logPrefix = 'Failed to load current user roles; retrying once before using client role' } = {}) => {
  try {
    return await queryCurrentUserRoles(db, userId);
  } catch (roleError) {
    console.error(logPrefix, roleError);
  }

  try {
    return await queryCurrentUserRoles(db, userId);
  } catch (retryError) {
    console.error('Failed to load current user roles after retry; using client role', retryError);
    return ['client'];
  }
};

const loadUserWorkspaceAccess = async (db, userId) => {
  try {
    const rows = await db.sql`
      select workspace_key
      from user_workspace_access
      where user_id = ${userId}
      order by workspace_key
    `;
    return rows.map((row) => clean(row.workspace_key, 80)).filter(Boolean);
  } catch (error) {
    console.error('Failed to load user workspace access; using role permissions only', error);
    return [];
  }
};

const loadCurrentUserFallback = async (db, sessionTokens) => {
  const { session, sessionToken } = await loadCurrentUserSession(db, sessionTokens);

  if (!isSessionUsable(session)) return null;

  return {
    session,
    sessionToken,
    roleKeys: await loadCurrentUserRoles(db, session.user_id, {
      logPrefix: 'Failed to load current user roles during /api/me fallback; using client role',
    }),
  };
};

const mapUser = (session, roleKeys, permissionKeys = null, workspaceAccess = []) => ({
  id: session.user_id,
  email: session.email,
  fullName: session.full_name,
  phone: session.phone,
  secondaryPhone: session.secondary_phone,
  companyName: session.company_name,
  mailingAddress: session.mailing_address,
  accountSetupComplete: session.account_setup_complete !== false,
  roles: roleKeys,
  workspaceAccess,
  permissions: buildPermissions(roleKeys, permissionKeys, workspaceAccess),
});

export const createMeHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const optionalSessionCheck = isOptionalSessionCheck(request);
  const sessionTokens = getSessionTokens(request);

  if (!sessionTokens.length) {
    return unauthenticatedSessionResponse(
      'Sign in with a magic link to access the dashboard.',
      optionalSessionCheck ? 200 : 401,
    );
  }

  let db;

  try {
    db = await getDatabase();
    const { session, sessionToken } = await loadCurrentUserSession(db, sessionTokens, {
      profileFieldSet: request.method === 'GET' ? 'minimal' : 'full',
    });

    if (!isSessionUsable(session)) {
      return unauthenticatedSessionResponse(
        'Your session expired. Request a new magic link.',
        optionalSessionCheck ? 200 : 401,
        optionalSessionCheck ? { 'set-cookie': createExpiredSessionCookie(request) } : {},
      );
    }

    const roleKeys = await loadCurrentUserRoles(db, session.user_id);
    const permissionKeys = await loadRolePermissionKeys(db, session.user_id, {
      logPrefix: 'Failed to load role permissions for current user; using role defaults',
    });
    const workspaceAccess = await loadUserWorkspaceAccess(db, session.user_id);

    if (request.method === 'PATCH') {
      const sessionTtlMinutes = getSessionTtlMinutesForRoles(roleKeys);
      const sessionCookie = createSessionCookie(sessionToken, request, sessionTtlMinutes);

      try {
        await db.sql`
          update auth_sessions
          set last_seen_at = now(),
              expires_at = ${minutesFromNow(sessionTtlMinutes)}::timestamptz
          where id = ${session.id}
        `;
      } catch (touchError) {
        console.error('Failed to refresh current session expiry before profile update; continuing with profile update', touchError);
      }

      const body = await parseJsonBody(request);

      if (!body) {
        return json(400, { ok: false, message: 'Request body must be valid JSON.' });
      }

      const payload = normalizeProfilePayload(body);
      const [updatedUser] = await db.sql`
        update app_users
        set full_name = ${payload.fullName || null},
            phone = ${payload.phone || null},
            secondary_phone = ${payload.secondaryPhone || null},
            company_name = ${payload.companyName || null},
            mailing_address = ${payload.mailingAddress || null},
            updated_at = now()
        where id = ${session.user_id}
        returning id as user_id, email, full_name, phone, secondary_phone, company_name, mailing_address
      `;

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'client_profile.updated'},
          ${'app_user'},
          ${session.user_id},
          ${JSON.stringify({ source: 'client_dashboard' })}::jsonb
        )
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        user: mapUser(updatedUser, roleKeys, permissionKeys, workspaceAccess),
      }, { 'set-cookie': sessionCookie });
    }

    return json(200, {
      ok: true,
      authenticated: true,
      user: mapUser(session, roleKeys, permissionKeys, workspaceAccess),
    });
  } catch (error) {
    console.error('Failed to load current user', error);

    if (request.method === 'GET' && db) {
      try {
        const fallback = await loadCurrentUserFallback(db, sessionTokens);

        if (fallback) {
          return json(200, {
            ok: true,
            authenticated: true,
            recovered: true,
            user: mapUser(fallback.session, fallback.roleKeys),
          });
        }
      } catch (fallbackError) {
        console.error('Failed to recover current user after /api/me error', fallbackError);
      }
    }

    return json(500, { ok: false, authenticated: false, message: 'We could not load your session right now.' });
  }
};

export default createMeHandler();

export const config = {
  path: '/api/me',
};
