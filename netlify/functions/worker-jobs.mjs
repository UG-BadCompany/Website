import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  parseJsonBody,
} from './auth-utils.mjs';
import { WORKFLOW } from './workflow-state.mjs';

const WORKER_ASSIGNMENT_STATUSES = new Set(['assigned', 'scheduled', 'in_progress', 'worker_completed', 'completed', 'blocked']);

const normalizeWorkerUpdatePayload = (body = {}) => ({
  assignmentId: clean(body.assignmentId, 80),
  status: clean(body.status, 40),
  workerNotes: clean(body.workerNotes, 4000),
  inventoryItemId: clean(body.inventoryItemId, 80),
  inventoryQuantityUsed: Number(body.inventoryQuantityUsed || 0),
  inventoryNote: clean(body.inventoryNote, 500),
  customMaterialName: clean(body.customMaterialName, 160),
  customMaterialQuantity: Number(body.customMaterialQuantity || 0),
  customMaterialUnitCostCents: Number(body.customMaterialUnitCostCents || 0),
  customMaterialBillable: body.customMaterialBillable !== false,
  blockedReason: clean(body.blockedReason, 500),
  blockedNeedsAdminHelp: Boolean(body.blockedNeedsAdminHelp),
  completionChecklist: Array.isArray(body.completionChecklist) ? body.completionChecklist.map((item) => clean(item, 140)).filter(Boolean).slice(0, 20) : [],
  completionEvidenceFiles: Array.isArray(body.completionEvidenceFiles) ? body.completionEvidenceFiles.map((item) => clean(item, 240)).filter(Boolean).slice(0, 20) : [],
});

const buildWorkerCreatePayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  workerId: clean(body.workerId, 80),
  status: clean(body.status, 40) || 'assigned',
  scheduledDate: clean(body.scheduledDate, 20),
  startTime: clean(body.startTime, 20),
  endTime: clean(body.endTime, 20),
  notes: clean(body.notes, 2000),
});

const mapDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const mapAssignment = (row) => ({
  id: row.id,
  status: row.status,
  scheduledDate: mapDate(row.scheduled_date),
  startTime: row.start_time,
  endTime: row.end_time,
  notes: row.notes,
  workerNotes: row.worker_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  worker: {
    id: row.worker_id,
    fullName: row.worker_full_name,
    email: row.worker_email,
    phone: row.worker_phone,
  },
  jobRequest: {
    id: row.job_request_id,
    status: row.job_status,
    serviceType: row.service_type,
    preferredTimeframe: row.preferred_timeframe,
    description: row.description,
    adminNotes: row.admin_notes,
    estimatedStartDate: mapDate(row.estimated_start_date),
    completionDate: mapDate(row.completion_date),
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    city: row.city,
    streetAddress: row.street_address,
    property: row.property_id ? {
      id: row.property_id,
      label: row.property_label,
      street: row.property_street,
      city: row.property_city,
      state: row.property_state,
      postalCode: row.property_postal_code,
      accessNotes: row.property_access_notes,
    } : null,
  },
});

const SERVICE_CHECKLIST_TEMPLATES = {
  plumbing: ['Shutoff verified', 'Leak check completed', 'Fixtures tested', 'Work area cleaned'],
  electrical: ['Breaker/power safety check', 'Connections secured', 'Function test completed', 'Work area cleaned'],
  hvac: ['Filter/airflow checked', 'Thermostat test completed', 'Drain/condensate check', 'Work area cleaned'],
  general: ['Scope completed', 'Quality check completed', 'Client access area cleaned'],
};

const getChecklistTemplateForServiceType = (serviceType = '') => {
  const normalized = String(serviceType || '').trim().toLowerCase();
  if (!normalized) return SERVICE_CHECKLIST_TEMPLATES.general;
  if (normalized.includes('plumb')) return SERVICE_CHECKLIST_TEMPLATES.plumbing;
  if (normalized.includes('elect')) return SERVICE_CHECKLIST_TEMPLATES.electrical;
  if (normalized.includes('hvac') || normalized.includes('air') || normalized.includes('heating')) return SERVICE_CHECKLIST_TEMPLATES.hvac;
  return SERVICE_CHECKLIST_TEMPLATES.general;
};

const loadSessionContext = async (db, sessionToken) => {
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

  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${session.user_id}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, {
    logPrefix: 'Failed to load worker job permissions; using role defaults',
  });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);

  return { session, roleKeys, permissionKeys };
};

const hasWorkerAccess = (roleKeys, permissionKeys) => roleKeys.includes('admin') || roleKeys.includes('worker') || permissionKeys.includes('worker.jobs.manage');

