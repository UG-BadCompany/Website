import {
  createMagicLinkUrl,
  createToken,
  hashToken,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  sendMagicLinkEmail,
  shouldExposeDevMagicLinks,
} from './auth-utils.mjs';

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'city', 'streetAddress', 'service', 'description'];
const MAX_FIELD_LENGTHS = {
  name: 140,
  phone: 60,
  email: 254,
  city: 140,
  streetAddress: 240,
  service: 120,
  timeframe: 80,
  description: 4000,
};

const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export const normalizePayload = (payload) => {
  const normalized = {};

  for (const [field, maxLength] of Object.entries(MAX_FIELD_LENGTHS)) {
    normalized[field] = clean(payload[field]).slice(0, maxLength);
  }

  normalized.botField = clean(payload['bot-field']);

  return normalized;
};

export const validatePayload = (payload) => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    return `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`;
  }

  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) {
    return 'Enter a valid email address.';
  }

  return null;
};

const loadDatabase = async () => {
  const { getDatabase } = await import('@netlify/database');

  return getDatabase();
};

const findOrCreateProperty = async (db, clientId, payload) => {
  const [existingProperty] = await db.sql`
    select id
    from properties
    where client_id = ${clientId}
      and lower(street) = lower(${payload.streetAddress})
      and lower(city) = lower(${payload.city})
      and state = 'AZ'
    limit 1
  `;

  if (existingProperty) {
    return existingProperty;
  }

  const [property] = await db.sql`
    insert into properties (client_id, label, street, city, state)
    values (${clientId}, 'Request property', ${payload.streetAddress}, ${payload.city}, 'AZ')
    returning id
  `;

  return property;
};

export const createJobRequestHandler = ({ getDatabase = loadDatabase, makeToken = createToken, sendEmail = sendMagicLinkEmail } = {}) => async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  let payload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  if (payload.botField) {
    return json(200, { ok: true, message: 'Request received.' });
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  try {
    const db = await getDatabase();
    const [client] = await db.sql`
      insert into app_users (auth_provider, auth_subject, email, full_name, phone)
      values ('magic_link', ${payload.email}, ${payload.email}, ${payload.name}, ${payload.phone})
      on conflict (email) do update set
        full_name = coalesce(nullif(app_users.full_name, ''), excluded.full_name),
        phone = coalesce(nullif(app_users.phone, ''), excluded.phone),
        is_active = true,
        updated_at = now()
      returning id, email
    `;

    await db.sql`
      insert into user_roles (user_id, role_id)
      select ${client.id}, roles.id
      from roles
      where roles.key = 'client'
      on conflict do nothing
    `;

    const property = await findOrCreateProperty(db, client.id, payload);

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
        ${client.id},
        ${property.id},
        ${payload.name},
        ${payload.email},
        ${payload.phone},
        ${payload.city},
        ${payload.streetAddress},
        ${payload.service},
        ${payload.timeframe || null},
        ${payload.description}
      )
      returning id, created_at
    `;

    await db.sql`
      insert into audit_events (event_type, entity_type, entity_id, metadata)
      values (
        ${'job_request.created'},
        ${'job_request'},
        ${jobRequest.id},
        ${JSON.stringify({ source: 'public_estimate_form', clientId: client.id, propertyId: property.id, city: payload.city, streetAddress: payload.streetAddress, service: payload.service })}::jsonb
      )
    `;

    const token = makeToken();
    const magicLinkUrl = createMagicLinkUrl(request, token);

    await db.sql`
      insert into auth_magic_links (email, token_hash, purpose, client_name, client_phone, expires_at)
      values (${payload.email}, ${hashToken(token)}, 'client_account', ${payload.name}, ${payload.phone}, ${minutesFromNow(MAGIC_LINK_TTL_MINUTES)}::timestamptz)
    `;

    let emailResult = { sent: false, reason: 'Email delivery is not configured.' };

    try {
      emailResult = await sendEmail({ to: payload.email, magicLinkUrl, purpose: 'client_account' });
    } catch (emailError) {
      console.error('Request confirmation email delivery failed', emailError);
      emailResult = { sent: false, reason: 'Email delivery failed.' };
    }

    return json(201, {
      ok: true,
      id: jobRequest.id,
      clientId: client.id,
      propertyId: property.id,
      createdAt: jobRequest.created_at,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Estimate request saved. Check your email for a confirmation and secure client portal link.'
        : 'Estimate request saved. We could not send the confirmation email yet, but your request is in the portal.',
      ...(!emailResult.sent && shouldExposeDevMagicLinks() ? { devMagicLink: magicLinkUrl } : {}),
    });
  } catch (error) {
    console.error('Failed to create job request', error);

    return json(500, {
      ok: false,
      message: 'We could not save the request right now. Please try again or use the standard form fallback.',
    });
  }
};

export default createJobRequestHandler();

export const config = {
  path: '/api/job-requests',
};
