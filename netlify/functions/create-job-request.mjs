import {
  createMagicLinkUrl,
  createToken,
  hashToken,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  sendMagicLinkEmail,
} from './auth-utils.mjs';
import { verifyRecaptchaToken } from './recaptcha-utils.mjs';

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'city', 'streetAddress', 'service', 'description'];
const MAX_FIELD_LENGTHS = {
  name: 140,
  phone: 60,
  email: 254,
  city: 140,
  streetAddress: 240,
  workScope: 120,
  service: 120,
  subcategory: 160,
  timeframe: 80,
  description: 4000,
  recaptchaToken: 4000,
};

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_REQUEST_ESTIMATE_TIMEOUT_MS || 9000);
const DEFAULT_LABOR_RATE_CENTS = Number(process.env.AI_LABOR_RATE_CENTS || (Number(process.env.AI_LABOR_RATE || 95) * 100));
const TRIP_CHARGE_CENTS = Number(process.env.AI_TRIP_CHARGE_CENTS || (Number(process.env.AI_TRIP_CHARGE || 75) * 100));
const MATERIAL_MARKUP = Number(process.env.AI_MATERIAL_MARKUP_PERCENT || 25) / 100;

const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const clampMoney = (value) => Math.max(0, Math.round(Number(value || 0)));