const listInventoryItems = async (db) => {
  const rows = await db.sql`
    select id, name, unit, quantity_on_hand
    from inventory_items
    where is_active = true
    order by name
    limit 200
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit || 'each',
    quantityOnHand: Number(row.quantity_on_hand || 0),
  }));
};

const listAssignments = async (db, context) => {
  const isAdmin = context.roleKeys.includes('admin');
  const assignments = isAdmin ? await db.sql`
    select
      worker_assignments.id,
      worker_assignments.status,
      worker_assignments.scheduled_date,
      worker_assignments.start_time,
      worker_assignments.end_time,
      worker_assignments.notes,
      worker_assignments.worker_notes,
      worker_assignments.created_at,
      worker_assignments.updated_at,
      workers.id as worker_id,
      workers.full_name as worker_full_name,
      workers.email as worker_email,
      workers.phone as worker_phone,
      job_requests.id as job_request_id,
      job_requests.status as job_status,
      job_requests.service_type,
      job_requests.preferred_timeframe,
      job_requests.description,
      job_requests.admin_notes,
      job_requests.estimated_start_date,
      job_requests.completion_date,
      job_requests.requester_name,
      job_requests.requester_email,
      job_requests.requester_phone,
      job_requests.city,
      job_requests.street_address,
      properties.id as property_id,
      properties.label as property_label,
      properties.street as property_street,
      properties.city as property_city,
      properties.state as property_state,
      properties.postal_code as property_postal_code,
      properties.access_notes as property_access_notes
    from worker_assignments
    join app_users workers on workers.id = worker_assignments.worker_id
    join job_requests on job_requests.id = worker_assignments.job_request_id
    left join properties on properties.id = job_requests.property_id
    where worker_assignments.status = any(${WORKFLOW.workerActive})
      and job_requests.status = any(${WORKFLOW.workOrderActive})
    order by worker_assignments.scheduled_date nulls last, worker_assignments.created_at desc
    limit 75
  ` : await db.sql`
    select
      worker_assignments.id,
      worker_assignments.status,
      worker_assignments.scheduled_date,
      worker_assignments.start_time,
      worker_assignments.end_time,
      worker_assignments.notes,
      worker_assignments.worker_notes,
      worker_assignments.created_at,
      worker_assignments.updated_at,
      workers.id as worker_id,
      workers.full_name as worker_full_name,
      workers.email as worker_email,
      workers.phone as worker_phone,
      job_requests.id as job_request_id,
      job_requests.status as job_status,
      job_requests.service_type,
      job_requests.preferred_timeframe,
      job_requests.description,
      job_requests.admin_notes,
      job_requests.estimated_start_date,
      job_requests.completion_date,
      job_requests.requester_name,
      job_requests.requester_email,
      job_requests.requester_phone,
      job_requests.city,
      job_requests.street_address,
      properties.id as property_id,
      properties.label as property_label,
      properties.street as property_street,
      properties.city as property_city,
      properties.state as property_state,
      properties.postal_code as property_postal_code,
      properties.access_notes as property_access_notes
    from worker_assignments
    join app_users workers on workers.id = worker_assignments.worker_id
    join job_requests on job_requests.id = worker_assignments.job_request_id
    left join properties on properties.id = job_requests.property_id
    where worker_assignments.worker_id = ${context.session.user_id}
      and worker_assignments.status = any(${WORKFLOW.workerActive})
      and job_requests.status = any(${WORKFLOW.workOrderActive})
    order by worker_assignments.scheduled_date nulls last, worker_assignments.created_at desc
    limit 75
  `;

  return assignments.map(mapAssignment);
};

const handlePatch = async ({ request, db, context }) => {
  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizeWorkerUpdatePayload(body);

  if (!payload.assignmentId) {
    return json(422, { ok: false, field: 'assignmentId', missing: ['assignmentId'], message: 'Missing required field: assignmentId.' });
  }

  if (!payload.status) {
    return json(422, { ok: false, field: 'status', missing: ['status'], message: 'Missing required field: status.' });
  }

  if (!WORKER_ASSIGNMENT_STATUSES.has(payload.status)) {
    return json(422, { ok: false, field: 'status', message: `Invalid status: ${payload.status}.` });
  }

  if (payload.status === 'blocked' && !payload.blockedReason) {
    return json(422, { ok: false, field: 'blockedReason', missing: ['blockedReason'], message: 'Missing required field: blockedReason is required when a job is marked blocked.' });
  }

  const isAdmin = context.roleKeys.includes('admin');
  const completionFiles = JSON.stringify(payload.completionEvidenceFiles || []);
  let updatedRows = [];

  if (!isAdmin && !['assigned', 'in_progress', 'worker_completed', 'blocked'].includes(payload.status)) {
    return json(403, { ok: false, authenticated: true, authorized: false, message: 'Workers can only move assigned jobs into progress or submit completion for review.' });
  }

  if (payload.status === 'worker_completed' || payload.status === 'completed') {
    updatedRows = isAdmin ? await db.sql`
      update worker_assignments
      set status = ${payload.status === 'completed' ? 'completed' : 'worker_completed'},
          worker_notes = ${payload.workerNotes || null},
          completion_notes = nullif(${payload.workerNotes || ''}, ''),
          completion_photo_names = ${completionFiles}::jsonb,
          completion_submitted_at = now(),
          updated_at = now()
      where id = ${payload.assignmentId}
      returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
    ` : await db.sql`
      update worker_assignments
      set status = ${payload.status === 'completed' ? 'completed' : 'worker_completed'},
          worker_notes = ${payload.workerNotes || null},
          completion_notes = nullif(${payload.workerNotes || ''}, ''),
          completion_photo_names = ${completionFiles}::jsonb,
          completion_submitted_at = now(),
          updated_at = now()
      where id = ${payload.assignmentId}
        and worker_id = ${context.session.user_id}
      returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
    `;
  } else {
    updatedRows = isAdmin ? await db.sql`
      update worker_assignments
      set status = ${payload.status},
          worker_notes = ${payload.workerNotes || null},
          updated_at = now()
      where id = ${payload.assignmentId}
      returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
    ` : await db.sql`
      update worker_assignments
      set status = ${payload.status},
          worker_notes = ${payload.workerNotes || null},
          updated_at = now()
      where id = ${payload.assignmentId}
        and worker_id = ${context.session.user_id}
      returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
    `;
  }

  const [updatedAssignment] = updatedRows;

  if (!updatedAssignment) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Assigned job not found for this account.' });
  }

  if (!isAdmin && !['assigned', 'in_progress', 'worker_completed', 'blocked'].includes(payload.status)) {
    return json(403, { ok: false, authenticated: true, authorized: false, message: 'Workers can only move assigned jobs into progress or submit completion for review.' });
  }

  if (payload.status === 'worker_completed' || payload.status === 'completed') {
    await db.sql`
      update job_requests
      set status = ${'admin_review'},
          updated_at = now()
      where id = ${updatedAssignment.job_request_id}
        and status in ('assigned', 'scheduled', 'in_progress', 'accepted', 'waiting_assignment')
    `;
  }

  if (payload.status === 'blocked') {
    if (payload.blockedNeedsAdminHelp) {
      await db.sql`
        update job_requests
        set status = 'needs_review',
            admin_notes = concat(coalesce(admin_notes, ''), case when coalesce(admin_notes, '') = '' then '' else E'\n\n' end, ${`Worker blocked escalation: ${payload.blockedReason}`}),
            updated_at = now()
        where id = ${updatedAssignment.job_request_id}
      `;
    }
    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${context.session.user_id},
        ${'worker_assignment.blocked'},
        ${'worker_assignment'},
        ${updatedAssignment.id},
        ${JSON.stringify({ jobRequestId: updatedAssignment.job_request_id, blockedReason: payload.blockedReason, needsAdminHelp: payload.blockedNeedsAdminHelp })}::jsonb
      )
    `;
  }

  if (payload.customMaterialName && Number(payload.customMaterialQuantity) > 0) {
    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${context.session.user_id},
        ${'worker_material.custom_used'},
        ${'worker_assignment'},
        ${updatedAssignment.id},
        ${JSON.stringify({ jobRequestId: updatedAssignment.job_request_id, name: payload.customMaterialName, quantity: payload.customMaterialQuantity, unitCostCents: payload.customMaterialUnitCostCents, billable: payload.customMaterialBillable, note: payload.inventoryNote })}::jsonb
      )
    `;
  }

  if (payload.inventoryItemId && Number(payload.inventoryQuantityUsed) > 0) {
    const quantityUsed = Number(payload.inventoryQuantityUsed);
    const quantityDelta = quantityUsed * -1;
    const [inventoryItem] = await db.sql`
      update inventory_items
      set quantity_on_hand = quantity_on_hand + ${quantityDelta},
          updated_at = now()
      where id = ${payload.inventoryItemId}
        and is_active = true
      returning id, name, quantity_on_hand, unit
    `;

    if (!inventoryItem) {
      return json(404, { ok: false, authenticated: true, authorized: false, message: 'Inventory item not found.' });
    }

    await db.sql`
      insert into inventory_adjustments (inventory_item_id, adjustment_type, quantity_delta, note, job_request_id, created_by)
      values (
        ${inventoryItem.id},
        ${'used'},
        ${quantityDelta},
        ${payload.inventoryNote || `Used on worker assignment ${updatedAssignment.id}`},
        ${updatedAssignment.job_request_id},
        ${context.session.user_id}
      )
    `;
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${context.session.user_id},
      ${'worker_assignment.updated'},
      ${'worker_assignment'},
      ${updatedAssignment.id},
      ${JSON.stringify({ source: 'worker_dashboard', status: payload.status, jobRequestId: updatedAssignment.job_request_id })}::jsonb
    )
  `;

  return json(200, {
    ok: true,
    authenticated: true,
    authorized: true,
    assignment: {
      id: updatedAssignment.id,
      jobRequestId: updatedAssignment.job_request_id,
      workerId: updatedAssignment.worker_id,
      status: updatedAssignment.status,
      scheduledDate: mapDate(updatedAssignment.scheduled_date),
      startTime: updatedAssignment.start_time,
      endTime: updatedAssignment.end_time,
      notes: updatedAssignment.notes,
      workerNotes: updatedAssignment.worker_notes,
      createdAt: updatedAssignment.created_at,
      updatedAt: updatedAssignment.updated_at,
    },
  });
};

