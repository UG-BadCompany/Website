import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';
import { analyzeEstimateIntake } from './estimate-intake-intelligence.mjs';

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};



const getStore = async (name) => {
  const blobs = await import('@netlify/blobs').catch(() => null);
  if (blobs?.getStore) return blobs.getStore(name);
  return null;
};

const normalizeConfidenceScores = (metadata = {}) => {
  const confidence = Number(metadata.confidence || metadata.confidenceScore || metadata.confidence_scores?.overall || 0);
  const scores = metadata.confidenceScores || metadata.confidence_scores || {};
  return {
    overall: Number(scores.overall || confidence || 0),
    labor: Number(scores.labor || scores.laborConfidence || confidence || 0),
    material: Number(scores.material || scores.materialConfidence || confidence || 0),
    scope: Number(scores.scope || scores.scopeConfidence || confidence || 0),
  };
};

const normalizeOptionalQuestions = (metadata = {}) => {
  const questions = metadata.optionalQuestions || metadata.missingInfoQuestions || metadata.questions_to_customer || metadata.missing_required_info || [];
  return (Array.isArray(questions) ? questions : []).slice(0, 12).map((question) => typeof question === 'string'
    ? { label: question, prompt: question, optional: true }
    : { label: clean(question.label || question.name || 'Optional question', 160), prompt: clean(question.prompt || question.question || question.label || '', 500), optional: true });
};

const buildIntakeReview = (metadata = {}, request = {}) => {
  const analyzed = metadata.intakeAnalysis || request.intakeAnalysis || analyzeEstimateIntake(request);
  const confidenceScores = metadata.confidenceScores || analyzed.confidenceScores || normalizeConfidenceScores(metadata);
  const completeness = Number(metadata.informationCompletenessScore || analyzed.informationCompletenessScore || confidenceScores.overall || 25);
  return {
    informationCompletenessScore: completeness,
    confidenceScores,
    missingInformation: metadata.missingInformation || analyzed.missingInformation || metadata.missing_required_info || [],
    helpfulInformation: metadata.helpfulInformation || analyzed.helpfulInformation || [],
    recommendedClarifications: metadata.recommendedClarifications || analyzed.recommendedClarifications || [],
    optionalQuestions: normalizeOptionalQuestions({ ...metadata, optionalQuestions: metadata.optionalQuestions || analyzed.optionalQuestions }),
    customerPreferences: metadata.customerPreferences || analyzed.customerPreferences || {},
    photoIntelligence: metadata.photoIntelligence || analyzed.photoIntelligence || {},
    aiRecommendations: metadata.aiRecommendations || analyzed.aiRecommendations || [],
    quoteCreationBlocked: false,
    manualEstimateModeAvailable: true,
    adminOverrideAlwaysAvailable: true,
    lowConfidenceWarning: completeness < 55 ? 'Additional information recommended before final pricing.' : '',
  };
};

const ESTIMATE_REVIEW_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'pending_review', 'needs_review'];
const REQUEST_ONLY_REVIEW_STATUSES = ['new', 'needs_review', 'quote_in_progress'];

const normalizeMaterialBreakdown = (metadata = {}) => {
  const raw = Array.isArray(metadata.materialBreakdown) && metadata.materialBreakdown.length
    ? metadata.materialBreakdown
    : (Array.isArray(metadata.materials) ? metadata.materials : []);
  return raw.slice(0, 24).map((item) => ({
    name: clean(item.name || item.label || item.part || 'Material', 180),
    category: clean(item.category || item.trade || item.workCategory || '', 120),
    estimatedQuantity: Number(item.estimatedQuantity ?? item.quantity ?? item.neededQty ?? 1) || 1,
    unit: clean(item.unit || 'each', 40),
    notes: clean(item.notes || item.description || '', 500),
    inventoryMatchHint: clean(item.inventoryMatchHint || item.sku || item.supplierPartNumber || item.aiQuoteCatalogKey || item.name || '', 180),
  }));
};

