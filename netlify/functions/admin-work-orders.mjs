import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const WORK_ORDER_STATUSES = new Set(['accepted', 'scheduled', 'in_progress', 'pending_review', 'completed', 'cancelled']);

const mapWorkOrder = (row) => ({
  jobRequestId: row.job_request_id,
  status: row.job_status,
  requesterName: row.requester_name,
  requesterEmail: row.requester_email,
  requesterPhone: row.requester_phone,
  city: row.city,
  streetAddress: row.street_address,
  serviceType: row.service_type,
  workScope: row.work_scope,
  workCategory: row.work_category,
  preferredTimeframe: row.preferred_timeframe,
  description: row.description,
  estimatedStartDate: row.estimated_start_date,
  completionDate: row.completion_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  quoteId: row.quote_id,
  quoteStatus: row.quote_status,
  quoteTitle: row.quote_title,
  quoteAmountCents: row.quote_amount_cents,
  assignmentId: row.assignment_id,
  assignmentStatus: row.assignment_status,
  workerId: row.worker_id,
  workerName: row.worker_name,
  workerEmail: row.worker_email,
  scheduledDate: row.scheduled_date,
  startTime: row.start_time,
  endTime: row.end_time,
  assignmentNotes: row.assignment_notes,
  workerNotes: row.worker_notes,
  completionNotes: row.completion_notes,
  completionSubmittedAt: row.completion_submitted_at,
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

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  return roles.map((role) => role.key);
};

const requireAdmin = async (request) => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return { error: json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' }) };
  }

  const db = await loadDatabase();
  const session = await loadSession(db, sessionToken);

  if (!session) {
    return { error: json(401, { ok: false, authenticated: false, message: 'Session expired. Request a new magic link.' }) };
  }

  const roleKeys = await loadRoleKeys(db, session.user_id);

  if (!roleKeys.includes('admin')) {
    return { error: json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required.' }) };
  }

  return { db, session, roleKeys };
};

const normalizePatchPayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  status: clean(body.status, 40),
  estimatedStartDate: clean(body.estimatedStartDate, 40),
  completionDate: clean(body.completionDate, 40),
  workerId: clean(body.workerId, 80),
  scheduledDate: clean(body.scheduledDate, 40),
  startTime: clean(body.startTime, 40),
  endTime: clean(body.endTime, 40),
  notes: clean(body.notes, 1200),
});

const loadWorkOrderRows = async (db, { status = 'active', limit = 75 } = {}) => {
  const statuses = status === 'all'
    ? ['accepted', 'scheduled', 'in_progress', 'pending_review', 'completed', 'cancelled']
    : status === 'completed'
      ? ['completed']
      : status === 'pending_review'
        ? ['pending_review']
        : ['accepted', 'scheduled', 'in_progress', 'pending_review'];

  return db.sql`
    select
      jr.id as job_request_id,
      jr.status as job_status,
      jr.requester_name,
      jr.requester_email,
      jr.requester_phone,
      jr.city,
      jr.street_address,
      jr.service_type,
      jr.work_scope,
      jr.work_category,
      jr.preferred_timeframe,
      jr.description,
      jr.estimated_start_date,
      jr.completion_date,
      jr.created_at,
      jr.updated_at,
      q.id as quote_id,
      q.status as quote_status,
      q.title as quote_title,
      q.amount_cents as quote_amount_cents,
      wa.id as assignment_id,
      wa.status as assignment_status,
      wa.worker_id,
      worker.full_name as worker_name,
      worker.email as worker_email,
      wa.scheduled_date,
      wa.start_time,
      wa.end_time,
      wa.notes as assignment_notes,
      wa.worker_notes,
      wa.completion_notes,
      wa.completion_submitted_at
    from job_requests jr
    left join lateral (
      select id, status, title, amount_cents
      from quotes
      where quotes.job_request_id = jr.id
      order by quotes.created_at desc
      limit 1
    ) q on true
    left join lateral (
      select *
      from worker_assignments
      where worker_assignments.job_request_id = jr.id
      order by worker_assignments.created_at desc
      limit 1
    ) wa on true
    left join app_users worker on worker.id = wa.worker_id
    where jr.status = any(${statuses})
    order by
      case jr.status
        when 'pending_review' then 1
        when 'in_progress' then 2
        when 'scheduled' then 3
        when 'accepted' then 4
        when 'completed' then 5
        else 6
      end,
      coalesce(wa.scheduled_date, jr.estimated_start_date, jr.created_at::date) asc,
      jr.created_at desc
    limit ${Math.max(1, Math.min(Number(limit) || 75, 150))}
  `;
};