const handlePost = async ({ request, db, context }) => {
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

  const payload = buildWorkerCreatePayload(body);
  if (!payload.jobRequestId) return json(422, { ok: false, message: 'Job request is required.' });
  if (!WORKER_ASSIGNMENT_STATUSES.has(payload.status)) return json(422, { ok: false, message: 'Choose a valid assignment status.' });

  const isAdmin = context.roleKeys.includes('admin');
  const workerId = isAdmin ? (payload.workerId || context.session.user_id) : context.session.user_id;

  const [jobRequest] = await db.sql`select id from job_requests where id = ${payload.jobRequestId} limit 1`;
  if (!jobRequest) return json(404, { ok: false, message: 'Job request not found.' });

  const [existingAssignment] = await db.sql`
    select id, status
    from worker_assignments
    where job_request_id = ${payload.jobRequestId}
      and worker_id = ${workerId}
      and status <> 'cancelled'
    order by created_at desc
    limit 1
  `;
  if (existingAssignment) {
    return json(409, { ok: false, message: 'This worker already has an active assignment for that job request.' });
  }

  const [assignment] = await db.sql`
    insert into worker_assignments (job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes)
    values (${payload.jobRequestId}, ${workerId}, ${payload.status}, ${payload.scheduledDate || null}, ${payload.startTime || null}, ${payload.endTime || null}, ${payload.notes || null}, ${null})
    returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, created_at, updated_at
  `;

  return json(201, {
    ok: true,
    authenticated: true,
    authorized: true,
    assignment: {
      id: assignment.id,
      jobRequestId: assignment.job_request_id,
      workerId: assignment.worker_id,
      status: assignment.status,
      scheduledDate: mapDate(assignment.scheduled_date),
      startTime: assignment.start_time,
      endTime: assignment.end_time,
      notes: assignment.notes,
      workerNotes: assignment.worker_notes,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    },
  });
};

