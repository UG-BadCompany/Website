import {
  clean,
  getPermissionKeysForRoles,
  getFromEmail,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  parseJsonBody,
  shouldSendEmail,
} from './auth-utils.mjs';
import { saveAdminAiCorrection } from './ai-intelligence-engine.mjs';
import { analyzeEstimateIntake } from './estimate-intake-intelligence.mjs';

const QUOTE_STATUSES = new Set(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'pending_review', 'needs_review', 'quote_in_progress', 'information_needed', 'cancelled']);
const QUOTE_LIST_STATUSES = new Set(['all', 'needs_review', 'information_needed', ...QUOTE_STATUSES]);
const NEEDS_REVIEW_QUOTE_STATUSES = ['draft', 'pending_review', 'needs_review'];
const REQUEST_ONLY_STATUSES = ['new', 'needs_review', 'quote_in_progress', 'information_needed'];

const ACTIONS = new Set(['save_draft', 'send', 'delete_draft', 'cancel_quote', 'mark_accepted', 'mark_declined', 'request_info', 'reopen_draft', 'restore_draft', 'convert_work_order', 'create_invoice']);

const normalizePayload = (body = {}) => {
  const aiMetadata = body.aiMetadata && typeof body.aiMetadata === 'object' ? body.aiMetadata : null;
  const aiOriginal = body.aiOriginal && typeof body.aiOriginal === 'object' ? body.aiOriginal : null;
  const fallbackReason = clean(aiMetadata?.fallbackReason || aiOriginal?.fallbackReason || body.fallbackReason, 800);
  return {
    action: ACTIONS.has(clean(body.action, 40)) ? clean(body.action, 40) : (body.sendToClient ? 'send' : 'save_draft'),
    quoteId: clean(body.quoteId, 80),
    jobRequestId: clean(body.jobRequestId, 80),
    title: clean(body.title, 180),
    summary: clean(body.summary, 8000),
    status: clean(body.status, 40),
    expirationDate: clean(body.expirationDate, 40),
    amountCents: Number(body.amountCents),
    sendToClient: Boolean(body.sendToClient),
    pricingConfidenceOverride: ['high', 'medium', 'low'].includes(clean(body.pricingConfidenceOverride, 20)) ? clean(body.pricingConfidenceOverride, 20) : '',
    rangeLowCents: Number.isFinite(Number(body.rangeLowCents)) ? Math.max(0, Math.round(Number(body.rangeLowCents))) : null,
    rangeHighCents: Number.isFinite(Number(body.rangeHighCents)) ? Math.max(0, Math.round(Number(body.rangeHighCents))) : null,
    aiOriginal,
    aiMetadata,
    aiEnhanced: Boolean(aiMetadata?.aiEnhanced || aiOriginal?.aiEnhanced),
    fallbackUsed: Boolean(aiMetadata?.fallbackUsed || aiOriginal?.fallbackUsed),
    fallbackReason,
    fixedPriceRecommendationCents: Number.isFinite(Number(aiMetadata?.fixedPriceRecommendationCents ?? aiOriginal?.fixedPriceRecommendationCents)) ? Math.max(0, Math.round(Number(aiMetadata?.fixedPriceRecommendationCents ?? aiOriginal?.fixedPriceRecommendationCents))) : null,
    sourcingNotes: clean(body.sourcingNotes || aiMetadata?.pricingConfidenceReason || aiOriginal?.pricingConfidenceReason || '', 2000),
  };
};



const stripInternalClientText = (value = '') => clean(String(value || '')
  .replace(/ADMIN REVIEW DRAFT[\s\S]*/ig, '')
  .replace(/Quote readiness[\s\S]*/ig, '')
  .replace(/Do not send without review\.?/ig, '')
  .replace(/quote_in_progress/ig, '')
  .replace(/Internal admin notes?:[\s\S]*/ig, '')
  .trim(), 8000);
