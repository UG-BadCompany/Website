import {
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const ACTIVE_REQUEST_STATUSES = new Set(['new', 'needs_review', 'quote_in_progress', 'quote_sent', 'accepted', 'scheduled', 'in_progress']);

const mapJobRequest = (request) => ({
  id: request.id,
  status: request.status,
  city: request.city,
  streetAddress: request.street_address,
  serviceType: request.service_type,
  preferredTimeframe: request.preferred_timeframe,
  description: request.description,
  createdAt: request.created_at,
});

const countActiveRequests = (requests) => requests.filter((request) => ACTIVE_REQUEST_STATUSES.has(request.status)).length;

export const createClientJobRequestsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to view your job requests.' });
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

    if (!roleKeys.includes('client') && !roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client role required to view client job requests.' });
    }

    const jobRequests = await db.sql`
      select id, status, city, street_address, service_type, preferred_timeframe, description, created_at
      from job_requests
      where client_id = ${session.user_id}
      order by created_at desc
      limit 25
    `;
    const mappedRequests = jobRequests.map(mapJobRequest);

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
      requests: mappedRequests,
      summary: {
        total: mappedRequests.length,
        active: countActiveRequests(mappedRequests),
      },
    });
  } catch (error) {
    console.error('Failed to load client job requests', error);

    return json(500, { ok: false, message: 'We could not load your job requests right now.' });
  }
};

export default createClientJobRequestsHandler();

export const config = {
  path: '/api/client/job-requests',
};
