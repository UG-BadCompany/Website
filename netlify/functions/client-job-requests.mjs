import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const ACTIVE_REQUEST_STATUSES = new Set(['new', 'needs_review', 'quote_in_progress', 'quote_sent', 'accepted', 'scheduled', 'in_progress', 'pending_review', 'waiting_payment']);
const MAX_FIELD_LENGTHS = {
  propertyId: 80,
  label: 120,
  phone: 60,
  city: 140,
  streetAddress: 240,
  accessNotes: 1000,
  service: 120,
  timeframe: 80,
  description: 4000,
  attachmentNames: 1200,
  jobRequestId: 80,
  requestedDate: 80,
  additionalInfo: 4000,
  updateType: 40,
  completionAction: 40,
};

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

const mapDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const mapJobRequest = (request) => ({
  id: request.id,
  status: request.status,
  city: request.city,
  streetAddress: request.street_address,
  serviceType: request.service_type,
  preferredTimeframe: request.preferred_timeframe,
  description: request.description,
  estimatedStartDate: mapDate(request.estimated_start_date),
  completionDate: mapDate(request.completion_date),
  createdAt: request.created_at,
  updatedAt: request.updated_at,
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

const normalizePayload = (body = {}) => Object.fromEntries(
  Object.entries(MAX_FIELD_LENGTHS).map(([field, maxLength]) => [field, clean(body[field], maxLength)]),
);

const getDescriptionWithAttachmentSummary = (payload) => [
  payload.description,
  payload.attachmentNames ? `

Client attachments to review:
${payload.attachmentNames}` : '',
].filter(Boolean).join('');

const validateJobRequestPayload = (payload, session) => {
  if (!payload.service) {
    return 'Service is required.';
  }

  if (!payload.description) {
    return 'Description is required.';
  }

  if (!payload.propertyId && (!payload.streetAddress || !payload.city)) {
    return 'Choose an existing property or enter a street address and city.';
  }

  if (!session.phone && !payload.phone) {
    return 'Phone is required before creating a portal request.';
  }

  return null;
};

const loadSession = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name, app_users.phone
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;

  if (!session) {
    return null;
  }

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  return session;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  const roleKeys = roles.map((role) => role.key);

  return roleKeys.length ? roleKeys : ['client'];
};

const requireClientAccess = (roleKeys) => roleKeys.includes('client') || roleKeys.includes('admin');

const validateClientRequestUpdatePayload = (payload) => {
  if (!payload.jobRequestId) {
    return 'Job request is required.';
  }

  if (!payload.service) {
    return 'Service is required.';
  }

  if (!payload.description && !payload.additionalInfo && !payload.requestedDate) {
    return 'Add project details, a requested date change, or additional information.';
  }

  return null;
};

const validatePropertyPayload = (payload) => {
  if (!payload.propertyId) {
    return 'Property is required.';
  }

  if (!payload.streetAddress || !payload.city) {
    return 'Street address and city are required to update a property.';
  }

  return null;
};



const approveClientCompletedRequest = async (db, userId, payload) => {
  const [jobRequest] = await db.sql`
    update job_requests
    set status = ${'completed'},
        completion_date = coalesce(completion_date, now()::date),
        updated_at = now()
    where id = ${payload.jobRequestId}
      and client_id = ${userId}
      and status = ${'pending_review'}
    returning id, status, service_type, preferred_timeframe, description, completion_date, updated_at
  `;

  return jobRequest || null;
};

const updateClientJobRequest = async (db, userId, payload) => {
  const [jobRequest] = await db.sql`
    update job_requests
    set service_type = ${payload.service},
        preferred_timeframe = ${payload.requestedDate || payload.timeframe || null},
        description = ${payload.description || payload.additionalInfo || ''},
        updated_at = now()
    where id = ${payload.jobRequestId}
      and client_id = ${userId}
      and status in ('new', 'needs_review', 'quote_in_progress', 'quote_sent', 'accepted', 'scheduled', 'in_progress', 'pending_review', 'waiting_payment')
    returning id, status, service_type, preferred_timeframe, description, updated_at
  `;

  return jobRequest || null;
};


const deleteClientJobRequest = async (db, userId, payload) => {
  const [jobRequest] = await db.sql`
    delete from job_requests
    where id = ${payload.jobRequestId}
      and client_id = ${userId}
      and status in ('new', 'needs_review', 'quote_in_progress', 'quote_sent')
    returning id, status, service_type, requester_email
  `;

  return jobRequest || null;
};

const updateClientProperty = async (db, userId, payload) => {
  const [property] = await db.sql`
    update properties
    set label = ${payload.label || null},
        street = ${payload.streetAddress},
        city = ${payload.city},
        access_notes = ${payload.accessNotes || null},
        updated_at = now()
    where id = ${payload.propertyId}
      and client_id = ${userId}
    returning id, label, street, city, state, postal_code, access_notes, created_at, updated_at
  `;

  return property || null;
};

const findOrCreateClientProperty = async (db, userId, payload) => {
  if (payload.propertyId) {
    const [property] = await db.sql`
      select id, street, city
      from properties
      where id = ${payload.propertyId}
        and client_id = ${userId}
      limit 1
    `;

    return property || null;
  }

  const [existingProperty] = await db.sql`
    select id, street, city
    from properties
    where client_id = ${userId}
      and lower(street) = lower(${payload.streetAddress})
      and lower(city) = lower(${payload.city})
      and state = 'AZ'
    limit 1
  `;

  if (existingProperty) {
    return existingProperty;
  }

  const [property] = await db.sql`
    insert into properties (client_id, label, street, city, state, access_notes)
    values (${userId}, ${payload.label || 'Portal property'}, ${payload.streetAddress}, ${payload.city}, 'AZ', ${payload.accessNotes || null})
    returning id, street, city
  `;

  return property;
};

const listClientData = async (db, userId) => {
  const jobRequests = await db.sql`
    select
      job_requests.id,
      job_requests.status,
      job_requests.city,
      job_requests.street_address,
      job_requests.service_type,
      job_requests.preferred_timeframe,
      job_requests.description,
      job_requests.estimated_start_date,
      job_requests.completion_date,
      job_requests.created_at,
      job_requests.updated_at,
      properties.id as property_id,
      properties.label as property_label,
      properties.street as property_street,
      properties.city as property_city,
      properties.state as property_state,
      properties.postal_code as property_postal_code,
      properties.access_notes as property_access_notes
    from job_requests
    left join properties on properties.id = job_requests.property_id
      and properties.client_id = ${userId}
    where job_requests.client_id = ${userId}
      and job_requests.status <> 'completed'
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
      and job_requests.client_id = ${userId}
    where properties.client_id = ${userId}
    group by properties.id
    order by coalesce(max(job_requests.created_at), properties.created_at) desc
    limit 25
  `;
  const mappedRequests = jobRequests.map(mapJobRequest);
  const mappedProperties = properties.map(mapProperty);

  return {
    requests: mappedRequests,
    properties: mappedProperties,
    summary: {
      total: mappedRequests.length,
      active: countActiveRequests(mappedRequests),
      properties: mappedProperties.length,
    },
  };
};

const handleGet = async ({ db, session, roleKeys }) => {
  const clientData = await listClientData(db, session.user_id);

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
    ...clientData,
  });
};

