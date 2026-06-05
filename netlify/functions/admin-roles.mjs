import {
  ALL_PERMISSION_KEYS,
  clean,
  DEFAULT_ROLE_PERMISSIONS,
  canManageRoleKey,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  grantablePermissionKeys,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  normalizePermissionKeys,
  normalizeRoleKey,
  parseJsonBody,
  PORTAL_PERMISSIONS,
  roleRank,
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
    hasPermissions: Object.prototype.hasOwnProperty.call(body, 'permissions'),
    workspaceAccess: Array.isArray(body.workspaceAccess) ? body.workspaceAccess.map((workspace) => normalizeRoleKey(workspace)).filter(Boolean) : [],
  };
};

const mapRole = (role, permissions = []) => ({
  id: String(role.id || ''),
  key: clean(role.key, 80),
  name: clean(role.name, 120),
  description: clean(role.description || '', 500),
  isSystem: Boolean(role.is_system),
  permissions: role.key === 'owner' ? ALL_PERMISSION_KEYS : [...new Set(permissions)].sort(),
  createdAt: role.created_at ? String(role.created_at) : null,
  updatedAt: role.updated_at ? String(role.updated_at) : null,
  userCount: Number(role.user_count || 0),
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
  const grantablePermissions = grantablePermissionKeys(roleKeys, assignedPermissionKeys);

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
    assignedPermissionKeys,
    grantablePermissions,
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
      on conflict (role_id, permission_key) do update set enabled = excluded.enabled, updated_at = now()
    `;
  }
};

const loadRolesSafely = async (db) => {
  const roles = await db.sql`
    select roles.id, roles.key, roles.name, roles.description, coalesce(roles.is_system, false) as is_system, roles.created_at, roles.updated_at, count(distinct user_roles.user_id) as user_count
    from roles
    left join user_roles on user_roles.role_id = roles.id
    group by roles.id
    order by case
      when key = 'owner' then 0
      when key = 'admin' then 1
      when key = 'manager' then 2
      when key = 'worker' then 3
      when key = 'client' then 4
      else 5
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
      return mapRole(role, assignedPermissions);
    }),
    permissionWarning,
  };
};

export const createAdminRolesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
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
        permissions: PORTAL_PERMISSIONS.map((permission) => ({ ...permission, canGrant: adminSession.roleKeys.includes('owner') || adminSession.grantablePermissions.includes(permission.key) })),
        grantablePermissions: adminSession.grantablePermissions,
        roleHierarchy: { owner: 100, admin: 80, manager: 60, worker: 40, client: 20, guest: 10 },
        editorRoleKeys: adminSession.roleKeys,
        roles: roles.map((role) => ({ ...role, canEdit: canManageRoleKey(adminSession.roleKeys, role.key), canDelete: !role.isSystem && role.key !== 'owner' && canManageRoleKey(adminSession.roleKeys, role.key) })),
        warning: permissionWarning || '',
      });
    }


    if (request.method === 'DELETE') {
      const body = await parseJsonBody(request);
      const roleId = clean(body?.roleId || body?.id, 80);
      if (!roleId) return safeJson(422, { ok: false, message: 'Role ID is required.' });
      const [role] = await db.sql`select id, key, coalesce(is_system, false) as is_system from roles where id = ${roleId} limit 1`;
      if (!role) return safeJson(404, { ok: false, message: 'Role not found.' });
      if (role.key === 'owner' || role.is_system) return safeJson(409, { ok: false, message: 'System roles, including Owner, cannot be deleted.' });
      if (!canManageRoleKey(adminSession.roleKeys, role.key)) return safeJson(403, { ok: false, message: 'Only Owner can modify this role.' });
      const [used] = await db.sql`select count(*) from user_roles where role_id = ${roleId}`;
      if (Number(used?.count || 0) > 0) return safeJson(409, { ok: false, message: 'Role is assigned to users and cannot be deleted.' });
      await db.sql`delete from roles where id = ${roleId}`;
      return safeJson(200, { ok: true, deleted: true });
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

    const [targetRole] = request.method === 'PATCH'
      ? await db.sql`select id, key, coalesce(is_system, false) as is_system from roles where id = ${payload.roleId} limit 1`
      : [null];
    const targetKey = targetRole?.key || payload.key;
    if (targetKey === 'owner' && !adminSession.roleKeys.includes('owner')) return safeJson(403, { ok: false, message: 'Only Owner can modify this role.' });
    if (!canManageRoleKey(adminSession.roleKeys, targetKey)) return safeJson(403, { ok: false, message: 'Only Owner can modify this role.' });
    const requestedPermissions = payload.hasPermissions ? payload.permissions : (DEFAULT_ROLE_PERMISSIONS[targetKey] || []).filter((permission) => adminSession.roleKeys.includes('owner') || adminSession.grantablePermissions.includes(permission));
    const cannotGrant = requestedPermissions.filter((permission) => !adminSession.roleKeys.includes('owner') && !adminSession.grantablePermissions.includes(permission));
    if (cannotGrant.length) return safeJson(403, { ok: false, message: 'You cannot grant permissions you do not currently have.', blockedPermissions: cannotGrant });

    const effectivePermissions = requestedPermissions;

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
      effectivePermissions,
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
          permissions: effectivePermissions,
          workspaceAccess: payload.workspaceAccess,
        })}::jsonb
      )
    `;

    return safeJson(request.method === 'POST' ? 201 : 200, {
      ok: true,
      authenticated: true,
      authorized: true,
      role: mapRole(
        role,
        effectivePermissions,
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