import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const WORK_ORDER_STATUSES = new Set(['new', 'waiting_assignment', 'assigned', 'scheduled', 'in_progress', 'worker_completed', 'admin_review', 'client_review', 'invoice_ready', 'invoiced', 'payment_pending', 'payment_verified', 'closed', 'cancelled', 'needs_review', 'quote_in_progress', 'quote_sent', 'quoted', 'accepted', 'blocked', 'completed_by_worker', 'pending_review', 'completed', 'ready_to_invoice', 'waiting_payment', 'paid']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'emergency', 'critical']);
const ARRIVAL_WINDOWS = new Set(['8-10', '10-12', '12-2', 'Custom', 'custom']);

const WORK_ORDER_AUTOMATION_VERSION = 'phase21-work-order-automation-v1';

const daysBetween = (dateValue) => {
  if (!dateValue) return null;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return null;
  const now = Date.now();
  return Math.floor((time - now) / (1000 * 60 * 60 * 24));
};

const inferDispatchPriority = (row) => {
  const text = `${row.service_type || ''} ${row.work_scope || ''} ${row.description || ''}`.toLowerCase();
  let score = 50;
  const reasons = [];

  if (/leak|no cooling|no heat|electrical|breaker|sparking|water|urgent|asap|same day|emergency/.test(text)) {
    score += 25;
    reasons.push('Request text indicates urgent or safety-sensitive issue.');
  }

  if (/commercial|business|rental|tenant|property manager/.test(text)) {
    score += 8;
    reasons.push('Managed/commercial property coordination may require faster follow-up.');
  }

  if (!row.worker_id) {
    score += 10;
    reasons.push('No worker is assigned yet.');
  }

  if (row.job_status === 'pending_review') {
    score += 12;
    reasons.push('Job is waiting for completion review.');
  }

  if (row.assignment_status === 'blocked') {
    score += 20;
    reasons.push('Worker marked job as blocked.');
  }

  const createdAgeDays = row.created_at ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 0;
  if (createdAgeDays >= 3 && !['completed', 'cancelled'].includes(row.job_status)) {
    score += Math.min(20, createdAgeDays * 2);
    reasons.push(`Open for ${createdAgeDays} day(s).`);
  }

  if (row.scheduled_date) {
    const scheduleDelta = daysBetween(row.scheduled_date);
    if (scheduleDelta !== null && scheduleDelta < 0 && !['completed', 'cancelled'].includes(row.job_status)) {
      score += 18;
      reasons.push('Scheduled date appears overdue.');
    }
    if (scheduleDelta === 0) {
      score += 12;
      reasons.push('Scheduled for today.');
    }
  }

  const level = score >= 85 ? 'critical' : score >= 70 ? 'high' : score >= 52 ? 'normal' : 'low';

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    reasons,
  };
};

const buildAutomationPlan = (row) => {
  const priority = inferDispatchPriority(row);
  const text = `${row.service_type || ''} ${row.work_scope || ''} ${row.description || ''}`.toLowerCase();
  const actions = [];
  const warnings = [];

  if (!row.worker_id) {
    actions.push('Assign a worker before scheduling is considered complete.');
  }

  if (['accepted', 'waiting_assignment'].includes(row.job_status)) {
    actions.push('Assign a worker, set schedule/priority, and send the job to production.');
  }

  if (row.job_status === 'scheduled' && !row.scheduled_date) {
    actions.push('Add scheduled date/time so client and worker have a clear appointment.');
  }

  if (row.job_status === 'in_progress') {
    actions.push('Ask worker for completion photos, materials used, and closeout notes.');
  }

  if (['pending_review', 'worker_completed', 'admin_review'].includes(row.job_status)) {
    actions.push('Admin should review worker completion notes, photos, materials, and invoice readiness.');
  }

  if (/leak|water|electrical|sparking|gas|no cooling|no heat/.test(text)) {
    warnings.push('Consider same-day follow-up or safety escalation.');
  }

  if (/permit|inspection|new circuit|mini split|hvac|gas|panel|water heater/.test(text)) {
    warnings.push('Verify permit/licensed trade requirements before dispatch.');
  }

  const suggestedScheduleWindow =
    priority.level === 'critical' ? 'same day / urgent review' :
    priority.level === 'high' ? '24–48 hours' :
    priority.level === 'normal' ? '2–5 business days' :
    'next available';

  return {
    version: WORK_ORDER_AUTOMATION_VERSION,
    priority,
    suggestedScheduleWindow,
    assignmentNeeded: !row.worker_id,
    overdue: priority.reasons.some((reason) => reason.toLowerCase().includes('overdue')),
    actions,
    warnings,
  };
};


