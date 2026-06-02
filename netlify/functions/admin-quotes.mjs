import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';
import { saveAdminAiCorrection } from './ai-intelligence-engine.mjs';
import { analyzeEstimateIntake } from './estimate-intake-intelligence.mjs';

const QUOTE_STATUSES = new Set(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'pending_review', 'needs_review']);
const QUOTE_LIST_STATUSES = new Set(['all', 'needs_review', 'information_needed', ...QUOTE_STATUSES]);
const NEEDS_REVIEW_QUOTE_STATUSES = ['draft', 'pending_review', 'needs_review'];
const REQUEST_ONLY_STATUSES = ['new', 'needs_review', 'quote_in_progress'];

const normalizePayload = (body = {}) => {
  const aiMetadata = body.aiMetadata && typeof body.aiMetadata === 'object' ? body.aiMetadata : null;
  const aiOriginal = body.aiOriginal && typeof body.aiOriginal === 'object' ? body.aiOriginal : null;
  const fallbackReason = clean(aiMetadata?.fallbackReason || aiOriginal?.fallbackReason || body.fallbackReason, 800);
  return {
    quoteId: clean(body.quoteId, 80),
    jobRequestId: clean(body.jobRequestId, 80),
    title: clean(body.title, 180),
    summary: clean(body.summary, 4000),
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

const validatePayload = (payload, method = 'POST') => {
  if (method === 'PATCH' && !payload.quoteId) {
    return 'Quote is required.';
  }

  if (method === 'POST' && !payload.jobRequestId) {
    return 'Job request is required.';
  }

  if (!payload.title) {
    return 'Quote title is required.';
  }

  if (!Number.isInteger(payload.amountCents) || payload.amountCents < 0) {
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

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  return roles.map((role) => role.key);
};

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
          or (${status} in ('needs_review', 'information_needed') and quotes.status = any(${NEEDS_REVIEW_QUOTE_STATUSES}))
          or quotes.status = ${status}
        )
        and (${search || ''} = '' or lower(concat_ws(' ', quotes.title, quotes.summary, quotes.status, quotes.amount_cents::text, job_requests.requester_name, job_requests.requester_email, job_requests.city, job_requests.street_address, job_requests.service_type, job_requests.id::text, quotes.id::text)) like ${likeSearch})
    ), request_rows as (
      select
        null::uuid as id, job_requests.id as job_request_id, job_requests.client_id,
        'needs_review'::text as status,
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
        and (${status} in ('all', 'needs_review', 'information_needed') or ${status} = job_requests.status)
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

    const roleKeys = await loadRoleKeys(db, session.user_id);

    if (!roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required to manage quotes.' });
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
        user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys },
        quotes: quotes.map(mapQuote),
      });
    }

    const aiMetadataForStorage = buildAiMetadata(payload);
    const pricingConfidenceLevel = payload.pricingConfidenceOverride || payload.aiMetadata?.pricingConfidenceLevel || payload.aiOriginal?.pricingConfidenceLevel || null;

    if (request.method === 'PATCH') {
      const [existingQuote] = await db.sql`
        select id, job_request_id, client_id, status
        from quotes
        where id = ${payload.quoteId}
        limit 1
      `;

      if (!existingQuote) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Quote not found.' });
      }

      const quoteStatus = payload.sendToClient ? 'sent' : existingQuote.status;
      const [quote] = await db.sql`
        update quotes
        set title = ${payload.title},
            summary = ${payload.summary || null},
            amount_cents = ${payload.amountCents},
            status = ${quoteStatus},
            sent_at = case when ${payload.sendToClient} then coalesce(sent_at, now()) else sent_at end,
            ai_enhanced = ${payload.aiEnhanced},
            fallback_used = ${payload.fallbackUsed},
            fallback_reason = ${payload.fallbackReason || null},
            pricing_confidence_level = ${pricingConfidenceLevel},
            range_low_cents = ${payload.rangeLowCents},
            range_high_cents = ${payload.rangeHighCents},
            fixed_price_recommendation_cents = ${payload.fixedPriceRecommendationCents},
            ai_metadata = ${JSON.stringify(aiMetadataForStorage)}::jsonb,
            sourcing_notes = ${payload.sourcingNotes || null},
            updated_at = now()
        where id = ${existingQuote.id}
        returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at
      `;

      if (payload.sendToClient) {
        await db.sql`
          update job_requests
          set status = ${'quote_sent'}, updated_at = now()
          where id = ${existingQuote.job_request_id}
            and status in ('new', 'needs_review', 'quote_in_progress', 'quote_sent')
        `;
      }

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
          originalPricingConfidenceLevel: payload.aiMetadata?.pricingConfidenceLevel || payload.aiOriginal?.pricingConfidenceLevel || '',
          originalTotalLowCents: payload.aiMetadata?.totalLowCents || payload.aiOriginal?.totalLowCents || null,
          originalTotalHighCents: payload.aiMetadata?.totalHighCents || payload.aiOriginal?.totalHighCents || null,
          sentToClient: payload.sendToClient,
        },
        finalQuote: quote,
      });

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'quote.updated'},
          ${'quote'},
          ${quote.id},
          ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: quote.job_request_id, clientId: quote.client_id, amountCents: payload.amountCents, sentToClient: payload.sendToClient, aiCorrectionSaved: true })}::jsonb
        )
      `;

      return json(200, {
        ok: true,
        authenticated: true,
        authorized: true,
        user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys },
        quote: mapQuote(quote),
      });
    }

    const [jobRequest] = await db.sql`
      select id, client_id
      from job_requests
      where id = ${payload.jobRequestId}
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

    const quoteStatus = payload.sendToClient ? 'sent' : 'draft';

    const [quote] = await db.sql`
      insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, sent_at, created_by, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes)
      values (${jobRequest.id}, ${jobRequest.client_id}, ${quoteStatus}, ${payload.title}, ${payload.summary || null}, ${payload.amountCents}, ${payload.sendToClient ? new Date().toISOString() : null}::timestamptz, ${session.user_id}, ${payload.aiEnhanced}, ${payload.fallbackUsed}, ${payload.fallbackReason || null}, ${pricingConfidenceLevel}, ${payload.rangeLowCents}, ${payload.rangeHighCents}, ${payload.fixedPriceRecommendationCents}, ${JSON.stringify(aiMetadataForStorage)}::jsonb, ${payload.sourcingNotes || null})
      returning id, job_request_id, client_id, status, title, summary, amount_cents, ai_enhanced, fallback_used, fallback_reason, pricing_confidence_level, range_low_cents, range_high_cents, fixed_price_recommendation_cents, ai_metadata, sourcing_notes, created_at, updated_at
    `;

    await db.sql`
      update job_requests
      set status = ${payload.sendToClient ? 'quote_sent' : 'quote_in_progress'}, updated_at = now()
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
        sentToClient: payload.sendToClient,
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
        ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: jobRequest.id, clientId: jobRequest.client_id, amountCents: payload.amountCents, sentToClient: payload.sendToClient, aiCorrectionSaved: true })}::jsonb
      )
    `;

    return json(201, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys },
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