const sanitizeClientQuotePayload = (payload = {}, fallbackQuote = {}) => {
  const metadata = payload.aiMetadata || {};
  const structured = metadata.aiStructuredQuote || {};
  const existing = metadata.clientQuotePayload || {};
  const customer = structured.customer_quote || structured.customerQuote || existing || {};
  const scope = stripInternalClientText(existing.scopeOfWork || customer.scope_of_work || structured.scope_of_work || structured.scopeOfWork || payload.summary || fallbackQuote.summary || '');
  const cleanArray = (items = []) => (Array.isArray(items) ? items : items ? [items] : []).map((item) => stripInternalClientText(typeof item === 'string' ? item : item.description || item.name || item.label || '')).filter(Boolean);
  const clientQuotePayload = {
    ...existing,
    company: existing.company || { name: process.env.COMPANY_NAME || 'Ugly Guys Bad Company', phone: process.env.COMPANY_PHONE || '(602) 560-0455', email: process.env.COMPANY_EMAIL || '' },
    quoteNumber: existing.quoteNumber || fallbackQuote.id || payload.quoteId || '',
    quoteDate: existing.quoteDate || fallbackQuote.created_at || new Date().toISOString(),
    expirationDate: existing.expirationDate || payload.expirationDate || '',
    title: stripInternalClientText(existing.title || payload.title || fallbackQuote.title || 'Service quote'),
    customerName: stripInternalClientText(existing.customerName || payload.customerName || ''),
    serviceType: stripInternalClientText(existing.serviceType || structured.service_category || structured.trade || ''),
    propertySummary: stripInternalClientText(existing.propertySummary || structured.property_summary || ''),
    jobSummary: stripInternalClientText(existing.jobSummary || customer.summary || structured.job_summary || scope).slice(0, 800),
    scopeOfWork: scope,
    included: cleanArray(existing.included || ['Labor, materials, and service items listed in this quote.']),
    materialsSummary: stripInternalClientText(existing.materialsSummary || ''),
    laborSummary: stripInternalClientText(existing.laborSummary || ''),
    customerNotes: stripInternalClientText(existing.customerNotes || customer.customer_notes || structured.customer_notes || structured.customerNotes || ''),
    assumptions: cleanArray(existing.assumptions || customer.assumptions || structured.assumptions),
    exclusions: cleanArray(existing.exclusions || customer.exclusions || structured.exclusions),
    warrantyNotes: stripInternalClientText(existing.warrantyNotes || customer.warranty_notes || structured.warranty_notes || structured.warrantyNotes || ''),
    estimatedTimeline: stripInternalClientText(existing.estimatedTimeline || structured.estimated_timeline || ''),
    detailMode: metadata.clientQuoteDetailMode || existing.detailMode || structured.client_quote_detail_mode || 'summary',
    totalCents: payload.amountCents || existing.totalCents || fallbackQuote.amount_cents || 0,
    groupedPricing: existing.groupedPricing || null,
    lineItems: Array.isArray(existing.lineItems) ? existing.lineItems.map((line) => ({ ...line, name: stripInternalClientText(line.name || line.description || ''), description: stripInternalClientText(line.description || line.name || '') })) : [],
  };
  return { summary: scope, metadata: { ...metadata, clientQuotePayload, clientQuoteDetailMode: clientQuotePayload.detailMode } };
};

const centsFromLine = (line = {}) => Number(line.totalCents ?? line.total_cents ?? line.totalCostCents ?? 0) || 0;
const validateQuoteReady = (payload = {}, request = {}) => {
  const structured = payload.aiMetadata?.aiStructuredQuote || payload.aiMetadata?.quoteEditor || {};
  const editor = payload.aiMetadata?.quoteEditor || structured || {};
  const labor = Array.isArray(structured.laborLineItems) ? structured.laborLineItems : (Array.isArray(structured.labor_line_items) ? structured.labor_line_items : (Array.isArray(editor.laborLineItems) ? editor.laborLineItems : []));
  const materials = Array.isArray(structured.materialLineItems) ? structured.materialLineItems : (Array.isArray(structured.material_line_items) ? structured.material_line_items : (Array.isArray(editor.materialLineItems) ? editor.materialLineItems : []));
  const allLines = [...labor, ...materials];
  const other = { ...structured.other_pricing, ...structured.pricingEngine, ...editor };
  const otherTotal = Number(other.tripChargeCents || other.trip_charge_cents || 0) + Number(other.permitCents || other.permit_cents || 0) + Number(other.disposalCents || other.disposal_cents || 0) + Number(other.rentalCents || other.rental_cents || 0) + Number(other.markupCents || other.markup_cents || 0) + Number(other.taxCents || other.tax_cents || 0) - Number(other.discountCents || other.discount_cents || 0);
  const lineGrand = allLines.reduce((sum, line) => sum + centsFromLine(line), 0) + otherTotal;
  const visibleText = [payload.title, payload.summary, structured.scopeOfWork, structured.scope_of_work, structured.customerNotes, structured.customer_notes, ...allLines.map((line) => line.description || line.name || line.label || '')].join(' ');
  if (!clean(request.requester_email || request.client_email, 200)) return 'Customer email is required before sending a quote.';
  if (!payload.summary) return 'Scope of work is required before sending.';
  if (!allLines.length) return 'At least one labor or material line is required before sending.';
  if (!payload.amountCents || payload.amountCents <= 0) return 'Grand total must be greater than zero before sending.';
  if (Math.abs(lineGrand - payload.amountCents) > 1) return 'Editable line item totals must match the grand total before sending.';
  if (allLines.some((line) => !centsFromLine(line) || !(Number(line.unitCostCents ?? line.unit_cost_cents ?? line.rateCents ?? line.rate_cents ?? 0) > 0))) return 'Every labor/material line must include a unit price/rate and total before sending.';
  if (/quote_in_progress|ADMIN REVIEW DRAFT|Do not send without review/i.test(visibleText)) return 'Remove admin-only AI/status text from visible quote content before sending.';
  return null;
};