const normalizeMatchText = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const confidenceForInventoryMatch = (material, item) => {
  const materialName = normalizeMatchText(material.name);
  const hint = normalizeMatchText(material.inventoryMatchHint);
  const sku = normalizeMatchText(item.sku);
  const part = normalizeMatchText(item.supplier_part_number);
  const itemName = normalizeMatchText(item.name);
  const itemCategory = normalizeMatchText(item.category || item.trade_type);
  const materialCategory = normalizeMatchText(material.category);
  const catalogKey = normalizeMatchText(item.ai_quote_catalog_key);
  if (hint && (hint === sku || hint === part || hint === catalogKey)) return 'exact';
  if (materialName && itemName && (itemName.includes(materialName) || materialName.includes(itemName))) return 'strong';
  if (materialCategory && itemCategory && (itemCategory.includes(materialCategory) || materialCategory.includes(itemCategory))) return 'possible';
  return 'no_match';
};

const scoreConfidence = (confidence) => ({ exact: 4, strong: 3, possible: 2, no_match: 1 })[confidence] || 0;

const buildInventoryMatches = ({ materialBreakdown = [], inventoryItems = [], reservationRows = [], jobRequestId = '' }) => materialBreakdown.map((material) => {
  const matches = inventoryItems
    .map((item) => {
      const quantityOnHand = Number(item.quantity_on_hand || 0);
      const quantityReserved = Number(item.quantity_reserved || 0);
      const quantityAvailable = quantityOnHand - quantityReserved;
      const reorderPoint = Number(item.reorder_point || 0);
      const confidence = confidenceForInventoryMatch(material, item);
      return {
        confidence,
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantityOnHand,
        quantityReserved,
        quantityAvailable,
        unitCost: Number(item.unit_cost || 0),
        chargePrice: Number(item.charge_price || 0),
        reorderPoint,
        stockStatus: quantityAvailable <= 0 ? 'out_of_stock' : (quantityAvailable <= reorderPoint ? 'low_stock' : 'in_stock'),
        supplier: item.supplier,
        supplierPartNumber: item.supplier_part_number,
      };
    })
    .filter((match) => match.confidence !== 'no_match')
    .sort((a, b) => scoreConfidence(b.confidence) - scoreConfidence(a.confidence) || b.quantityAvailable - a.quantityAvailable)
    .slice(0, 4);
  const best = matches[0] || null;
  const existingReservation = best ? reservationRows.find((row) => row.inventory_item_id === best.itemId && (!jobRequestId || row.job_request_id === jobRequestId)) : null;
  return {
    material,
    confidence: best?.confidence || 'no_match',
    matches,
    selectedItem: best,
    reservedQuantity: Number(existingReservation?.reserved_quantity || 0),
    usedQuantity: Number(existingReservation?.used_quantity || 0),
    reservationId: existingReservation?.id || null,
    reservationStatus: existingReservation?.status || 'none',
    reorderWarning: best ? best.stockStatus !== 'in_stock' : true,
  };
});

