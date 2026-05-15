import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const clampLimit = (value) => {
  const parsed = Number(value || 25);

  if (!Number.isFinite(parsed)) return 25;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
};

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;

  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};

const mapEvent = (event) => ({
  id: event.id,
  eventType: event.event_type,
  entityType: event.entity_type,
  entityId: event.entity_id,
  metadata: parseMetadata(event.metadata),
  createdAt: event.created_at,
  actor: event.actor_user_id ? {
    id: event.actor_user_id,
    email: event.actor_email,
    fullName: event.actor_full_name,
  } : null,
});

const loadAdminSession = async (db, request) => {
  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return { response: json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to view activity.' }) };
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
    order by roles.key
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

  if (!permissionKeys.includes('admin.activity.view')) {
    return { response: json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin activity permission is required.' }) };
  }

  return { session, roleKeys, permissionKeys };
};

const listActivity = async (db, { limit, eventType, search }) => {
  const eventTypeFilter = eventType || null;
  const searchFilter = search ? `%${search}%` : null;
  const events = await db.sql`
    select
      audit_events.id,
      audit_events.actor_user_id,
      audit_events.event_type,
      audit_events.entity_type,
      audit_events.entity_id,
      audit_events.metadata,
      audit_events.created_at,
      actors.email as actor_email,
      actors.full_name as actor_full_name
    from audit_events
    left join app_users actors on actors.id = audit_events.actor_user_id
    where (${eventTypeFilter}::text is null or audit_events.event_type = ${eventTypeFilter})
      and (${searchFilter}::text is null
        or audit_events.event_type ilike ${searchFilter}
        or audit_events.entity_type ilike ${searchFilter}
        or actors.email ilike ${searchFilter}
        or actors.full_name ilike ${searchFilter})
    order by audit_events.created_at desc
    limit ${limit}
  `;

  return events.map(mapEvent);
};

export const createAdminActivityHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const db = await getDatabase();
    const adminSession = await loadAdminSession(db, request);

    if (adminSession.response) {
      return adminSession.response;
    }

    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const eventType = clean(url.searchParams.get('eventType'), 120);
    const search = clean(url.searchParams.get('search'), 120);

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: adminSession.session.user_id,
        email: adminSession.session.email,
        fullName: adminSession.session.full_name,
        roles: adminSession.roleKeys,
      },
      events: await listActivity(db, { limit, eventType, search }),
      filters: { limit, eventType, search },
    });
  } catch (error) {
    console.error('Failed to load admin activity', error);

    return json(500, { ok: false, message: 'We could not load activity right now.' });
  }
};

export default createAdminActivityHandler();

export const config = {
  path: '/api/admin/activity',
};
