import {
  ALL_PERMISSION_KEYS,
  clean,
  DEFAULT_ROLE_PERMISSIONS,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  normalizePermissionKeys,
  normalizeRoleKey,
  parseJsonBody,
  PORTAL_PERMISSIONS,
} from './auth-utils.mjs';

const safeJson = (status, body) => json(status, body, {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
});

const normalizeRolePayload = (body = {}) => {
  const key = normalizeRoleKey(body.key || body.name);

  return {
    roleId: clean(body.roleId, 80),
    key,
    name: clean(body.name, 120),
    description: clean(body.description, 500),
    permissions: normalizePermissionKeys(body.permissions),
  };
};

const mapRole = (role, permissions = []) => ({
  id: String(role.id || ''),
  key: clean(role.key, 80),
  name: clean(role.name, 120),
  description: clean(role.description || '', 500),
  isSystem: Boolean(role.is_system),
  permissions: getPermissionKeysForRoles([role.key], permissions),
  createdAt: role.created_at ? String(role.created_at) : null,
  updatedAt: role.updated_at ? String(role.updated_at) : null,
});

const loadAdminSession = async (db, request) => {
  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return {
      response: safeJson(401, {
        ok: false,
        authenticated: false,
        message: 'Sign in with an admin account to manage roles.',
      }),
    };
  }

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
    return {
      response: safeJson(401, {
        ok: false,
        authenticated: false,
        message: 'Your session expired. Request a new magic link.',
      }),
    };
  }

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${session.user_id}
  `;

  const roleKeys = roles.map((role) => role.key);

  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, {
    logPrefix: 'Failed to load admin role permissions; using role defaults',
  });

  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);

  if (!permissionKeys.includes('admin.roles.manage')) {
    return {
      response: safeJson(403, {
        ok: false,
        authenticated: true,
        authorized: false,
        message: 'Admin role-management permission required to manage roles.',
      }),
    };
  }

  return {
    session,
    roleKeys,
    permissionKeys,
  };
};

const savePermissions = async (db, roleId, permissions) => {
  await db.sql`
    delete from role_permissions
    where role_id = ${roleId}
  `;

  if (permissions.length > 0) {
    await db.sql`
      insert into role_permissions (role_id, permission_key, enabled)
      select ${roleId}, unnest(${permissions}::text[]), true
      on conflict (role_id, permission_key) do update set enabled = excluded.enabled
    `;
  }
};

const loadRolesSafely = async (db) => {
  const roles = await db.sql`
    select id, key, name, description, coalesce(is_system, false) as is_system, created_at, updated_at
    from roles
    order by case
      when key = 'admin' then 0
      when key = 'worker' then 1
      when key = 'client' then 2
      else 3
    end, name
  `;

  let permissionsByRole = {};
  let permissionWarning = '';

  try {
    const rolePermissions = await db.sql`
      select roles.key as role_key, role_permissions.permission_key
      from roles
      left join role_permissions
        on role_permissions.role_id = roles.id
        and role_permissions.enabled = true
      order by roles.key, role_permissions.permission_key
    `;

    permissionsByRole = rolePermissions.reduce((acc, row) => {
      if (!acc[row.role_key]) acc[row.role_key] = [];
      if (row.permission_key) acc[row.role_key].push(row.permission_key);
      return acc;
    }, {});
  } catch (error) {
    console.error('Failed to load role_permissions; using default permissions', error);
    permissionWarning = 'Role permissions could not be fully loaded. Defaults were used where possible.';
  }

  return {
    roles: roles.map((role) => {
      const assignedPermissions = permissionsByRole[role.key] || DEFAULT_ROLE_PERMISSIONS[role.key] || [];
      return mapRole(role, role.key === 'admin' ? ALL_PERMISSION_KEYS : assignedPermissions);
    }),
    permissionWarning,
  };
};

export const createAdminRolesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return safeJson(405, {
      ok: false,
      message: 'Method not allowed.',
    });
  }

  try {
    const db = await getDatabase();
    const adminSession = await loadAdminSession(db, request);

    if (adminSession.response) {
      return adminSession.response;
    }

    if (request.method === 'GET') {
      const { roles, permissionWarning } = await loadRolesSafely(db);

      return safeJson(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        permissions: PORTAL_PERMISSIONS,
        roles,
        warning: permissionWarning || '',
      });
    }

    const body = await parseJsonBody(request);

    if (!body) {
      return safeJson(400, {
        ok: false,
        message: 'Request body must be valid JSON.',
      });
    }

    const payload = normalizeRolePayload(body);

    if (request.method === 'POST' && !payload.key) {
      return safeJson(422, {
        ok: false,
        message: 'Role key is required.',
      });
    }

    if (!payload.name) {
      return safeJson(422, {
        ok: false,
        message: 'Role name is required.',
      });
    }

    if (request.method === 'PATCH' && !payload.roleId) {
      return safeJson(422, {
        ok: false,
        message: 'Role ID is required.',
      });
    }

    const effectivePermissions = payload.key === 'admin'
      ? ALL_PERMISSION_KEYS
      : (payload.permissions.length ? payload.permissions : DEFAULT_ROLE_PERMISSIONS[payload.key] || []);

    const [role] = request.method === 'POST'
      ? await db.sql`
          insert into roles (key, name, description, is_system)
          values (${payload.key}, ${payload.name}, ${payload.description || null}, false)
          returning id, key, name, description, coalesce(is_system, false) as is_system, created_at, updated_at
        `
      : await db.sql`
          update roles
          set name = ${payload.name},
              description = ${payload.description || null},
              updated_at = now()
          where id = ${payload.roleId}
          returning id, key, name, description, coalesce(is_system, false) as is_system, created_at, updated_at
        `;

    if (!role) {
      return safeJson(404, {
        ok: false,
        authenticated: true,
        authorized: true,
        message: 'Role not found.',
      });
    }

    await savePermissions(
      db,
      role.id,
      role.key === 'admin' ? ALL_PERMISSION_KEYS : effectivePermissions,
    );

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${adminSession.session.user_id},
        ${request.method === 'POST' ? 'role.created_by_admin' : 'role.updated_by_admin'},
        'role',
        ${role.id},
        ${JSON.stringify({
          key: role.key,
          permissions: role.key === 'admin' ? ALL_PERMISSION_KEYS : effectivePermissions,
        })}::jsonb
      )
    `;

    return safeJson(request.method === 'POST' ? 201 : 200, {
      ok: true,
      authenticated: true,
      authorized: true,
      role: mapRole(
        role,
        role.key === 'admin' ? ALL_PERMISSION_KEYS : effectivePermissions,
      ),
    });
  } catch (error) {
    console.error('Failed to manage admin roles', error);

    return safeJson(500, {
      ok: false,
      message: 'We could not load or save roles right now.',
    });
  }
};

export default createAdminRolesHandler();

export const config = {
  path: '/api/admin/roles',
};