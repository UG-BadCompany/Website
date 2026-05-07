import {
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const ACTIVE_REQUEST_STATUSES = new Set(['new', 'needs_review', 'quote_in_progress', 'quote_sent', 'accepted', 'scheduled', 'in_progress']);

const mapProperty = (property) => ({
  id: property.id,
  label: property.label,
  street: property.street,
  city: property.city,
  state: property.state,
  postalCode: property.postal_code,
  accessNotes: property.access_notes,
  requestCount: property.request_count ?? 0,
  lastRequestAt: property.last_request_at,
  createdAt: property.created_at,
  updatedAt: property.updated_at,
});

const mapJobRequest = (request) => ({
  id: request.id,
  status: request.status,
  city: request.city,
  streetAddress: request.street_address,
  serviceType: request.service_type,
  preferredTimeframe: request.preferred_timeframe,
  description: request.description,
  createdAt: request.created_at,
  property: request.property_id ? {
    id: request.property_id,
    label: request.property_label,
    street: request.property_street,
    city: request.property_city,
    state: request.property_state,
    postalCode: request.property_postal_code,
    accessNotes: request.property_access_notes,
  } : null,
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
      select
        job_requests.id,
        job_requests.status,
        job_requests.city,
        job_requests.street_address,
        job_requests.service_type,
        job_requests.preferred_timeframe,
        job_requests.description,
        job_requests.created_at,
        properties.id as property_id,
        properties.label as property_label,
        properties.street as property_street,
        properties.city as property_city,
        properties.state as property_state,
        properties.postal_code as property_postal_code,
        properties.access_notes as property_access_notes
      from job_requests
      left join properties on properties.id = job_requests.property_id
        and properties.client_id = ${session.user_id}
      where job_requests.client_id = ${session.user_id}
      order by job_requests.created_at desc
      limit 25
    `;
    const properties = await db.sql`
      select
        properties.id,
        properties.label,
        properties.street,
        properties.city,
        properties.state,
        properties.postal_code,
        properties.access_notes,
        properties.created_at,
        properties.updated_at,
        count(job_requests.id)::int as request_count,
        max(job_requests.created_at) as last_request_at
      from properties
      left join job_requests on job_requests.property_id = properties.id
        and job_requests.client_id = ${session.user_id}
      where properties.client_id = ${session.user_id}
      group by properties.id
      order by coalesce(max(job_requests.created_at), properties.created_at) desc
      limit 25
    `;
    const mappedRequests = jobRequests.map(mapJobRequest);
    const mappedProperties = properties.map(mapProperty);

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
      properties: mappedProperties,
      summary: {
        total: mappedRequests.length,
        active: countActiveRequests(mappedRequests),
        properties: mappedProperties.length,
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
