import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const WORKER_ASSIGNMENT_STATUSES = new Set(['assigned', 'accepted', 'in_progress', 'blocked', 'completed', 'cancelled']);

const normalizePhotoNames = (value) => (Array.isArray(value) ? value : [])
  .map((name) => clean(name, 240))
  .filter(Boolean)
  .slice(0, 12);

const normalizeWorkerUpdatePayload = (body = {}) => ({
  assignmentId: clean(body.assignmentId, 80),
  status: clean(body.status, 40),
  workerNotes: clean(body.workerNotes, 4000),
  completionNotes: clean(body.completionNotes, 4000),
  completionPhotoNames: normalizePhotoNames(body.completionPhotoNames),
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
  completionNotes: row.completion_notes,
  completionPhotoNames: Array.isArray(row.completion_photo_names) ? row.completion_photo_names : [],
  completionSubmittedAt: row.completion_submitted_at,
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
  const rolePermissions = await db.sql`
    select distinct role_permissions.permission_key
    from user_roles
    join roles on roles.id = user_roles.role_id
    join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
    where user_roles.user_id = ${session.user_id}
    order by role_permissions.permission_key
  `;
  const permissionKeys = getPermissionKeysForRoles(roleKeys, rolePermissions.map((permission) => permission.permission_key));

  return { session, roleKeys, permissionKeys };
};

const hasWorkerAccess = (roleKeys, permissionKeys) => roleKeys.includes('admin') || roleKeys.includes('worker') || permissionKeys.includes('worker.jobs.manage');

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
      worker_assignments.completion_notes,
      worker_assignments.completion_photo_names,
      worker_assignments.completion_submitted_at,
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
      worker_assignments.completion_notes,
      worker_assignments.completion_photo_names,
      worker_assignments.completion_submitted_at,
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
    return json(422, { ok: false, message: 'Assignment is required.' });
  }

  if (!WORKER_ASSIGNMENT_STATUSES.has(payload.status)) {
    return json(422, { ok: false, message: 'Choose a valid assignment status.' });
  }

  if (payload.status === 'completed' && (!payload.completionNotes || payload.completionPhotoNames.length === 0)) {
    return json(422, { ok: false, message: 'Completion notes and at least one completion photo are required before completing work.' });
  }

  const isAdmin = context.roleKeys.includes('admin');
  const [updatedAssignment] = isAdmin ? await db.sql`
    update worker_assignments
    set status = ${payload.status},
        worker_notes = ${payload.workerNotes || null},
        completion_notes = ${payload.completionNotes || null},
        completion_photo_names = ${JSON.stringify(payload.completionPhotoNames)}::jsonb,
        completion_submitted_at = case when ${payload.status} = 'completed' then now() else completion_submitted_at end,
        updated_at = now()
    where id = ${payload.assignmentId}
    returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, completion_notes, completion_photo_names, completion_submitted_at, created_at, updated_at
  ` : await db.sql`
    update worker_assignments
    set status = ${payload.status},
        worker_notes = ${payload.workerNotes || null},
        completion_notes = ${payload.completionNotes || null},
        completion_photo_names = ${JSON.stringify(payload.completionPhotoNames)}::jsonb,
        completion_submitted_at = case when ${payload.status} = 'completed' then now() else completion_submitted_at end,
        updated_at = now()
    where id = ${payload.assignmentId}
      and worker_id = ${context.session.user_id}
    returning id, job_request_id, worker_id, status, scheduled_date, start_time, end_time, notes, worker_notes, completion_notes, completion_photo_names, completion_submitted_at, created_at, updated_at
  `;

  if (!updatedAssignment) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Assigned job not found for this account.' });
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
      completionNotes: updatedAssignment.completion_notes,
      completionPhotoNames: Array.isArray(updatedAssignment.completion_photo_names) ? updatedAssignment.completion_photo_names : [],
      completionSubmittedAt: updatedAssignment.completion_submitted_at,
      createdAt: updatedAssignment.created_at,
      updatedAt: updatedAssignment.updated_at,
    },
  });
};

export const createWorkerJobsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
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

    if (request.method === 'PATCH') {
      return await handlePatch({ request, db, context });
    }

    const assignments = await listAssignments(db, context);

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
      summary: {
        assigned: assignments.filter((assignment) => !['completed', 'cancelled'].includes(assignment.status)).length,
        today: assignments.filter((assignment) => assignment.scheduledDate === new Date().toISOString().slice(0, 10)).length,
      },
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
