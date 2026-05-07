import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const ADMIN_STATUSES = new Set([
  'new',
  'needs_review',
  'quote_in_progress',
  'quote_sent',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

const normalizeStatusPayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  status: clean(body.status, 40),
  adminNotes: clean(body.adminNotes, 4000),
});

const mapJobRequest = (request) => ({
  id: request.id,
  status: request.status,
  requesterName: request.requester_name,
  requesterEmail: request.requester_email,
  requesterPhone: request.requester_phone,
  city: request.city,
  serviceType: request.service_type,
  preferredTimeframe: request.preferred_timeframe,
  description: request.description,
  adminNotes: request.admin_notes,
  createdAt: request.created_at,
});

export const createAdminJobRequestsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to view job requests.' });
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

    if (!roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required to view job requests.' });
    }

    if (request.method === 'PATCH') {
      const body = await parseJsonBody(request);

      if (!body) {
        return json(400, { ok: false, message: 'Request body must be valid JSON.' });
      }

      const payload = normalizeStatusPayload(body);

      if (!payload.jobRequestId) {
        return json(422, { ok: false, message: 'Job request is required.' });
      }

      if (!ADMIN_STATUSES.has(payload.status)) {
        return json(422, { ok: false, message: 'Choose a valid request status.' });
      }

      const [updatedRequest] = await db.sql`
        update job_requests
        set status = ${payload.status},
            admin_notes = ${payload.adminNotes || null},
            updated_at = now()
        where id = ${payload.jobRequestId}
        returning id, status, requester_name, requester_email, requester_phone, city, service_type, preferred_timeframe, description, admin_notes, created_at
      `;

      if (!updatedRequest) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Job request not found.' });
      }

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'job_request.status_updated'},
          ${'job_request'},
          ${updatedRequest.id},
          ${JSON.stringify({ source: 'admin_dashboard', status: payload.status })}::jsonb
        )
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        request: mapJobRequest(updatedRequest),
      });
    }

    const jobRequests = await db.sql`
      select id, status, requester_name, requester_email, requester_phone, city, service_type, preferred_timeframe, description, admin_notes, created_at
      from job_requests
      order by created_at desc
      limit 50
    `;
    const statusCounts = await db.sql`
      select status, count(*)::int as count
      from job_requests
      group by status
      order by status
    `;

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
      requests: jobRequests.map(mapJobRequest),
      statusCounts: Object.fromEntries(statusCounts.map((row) => [row.status, row.count])),
    });
  } catch (error) {
    console.error('Failed to load admin job requests', error);

    return json(500, { ok: false, message: 'We could not load job requests right now.' });
  }
};

export default createAdminJobRequestsHandler();

export const config = {
  path: '/api/admin/job-requests',
};