const mapWorkOrder = (row) => ({
  jobRequestId: row.job_request_id,
  automation: buildAutomationPlan(row),
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
  priority: row.priority || row.automation_priority || buildAutomationPlan(row).priority.level,
  arrivalWindow: row.arrival_window || '',
  estimatedDuration: row.estimated_duration || row.estimated_labor_hours || null,
  estimatedLaborHours: row.estimated_labor_hours || null,
  requiredMaterials: row.required_materials || [],
  requiredPhotos: row.required_photos || [],
  materials: row.materials || [],
  photos: row.photos || [],
  timeline: row.timeline || [],
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

  if (!roleKeys.some((role) => ['owner', 'admin', 'manager'].includes(role))) {
    return { error: json(403, { ok: false, authenticated: true, authorized: false, message: 'Owner, admin, or manager role required.' }) };
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
  priority: clean(body.priority, 40),
  estimatedLaborHours: clean(body.estimatedLaborHours, 40),
  estimatedDuration: clean(body.estimatedDuration, 80),
  arrivalWindow: clean(body.arrivalWindow, 40),
  notificationAction: clean(body.notificationAction, 40),
  requiredMaterials: clean(body.requiredMaterials, 1200),
  requiredPhotos: clean(body.requiredPhotos, 1200),
  notes: clean(body.notes, 1200),
});

const linesToJson = (value = '') => JSON.stringify(String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean));

const toStoredWorkOrderStatus = (status = '') => ({
  quoted: 'quote_sent',
  accepted: 'waiting_assignment',
  blocked: 'admin_review',
  completed_by_worker: 'worker_completed',
  pending_review: 'admin_review',
  ready_to_invoice: 'invoice_ready',
  waiting_payment: 'payment_pending',
  paid: 'payment_verified',
}[status] || status);

const appendReviewNote = (existing = '', note = '') => [existing, note].filter(Boolean).join('\n\n');