const validatePayload = (payload, method = 'POST') => {
  if (method === 'PATCH' && !payload.quoteId) {
    return 'Quote is required.';
  }

  if (method === 'POST' && !payload.jobRequestId) {
    return 'Job request is required.';
  }

  if (['save_draft', 'send'].includes(payload.action) && !payload.title) {
    return 'Quote title is required.';
  }

  if (['save_draft', 'send'].includes(payload.action) && (!Number.isInteger(payload.amountCents) || payload.amountCents < 0)) {
    return 'Quote amount must be a non-negative amount in cents.';
  }

  return null;
};

const mapDate = (value) => value ? String(value).slice(0, 10) : null;

const mapQuote = (quote = {}) => {
  const metadata = quote.ai_metadata || {};
  const requestOnly = Boolean(quote.request_only);
  const request = quote.request_id ? {
    id: quote.request_id,
    status: quote.request_status,
    requesterName: quote.requester_name,
    requesterEmail: quote.requester_email,
    requesterPhone: quote.requester_phone,
    city: quote.city,
    streetAddress: quote.street_address,
    serviceType: quote.service_type,
    preferredTimeframe: quote.preferred_timeframe,
    description: quote.description,
    adminNotes: quote.admin_notes,
    estimatedStartDate: mapDate(quote.estimated_start_date),
    completionDate: mapDate(quote.completion_date),
    createdAt: quote.request_created_at,
    updatedAt: quote.request_updated_at,
  } : null;
  const intake = metadata.intakeAnalysis || analyzeEstimateIntake({
    service: quote.service_type,
    city: quote.city,
    streetAddress: quote.street_address,
    timeframe: quote.preferred_timeframe,
    description: quote.description || quote.summary,
  });
  return {
    id: requestOnly ? `request:${quote.request_id}` : quote.id,
    quoteId: requestOnly ? '' : quote.id,
    isRequestOnly: requestOnly,
    needsDraft: requestOnly,
    reviewLabel: requestOnly ? 'Needs Draft' : (['draft', 'pending_review', 'needs_review'].includes(quote.status) ? 'Needs Review' : ''),
    submittedAt: quote.request_created_at || quote.created_at,
    jobRequestId: quote.job_request_id || quote.request_id,
    clientId: quote.client_id,
    clientName: quote.client_name || quote.requester_name || '',
    clientEmail: quote.client_email || quote.requester_email || '',
    status: quote.status,
    title: quote.title,
    summary: quote.summary,
    amountCents: quote.amount_cents,
    aiEnhanced: Boolean(quote.ai_enhanced || metadata.aiEnhanced),
    fallbackUsed: Boolean(quote.fallback_used || metadata.fallbackUsed),
    fallbackReason: quote.fallback_reason || metadata.fallbackReason || '',
    pricingConfidenceLevel: quote.pricing_confidence_level || metadata.pricingConfidenceLevel || '',
    rangeLowCents: quote.range_low_cents ?? metadata.totalLowCents ?? metadata.rangeLowCents ?? null,
    rangeHighCents: quote.range_high_cents ?? metadata.totalHighCents ?? metadata.rangeHighCents ?? null,
    fixedPriceRecommendationCents: quote.fixed_price_recommendation_cents ?? metadata.fixedPriceRecommendationCents ?? null,
    aiMetadata: metadata,
    sourcingNotes: quote.sourcing_notes || metadata.pricingConfidenceReason || metadata.rangeSpreadReason || '',
    informationCompletenessScore: metadata.informationCompletenessScore || intake.informationCompletenessScore,
    confidenceScores: metadata.confidenceScores || intake.confidenceScores,
    missingInformation: metadata.missingInformation || intake.missingInformation || [],
    optionalQuestions: metadata.optionalQuestions || intake.optionalQuestions || [],
    customerPreferences: metadata.customerPreferences || intake.customerPreferences || {},
    photoIntelligence: metadata.photoIntelligence || intake.photoIntelligence || {},
    aiRecommendations: metadata.aiRecommendations || intake.aiRecommendations || [],
    adminOverrideAlwaysAvailable: true,
    manualEstimateModeAvailable: true,
    quoteCreationBlocked: false,
    serviceType: quote.service_type || '',
    city: quote.city || '',
    streetAddress: quote.street_address || '',
    requestId: quote.request_id || quote.job_request_id || '',
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
    request,
  };
};

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

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, { logPrefix: 'Failed to load quote role permissions; using defaults' });
  return { roleKeys, permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys) };
};