const mapDraft = (row, { inventoryItems = [], reservationRows = [] } = {}) => {
  const metadata = parseMetadata(row.estimate_metadata);
  const intakeReview = buildIntakeReview(metadata, {
    name: row.requester_name,
    email: row.requester_email,
    phone: row.requester_phone,
    city: row.city,
    streetAddress: row.street_address,
    service: row.service_type,
    workScope: row.work_scope,
    workCategory: row.work_category,
    timeframe: row.preferred_timeframe,
    description: row.request_description,
  });
  return {
    quoteId: row.quote_id || '',
    queueId: row.quote_id || `request:${row.job_request_id}`,
    jobRequestId: row.job_request_id,
    clientId: row.client_id,
    status: row.quote_status || 'needs_review',
    reviewLabel: row.quote_id ? (['draft', 'pending_review', 'needs_review'].includes(row.quote_status) ? 'Needs Review' : row.quote_status) : 'Needs Draft',
    needsDraft: !row.quote_id,
    title: row.title,
    summary: row.summary,
    amountCents: row.amount_cents,
    lowAmountCents: metadata.lowAmountCents || null,
    confidence: metadata.confidence || intakeReview.confidenceScores.overall || null,
    informationCompletenessScore: intakeReview.informationCompletenessScore,
    confidenceScores: intakeReview.confidenceScores,
    missingInformation: intakeReview.missingInformation,
    helpfulInformation: intakeReview.helpfulInformation,
    recommendedClarifications: intakeReview.recommendedClarifications,
    optionalQuestions: intakeReview.optionalQuestions,
    customerPreferences: intakeReview.customerPreferences,
    photoIntelligence: intakeReview.photoIntelligence,
    aiRecommendations: intakeReview.aiRecommendations,
    quoteCreationBlocked: false,
    manualEstimateModeAvailable: true,
    adminOverrideAlwaysAvailable: true,
    lowConfidenceWarning: intakeReview.lowConfidenceWarning,
    quoteReady: Boolean(metadata.quoteReady),
    laborItems: metadata.laborItems || [],
    materials: metadata.materials || [],
    materialBreakdown: normalizeMaterialBreakdown(metadata),
    baseLaborItems: metadata.baseLaborItems || [],
    baseMaterials: metadata.baseMaterials || [],
    factors: metadata.factors || {},
    accuracyReview: metadata.accuracyReview || [],
    quoteOptions: metadata.quoteOptions || [],
    supplierPricingPlan: metadata.supplierPricingPlan || {},
    troubleshootingPlan: metadata.troubleshootingPlan || {},
    accuracyRulesVersion: metadata.accuracyRulesVersion || null,
    missingInfoQuestions: metadata.missingInfoQuestions || [],
    riskFlags: metadata.riskFlags || [],
    exclusions: metadata.exclusions || [],
    totals: metadata.totals || {},
    job: metadata.job || null,
    aiEnhanced: Boolean(metadata.aiEnhanced),
    createdAt: row.quote_created_at || row.request_created_at,
    updatedAt: row.quote_updated_at || row.request_updated_at,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    city: row.city,
    streetAddress: row.street_address,
    serviceType: row.service_type,
    workScope: row.work_scope,
    workCategory: row.work_category,
    preferredTimeframe: row.preferred_timeframe,
    requestDescription: row.request_description,
    requestStatus: row.request_status,
    inventoryMatches: buildInventoryMatches({ materialBreakdown: normalizeMaterialBreakdown(metadata), inventoryItems, reservationRows, jobRequestId: row.job_request_id }),
  };
};