const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const normalizePayload = (payload) => {
  const normalized = {};

  for (const [field, maxLength] of Object.entries(MAX_FIELD_LENGTHS)) {
    normalized[field] = clean(payload[field]).slice(0, maxLength);
  }

  normalized.email = normalized.email.toLowerCase();
  normalized.botField = clean(payload['bot-field']);

  // Backward compatibility: older form has Work Scope dropdown named workScope and Type of Work named service.
  normalized.workCategory = normalized.service;
  normalized.customerSupplied = clean(payload.customerSupplied || payload.customer_supplied || '').slice(0, 500);
  normalized.photoNames = Array.isArray(payload.photoNames) ? payload.photoNames.map((name) => clean(name).slice(0, 160)).filter(Boolean) : [];

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

const baseMaterials = (payload) => {
  const text = slug(`${payload.workScope} ${payload.service} ${payload.subcategory} ${payload.description}`);
  const add = (name, quantity, lowCents, highCents, notes = '') => ({ name, quantity, lowCents, highCents, notes });

  if (/mini split|mini-split|ductless/.test(text)) {
    return [
      add('Mini split system/package allowance', 1, 65000, 220000, 'Customer supplied equipment may reduce this.'),
      add('Line set kit', 1, 12000, 32000),
      add('Line hide kit and fittings', 1, 9000, 32000),
      add('Communication wire', 1, 4500, 15000),
      add('Disconnect, whip, breaker, conduit, fittings allowance', 1, 12000, 52500),
      add('Condenser pad/bracket, anchors, sealants, drain materials', 1, 8500, 32000),
    ];
  }

  if (/faucet/.test(text)) {
    return [
      add('Faucet allowance', 1, 4500, 28000),
      add('Supply lines', 1, 1500, 4500),
      add('Putty/silicone and consumables', 1, 600, 1800),
      add('Drain/shutoff allowance', 1, 2500, 12000),
    ];
  }

  if (/toilet/.test(text)) {
    return [
      add('Toilet allowance', 1, 12000, 45000),
      add('Wax ring, bolts, supply line, caulk', 1, 2500, 9000),
      add('Shutoff valve allowance', 1, 900, 3500),
    ];
  }

  if (/electrical|outlet|switch|gfci|light|fan|fixture/.test(text)) {
    return [
      add('Device/fixture allowance', 1, 800, 20000),
      add('Cover plate, connectors, pigtails, fasteners', 1, 1200, 6000),
      add('Box extender/repair allowance', 1, 400, 2500),
    ];
  }

  if (/drywall|patch|texture/.test(text)) {
    return [
      add('Drywall patch materials', 1, 1000, 5500),
      add('Joint compound, tape, texture', 1, 1200, 6500),
      add('Primer/paint touch-up allowance', 1, 2000, 10000),
    ];
  }

  return [
    add(`${payload.service || 'General'} materials allowance`, 1, 2500, 30000),
    add('Fasteners, anchors, sealants, consumables', 1, 1500, 9000),
  ];
};

const baseLaborItems = (payload) => {
  const text = slug(`${payload.workScope} ${payload.service} ${payload.subcategory} ${payload.description}`);

  if (/mini split|mini-split|ductless/.test(text)) {
    return [
      { name: 'Layout and site prep', lowHours: 0.75, highHours: 1.5, notes: 'Confirm locations, paths, access, and protection.' },
      { name: 'Mount and wall penetration', lowHours: 1.25, highHours: 2.5, notes: 'Wall type/access may change scope.' },
      { name: 'Route line set, drain, communication, and exterior finish', lowHours: 3, highHours: 8, notes: 'Length/access affects estimate.' },
      { name: 'Electrical/HVAC coordination and startup', lowHours: 2.5, highHours: 8.5, notes: 'Licensed trade/permit review may be required.' },
    ];
  }

  const items = [
    { name: 'Site verification and protection', lowHours: 0.25, highHours: 0.75, notes: 'Confirm scope and protect work area.' },
    { name: 'Setup and prep/removal', lowHours: 0.25, highHours: 1.5, notes: 'Includes utility shutoff if needed.' },
    { name: 'Main repair/replacement/install work', lowHours: 1, highHours: 4, notes: 'Depends on access and hidden conditions.' },
    { name: 'Test, cleanup, and walkthrough', lowHours: 0.25, highHours: 0.75, notes: 'Verify operation and clean area.' },
  ];

  if (/troubleshoot|repair|not working|leak|clog|trip|tripping|noise/.test(text)) {
    items[2] = { name: 'Diagnosis and repair attempt', lowHours: 1, highHours: 4.5, notes: 'Final repair cost depends on findings.' };
  }

  return items;
};

const flagNotes = (payload) => {
  const text = slug(`${payload.workScope} ${payload.service} ${payload.subcategory} ${payload.description}`);
  const flags = [];

  if (/panel|breaker|new circuit|dedicated circuit|disconnect|meter/.test(text)) {
    flags.push('Electrical panel/new circuit/disconnect scope may require licensed electrician review.');
  }

  if (/gas|propane/.test(text)) {
    flags.push('Gas work requires licensed trade review.');
  }

  if (/mini split|hvac|refrigerant|condenser/.test(text)) {
    flags.push('HVAC/refrigerant/startup scope may require licensed HVAC review and permit verification.');
  }

  if (/roof|structural|truss|rafter/.test(text)) {
    flags.push('Roofing/structural work is excluded or requires specialty contractor review.');
  }

  if (/mold|asbestos|lead|sewage/.test(text)) {
    flags.push('Hazardous conditions may stop work until remediated.');
  }

  if (/leak|water damage|rot|rust|corrosion/.test(text)) {
    flags.push('Hidden damage or corroded parts may change final pricing.');
  }

  return flags;
};

const missingQuestions = (payload) => {
  const text = slug(`${payload.workScope} ${payload.service} ${payload.subcategory} ${payload.description}`);
  const questions = [];

  if (!payload.workScope) questions.push('Is this troubleshooting/repair, replacing existing, or a new install?');
  if (!payload.subcategory) questions.push('What specific item or system is involved?');
  if (!/(photo|picture|image|uploaded)/.test(text)) questions.push('Can you provide photos of the work area and existing item?');
  if (!/(model|brand|size|btu|amp|volt|inch|measurement|feet|ft)/.test(text)) questions.push('Do you have brand, model, size, voltage, measurements, or part information?');

  return questions.slice(0, 6);
};

const estimateFromPayload = (payload) => {
  const laborItems = baseLaborItems(payload);
  const materials = baseMaterials(payload);
  const flags = flagNotes(payload);
  const questions = missingQuestions(payload);

  const lowHours = laborItems.reduce((sum, item) => sum + Number(item.lowHours || 0), 0);
  const highHours = laborItems.reduce((sum, item) => sum + Number(item.highHours || item.lowHours || 0), 0);

  const laborLowCents = Math.round(lowHours * DEFAULT_LABOR_RATE_CENTS);
  const laborHighCents = Math.round(highHours * DEFAULT_LABOR_RATE_CENTS);

  const materialLowCents = materials.reduce((sum, item) => sum + clampMoney(item.lowCents) * Number(item.quantity || 1), 0);
  const materialHighCents = materials.reduce((sum, item) => sum + clampMoney(item.highCents) * Number(item.quantity || 1), 0);

  const markupLowCents = Math.round(materialLowCents * MATERIAL_MARKUP);
  const markupHighCents = Math.round(materialHighCents * MATERIAL_MARKUP);

  const totalLowCents = Math.max(17500, laborLowCents + materialLowCents + markupLowCents + TRIP_CHARGE_CENTS);
  const totalHighCents = Math.max(totalLowCents, laborHighCents + materialHighCents + markupHighCents + TRIP_CHARGE_CENTS);

  return {
    title: `${payload.service || 'Service'} estimate draft`,
    summary: [
      `Scope: ${payload.workScope || 'Request Estimate'} - ${payload.service || 'Service request'}${payload.subcategory ? ` (${payload.subcategory})` : ''}.`,
      '',
      'Labor:',
      ...laborItems.map((item) => `- ${item.name}: ${item.lowHours}-${item.highHours} hrs. ${item.notes || ''}`),
      '',
      'Materials / allowances:',
      ...materials.map((item) => `- ${item.name}: qty ${item.quantity}, $${(item.lowCents / 100).toFixed(2)}-$${(item.highCents / 100).toFixed(2)}. ${item.notes || ''}`),
      ...(questions.length ? ['', 'Missing info / follow-up questions:', ...questions.map((q) => `- ${q}`)] : []),
      ...(flags.length ? ['', 'Risk / licensed trade notes:', ...flags.map((flag) => `- ${flag}`)] : []),
      '',
      'This draft was automatically created from the public Request Estimate form and must be reviewed by admin before sending to the customer.',
    ].join('\n'),
    amountCents: totalHighCents,
    laborHours: highHours,
    laborRateCents: DEFAULT_LABOR_RATE_CENTS,
    materials,
    laborItems,
    missingInfoQuestions: questions,
    riskFlags: flags,
    totals: {
      laborLowCents,
      laborHighCents,
      materialLowCents,
      materialHighCents,
      totalLowCents,
      totalHighCents,
    },
  };
};

const tryImproveDraftWithOpenAi = async (payload, draft) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return draft;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: 'You are a senior handyman estimator. Return strict JSON only. Do not send quotes to customers. Improve the estimate draft for admin review.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Improve this Request Estimate draft. Keep it practical and handyman-focused. Add missing materials, labor notes, risk notes, and follow-up questions. Return JSON with title, summary, amountCents, missingInfoQuestions, riskFlags.',
              request: payload,
              draft,
            }),
          },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 2200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return draft;

    const data = await response.json();
    const raw = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    if (!raw) return draft;

    const parsed = JSON.parse(raw);
    return {
      ...draft,
      ...parsed,
      amountCents: Number.isInteger(Number(parsed.amountCents)) && Number(parsed.amountCents) > 0 ? Number(parsed.amountCents) : draft.amountCents,
      summary: clean(parsed.summary).slice(0, 4000) || draft.summary,
      title: clean(parsed.title).slice(0, 180) || draft.title,
      aiEnhanced: true,
    };
  } catch {
    clearTimeout(timer);
    return draft;
  }
};