const handlePost = async ({ request, db, session, roleKeys }) => {
  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizePayload(body);
  const validationError = validateJobRequestPayload(payload, session);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  const property = await findOrCreateClientProperty(db, session.user_id, payload);

  if (!property) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Property not found for this account.' });
  }

  const requestPhone = session.phone || payload.phone;
  const [jobRequest] = await db.sql`
    insert into job_requests (
      client_id,
      property_id,
      requester_name,
      requester_email,
      requester_phone,
      city,
      street_address,
      service_type,
      preferred_timeframe,
      description
    ) values (
      ${session.user_id},
      ${property.id},
      ${session.full_name || session.email},
      ${session.email},
      ${requestPhone},
      ${property.city || payload.city},
      ${property.street || payload.streetAddress},
      ${payload.service},
      ${payload.timeframe || null},
      ${getDescriptionWithAttachmentSummary(payload)}
    )
    returning id, created_at
  `;

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${session.user_id},
      ${'client_job_request.created'},
      ${'job_request'},
      ${jobRequest.id},
      ${JSON.stringify({ source: 'client_dashboard', propertyId: property.id, service: payload.service, attachments: payload.attachmentNames || null })}::jsonb
    )
  `;

  return json(201, {
    ok: true,
    authenticated: true,
    authorized: true,
    user: {
      id: session.user_id,
      email: session.email,
      fullName: session.full_name,
      roles: roleKeys,
    },
    id: jobRequest.id,
    propertyId: property.id,
    createdAt: jobRequest.created_at,
    message: 'Request saved to your account.',
  });
};


const handleDelete = async ({ request, db, session, roleKeys }) => {
  const body = await parseJsonBody(request);
  const payload = normalizePayload(body);

  if (!payload.jobRequestId) {
    return json(422, { ok: false, message: 'Job request is required.' });
  }

  if (clean(body.confirmation, 20).toUpperCase() !== 'DELETE') {
    return json(422, { ok: false, message: 'Type DELETE to permanently delete this request.' });
  }

  const deletedRequest = await deleteClientJobRequest(db, session.user_id, payload);

  if (!deletedRequest) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Only open requests can be permanently deleted.' });
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${session.user_id},
      ${'client_job_request.permanently_deleted'},
      ${'job_request'},
      ${deletedRequest.id},
      ${JSON.stringify({ source: 'client_dashboard', status: deletedRequest.status, serviceType: deletedRequest.service_type })}::jsonb
    )
  `;

  return json(200, {
    ok: true,
    authenticated: true,
    authorized: true,
    deleted: true,
    requestId: deletedRequest.id,
    user: {
      id: session.user_id,
      email: session.email,
      fullName: session.full_name,
      roles: roleKeys,
    },
  });
};