const mapBlobDraft = (record = {}) => {
  const request = record.savedRequest || record.requestPayload || record.estimateDraft?.request || {};
  const draft = record.estimateDraft || record.aiDraft || {};
  const metadata = { ...draft, ...(record.intakeAnalysis ? { intakeAnalysis: record.intakeAnalysis } : {}) };
  const intakeReview = buildIntakeReview(metadata, request);
  const totalHigh = Number(draft.totals?.total_high || 0);
  const totalLow = Number(draft.totals?.total_low || 0);
  return {
    quoteId: record.id || `request:${request.id || ''}`,
    queueId: record.id || `request:${request.id || ''}`,
    jobRequestId: request.id || '',
    clientId: '',
    status: 'needs_review',
    reviewLabel: 'Needs Draft',
    needsDraft: true,
    title: draft.job_summary || `${request.service || 'Service'} estimate request`,
    summary: draft.customer_facing_quote || request.description || 'Submitted estimate request needs admin review.',
    amountCents: totalHigh ? Math.round(totalHigh * 100) : 0,
    lowAmountCents: totalLow ? Math.round(totalLow * 100) : null,
    confidence: intakeReview.confidenceScores.overall,
    informationCompletenessScore: intakeReview.informationCompletenessScore,
    confidenceScores: intakeReview.confidenceScores,
    missingInformation: intakeReview.missingInformation,
    helpfulInformation: intakeReview.helpfulInformation,
    recommendedClarifications: intakeReview.recommendedClarifications,
    optionalQuestions: intakeReview.optionalQuestions,
    customerPreferences: intakeReview.customerPreferences,
    photoIntelligence: intakeReview.photoIntelligence,
    aiRecommendations: intakeReview.aiRecommendations,
    quoteCreationBlocked: false,
    manualEstimateModeAvailable: true,
    adminOverrideAlwaysAvailable: true,
    lowConfidenceWarning: intakeReview.lowConfidenceWarning,
    quoteReady: Boolean(draft.quote_ready),
    laborItems: draft.labor_items || [],
    materials: draft.materials || [],
    materialBreakdown: normalizeMaterialBreakdown({ materials: draft.materials || [] }),
    missingInfoQuestions: draft.questions_to_customer || intakeReview.optionalQuestions.map((q) => q.prompt),
    riskFlags: draft.risk_flags || [],
    exclusions: draft.exclusions || [],
    totals: draft.totals || {},
    aiEnhanced: draft.source === 'openai-fast',
    createdAt: record.createdAt || request.createdAt,
    updatedAt: record.updatedAt || record.createdAt || request.createdAt,
    requesterName: request.name,
    requesterEmail: request.email,
    requesterPhone: request.phone,
    city: request.city,
    streetAddress: request.streetAddress,
    serviceType: request.service,
    workScope: request.workScope,
    workCategory: request.workCategory || draft.category,
    preferredTimeframe: request.timeframe,
    requestDescription: request.description,
    requestStatus: request.status || 'request_saved_estimate_intake',
    inventoryMatches: [],
  };
};