const createAutomaticEstimateDraft = async ({ db, jobRequest, client, payload }) => {
  let draft = estimateFromPayload(payload);
  draft = await tryImproveDraftWithOpenAi(payload, draft);

  const [quote] = await db.sql`
    insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, created_by)
    values (${jobRequest.id}, ${client.id}, 'draft', ${draft.title}, ${draft.summary || null}, ${draft.amountCents || 0}, null)
    returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
  `;

  await db.sql`
    update job_requests
    set status = 'quote_in_progress', updated_at = now()
    where id = ${jobRequest.id}
      and status in ('new', 'needs_review', 'quote_in_progress')
  `;

  await db.sql`
    insert into audit_events (event_type, entity_type, entity_id, metadata)
    values (
      ${'estimate_draft.created'},
      ${'quote'},
      ${quote.id},
      ${JSON.stringify({
        source: 'public_request_estimate_ai',
        jobRequestId: jobRequest.id,
        clientId: client.id,
        amountCents: draft.amountCents || 0,
        workScope: payload.workScope,
        service: payload.service,
        aiEnhanced: Boolean(draft.aiEnhanced),
        missingInfoQuestions: draft.missingInfoQuestions || [],
        riskFlags: draft.riskFlags || [],
      })}::jsonb
    )
  `;

  return { quote, draft };
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

  const recaptchaCheck = await verifyRecaptchaToken({ token: payload.recaptchaToken, request, action: 'request_work' });
  if (!recaptchaCheck.ok) {
    return json(403, { ok: false, message: `reCAPTCHA verification failed. Please try again. (${recaptchaCheck.reason})` });
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
        work_scope,
        work_category,
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
        ${payload.workScope || null},
        ${payload.workCategory || payload.service || null},
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
        ${JSON.stringify({
          source: 'public_request_estimate_form',
          clientId: client.id,
          propertyId: property.id,
          city: payload.city,
          streetAddress: payload.streetAddress,
          workScope: payload.workScope,
          service: payload.service,
          subcategory: payload.subcategory,
        })}::jsonb
      )
    `;

    let estimateDraftResult = null;

    try {
      estimateDraftResult = await createAutomaticEstimateDraft({ db, jobRequest, client, payload });
    } catch (draftError) {
      console.error('Automatic estimate draft failed', draftError);
      await db.sql`
        insert into audit_events (event_type, entity_type, entity_id, metadata)
        values (
          ${'estimate_draft.failed'},
          ${'job_request'},
          ${jobRequest.id},
          ${JSON.stringify({ source: 'public_request_estimate_form', error: draftError?.message || 'unknown' })}::jsonb
        )
      `;
    }

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
      estimateDraftCreated: Boolean(estimateDraftResult?.quote?.id),
      estimateDraft: estimateDraftResult ? {
        id: estimateDraftResult.quote.id,
        status: estimateDraftResult.quote.status,
        title: estimateDraftResult.quote.title,
        summary: estimateDraftResult.quote.summary,
        amountCents: estimateDraftResult.quote.amount_cents,
        missingInfoQuestions: estimateDraftResult.draft.missingInfoQuestions || [],
        riskFlags: estimateDraftResult.draft.riskFlags || [],
      } : null,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Estimate request saved. We are preparing your estimate, and a secure client portal link was sent to your email.'
        : 'Estimate request saved. We are preparing your estimate. We could not send the confirmation email yet, but your request is in the portal.',
      ...(emailResult.sent ? {} : { devMagicLink: magicLinkUrl }),
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
