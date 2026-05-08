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
  'pending_review',
  'waiting_payment',
  'completed',
  'cancelled',
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeOptionalDate = (value) => clean(value, 20);

const validateOptionalDate = (value, label) => {
  if (!value) {
    return null;
  }

  if (!DATE_PATTERN.test(value)) {
    return `${label} must use YYYY-MM-DD format.`;
  }

  return null;
};

const normalizeStatusPayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  status: clean(body.status, 40),
  adminNotes: clean(body.adminNotes, 4000),
  estimatedStartDate: normalizeOptionalDate(body.estimatedStartDate),
  completionDate: normalizeOptionalDate(body.completionDate),
  workerId: clean(body.workerId, 80),
  assignmentNotes: clean(body.assignmentNotes, 2000),
  scheduledDate: normalizeOptionalDate(body.scheduledDate),
  startTime: clean(body.startTime, 40),
  endTime: clean(body.endTime, 40),
});

const normalizeDeletePayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  confirmation: clean(body.confirmation, 80),
});

const mapDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const mapWorker = (worker) => ({
  id: worker.id,
  fullName: worker.full_name,
  email: worker.email,
  phone: worker.phone,
});

const mapQuote = (quote) => ({
  id: quote.id,
  jobRequestId: quote.job_request_id,
  clientId: quote.client_id,
  status: quote.status,
  title: quote.title,
  summary: quote.summary,
  amountCents: quote.amount_cents,
  createdAt: quote.created_at,
  updatedAt: quote.updated_at,
});