const loadBlobDrafts = async (limit = 50) => {
  const store = await getStore('estimate-drafts');
  if (!store) return [];
  const list = await store.list();
  const drafts = [];
  for (const blob of (list.blobs || []).slice(-limit).reverse()) {
    try {
      drafts.push(mapBlobDraft(await store.get(blob.key, { type: 'json' })));
    } catch {}
  }
  return drafts;
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

const normalizeDecisionPayload = (body = {}) => ({
  quoteId: clean(body.quoteId, 80),
  title: clean(body.title, 180),
  summary: clean(body.summary, 6000),
  amountCents: Number(body.amountCents),
  action: clean(body.action, 40),
});

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
      const requestedStatus = clean(url.searchParams.get('status'), 40) || 'draft';
      const status = requestedStatus === 'all' || ESTIMATE_REVIEW_STATUSES.includes(requestedStatus) ? requestedStatus : 'draft';
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)));

      const rows = await db.sql`
        with quote_rows as (
          select
            q.id as quote_id,
            q.job_request_id,
            q.client_id,
            q.status as quote_status,
            q.title,
            q.summary,
            q.amount_cents,
            q.created_at as quote_created_at,
            q.updated_at as quote_updated_at,
            jr.created_at as request_created_at,
            jr.updated_at as request_updated_at,
            jr.requester_name,
            jr.requester_email,
            jr.requester_phone,
            jr.city,
            jr.street_address,
            jr.service_type,
            jr.work_scope,
            jr.work_category,
            jr.preferred_timeframe,
            jr.description as request_description,
            jr.status as request_status,
            estimate_event.metadata as estimate_metadata
          from quotes q
          left join job_requests jr on jr.id = q.job_request_id
          left join lateral (
            select metadata
            from audit_events
            where audit_events.entity_type = 'quote'
              and audit_events.entity_id = q.id
              and audit_events.event_type = 'estimate_draft.created'
            order by created_at desc
            limit 1
          ) estimate_event on true
          where (${status} = 'all' or q.status = ${status})
        ), request_rows as (
          select
            null::uuid as quote_id,
            jr.id as job_request_id,
            jr.client_id,
            'needs_review'::text as quote_status,
            concat(coalesce(jr.service_type, 'Service'), ' estimate request') as title,
            jr.description as summary,
            null::integer as amount_cents,
            null::timestamptz as quote_created_at,
            null::timestamptz as quote_updated_at,
            jr.created_at as request_created_at,
            jr.updated_at as request_updated_at,
            jr.requester_name,
            jr.requester_email,
            jr.requester_phone,
            jr.city,
            jr.street_address,
            jr.service_type,
            jr.work_scope,
            jr.work_category,
            jr.preferred_timeframe,
            jr.description as request_description,
            jr.status as request_status,
            '{}'::jsonb as estimate_metadata
          from job_requests jr
          where not exists (select 1 from quotes q where q.job_request_id = jr.id)
            and jr.status = any(${REQUEST_ONLY_REVIEW_STATUSES})
            and ${status} in ('all', 'draft', 'needs_review', 'pending_review')
        )
        select * from quote_rows
        union all
        select * from request_rows
        order by coalesce(quote_updated_at, request_updated_at, quote_created_at, request_created_at) desc
        limit ${limit}
      `;

      const inventoryItems = await db.sql`
        select id, name, sku, category, trade_type, unit, quantity_on_hand, quantity_reserved, reorder_point, unit_cost, charge_price, supplier, supplier_part_number, ai_quote_catalog_key
        from inventory_items
        where is_active = true
        limit 500
      `;
      const reservationRows = await db.sql`
        select id, inventory_item_id, job_request_id, reserved_quantity, used_quantity, status
        from inventory_reservations
        where status in ('reserved', 'partially_used')
        limit 500
      `;
      const databaseDrafts = rows.map((row) => mapDraft(row, { inventoryItems, reservationRows }));
      const blobDrafts = await loadBlobDrafts(limit);
      const drafts = [...databaseDrafts, ...blobDrafts].slice(0, limit);
      const readyCount = drafts.filter((draft) => Number(draft.amountCents || 0) > 0).length;
      const needsReviewCount = drafts.length - readyCount;

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
        stats: {
          totalDrafts: drafts.length,
          readyCount,
          needsReviewCount,
        },
        drafts,
      });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

    const payload = normalizeDecisionPayload(body);
    if (!payload.quoteId) return json(422, { ok: false, message: 'Quote is required.' });

    const [existingQuote] = await db.sql`
      select id, job_request_id, client_id, status, title, summary, amount_cents
      from quotes
      where id = ${payload.quoteId}
      limit 1
    `;

    if (!existingQuote) {
      return json(404, { ok: false, message: 'Estimate draft not found.' });
    }

    const nextStatus = payload.action === 'send' ? 'sent' : 'draft';
    const title = payload.title || existingQuote.title;
    const summary = payload.summary || existingQuote.summary;
    const amountCents = Number.isInteger(payload.amountCents) && payload.amountCents >= 0
      ? payload.amountCents
      : Number(existingQuote.amount_cents || 0);

    const [quote] = await db.sql`
      update quotes
      set title = ${title},
          summary = ${summary || null},
          amount_cents = ${amountCents},
          status = ${nextStatus},
          sent_at = case when ${payload.action === 'send'} then coalesce(sent_at, now()) else sent_at end,
          updated_at = now()
      where id = ${existingQuote.id}
      returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
    `;

    if (payload.action === 'send') {
      await db.sql`
        update job_requests
        set status = 'quote_sent', updated_at = now()
        where id = ${quote.job_request_id}
      `;
    }

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${payload.action === 'send' ? 'estimate_review.sent' : 'estimate_review.updated'},
        ${'quote'},
        ${quote.id},
        ${JSON.stringify({ source: 'admin_estimate_review', jobRequestId: quote.job_request_id, amountCents, action: payload.action || 'save' })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      quote: {
        id: quote.id,
        jobRequestId: quote.job_request_id,
        clientId: quote.client_id,
        status: quote.status,
        title: quote.title,
        summary: quote.summary,
        amountCents: quote.amount_cents,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to load or update estimate review queue', error);
    return json(500, { ok: false, message: 'Could not load estimate review right now.' });
  }
};

export const config = {
  path: '/api/admin/estimate-review',
};
