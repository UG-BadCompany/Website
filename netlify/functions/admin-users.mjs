import {
  clean,
  canManageRoleKey,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  normalizeRoleKey,
  roleRank,
  validateEmail,
} from './auth-utils.mjs';

const safeJson = (status, body) => json(status, body, {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
});

const normalizeRoles = (roles) => [...new Set((Array.isArray(roles) ? roles : [])
  .map((role) => normalizeRoleKey(role))
  .filter(Boolean))];

const normalizeUserPayload = (payload = {}) => ({
  userId: clean(payload.userId),
  email: clean(payload.email).toLowerCase(),
  fullName: clean(payload.fullName || payload.name, 140),
  phone: clean(payload.phone, 60),
  secondaryPhone: clean(payload.secondaryPhone, 60),
  companyName: clean(payload.companyName, 160),
  mailingAddress: clean(payload.mailingAddress, 500),
  internalNotes: clean(payload.internalNotes, 2000),
  confirmation: clean(payload.confirmation, 80),
  isActive: payload.isActive === undefined ? null : Boolean(payload.isActive),
  workspaceAccess: Array.isArray(payload.workspaceAccess) ? payload.workspaceAccess.map((item) => clean(item, 120)).filter(Boolean) : [],
  currentRoles: normalizeRoles(payload.currentRoles || []),
  roles: normalizeRoles(payload.roles?.length ? payload.roles : ['client']),
});

const mapUser = (user) => ({
  id: String(user.id || ''),
  email: clean(user.email, 254),
  fullName: clean(user.full_name || '', 140),
  phone: clean(user.phone || '', 60),
  secondaryPhone: clean(user.secondary_phone || '', 60),
  companyName: clean(user.company_name || '', 160),
  mailingAddress: clean(user.mailing_address || '', 500),
  internalNotes: clean(user.internal_notes || '', 2000),
  isActive: user.is_active !== false,
  roles: Array.isArray(user.roles) ? user.roles.map((role) => clean(role, 80)).filter(Boolean) : [],
  properties: Array.isArray(user.properties) ? user.properties.map((property) => ({
    id: String(property.id || ''),
    label: clean(property.label || '', 160),
    street: clean(property.street || '', 220),
    city: clean(property.city || '', 120),
    state: clean(property.state || '', 40),
    postalCode: clean(property.postalCode || property.postal_code || '', 40),
    accessNotes: clean(property.accessNotes || property.access_notes || '', 500),
  })) : [],
  createdAt: user.created_at ? String(user.created_at) : null,
});

const mapRole = (role) => ({
  id: String(role.id || ''),
  key: clean(role.key, 80),
  name: clean(role.name, 120),
  description: clean(role.description || '', 500),
  isSystem: Boolean(role.is_system),
  permissions: getPermissionKeysForRoles(
    [role.key],
    Array.isArray(role.permissions) ? role.permissions : [],
  ),
});