const handleCompletionReview = async ({ request, db, session }) => {
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const jobRequestId = clean(body.jobRequestId, 80);
  const decision = clean(body.decision, 40) || 'approve';
  const reviewNote = clean(body.reviewNote, 2000);
  if (!jobRequestId) return json(422, { ok: false, message: 'Work order is required for completion review.' });
  if (!['approve', 'reject'].includes(decision)) return json(422, { ok: false, message: 'Choose approve or reject.' });

  const [job] = await db.sql`select id, status, admin_notes from job_requests where id = ${jobRequestId} limit 1`;
  if (!job) return json(404, { ok: false, message: 'Work order not found.' });

  const nextStatus = decision === 'approve' ? 'invoice_ready' : 'assigned';
  const notePrefix = decision === 'approve' ? 'Completion approved for invoice readiness' : 'Completion rejected/requested changes';
  const adminNotes = appendReviewNote(job.admin_notes || '', `${notePrefix}${reviewNote ? `: ${reviewNote}` : ''}`);

  const [updatedJob] = await db.sql`
    update job_requests
    set status = ${nextStatus},
        completion_date = case when ${decision} = 'approve' then coalesce(completion_date, current_date) else completion_date end,
        admin_notes = ${adminNotes},
        updated_at = now()
    where id = ${jobRequestId}
    returning id, status, completion_date, updated_at
  `;

  if (decision === 'reject') {
    await db.sql`
      update worker_assignments
      set status = 'assigned', updated_at = now()
      where job_request_id = ${jobRequestId}
        and status = 'completed'
    `;
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${decision === 'approve' ? 'work_order.completion_approved' : 'work_order.completion_rejected'}, ${'job_request'}, ${jobRequestId}, ${JSON.stringify({ decision, reviewNote, nextStatus })}::jsonb)
  `;

  return json(200, {
    ok: true,
    authenticated: true,
    authorized: true,
    workOrder: { jobRequestId: updatedJob.id, status: updatedJob.status, completionDate: updatedJob.completion_date, updatedAt: updatedJob.updated_at },
    invoiceReadiness: { ready: decision === 'approve', blockingReasons: decision === 'approve' ? [] : ['Admin requested worker changes before invoicing.'] },
  });
};

const loadWorkOrderRows = async (db, { status = 'active', limit = 75 } = {}) => {
  const statuses = status === 'all'
    ? ['new', 'needs_review', 'quote_in_progress', 'quote_sent', 'accepted', 'waiting_assignment', 'assigned', 'scheduled', 'in_progress', 'worker_completed', 'admin_review', 'client_review', 'invoice_ready', 'invoiced', 'payment_pending', 'payment_verified', 'pending_review', 'completed', 'closed', 'cancelled']
    : status === 'completed'
      ? ['closed', 'completed']
      : status === 'pending_review'
        ? ['worker_completed', 'admin_review', 'pending_review']
        : ['waiting_assignment', 'assigned', 'scheduled', 'in_progress', 'worker_completed', 'admin_review', 'client_review', 'invoice_ready', 'invoiced', 'payment_pending', 'payment_verified', 'accepted', 'scheduled', 'pending_review'];

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
      jr.admin_notes,
      coalesce(wa.priority, 'normal')::text as priority,
      wa.estimated_duration as estimated_duration,
      wa.arrival_window as arrival_window,
      null::numeric as estimated_labor_hours,
      coalesce(wa.required_materials, '[]'::jsonb) as required_materials,
      coalesce(wa.required_photos, '[]'::jsonb) as required_photos,
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
      wa.completion_submitted_at,
      coalesce(mat.materials, '[]'::jsonb) as materials,
      coalesce(photo.photos, '[]'::jsonb) as photos,
      coalesce(timeline.events, '[]'::jsonb) as timeline
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
    left join lateral (select jsonb_agg(jsonb_build_object('id', inventory_reservations.id, 'itemId', inventory_items.id, 'name', inventory_items.name, 'reservedQuantity', inventory_reservations.reserved_quantity, 'usedQuantity', inventory_reservations.used_quantity, 'status', inventory_reservations.status, 'notes', inventory_reservations.notes)) as materials from inventory_reservations left join inventory_items on inventory_items.id = inventory_reservations.inventory_item_id where inventory_reservations.job_request_id = jr.id) mat on true
    left join lateral (select jsonb_agg(jsonb_build_object('id', files.id, 'fileName', files.file_name, 'photoType', files.photo_type, 'caption', files.caption, 'createdAt', files.created_at)) as photos from files where files.job_request_id = jr.id or files.work_order_id = jr.id::text) photo on true
    left join lateral (select jsonb_agg(jsonb_build_object('eventType', audit_events.event_type, 'createdAt', audit_events.created_at, 'metadata', audit_events.metadata) order by audit_events.created_at desc) as events from audit_events where audit_events.entity_id = jr.id) timeline on true
    where jr.status = any(${statuses})
    order by
      case jr.status
        when 'worker_completed' then 1
        when 'admin_review' then 2
        when 'in_progress' then 3
        when 'assigned' then 4
        when 'waiting_assignment' then 5
        when 'accepted' then 6
        when 'closed' then 7
        when 'completed' then 8
        else 6
      end,
      coalesce(wa.scheduled_date, jr.estimated_start_date, jr.created_at::date) asc,
      jr.created_at desc
    limit ${Math.max(1, Math.min(Number(limit) || 75, 150))}
  `;
};