export const createWorkerJobsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to view assigned jobs.' });
  }

  try {
    const db = await getDatabase();
    const context = await loadSessionContext(db, sessionToken);

    if (!context) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    if (!hasWorkerAccess(context.roleKeys, context.permissionKeys)) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Worker access required to view assigned jobs.' });
    }

    const path = new URL(request.url).pathname;
    if (request.method === 'PATCH') {
      return await handlePatch({ request, db, context });
    }
    if (request.method === 'POST' && path.endsWith('/complete')) {
      return await handlePatch({ request, db, context });
    }
    if (request.method === 'POST') {
      return await handlePost({ request, db, context });
    }

    const assignments = await listAssignments(db, context);
    const inventoryItems = await listInventoryItems(db);

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: context.session.user_id,
        email: context.session.email,
        fullName: context.session.full_name,
        roles: context.roleKeys,
      },
      assignments,
      inventoryItems,
      summary: {
        assigned: assignments.filter((assignment) => !['completed', 'cancelled'].includes(assignment.status)).length,
        today: assignments.filter((assignment) => assignment.scheduledDate === new Date().toISOString().slice(0, 10)).length,
      },
      checklistTemplates: SERVICE_CHECKLIST_TEMPLATES,
    });
  } catch (error) {
    console.error('Failed to load worker jobs', error);

    return json(500, { ok: false, message: 'We could not load assigned jobs right now.' });
  }
};

export default createWorkerJobsHandler();

export const config = {
  path: '/api/worker/jobs',
};