const loadAdminSession = async (db, request) => {
  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return {
      response: safeJson(401, {
        ok: false,
        authenticated: false,
        message: 'Sign in with an admin account to manage users.',
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
    logPrefix: 'Failed to load admin user permissions; using role defaults',
  });

  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);

  if (!permissionKeys.includes('admin.users.manage')) {
    return {
      response: safeJson(403, {
        ok: false,
        authenticated: true,
        authorized: false,
        message: 'Admin user-management permission required to manage users.',
      }),
    };
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

const loadUsersSafely = async (db) => {
  const users = await db.sql`
    select app_users.id,
           app_users.email,
           app_users.full_name,
           app_users.phone,
           app_users.secondary_phone,
           app_users.company_name,
           app_users.mailing_address,
           app_users.internal_notes,
           app_users.is_active,
           app_users.created_at,
           coalesce(array_agg(distinct roles.key order by roles.key) filter (where roles.key is not null), '{}') as roles,
           coalesce(jsonb_agg(distinct jsonb_build_object(
             'id', properties.id,
             'label', properties.label,
             'street', properties.street,
             'city', properties.city,
             'state', properties.state,
             'postalCode', properties.postal_code,
             'accessNotes', properties.access_notes
           )) filter (where properties.id is not null), '[]'::jsonb) as properties
    from app_users
    left join user_roles on user_roles.user_id = app_users.id
    left join roles on roles.id = user_roles.role_id
    left join properties on properties.client_id = app_users.id
    group by app_users.id
    order by app_users.created_at desc
    limit 100
  `;

  return users.map(mapUser);
};

const loadRolesSafely = async (db, adminSession = { roleKeys: [] }) => {
  try {
    const availableRoles = await db.sql`
      select roles.id,
             roles.key,
             roles.name,
             roles.description,
             coalesce(roles.is_system, false) as is_system,
             coalesce(array_agg(role_permissions.permission_key order by role_permissions.permission_key) filter (where role_permissions.enabled = true), '{}') as permissions
      from roles
      left join role_permissions on role_permissions.role_id = roles.id
      group by roles.id
      order by roles.name
    `;

    return {
      roles: availableRoles.map((role) => ({ ...mapRole(role), canAssign: canManageRoleKey(adminSession.roleKeys, role.key), rank: roleRank(role.key) })),
      warning: '',
    };
  } catch (error) {
    console.error('Failed to load available roles for admin users', error);

    const fallbackRoles = await db.sql`
      select id, key, name, description, coalesce(is_system, false) as is_system
      from roles
      order by name
    `;

    return {
      roles: fallbackRoles.map((role) => ({ ...mapRole({ ...role, permissions: [] }), canAssign: canManageRoleKey(adminSession.roleKeys, role.key), rank: roleRank(role.key) })),
      warning: 'Role permissions could not be fully loaded. User editing can continue with limited role details.',
    };
  }
};

export const createAdminUsersHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
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
      const [users, roleResult] = await Promise.all([
        loadUsersSafely(db),
        loadRolesSafely(db, adminSession),
      ]);

      return safeJson(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        users,
        roles: roleResult.roles,
        warning: roleResult.warning || '',
      });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return safeJson(400, {
        ok: false,
        message: 'Request body must be valid JSON.',
      });
    }

    const payload = normalizeUserPayload(body);

    if (request.method === 'DELETE') {
      if (!payload.userId) {
        return safeJson(422, {
          ok: false,
          message: 'userId is required to delete a user.',
        });
      }

      if (payload.confirmation !== 'DELETE') {
        return safeJson(422, {
          ok: false,
          message: 'Type DELETE to delete this user.',
        });
      }

      if (payload.currentRoles.includes('owner')) {
        const ownerRoles = await db.sql`select app_users.id from app_users join user_roles on user_roles.user_id=app_users.id join roles on roles.id=user_roles.role_id where roles.key='owner' and app_users.is_active=true`;
        if (!adminSession.roleKeys.includes('owner')) return safeJson(403, { ok: false, message: 'Only Owner can modify this role.' });
        if (ownerRoles.length === 1 && String(ownerRoles[0].id) === String(payload.userId)) return safeJson(409, { ok: false, message: 'The final Owner account cannot be deactivated.' });
      }

      const [deletedUser] = await db.sql`
        update app_users
        set is_active = false,
            updated_at = now()
        where id = ${payload.userId}
        returning id, email, full_name, phone, secondary_phone, company_name, mailing_address, internal_notes, is_active
      `;

      if (!deletedUser) {
        return safeJson(404, {
          ok: false,
          message: 'User not found.',
        });
      }

      await db.sql`
        update auth_sessions
        set revoked_at = now()
        where user_id = ${deletedUser.id}
          and revoked_at is null
      `;

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${adminSession.session.user_id},
          ${'user.deactivated_by_admin'},
          'app_user',
          ${deletedUser.id},
          ${JSON.stringify({ email: deletedUser.email })}::jsonb
        )
      `;

      return safeJson(200, {
        ok: true,
        deleted: true,
        user: {
          id: String(deletedUser.id || ''),
          email: deletedUser.email,
          fullName: deletedUser.full_name,
          phone: deletedUser.phone,
          secondaryPhone: deletedUser.secondary_phone,
          companyName: deletedUser.company_name,
          mailingAddress: deletedUser.mailing_address,
          internalNotes: deletedUser.internal_notes,
          isActive: deletedUser.is_active,
        },
      });
    }

    if (request.method === 'POST') {
      const emailError = validateEmail(payload.email);

      if (emailError) {
        return safeJson(422, {
          ok: false,
          message: emailError,
        });
      }
    }

    if (request.method === 'PATCH' && !payload.userId) {
      return safeJson(422, {
        ok: false,
        message: 'userId is required to update roles.',
      });
    }

    if (request.method === 'PATCH' && payload.userId && payload.currentRoles.includes('owner') && !payload.roles.includes('owner')) {
      const ownerRoles = await db.sql`select app_users.id from app_users join user_roles on user_roles.user_id=app_users.id join roles on roles.id=user_roles.role_id where roles.key='owner' and app_users.is_active=true`;
      if (!adminSession.roleKeys.includes('owner')) return safeJson(403, { ok: false, message: 'Only Owner can modify this role.' });
      if (ownerRoles.length === 1 && String(ownerRoles[0].id) === String(payload.userId)) return safeJson(409, { ok: false, message: 'The final Owner account cannot lose the Owner role.' });
    }

    if (payload.roles.length === 0) {
      return safeJson(422, {
        ok: false,
        message: 'At least one valid role is required.',
      });
    }

    if (request.method === 'PATCH' && String(payload.userId) === String(adminSession.session.user_id) && !adminSession.roleKeys.includes('owner')) {
      return safeJson(403, { ok: false, message: 'Users cannot escalate themselves.' });
    }

    const requestedRoleKeys = payload.roles;
    const blockedRoles = requestedRoleKeys.filter((roleKey) => !adminSession.roleKeys.includes(roleKey) && !canManageRoleKey(adminSession.roleKeys, roleKey));
    if (blockedRoles.length) {
      return safeJson(403, { ok: false, message: blockedRoles.includes('owner') ? 'Only Owner can modify this role.' : 'You can only assign roles below your authority level.', blockedRoles });
    }

    const [user] = request.method === 'POST'
      ? await db.sql`
          insert into app_users (auth_provider, auth_subject, email, full_name, phone, secondary_phone, company_name, mailing_address, internal_notes)
          values ('magic_link', ${payload.email}, ${payload.email}, ${payload.fullName || null}, ${payload.phone || null}, ${payload.secondaryPhone || null}, ${payload.companyName || null}, ${payload.mailingAddress || null}, ${payload.internalNotes || null})
          on conflict (email) do update set
            full_name = coalesce(nullif(excluded.full_name, ''), app_users.full_name),
            phone = coalesce(nullif(excluded.phone, ''), app_users.phone),
            secondary_phone = coalesce(nullif(excluded.secondary_phone, ''), app_users.secondary_phone),
            company_name = coalesce(nullif(excluded.company_name, ''), app_users.company_name),
            mailing_address = coalesce(nullif(excluded.mailing_address, ''), app_users.mailing_address),
            internal_notes = coalesce(nullif(excluded.internal_notes, ''), app_users.internal_notes),
            is_active = true,
            updated_at = now()
          returning id, email, full_name, phone, secondary_phone, company_name, mailing_address, internal_notes, is_active
        `
      : await db.sql`
          update app_users
          set full_name = ${payload.fullName || null},
              is_active = coalesce(${payload.isActive}, app_users.is_active),
              phone = ${payload.phone || null},
              secondary_phone = ${payload.secondaryPhone || null},
              company_name = ${payload.companyName || null},
              mailing_address = ${payload.mailingAddress || null},
              internal_notes = ${payload.internalNotes || null},
              updated_at = now()
          where id = ${payload.userId}
          returning id, email, full_name, phone, secondary_phone, company_name, mailing_address, internal_notes, is_active
        `;

    if (!user) {
      return safeJson(404, {
        ok: false,
        message: 'User not found.',
      });
    }

    await assignRoles(db, user.id, payload.roles);

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${adminSession.session.user_id},
        ${request.method === 'POST' ? 'user.created_by_admin' : 'user.roles_updated'},
        'app_user',
        ${user.id},
        ${JSON.stringify({
          roles: payload.roles,
          email: user.email,
          updatedProfile: true,
          isActive: payload.isActive,
          workspaceAccess: payload.workspaceAccess,
        })}::jsonb
      )
    `;

    return safeJson(request.method === 'POST' ? 201 : 200, {
      ok: true,
      user: {
        id: String(user.id || ''),
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        secondaryPhone: user.secondary_phone,
        companyName: user.company_name,
        mailingAddress: user.mailing_address,
        internalNotes: user.internal_notes,
        isActive: user.is_active,
        roles: payload.roles,
      },
    });
  } catch (error) {
    console.error('Failed to manage admin user', error);

    return safeJson(500, {
      ok: false,
      message: 'We could not load or save users right now.',
    });
  }
};

export default createAdminUsersHandler();

export const config = {
  path: '/api/admin/users',
};