export default async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { db, session, roleKeys } = auth;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const rows = await loadWorkOrderRows(db, {
        status: clean(url.searchParams.get('status'), 40) || 'active',
        limit: Number(url.searchParams.get('limit') || 75),
      });
      const workOrders = rows.map(mapWorkOrder);

      const stats = workOrders.reduce((acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        if (item.assignmentStatus === 'blocked') acc.blocked += 1;
        if (!item.workerId) acc.unassigned += 1;
        return acc;
      }, { total: 0, accepted: 0, scheduled: 0, in_progress: 0, pending_review: 0, completed: 0, blocked: 0, unassigned: 0 });

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
        stats,
        workOrders,
      });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

    const payload = normalizePatchPayload(body);
    if (!payload.jobRequestId) return json(422, { ok: false, message: 'Job request is required.' });
    if (payload.status && !WORK_ORDER_STATUSES.has(payload.status)) return json(422, { ok: false, message: 'Invalid work order status.' });

    const [jobRequest] = await db.sql`
      select id, status
      from job_requests
      where id = ${payload.jobRequestId}
      limit 1
    `;

    if (!jobRequest) return json(404, { ok: false, message: 'Work order not found.' });

    const nextStatus = payload.status || jobRequest.status;

    const [updatedJob] = await db.sql`
      update job_requests
      set status = ${nextStatus},
          estimated_start_date = case when ${payload.estimatedStartDate} = '' then estimated_start_date else ${payload.estimatedStartDate || null}::date end,
          completion_date = case when ${payload.completionDate} = '' then completion_date else ${payload.completionDate || null}::date end,
          updated_at = now()
      where id = ${jobRequest.id}
      returning id, status, estimated_start_date, completion_date, updated_at
    `;

    let assignment = null;

    if (payload.workerId) {
      const [createdAssignment] = await db.sql`
        insert into worker_assignments (
          job_request_id,
          worker_id,
          assigned_by_user_id,
          status,
          scheduled_date,
          start_time,
          end_time,
          notes
        ) values (
          ${jobRequest.id},
          ${payload.workerId},
          ${session.user_id},
          ${nextStatus === 'in_progress' ? 'in_progress' : 'assigned'},
          ${payload.scheduledDate || null}::date,
          ${payload.startTime || null},
          ${payload.endTime || null},
          ${payload.notes || null}
        )
        on conflict (job_request_id, worker_id) do update set
          scheduled_date = excluded.scheduled_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          notes = excluded.notes,
          updated_at = now()
        returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes
      `;
      assignment = createdAssignment;
    }

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'work_order.updated'},
        ${'job_request'},
        ${jobRequest.id},
        ${JSON.stringify({ source: 'admin_work_orders', status: nextStatus, assignedWorkerId: payload.workerId || null, scheduledDate: payload.scheduledDate || null })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      workOrder: {
        jobRequestId: updatedJob.id,
        status: updatedJob.status,
        estimatedStartDate: updatedJob.estimated_start_date,
        completionDate: updatedJob.completion_date,
        updatedAt: updatedJob.updated_at,
      },
      assignment,
    });
  } catch (error) {
    console.error('Failed to load or update work orders', error);
    return json(500, { ok: false, message: 'Could not load or update work orders right now.' });
  }
};

export const config = {
  path: '/api/admin/work-orders',
};
