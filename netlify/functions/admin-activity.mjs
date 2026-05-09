import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const DEFAULT_ACTIVITY_LIMIT = 50;
const MAX_ACTIVITY_LIMIT = 100;
const ACTIVITY_TYPE_FILTERS = new Set(['', 'job', 'quote', 'payment', 'user']);

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getActivityFilters = (request) => {
  const url = new URL(request.url);
  const limit = Math.min(parsePositiveInteger(url.searchParams.get('limit'), DEFAULT_ACTIVITY_LIMIT), MAX_ACTIVITY_LIMIT);
  const page = parsePositiveInteger(url.searchParams.get('page'), 1);
  const type = clean(url.searchParams.get('type'), 20).toLowerCase();
  const search = clean(url.searchParams.get('q'), 120).toLowerCase();

  return {
    limit,
    page,
    offset: (page - 1) * limit,
    type: ACTIVITY_TYPE_FILTERS.has(type) ? type : '',
    search,
    searchPattern: search ? `%${search}%` : '',
  };
};

const mapActivity = (event) => ({
  id: event.id,
  eventType: event.event_type,
  entityType: event.entity_type,
  entityId: event.entity_id,
  metadata: event.metadata || {},
  createdAt: event.created_at,
  actor: event.actor_user_id ? {
    id: event.actor_user_id,
    fullName: event.actor_full_name,
    email: event.actor_email,
  } : null,
});

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

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  return session;
};

const loadPermissions = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);

  const rolePermissions = await db.sql`
    select distinct role_permissions.permission_key
    from user_roles
    join roles on roles.id = user_roles.role_id
    join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
    where user_roles.user_id = ${userId}
    order by role_permissions.permission_key
  `;

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, rolePermissions.map((permission) => permission.permission_key)),
  };
};

const listAdminActivity = async (db, { limit, offset, type = '', search = '', searchPattern = '' }) => {
  const fetchLimit = limit + 1;
  const events = await db.sql`
    select
      audit_events.id,
      audit_events.actor_user_id,
      audit_events.event_type,
      audit_events.entity_type,
      audit_events.entity_id,
      audit_events.metadata,
      audit_events.created_at,
      actors.full_name as actor_full_name,
      actors.email as actor_email
    from audit_events
    left join app_users actors on actors.id = audit_events.actor_user_id
    where (
        ${type} = ${''}
        or (${type} = ${'quote'} and (audit_events.event_type ilike ${'%quote%'} or audit_events.entity_type = ${'quote'}))
        or (${type} = ${'payment'} and (audit_events.event_type ilike ${'%payment%'} or audit_events.event_type ilike ${'%invoice%'} or audit_events.entity_type in (${'invoice'}, ${'payment'})))
        or (${type} = ${'user'} and (audit_events.event_type ilike ${'%user%'} or audit_events.event_type ilike ${'%role%'} or audit_events.entity_type in (${'user'}, ${'role'})))
        or (${type} = ${'job'} and (audit_events.event_type ilike ${'%job%'} or audit_events.event_type ilike ${'%request%'} or audit_events.event_type ilike ${'%worker_assignment%'} or audit_events.entity_type in (${'job_request'}, ${'worker_assignment'})))
      )
      and (
        ${search} = ${''}
        or lower(coalesce(audit_events.event_type, '')) like ${searchPattern}
        or lower(coalesce(audit_events.entity_type, '')) like ${searchPattern}
        or lower(coalesce(audit_events.entity_id::text, '')) like ${searchPattern}
        or lower(coalesce(actors.full_name, '')) like ${searchPattern}
        or lower(coalesce(actors.email, '')) like ${searchPattern}
        or lower(coalesce(audit_events.metadata::text, '')) like ${searchPattern}
      )
    order by audit_events.created_at desc
    limit ${fetchLimit}
    offset ${offset}
  `;

  return {
    events: events.slice(0, limit).map(mapActivity),
    hasNextPage: events.length > limit,
  };
};

export const createAdminActivityHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to view activity.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const { roleKeys, permissionKeys } = await loadPermissions(db, session.user_id);

    if (!permissionKeys.includes('admin.activity.view')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin activity permission required to view activity.' });
    }

    const filters = getActivityFilters(request);
    const activity = await listAdminActivity(db, filters);

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        roles: roleKeys,
      },
      events: activity.events,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        hasNextPage: activity.hasNextPage,
        type: filters.type,
        search: filters.search,
      },
    });
  } catch (error) {
    console.error('Failed to load admin activity', error);
    return json(500, { ok: false, message: 'We could not load admin activity right now.' });
  }
};

export default createAdminActivityHandler();

export const config = {
  path: '/api/admin/activity',
};
