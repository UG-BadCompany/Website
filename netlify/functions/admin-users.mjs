import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  normalizeRoleKey,
  validateEmail,
} from './auth-utils.mjs';

const normalizeRoles = (roles) => [...new Set((Array.isArray(roles) ? roles : [])
  .map((role) => normalizeRoleKey(role))
  .filter(Boolean))];

const normalizeUserPayload = (payload = {}) => ({
  userId: clean(payload.userId),
  email: clean(payload.email).toLowerCase(),
  fullName: clean(payload.fullName || payload.name, 140),
  phone: clean(payload.phone, 60),
  companyName: clean(payload.companyName, 160),
  roles: normalizeRoles(payload.roles?.length ? payload.roles : ['client']),
});

const loadAdminSession = async (db, request) => {
  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return { response: json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to manage users.' }) };
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
    return { response: json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' }) };
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
  const rolePermissions = await db.sql`
    select distinct role_permissions.permission_key
    from user_roles
    join roles on roles.id = user_roles.role_id
    join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
    where user_roles.user_id = ${session.user_id}
    order by role_permissions.permission_key
  `;
  const permissionKeys = getPermissionKeysForRoles(roleKeys, rolePermissions.map((permission) => permission.permission_key));

  if (!permissionKeys.includes('admin.users.manage')) {
    return { response: json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin user-management permission required to manage users.' }) };
  }

  return { session, roleKeys, permissionKeys };
};

const assignRoles = async (db, userId, roles) => {
  await db.sql`
    delete from user_roles
    where user_id = ${userId}
  `;

  await db.sql`
    insert into user_roles (user_id, role_id)
    select ${userId}, roles.id
    from roles
    where roles.key = any(${roles})
    on conflict do nothing
  `;
};

export const createAdminUsersHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const db = await getDatabase();
    const adminSession = await loadAdminSession(db, request);

    if (adminSession.response) {
      return adminSession.response;
    }

    if (request.method === 'GET') {
      const users = await db.sql`
        select app_users.id, app_users.email, app_users.full_name, app_users.phone, app_users.company_name, app_users.is_active, app_users.created_at,
               coalesce(array_agg(roles.key order by roles.key) filter (where roles.key is not null), '{}') as roles
        from app_users
        left join user_roles on user_roles.user_id = app_users.id
        left join roles on roles.id = user_roles.role_id
        group by app_users.id
        order by app_users.created_at desc
        limit 100
      `;
      const availableRoles = await db.sql`
        select roles.id, roles.key, roles.name, roles.description, coalesce(roles.is_system, false) as is_system,
               coalesce(array_agg(role_permissions.permission_key order by role_permissions.permission_key) filter (where role_permissions.enabled = true), '{}') as permissions
        from roles
        left join role_permissions on role_permissions.role_id = roles.id
        group by roles.id
        order by roles.name
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          companyName: user.company_name,
          isActive: user.is_active,
          roles: user.roles || [],
          createdAt: user.created_at,
        })),
        roles: availableRoles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: Boolean(role.is_system),
          permissions: getPermissionKeysForRoles([role.key], role.permissions || []),
        })),
      });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    }

    const payload = normalizeUserPayload(body);

    if (request.method === 'POST') {
      const emailError = validateEmail(payload.email);

      if (emailError) {
        return json(422, { ok: false, message: emailError });
      }
    }

    if (request.method === 'PATCH' && !payload.userId) {
      return json(422, { ok: false, message: 'userId is required to update roles.' });
    }

    if (payload.roles.length === 0) {
      return json(422, { ok: false, message: 'At least one valid role is required.' });
    }

    const [user] = request.method === 'POST'
      ? await db.sql`
          insert into app_users (auth_provider, auth_subject, email, full_name, phone, company_name)
          values ('magic_link', ${payload.email}, ${payload.email}, ${payload.fullName || null}, ${payload.phone || null}, ${payload.companyName || null})
          on conflict (email) do update set
            full_name = coalesce(nullif(app_users.full_name, ''), excluded.full_name),
            phone = coalesce(nullif(app_users.phone, ''), excluded.phone),
            company_name = coalesce(nullif(app_users.company_name, ''), excluded.company_name),
            is_active = true,
            updated_at = now()
          returning id, email, full_name, phone, company_name
        `
      : await db.sql`
          select id, email, full_name, phone, company_name
          from app_users
          where id = ${payload.userId}
          limit 1
        `;

    if (!user) {
      return json(404, { ok: false, message: 'User not found.' });
    }

    await assignRoles(db, user.id, payload.roles);

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${adminSession.session.user_id},
        ${request.method === 'POST' ? 'user.created_by_admin' : 'user.roles_updated'},
        'app_user',
        ${user.id},
        ${JSON.stringify({ roles: payload.roles, email: user.email })}::jsonb
      )
    `;

    return json(request.method === 'POST' ? 201 : 200, {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        companyName: user.company_name,
        roles: payload.roles,
      },
    });
  } catch (error) {
    console.error('Failed to manage admin user', error);

    return json(500, { ok: false, message: 'We could not save the user right now.' });
  }
};

export default createAdminUsersHandler();

export const config = {
  path: '/api/admin/users',
};