const mapAssignment = (assignment) => ({
  id: assignment.id,
  jobRequestId: assignment.job_request_id,
  workerId: assignment.worker_id,
  workerName: assignment.worker_full_name,
  workerEmail: assignment.worker_email,
  status: assignment.status,
  scheduledDate: mapDate(assignment.scheduled_date),
  startTime: assignment.start_time,
  endTime: assignment.end_time,
  notes: assignment.notes,
  workerNotes: assignment.worker_notes,
  createdAt: assignment.created_at,
  updatedAt: assignment.updated_at,
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
  estimatedStartDate: mapDate(request.estimated_start_date),
  completionDate: mapDate(request.completion_date),
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

export const createAdminJobRequestsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH', 'DELETE'].includes(request.method)) {
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

      const estimatedStartError = validateOptionalDate(payload.estimatedStartDate, 'Estimated start date');
      const completionDateError = validateOptionalDate(payload.completionDate, 'Completion date');
      const scheduledDateError = validateOptionalDate(payload.scheduledDate, 'Scheduled worker date');

      if (estimatedStartError || completionDateError || scheduledDateError) {
        return json(422, { ok: false, message: estimatedStartError || completionDateError || scheduledDateError });
      }

      const [updatedRequest] = await db.sql`
        update job_requests
        set status = ${payload.status},
            admin_notes = ${payload.adminNotes || null},
            estimated_start_date = ${payload.estimatedStartDate || null},
            completion_date = ${['waiting_payment', 'completed'].includes(payload.status) ? (payload.completionDate || new Date().toISOString().slice(0, 10)) : (payload.completionDate || null)},
            updated_at = now()
        where id = ${payload.jobRequestId}
        returning id, status, requester_name, requester_email, requester_phone, city, service_type, preferred_timeframe, description, admin_notes, estimated_start_date, completion_date, created_at, updated_at
      `;

      if (!updatedRequest) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Job request not found.' });
      }


      let invoice = null;

      if (payload.status === 'waiting_payment') {
        const [quoteForInvoice] = await db.sql`
          select id, client_id, title, amount_cents
          from quotes
          where job_request_id = ${updatedRequest.id}
            and status in ('accepted', 'sent', 'viewed')
          order by case when status = 'accepted' then 0 else 1 end, updated_at desc
          limit 1
        `;

        [invoice] = await db.sql`
          insert into invoices (job_request_id, client_id, quote_id, status, title, amount_cents, created_by)
          values (${updatedRequest.id}, ${quoteForInvoice?.client_id || null}, ${quoteForInvoice?.id || null}, ${'open'}, ${quoteForInvoice?.title || `${updatedRequest.service_type || 'Service'} invoice`}, ${quoteForInvoice?.amount_cents || 0}, ${session.user_id})
          on conflict (job_request_id) do update set
            client_id = coalesce(invoices.client_id, excluded.client_id),
            quote_id = coalesce(invoices.quote_id, excluded.quote_id),
            status = case when invoices.status = 'paid' then invoices.status else 'open' end,
            title = excluded.title,
            amount_cents = excluded.amount_cents,
            updated_at = now()
          returning id, job_request_id, client_id, quote_id, status, title, amount_cents, created_at, updated_at
        `;
      }

      let assignment = null;

      if (payload.workerId) {
        [assignment] = await db.sql`
          insert into worker_assignments (job_request_id, worker_id, assigned_by_user_id, status, scheduled_date, start_time, end_time, notes)
          values (${updatedRequest.id}, ${payload.workerId}, ${session.user_id}, ${'assigned'}, ${payload.scheduledDate || payload.estimatedStartDate || null}, ${payload.startTime || null}, ${payload.endTime || null}, ${payload.assignmentNotes || null})
          on conflict (job_request_id, worker_id) do update set
            assigned_by_user_id = excluded.assigned_by_user_id,
            status = case when worker_assignments.status in ('completed', 'cancelled') then worker_assignments.status else excluded.status end,
            scheduled_date = excluded.scheduled_date,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            notes = excluded.notes,
            updated_at = now()
          returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
        `;
      }

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${assignment ? 'worker_assignment.assigned' : 'job_request.status_updated'},
          ${assignment ? 'worker_assignment' : 'job_request'},
          ${assignment ? assignment.id : updatedRequest.id},
          ${JSON.stringify({ source: 'admin_dashboard', status: payload.status, estimatedStartDate: payload.estimatedStartDate || null, completionDate: updatedRequest.completion_date || null, invoiceId: invoice?.id || null, workerId: payload.workerId || null, jobRequestId: updatedRequest.id })}::jsonb
        )
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        request: mapJobRequest(updatedRequest),
        assignment,
        invoice,
      });
    }

    if (request.method === 'DELETE') {
      const body = await parseJsonBody(request);

      if (!body) {
        return json(400, { ok: false, message: 'Request body must be valid JSON.' });
      }

      const payload = normalizeDeletePayload(body);

      if (!payload.jobRequestId) {
        return json(422, { ok: false, message: 'Job request is required.' });
      }

      if (payload.confirmation !== 'DELETE') {
        return json(422, { ok: false, message: 'Type DELETE to permanently delete this request.' });
      }

      const [deletedRequest] = await db.sql`
        delete from job_requests
        where id = ${payload.jobRequestId}
        returning id, status, requester_name, requester_email, service_type
      `;

      if (!deletedRequest) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Job request not found.' });
      }

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'job_request.permanently_deleted'},
          ${'job_request'},
          ${deletedRequest.id},
          ${JSON.stringify({ source: 'admin_dashboard', status: deletedRequest.status, requesterEmail: deletedRequest.requester_email, serviceType: deletedRequest.service_type })}::jsonb
        )
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        deleted: true,
        requestId: deletedRequest.id,
      });
    }

    const jobRequests = await db.sql`
      select id, status, requester_name, requester_email, requester_phone, city, service_type, preferred_timeframe, description, admin_notes, estimated_start_date, completion_date, created_at, updated_at
      from job_requests
      where status <> 'completed'
      order by created_at desc
      limit 50
    `;
    const statusCounts = await db.sql`
      select status, count(*)::int as count
      from job_requests
      where status <> 'completed'
      group by status
      order by status
    `;
    const workers = await db.sql`
      select app_users.id, app_users.full_name, app_users.email, app_users.phone
      from app_users
      join user_roles on user_roles.user_id = app_users.id
      join roles on roles.id = user_roles.role_id
      where roles.key = ${'worker'}
        and app_users.is_active = true
      order by app_users.full_name nulls last, app_users.email
      limit 100
    `;
    const assignments = await db.sql`
      select worker_assignments.id, worker_assignments.job_request_id, worker_assignments.worker_id, workers.full_name as worker_full_name, workers.email as worker_email, worker_assignments.status, worker_assignments.scheduled_date, worker_assignments.start_time, worker_assignments.end_time, worker_assignments.notes, worker_assignments.worker_notes, worker_assignments.created_at, worker_assignments.updated_at
      from worker_assignments
      join app_users workers on workers.id = worker_assignments.worker_id
      where worker_assignments.job_request_id in (select id from job_requests where status <> 'completed' order by created_at desc limit 50)
      order by worker_assignments.created_at desc
    `;
    const quotes = await db.sql`
      select id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
      from quotes
      where job_request_id in (select id from job_requests where status <> 'completed' order by created_at desc limit 50)
      order by created_at desc
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
      workers: workers.map(mapWorker),
      assignments: assignments.map(mapAssignment),
      quotes: quotes.map(mapQuote),
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