const hasPermission = (roleKeys = [], permissionKeys = [], permission) => (
  roleKeys.includes('owner')
  || permissionKeys.includes(permission)
  || permissionKeys.includes('admin.tools')
);

const sendQuoteEmail = async ({ quote, request }) => {
  if (!shouldSendEmail()) {
    throw new Error('Email service is not configured. Add RESEND_API_KEY and MAGIC_LINK_FROM_EMAIL or QUOTE_FROM_EMAIL in Netlify before sending quotes.');
  }
  const to = quote.client_email || quote.requester_email || request?.requester_email;
  if (!to) throw new Error('Customer email is required before sending a quote.');
  const origin = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://ta-contracting.org';
  const quoteUrl = `${origin.replace(/\/$/, '')}/dashboard/#client.quotes`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: getFromEmail(),
      to,
      subject: `Your quote is ready: ${quote.title}`,
      html: `<p>Hello,</p><p>Your quote is ready for review.</p><p><strong>${quote.title}</strong></p><p>${quote.summary || ''}</p><p>Total: $${(Number(quote.amount_cents || 0) / 100).toFixed(2)}</p><p><a href="${quoteUrl}">Open your client portal to review the quote</a></p>`,
      text: `Your quote is ready: ${quote.title}\nTotal: $${(Number(quote.amount_cents || 0) / 100).toFixed(2)}\nReview it in your client portal: ${quoteUrl}`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Quote email failed with ${response.status}: ${detail}`);
  }
};

const audit = async (db, session, eventType, entityId, metadata = {}) => db.sql`
  insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
  values (${session.user_id}, ${eventType}, ${'quote'}, ${entityId}, ${JSON.stringify(metadata)}::jsonb)
`;

const selectAdminQuotes = async ({ db, status, search, quoteId }) => {
  const likeSearch = `%${String(search || '').toLowerCase()}%`;
  return await db.sql`
    with quote_rows as (
      select
        quotes.id, quotes.job_request_id, quotes.client_id, quotes.status, quotes.title, quotes.summary, quotes.amount_cents,
        quotes.ai_enhanced, quotes.fallback_used, quotes.fallback_reason, quotes.pricing_confidence_level,
        quotes.range_low_cents, quotes.range_high_cents, quotes.fixed_price_recommendation_cents,
        quotes.ai_metadata, quotes.sourcing_notes, quotes.created_at, quotes.updated_at,
        false as request_only,
        job_requests.id as request_id, job_requests.status as request_status, job_requests.requester_name,
        job_requests.requester_email, job_requests.requester_phone, job_requests.city, job_requests.street_address,
        job_requests.service_type, job_requests.preferred_timeframe, job_requests.description, job_requests.admin_notes,
        job_requests.estimated_start_date, job_requests.completion_date, job_requests.created_at as request_created_at,
        job_requests.updated_at as request_updated_at,
        app_users.full_name as client_name, app_users.email as client_email
      from quotes
      left join job_requests on job_requests.id = quotes.job_request_id
      left join app_users on app_users.id = quotes.client_id
      where (${quoteId || ''} = '' or quotes.id::text = ${quoteId || ''})
        and (
          ${status} = 'all'
          or (${status} = 'needs_review' and quotes.status = any(${NEEDS_REVIEW_QUOTE_STATUSES}))
          or (${status} = 'information_needed' and quotes.status = 'information_needed')
          or quotes.status = ${status}
        )
        and (${search || ''} = '' or lower(concat_ws(' ', quotes.title, quotes.summary, quotes.status, quotes.amount_cents::text, job_requests.requester_name, job_requests.requester_email, job_requests.city, job_requests.street_address, job_requests.service_type, job_requests.id::text, quotes.id::text)) like ${likeSearch})
    ), request_rows as (
      select
        null::uuid as id, job_requests.id as job_request_id, job_requests.client_id,
        job_requests.status as status,
        concat(coalesce(job_requests.service_type, 'Service'), ' estimate request') as title,
        job_requests.description as summary,
        null::integer as amount_cents,
        false as ai_enhanced, false as fallback_used, null::text as fallback_reason, null::text as pricing_confidence_level,
        null::integer as range_low_cents, null::integer as range_high_cents, null::integer as fixed_price_recommendation_cents,
        '{}'::jsonb as ai_metadata, null::text as sourcing_notes, job_requests.created_at, job_requests.updated_at,
        true as request_only,
        job_requests.id as request_id, job_requests.status as request_status, job_requests.requester_name,
        job_requests.requester_email, job_requests.requester_phone, job_requests.city, job_requests.street_address,
        job_requests.service_type, job_requests.preferred_timeframe, job_requests.description, job_requests.admin_notes,
        job_requests.estimated_start_date, job_requests.completion_date, job_requests.created_at as request_created_at,
        job_requests.updated_at as request_updated_at,
        app_users.full_name as client_name, app_users.email as client_email
      from job_requests
      left join app_users on app_users.id = job_requests.client_id
      where not exists (select 1 from quotes where quotes.job_request_id = job_requests.id)
        and job_requests.status = any(${REQUEST_ONLY_STATUSES})
        and (${quoteId || ''} = '' or job_requests.id::text = ${quoteId || ''})
        and (${status} = 'all' or (${status} = 'needs_review' and job_requests.status = any(${REQUEST_ONLY_STATUSES})) or ${status} = job_requests.status)
        and (${search || ''} = '' or lower(concat_ws(' ', job_requests.status, job_requests.requester_name, job_requests.requester_email, job_requests.city, job_requests.street_address, job_requests.service_type, job_requests.description, job_requests.id::text)) like ${likeSearch})
    )
    select * from quote_rows
    union all
    select * from request_rows
    order by updated_at desc, created_at desc
    limit 150
  `;
};

const buildAiMetadata = (payload) => ({
  ...(payload.aiMetadata || {}),
  aiEnhanced: payload.aiEnhanced,
  fallbackUsed: payload.fallbackUsed,
  fallbackReason: payload.fallbackReason,
  pricingConfidenceLevel: payload.pricingConfidenceOverride || payload.aiMetadata?.pricingConfidenceLevel || payload.aiOriginal?.pricingConfidenceLevel || '',
  totalLowCents: payload.rangeLowCents ?? payload.aiMetadata?.totalLowCents ?? payload.aiOriginal?.totalLowCents ?? null,
  totalHighCents: payload.rangeHighCents ?? payload.aiMetadata?.totalHighCents ?? payload.aiOriginal?.totalHighCents ?? null,
  fixedPriceRecommendationCents: payload.fixedPriceRecommendationCents ?? payload.aiMetadata?.fixedPriceRecommendationCents ?? payload.aiOriginal?.fixedPriceRecommendationCents ?? null,
  informationCompletenessScore: payload.aiMetadata?.informationCompletenessScore ?? payload.aiOriginal?.informationCompletenessScore ?? null,
  confidenceScores: payload.aiMetadata?.confidenceScores ?? payload.aiOriginal?.confidenceScores ?? null,
  missingInformation: payload.aiMetadata?.missingInformation ?? payload.aiOriginal?.missingInformation ?? [],
  optionalQuestions: payload.aiMetadata?.optionalQuestions ?? payload.aiOriginal?.optionalQuestions ?? [],
  customerPreferences: payload.aiMetadata?.customerPreferences ?? payload.aiOriginal?.customerPreferences ?? {},
  photoIntelligence: payload.aiMetadata?.photoIntelligence ?? payload.aiOriginal?.photoIntelligence ?? {},
  adminOverrideAlwaysAvailable: true,
  manualEstimateModeAvailable: true,
  quoteCreationBlocked: false,
});

export const createAdminQuotesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to manage quotes.' });
  }

  let payload = null;
  if (request.method !== 'GET') {
    const body = await parseJsonBody(request);

    if (!body) {
      return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    }

    payload = normalizePayload(body);
    const validationError = validatePayload(payload, request.method);

    if (validationError) {
      return json(422, { ok: false, message: validationError });
    }
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const { roleKeys, permissionKeys } = await loadAccess(db, session.user_id);

    if (!roleKeys.some((role) => ['owner', 'admin', 'manager'].includes(role)) || !hasPermission(roleKeys, permissionKeys, 'quotes.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Quote management permission is required.' });
    }

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const status = QUOTE_LIST_STATUSES.has(clean(url.searchParams.get('status'), 20)) ? clean(url.searchParams.get('status'), 20) : 'all';
      const search = clean(url.searchParams.get('search'), 160);
      const quoteId = clean(url.searchParams.get('quoteId'), 80);
      const quotes = await selectAdminQuotes({ db, status, search, quoteId });
      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        status,
        search,
        user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys, permissionKeys },
        quotes: quotes.map(mapQuote),
      });
    }

    let aiMetadataForStorage = buildAiMetadata(payload);
    const pricingConfidenceLevel = payload.pricingConfidenceOverride || payload.aiMetadata?.pricingConfidenceLevel || payload.aiOriginal?.pricingConfidenceLevel || null;

    if (request.method === 'PATCH') {
      const [existingQuote] = await db.sql`
        select quotes.id, quotes.job_request_id, quotes.client_id, quotes.status, quotes.title, quotes.summary, quotes.amount_cents,
               quotes.ai_metadata, quotes.created_at, quotes.updated_at,
               clients.email as client_email, job_requests.requester_email
        from quotes
        left join app_users clients on clients.id = quotes.client_id
        left join job_requests on job_requests.id = quotes.job_request_id
        where quotes.id = ${payload.quoteId}
        limit 1
      `;

      if (!existingQuote) return json(404, { ok: false, authenticated: true, authorized: true, message: 'Quote not found.' });

      const actionPermission = {
        save_draft: 'quotes.edit', send: 'quotes.send', delete_draft: 'quotes.delete', cancel_quote: 'quotes.delete',
        mark_accepted: 'quotes.manage', mark_declined: 'quotes.manage', request_info: 'requests.manage', reopen_draft: 'quotes.edit',
        restore_draft: 'quotes.edit', convert_work_order: 'workorders.create', create_invoice: 'invoices.create',
      }[payload.action] || 'quotes.manage';
      if (!hasPermission(roleKeys, permissionKeys, actionPermission)) {
        return json(403, { ok: false, authenticated: true, authorized: false, message: `${actionPermission} permission is required for this quote action.` });
      }

      if (payload.action === 'delete_draft') {
        if (!['draft', 'pending_review', 'needs_review', 'quote_in_progress'].includes(existingQuote.status)) {
          return json(409, { ok: false, message: 'Only draft quotes can be deleted. Sent or accepted quotes must be cancelled.' });
        }
        await db.sql`delete from quotes where id = ${existingQuote.id}`;
        if (existingQuote.job_request_id) await db.sql`update job_requests set status = 'needs_review', updated_at = now() where id = ${existingQuote.job_request_id}`;
        await audit(db, session, 'quote.deleted_draft', existingQuote.id, { source: 'estimate_quote_center' });
        return json(200, { ok: true, authenticated: true, authorized: true, message: 'Draft deleted safely.' });
      }

      if (payload.action === 'cancel_quote') {
        const [quote] = await db.sql`update quotes set status = 'cancelled', updated_at = now() where id = ${existingQuote.id} returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at`;
        if (quote.job_request_id) await db.sql`update job_requests set status = 'cancelled', updated_at = now() where id = ${quote.job_request_id}`;
        await audit(db, session, 'quote.cancelled', quote.id, { source: 'estimate_quote_center' });
        return json(200, { ok: true, authenticated: true, authorized: true, message: 'Quote cancelled.', quote: mapQuote(quote) });
      }

      if (payload.action === 'mark_accepted' || payload.action === 'mark_declined' || payload.action === 'reopen_draft' || payload.action === 'restore_draft' || payload.action === 'request_info') {
        const nextStatus = payload.action === 'mark_accepted' ? 'accepted' : payload.action === 'mark_declined' ? 'declined' : payload.action === 'request_info' ? 'information_needed' : 'draft';
        const [quote] = await db.sql`
          update quotes set status = ${nextStatus},
            accepted_at = case when ${nextStatus === 'accepted'} then now() else accepted_at end,
            declined_at = case when ${nextStatus === 'declined'} then now() else declined_at end,
            updated_at = now()
          where id = ${existingQuote.id}
          returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at`;
        if (quote.job_request_id) await db.sql`update job_requests set status = ${nextStatus === 'information_needed' ? 'information_needed' : nextStatus === 'draft' ? 'quote_in_progress' : nextStatus}, updated_at = now() where id = ${quote.job_request_id}`;
        await audit(db, session, `quote.${payload.action}`, quote.id, { source: 'estimate_quote_center' });
        return json(200, { ok: true, authenticated: true, authorized: true, message: 'Quote status updated.', quote: mapQuote(quote) });
      }

      if (payload.action === 'convert_work_order') {
        if (existingQuote.status !== 'accepted') return json(409, { ok: false, message: 'Only accepted quotes can be converted to work orders.' });
        await db.sql`update job_requests set status = 'scheduled', updated_at = now() where id = ${existingQuote.job_request_id}`;
        await audit(db, session, 'quote.converted_work_order', existingQuote.id, { source: 'estimate_quote_center', jobRequestId: existingQuote.job_request_id });
        return json(200, { ok: true, authenticated: true, authorized: true, message: 'Accepted quote converted to a work order.' });
      }

      if (payload.action === 'create_invoice') {
        if (existingQuote.status !== 'accepted') return json(409, { ok: false, message: 'Only accepted quotes can create invoices.' });
        const [invoice] = await db.sql`
          insert into invoices (job_request_id, client_id, quote_id, status, title, amount_cents, due_at, created_by)
          values (${existingQuote.job_request_id}, ${existingQuote.client_id}, ${existingQuote.id}, 'open', ${existingQuote.title || 'Accepted quote invoice'}, ${existingQuote.amount_cents || 0}, now() + interval '14 days', ${session.user_id})
          on conflict (job_request_id) do update set quote_id = excluded.quote_id, amount_cents = excluded.amount_cents, updated_at = now()
          returning id`;
        await db.sql`update job_requests set status = 'waiting_payment', updated_at = now() where id = ${existingQuote.job_request_id}`;
        await audit(db, session, 'quote.invoice_created', existingQuote.id, { source: 'estimate_quote_center', invoiceId: invoice.id });
        return json(200, { ok: true, authenticated: true, authorized: true, message: 'Invoice created from accepted quote.', invoice });
      }

      const nextStatus = payload.action === 'send' ? 'sent' : (payload.status && ['draft', 'quote_in_progress', 'needs_review', 'pending_review'].includes(payload.status) ? payload.status : existingQuote.status);
      let quoteForEmail = null;
      if (payload.action === 'send') {
        const sanitized = sanitizeClientQuotePayload({ ...payload, aiMetadata: aiMetadataForStorage }, existingQuote);
        payload.summary = sanitized.summary;
        aiMetadataForStorage = sanitized.metadata;
        const readyError = validateQuoteReady({ ...payload, aiMetadata: aiMetadataForStorage }, existingQuote);
        if (readyError) return json(422, { ok: false, message: readyError });
      }
      if (payload.action === 'send') {
        quoteForEmail = { ...existingQuote, title: payload.title, summary: payload.summary, amount_cents: payload.amountCents };
        await sendQuoteEmail({ quote: quoteForEmail });
      }
      const [quote] = await db.sql`
        update quotes
        set title = ${payload.title}, summary = ${payload.summary || null}, amount_cents = ${payload.amountCents}, status = ${nextStatus},
            sent_at = case when ${payload.action === 'send'} then now() else sent_at end,
            ai_enhanced = ${payload.aiEnhanced}, fallback_used = ${payload.fallbackUsed}, fallback_reason = ${payload.fallbackReason || null},
            pricing_confidence_level = ${pricingConfidenceLevel}, range_low_cents = ${payload.rangeLowCents}, range_high_cents = ${payload.rangeHighCents},
            fixed_price_recommendation_cents = ${payload.fixedPriceRecommendationCents}, ai_metadata = ${JSON.stringify(aiMetadataForStorage)}::jsonb,
            sourcing_notes = ${payload.sourcingNotes || null}, updated_at = now()
        where id = ${existingQuote.id}
        returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at`;
      if (quote.job_request_id) await db.sql`update job_requests set status = ${payload.action === 'send' ? 'quote_sent' : 'quote_in_progress'}, updated_at = now() where id = ${quote.job_request_id}`;
      if (payload.aiOriginal || payload.aiMetadata) await saveAdminAiCorrection({ db, quoteId: quote.id, jobRequestId: quote.job_request_id, actorUserId: session.user_id, originalAiResult: payload.aiOriginal || payload.aiMetadata?.aiStructuredQuote || {}, adminChanges: { title: payload.title, summary: payload.summary, amountCents: payload.amountCents, sentToClient: payload.action === 'send' }, finalQuote: quote });
      await audit(db, session, payload.action === 'send' ? 'quote.sent' : 'quote.saved_draft', quote.id, { source: 'estimate_quote_center', jobRequestId: quote.job_request_id, amountCents: payload.amountCents });
      return json(200, { ok: true, authenticated: true, authorized: true, user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys, permissionKeys }, quote: mapQuote(quote), message: payload.action === 'send' ? 'Quote sent to client.' : 'Draft saved.' });
    }

    const [jobRequest] = await db.sql`
      select job_requests.id, job_requests.client_id, job_requests.requester_email, clients.email as client_email
      from job_requests
      left join app_users clients on clients.id = job_requests.client_id
      where job_requests.id = ${payload.jobRequestId}
      limit 1
    `;

    if (!jobRequest) {
      return json(404, { ok: false, authenticated: true, authorized: true, message: 'Job request not found.' });
    }

    if (!jobRequest.client_id) {
      return json(422, { ok: false, authenticated: true, authorized: true, message: 'Job request must be linked to a client before quoting.' });
    }

    const [existingQuote] = await db.sql`
      select id
      from quotes
      where job_request_id = ${jobRequest.id}
      order by created_at desc
      limit 1
    `;

    if (existingQuote) {
      return json(409, { ok: false, authenticated: true, authorized: true, message: 'This request already has a quote. Open the request and edit the saved quote.' });
    }

    const createPermission = payload.action === 'send' ? 'quotes.send' : 'quotes.create';
    if (!hasPermission(roleKeys, permissionKeys, createPermission)) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: `${createPermission} permission is required.` });
    }

    if (payload.action === 'send') {
      const sanitized = sanitizeClientQuotePayload({ ...payload, aiMetadata: aiMetadataForStorage }, jobRequest);
      payload.summary = sanitized.summary;
      aiMetadataForStorage = sanitized.metadata;
      const readyError = validateQuoteReady({ ...payload, aiMetadata: aiMetadataForStorage }, jobRequest);
      if (readyError) return json(422, { ok: false, authenticated: true, authorized: true, message: readyError });
    }

    const quoteStatus = 'draft';

    let [quote] = await db.sql`
      insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, sent_at, created_by, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes)
      values (${jobRequest.id}, ${jobRequest.client_id}, ${quoteStatus}, ${payload.title}, ${payload.summary || null}, ${payload.amountCents}, ${null}::timestamptz, ${session.user_id}, ${payload.aiEnhanced}, ${payload.fallbackUsed}, ${payload.fallbackReason || null}, ${pricingConfidenceLevel}, ${payload.rangeLowCents}, ${payload.rangeHighCents}, ${payload.fixedPriceRecommendationCents}, ${JSON.stringify(aiMetadataForStorage)}::jsonb, ${payload.sourcingNotes || null})
      returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at
    `;

    if (payload.action === 'send') {
      await sendQuoteEmail({ quote: { ...quote, client_email: jobRequest.client_email, requester_email: jobRequest.requester_email } });
      [quote] = await db.sql`
        update quotes
        set status = 'sent', sent_at = now(), updated_at = now()
        where id = ${quote.id}
        returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at
      `;
    }

    await db.sql`
      update job_requests
      set status = ${payload.action === 'send' ? 'quote_sent' : 'quote_in_progress'}, updated_at = now()
      where id = ${jobRequest.id}
        and status in ('new', 'needs_review', 'quote_in_progress')
    `;

    if (payload.aiOriginal || payload.aiMetadata) await saveAdminAiCorrection({
      db,
      quoteId: quote.id,
      jobRequestId: quote.job_request_id,
      actorUserId: session.user_id,
      originalAiResult: payload.aiOriginal || payload.aiMetadata?.aiStructuredQuote || {},
      adminChanges: {
        title: payload.title,
        summary: payload.summary,
        amountCents: payload.amountCents,
        priceAdjustmentCents: payload.aiMetadata?.fixedPriceRecommendationCents ? payload.amountCents - Number(payload.aiMetadata.fixedPriceRecommendationCents) : null,
        pricingConfidenceOverride: payload.pricingConfidenceOverride,
        rangeLowCents: payload.rangeLowCents,
        rangeHighCents: payload.rangeHighCents,
        sentToClient: payload.action === 'send',
      },
      finalQuote: quote,
    });

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'quote.created'},
        ${'quote'},
        ${quote.id},
        ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: jobRequest.id, clientId: jobRequest.client_id, amountCents: payload.amountCents, sentToClient: payload.action === 'send', aiCorrectionSaved: true })}::jsonb
      )
    `;

    return json(201, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys, permissionKeys },
      quote: mapQuote(quote),
    });
  } catch (error) {
    console.error('Failed to manage admin quote', error);

    return json(500, { ok: false, message: 'We could not manage quotes right now.' });
  }
};

export default createAdminQuotesHandler();

export const config = {
  path: '/api/admin/quotes',
};