const handlePatch = async ({ request, db, session, roleKeys }) => {
  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizePayload(body);

  if (payload.jobRequestId && payload.completionAction === 'approve_completed') {
    const jobRequest = await approveClientCompletedRequest(db, session.user_id, payload);

    if (!jobRequest) {
      return json(404, { ok: false, authenticated: true, authorized: false, message: 'Pending completion request not found for this account.' });
    }

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'client_job_request.completed_approved'},
        ${'job_request'},
        ${jobRequest.id},
        ${JSON.stringify({ source: 'client_dashboard' })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      request: {
        id: jobRequest.id,
        status: jobRequest.status,
        serviceType: jobRequest.service_type,
        preferredTimeframe: jobRequest.preferred_timeframe,
        description: jobRequest.description,
        completionDate: mapDate(jobRequest.completion_date),
        updatedAt: jobRequest.updated_at,
      },
    });
  }

  if (payload.jobRequestId) {
    const validationError = validateClientRequestUpdatePayload(payload);

    if (validationError) {
      return json(422, { ok: false, message: validationError });
    }

    const jobRequest = await updateClientJobRequest(db, session.user_id, payload);

    if (!jobRequest) {
      return json(404, { ok: false, authenticated: true, authorized: false, message: 'Open job request not found for this account.' });
    }

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'client_job_request.updated'},
        ${'job_request'},
        ${jobRequest.id},
        ${JSON.stringify({ source: 'client_dashboard', requestedDate: payload.requestedDate || null, updateType: payload.updateType || 'client_edit' })}::jsonb
      )
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
      request: {
        id: jobRequest.id,
        status: jobRequest.status,
        serviceType: jobRequest.service_type,
        preferredTimeframe: jobRequest.preferred_timeframe,
        description: jobRequest.description,
        updatedAt: jobRequest.updated_at,
      },
    });
  }

  const validationError = validatePropertyPayload(payload);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  const property = await updateClientProperty(db, session.user_id, payload);

  if (!property) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Property not found for this account.' });
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${session.user_id},
      ${'client_property.updated'},
      ${'property'},
      ${property.id},
      ${JSON.stringify({ source: 'client_dashboard' })}::jsonb
    )
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
    property: mapProperty(property),
  });
};

export const createClientJobRequestsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to view your job requests.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const roleKeys = await loadRoleKeys(db, session.user_id);

    if (!requireClientAccess(roleKeys)) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client role required to view client job requests.' });
    }

    if (request.method === 'POST') {
      return await handlePost({ request, db, session, roleKeys });
    }

    if (request.method === 'PATCH') {
      return await handlePatch({ request, db, session, roleKeys });
    }

    if (request.method === 'DELETE') {
      return await handleDelete({ request, db, session, roleKeys });
    }

    return await handleGet({ db, session, roleKeys });
  } catch (error) {
    console.error('Failed to load client job requests', error);

    return json(500, { ok: false, message: 'We could not load your job requests right now.' });
  }
};

export default createClientJobRequestsHandler();

export const config = {
  path: '/api/client/job-requests',
};