export default async (request) => {
  if (!['GET', 'PATCH', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { db, session, roleKeys } = auth;

    if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/review')) {
      return await handleCompletionReview({ request, db, session });
    }

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const rows = await loadWorkOrderRows(db, {
        status: clean(url.searchParams.get('status'), 40) || 'active',
        limit: Number(url.searchParams.get('limit') || 75),
      });
      const workOrders = rows.map(mapWorkOrder);
      const workers = await db.sql`
        select app_users.id, app_users.full_name, app_users.email
        from app_users
        join user_roles on user_roles.user_id = app_users.id
        join roles on roles.id = user_roles.role_id
        where roles.key = 'worker' and app_users.is_active = true
        order by app_users.full_name nulls last, app_users.email
        limit 150
      `;

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
        workers: workers.map((worker) => ({ id: worker.id, fullName: worker.full_name, email: worker.email })),
        workflow: ['client_request','ai_draft','admin_review','quote_sent','client_accepted','waiting_assignment','assigned','scheduled','in_progress','worker_completed','inventory_updated','client_review','invoice_ready','payment_received','payment_verified','closed'],
      });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

    const payload = normalizePatchPayload(body);
    if (!payload.jobRequestId) return json(422, { ok: false, message: 'Job request is required.' });
    if (payload.status && !WORK_ORDER_STATUSES.has(payload.status)) return json(422, { ok: false, message: 'Invalid work order status.' });
    if (payload.priority && !PRIORITIES.has(payload.priority)) return json(422, { ok: false, message: 'Invalid priority.' });
    if (payload.arrivalWindow && !ARRIVAL_WINDOWS.has(payload.arrivalWindow)) return json(422, { ok: false, message: 'Invalid arrival window.' });

    const [jobRequest] = await db.sql`
      select id, status
      from job_requests
      where id = ${payload.jobRequestId}
      limit 1
    `;

    if (!jobRequest) return json(404, { ok: false, message: 'Work order not found.' });

    if (payload.notificationAction) {
      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (${session.user_id}, ${payload.notificationAction === 'client' ? 'work_order.client_notified' : 'work_order.worker_notified'}, ${'job_request'}, ${jobRequest.id}, ${JSON.stringify({ source: 'admin_work_orders' })}::jsonb)
      `;
      return json(200, { ok: true, authenticated: true, authorized: true, message: payload.notificationAction === 'client' ? 'Client notification recorded.' : 'Worker notification recorded.' });
    }

    const assigningWorker = Boolean(payload.workerId);
    const nextStatus = toStoredWorkOrderStatus(payload.status || (assigningWorker ? 'assigned' : jobRequest.status));

    const [updatedJob] = await db.sql`
      update job_requests
      set status = ${nextStatus},
          estimated_start_date = case when ${payload.estimatedStartDate} = '' then estimated_start_date else ${payload.estimatedStartDate || payload.scheduledDate || null}::date end,
          completion_date = case when ${payload.completionDate} = '' then completion_date else ${payload.completionDate || null}::date end,
          updated_at = now()
      where id = ${jobRequest.id}
      returning id, status, estimated_start_date, completion_date, updated_at
    `;

    let assignment = null;

    if (!payload.workerId) {
      await db.sql`
        update worker_assignments
        set status = 'cancelled', updated_at = now()
        where job_request_id = ${jobRequest.id}
          and status not in ('completed', 'worker_completed', 'cancelled')
      `;
    }

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
          notes,
          priority,
          arrival_window,
          estimated_duration,
          required_materials,
          required_photos
        ) values (
          ${jobRequest.id},
          ${payload.workerId},
          ${session.user_id},
          ${nextStatus === 'in_progress' ? 'in_progress' : 'assigned'},
          ${payload.scheduledDate || null}::date,
          ${payload.startTime || null},
          ${payload.endTime || null},
          ${payload.notes || null},
          ${payload.priority === 'emergency' ? 'emergency' : (payload.priority || 'normal')},
          ${payload.arrivalWindow || null},
          ${payload.estimatedDuration || payload.estimatedLaborHours || null},
          ${linesToJson(payload.requiredMaterials)}::jsonb,
          ${linesToJson(payload.requiredPhotos)}::jsonb
        )
        on conflict (job_request_id, worker_id) do update set
          scheduled_date = excluded.scheduled_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          notes = excluded.notes,
          priority = excluded.priority,
          arrival_window = excluded.arrival_window,
          estimated_duration = excluded.estimated_duration,
          required_materials = excluded.required_materials,
          required_photos = excluded.required_photos,
          status = excluded.status,
          updated_at = now()
        returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, priority, arrival_window, estimated_duration, required_materials, required_photos
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
