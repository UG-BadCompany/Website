import { clean } from './auth-utils.mjs';

export const AI_QUOTE_PROMPT_VERSION = 'phase58-ai-tight-confidence-quote-v1';
export const AI_TROUBLESHOOTING_PROMPT_VERSION = 'phase57-ai-first-troubleshooting-v1';

export const REQUIRED_QUOTE_FIELDS = [
  'jobClassification',
  'tradeCategory',
  'confidenceScore',
  'quoteReady',
  'siteVisitRecommended',
  'missingInfoQuestions',
  'laborPhases',
  'laborHoursLow',
  'laborHoursHigh',
  'laborRateUsed',
  'materialBreakdown',
  'toolsNeeded',
  'consumables',
  'inventoryMatchHints',
  'supplierPricingRecommendations',
  'riskFlags',
  'exclusions',
  'changeOrderTriggers',
  'customerReadySummary',
  'adminReviewChecklist',
  'totalLowCents',
  'totalHighCents',
  'fixedPriceRecommendationCents',
  'pricingConfidenceLevel',
  'pricingConfidenceReason',
  'rangeSpreadReason',
  'fixedPricePreferred',
  'needsSiteVisitToTightenPrice',
  'missingMeasurementsNeeded',
  'assumptionsUsedForTightPrice',
];

export const REQUIRED_TROUBLESHOOTING_FIELDS = [
  'firstThingToCheck',
  'safetyWarnings',
  'diagnosticSteps',
  'expectedReadings',
  'toolsMetersNeeded',
  'likelyCauses',
  'partsLikelyNeeded',
  'stopAndEscalateIf',
  'customerExplanation',
  'workOrderNotes',
  'repairEstimateRecommendation',
];

const HIGH_RISK_PATTERN = /electrical|outlet|switch|light|ceiling fan|panel|breaker|hvac|mini\s*split|heat\s*pump|water\s*source|gas|refrigerant|roof|structural|water\s*heater|plumbing/i;
const VAGUE_PATTERN = /\b(fix|repair|broken|not working|issue|problem|help|thing|stuff)\b/i;

const toArray = (value) => Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).map((item) => typeof item === 'string' ? clean(item, 1200) : item).filter(Boolean) : [];
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const parseOpenAiJson = (result = {}) => {
  const candidates = [
    result.output_text,
    result.text,
    result.content,
    result?.choices?.[0]?.message?.content,
    ...(Array.isArray(result.output) ? result.output.flatMap((item) => Array.isArray(item.content) ? item.content.map((content) => content.text) : []) : []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const raw = String(candidate).trim();
    if (!raw) continue;
    try { return JSON.parse(raw); } catch {}
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
  }
  return null;
};

export const normalizeQuoteAiOutput = (quote = {}) => {
  const laborPhases = toArray(quote.laborPhases).map((phase) => typeof phase === 'string' ? { name: phase } : phase);
  const materialBreakdown = toArray(quote.materialBreakdown).map((item) => typeof item === 'string' ? { name: item, quantity: 1, unit: 'each' } : item);
  return {
    ...quote,
    jobClassification: clean(quote.jobClassification, 160),
    tradeCategory: clean(quote.tradeCategory, 120),
    confidenceScore: Math.max(0, Math.min(1, toNumber(quote.confidenceScore, 0))),
    quoteReady: Boolean(quote.quoteReady),
    siteVisitRecommended: Boolean(quote.siteVisitRecommended),
    missingInfoQuestions: toArray(quote.missingInfoQuestions).map((q) => clean(String(q), 400)),
    laborPhases,
    laborHoursLow: toNumber(quote.laborHoursLow, 0),
    laborHoursHigh: toNumber(quote.laborHoursHigh, 0),
    laborRateUsed: toNumber(quote.laborRateUsed, 0),
    materialBreakdown,
    toolsNeeded: toArray(quote.toolsNeeded),
    consumables: toArray(quote.consumables),
    inventoryMatchHints: toArray(quote.inventoryMatchHints),
    supplierPricingRecommendations: toArray(quote.supplierPricingRecommendations),
    riskFlags: toArray(quote.riskFlags).map((risk) => clean(String(risk), 600)),
    exclusions: toArray(quote.exclusions).map((item) => clean(String(item), 600)),
    changeOrderTriggers: toArray(quote.changeOrderTriggers).map((item) => clean(String(item), 600)),
    customerReadySummary: clean(quote.customerReadySummary, 8000),
    adminReviewChecklist: toArray(quote.adminReviewChecklist).map((item) => clean(String(item), 600)),
    totalLowCents: Math.max(0, Math.round(toNumber(quote.totalLowCents, 0))),
    totalHighCents: Math.max(0, Math.round(toNumber(quote.totalHighCents, 0))),
    fixedPriceRecommendationCents: Math.max(0, Math.round(toNumber(quote.fixedPriceRecommendationCents, 0))),
    pricingConfidenceLevel: ['high', 'medium', 'low'].includes(clean(quote.pricingConfidenceLevel, 20).toLowerCase()) ? clean(quote.pricingConfidenceLevel, 20).toLowerCase() : '',
    pricingConfidenceReason: clean(quote.pricingConfidenceReason, 1200),
    rangeSpreadReason: clean(quote.rangeSpreadReason, 1200),
    fixedPricePreferred: Boolean(quote.fixedPricePreferred),
    needsSiteVisitToTightenPrice: Boolean(quote.needsSiteVisitToTightenPrice),
    missingMeasurementsNeeded: toArray(quote.missingMeasurementsNeeded).map((item) => clean(String(item), 400)),
    assumptionsUsedForTightPrice: toArray(quote.assumptionsUsedForTightPrice).map((item) => clean(String(item), 600)),
  };
};

export const validateQuoteAiOutput = (quote = {}, context = {}) => {
  const errors = [];
  for (const field of REQUIRED_QUOTE_FIELDS) {
    if (!(field in quote)) errors.push(`Missing required field: ${field}`);
  }
  const normalized = normalizeQuoteAiOutput(quote);
  if (normalized.confidenceScore <= 0 || normalized.confidenceScore > 1) errors.push('confidenceScore must be between 0 and 1.');
  if (normalized.laborHoursLow <= 0 || normalized.laborHoursHigh <= 0) errors.push('Labor hours must be greater than zero.');
  if (normalized.laborHoursHigh < normalized.laborHoursLow) errors.push('laborHoursHigh must be greater than or equal to laborHoursLow.');
  if (normalized.laborHoursHigh > 160) errors.push('Labor hours are unreasonably high.');
  if (!normalized.siteVisitRecommended && !normalized.materialBreakdown.length) errors.push('materialBreakdown cannot be empty unless siteVisitRecommended is true.');
  const requestText = `${context.serviceType || ''} ${context.workCategory || ''} ${context.description || ''} ${normalized.tradeCategory}`;
  if (HIGH_RISK_PATTERN.test(requestText)) {
    const riskText = `${normalized.riskFlags.join(' ')} ${normalized.adminReviewChecklist.join(' ')} ${normalized.changeOrderTriggers.join(' ')}`;
    if (!normalized.riskFlags.length) errors.push('High-risk trade requires riskFlags.');
    if (!/stop|escalate|licensed|supervisor|permit|code|safety/i.test(riskText)) errors.push('High-risk trade requires stop/escalate guidance.');
  }
  if (VAGUE_PATTERN.test(context.description || '') && String(context.description || '').trim().length < 80 && !normalized.missingInfoQuestions.length) {
    errors.push('Vague requests must include missingInfoQuestions.');
  }
  if (!normalized.customerReadySummary) errors.push('customerReadySummary is required.');
  if (!normalized.adminReviewChecklist.length) errors.push('adminReviewChecklist is required.');
  if (!normalized.pricingConfidenceLevel) errors.push('pricingConfidenceLevel must be high, medium, or low.');
  if (!normalized.pricingConfidenceReason) errors.push('pricingConfidenceReason is required.');
  if (!normalized.assumptionsUsedForTightPrice.length) errors.push('assumptionsUsedForTightPrice is required to support tight pricing.');
  if (normalized.totalHighCents < normalized.totalLowCents) errors.push('totalHighCents must be >= totalLowCents.');

  const rangeSpreadCents = Math.max(0, normalized.totalHighCents - normalized.totalLowCents);
  const rangeSpreadRatio = normalized.totalLowCents > 0 ? rangeSpreadCents / normalized.totalLowCents : 0;
  const quoteReadyWithoutVisit = normalized.quoteReady && !normalized.siteVisitRecommended && !normalized.needsSiteVisitToTightenPrice;
  if (normalized.pricingConfidenceLevel === 'low' && normalized.quoteReady) {
    errors.push('Low-confidence output cannot be quoteReady; ask missing questions or recommend a site visit.');
  }
  if (normalized.fixedPriceRecommendationCents && normalized.totalLowCents && normalized.totalHighCents && (normalized.fixedPriceRecommendationCents < normalized.totalLowCents || normalized.fixedPriceRecommendationCents > normalized.totalHighCents)) {
    errors.push('fixedPriceRecommendationCents must fall within totalLowCents and totalHighCents.');
  }
  if (quoteReadyWithoutVisit) {
    const confidenceMaxRatio = normalized.pricingConfidenceLevel === 'high' ? 0.15 : normalized.pricingConfidenceLevel === 'medium' ? 0.25 : 0.2;
    if (normalized.totalLowCents < 100000 && rangeSpreadCents > 25000) {
      errors.push('Quote-ready small jobs under $1,000 must keep the range within $250 unless a site visit/missing info is required.');
    }
    if (normalized.totalLowCents >= 100000 && normalized.totalLowCents <= 500000 && rangeSpreadRatio > 0.25) {
      errors.push('Quote-ready medium jobs must keep totalHighCents within 25% of totalLowCents.');
    }
    if (normalized.totalLowCents > 500000 && rangeSpreadRatio > 0.30) {
      errors.push('Quote-ready larger jobs must keep totalHighCents within 30% of totalLowCents.');
    }
    if (rangeSpreadRatio > confidenceMaxRatio) {
      errors.push(`${normalized.pricingConfidenceLevel || 'unknown'} pricing confidence allows a maximum ${(confidenceMaxRatio * 100).toFixed(0)}% range spread for quote-ready work.`);
    }
    if (rangeSpreadRatio > 0.20 && !normalized.rangeSpreadReason) {
      errors.push('rangeSpreadReason is required whenever a quote-ready range exceeds 20%.');
    }
  } else if (rangeSpreadRatio > 0.30 && !normalized.rangeSpreadReason) {
    errors.push('Site-visit or not-ready quotes may use a wider range only with rangeSpreadReason.');
  }
  return { ok: errors.length === 0, errors, normalized };
};

export const normalizeTroubleshootingAiOutput = (plan = {}) => ({
  firstThingToCheck: clean(plan.firstThingToCheck || plan.summary, 1200),
  safetyWarnings: toArray(plan.safetyWarnings).map((item) => clean(String(item), 800)),
  diagnosticSteps: toArray(plan.diagnosticSteps).map((item) => clean(String(item), 1000)),
  expectedReadings: toArray(plan.expectedReadings).map((item) => clean(String(item), 800)),
  toolsMetersNeeded: toArray(plan.toolsMetersNeeded).map((item) => clean(String(item), 300)),
  likelyCauses: toArray(plan.likelyCauses).map((item) => typeof item === 'string' ? { cause: clean(item, 500), probability: 'unknown' } : item),
  partsLikelyNeeded: toArray(plan.partsLikelyNeeded).map((item) => clean(typeof item === 'string' ? item : item?.name || JSON.stringify(item), 400)),
  stopAndEscalateIf: toArray(plan.stopAndEscalateIf).map((item) => clean(String(item), 800)),
  customerExplanation: clean(plan.customerExplanation, 2000),
  workOrderNotes: clean(plan.workOrderNotes, 3000),
  repairEstimateRecommendation: clean(plan.repairEstimateRecommendation || plan.estimateRecommendation, 1600),
});

export const validateTroubleshootingAiOutput = (plan = {}, context = {}) => {
  const errors = [];
  for (const field of REQUIRED_TROUBLESHOOTING_FIELDS) {
    if (!(field in plan)) errors.push(`Missing required field: ${field}`);
  }
  const normalized = normalizeTroubleshootingAiOutput(plan);
  if (!normalized.firstThingToCheck) errors.push('firstThingToCheck is required.');
  if (!normalized.safetyWarnings.length) errors.push('safetyWarnings are required.');
  if (!normalized.diagnosticSteps.length) errors.push('diagnosticSteps are required.');
  if (!normalized.stopAndEscalateIf.length) errors.push('stopAndEscalateIf is required.');
  if (HIGH_RISK_PATTERN.test(`${context.systemType || ''} ${context.component || ''} ${context.issue || ''}`)) {
    const safetyText = `${normalized.safetyWarnings.join(' ')} ${normalized.stopAndEscalateIf.join(' ')}`;
    if (!/stop|escalate|lockout|tagout|licensed|supervisor|gas|refrigerant|electrical/i.test(safetyText)) {
      errors.push('High-risk troubleshooting requires explicit safety stop/escalate language.');
    }
  }
  return { ok: errors.length === 0, errors, normalized };
};

export const callOpenAiJson = async ({ apiKey, model, timeoutMs = 12000, system, user, fetchImpl = fetch }) => {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || `OpenAI request failed with ${response.status}`);
    const parsed = parseOpenAiJson(result);
    if (!parsed) throw new Error('OpenAI did not return valid JSON.');
    return parsed;
  } finally {
    clearTimeout(timer);
  }
};

export const runOpenAiWithValidation = async ({ kind, apiKey, model, timeoutMs, system, user, correctionSystem, validate, context, fetchImpl }) => {
  const attempts = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = attempt === 0 ? user : {
        originalRequest: user,
        previousValidationErrors: attempts.at(-1)?.validationErrors || attempts.at(-1)?.error || [],
        instruction: 'Return corrected strict JSON only. Include every required field and satisfy validation rules.',
      };
      const parsed = await callOpenAiJson({ apiKey, model, timeoutMs, system: attempt === 0 ? system : (correctionSystem || system), user: payload, fetchImpl });
      const validation = validate(parsed, context);
      attempts.push({ attempt: attempt + 1, parsed, validationErrors: validation.errors });
      if (validation.ok) return { ok: true, output: validation.normalized, attempts, retryCount: attempt, model };
    } catch (error) {
      attempts.push({ attempt: attempt + 1, error: error?.message || 'OpenAI call failed' });
    }
  }
  return { ok: false, attempts, retryCount: Math.max(0, attempts.length - 1), model, error: attempts.at(-1)?.error || 'OpenAI output failed validation after retry.' };
};

export const buildQuotePrompt = ({ jobRequest = {}, inventory = [], supplierPricing = [], historicalContext = [], companyRules = [], photoContext = [] }) => ({
  promptVersion: AI_QUOTE_PROMPT_VERSION,
  task: 'Create a contractor-grade AI-first estimate for T&A Contracting. OpenAI is the decision maker; company playbooks/history are context only.',
  requiredFields: REQUIRED_QUOTE_FIELDS,
  validationRules: [
    'Return strict JSON only.',
    'Classify job and trade.',
    'Decide quoteReady and siteVisitRecommended.',
    'Provide labor phases, hours low/high, and labor rate.',
    'Provide materials, tools, consumables, inventory hints, supplier recommendations, risks, exclusions, change orders, customer summary, admin checklist, and low/high/fixed cents.',
    'Prefer a confident fixed price whenever enough information exists; do not hide uncertainty behind a huge low/high range.',
    'Return a tight low/high range plus one recommended fixed price. High confidence range max 10-15%; medium confidence max 20-25%; low confidence must set quoteReady false unless admin overrides later.',
    'Use company history, inventory, labor knowledge, material knowledge, supplier pricing, and photos/context to tighten pricing.',
    'If uncertain, ask missing questions or recommend a site visit and explain exactly what information would tighten price.',
    'High-risk trades require risk flags and stop/escalate guidance.',
    'Vague requests require missingInfoQuestions.',
  ],
  customerRequest: jobRequest,
  inventoryContext: inventory,
  supplierPricingContext: supplierPricing,
  historicalCompanyContext: historicalContext,
  companyRules,
  photoContext,
});

export const buildTroubleshootingPrompt = ({ payload = {}, historicalContext = [], companyRules = [], photoContext = [] }) => ({
  promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION,
  task: 'Create a trade-specific diagnostic tree for T&A Contracting. OpenAI is primary; fallback is emergency only.',
  requiredFields: REQUIRED_TROUBLESHOOTING_FIELDS,
  supportedTrades: ['HVAC', 'mini splits', 'water source heat pumps', 'plumbing', 'drains', 'water heaters', 'electrical', 'outlets', 'switches', 'lights', 'ceiling fans', 'exhaust fans', 'appliances', 'doors', 'locks', 'drywall', 'irrigation', 'pumps', 'general handyman work'],
  validationRules: ['Return strict JSON only.', 'Include safety warnings, expected readings, tools/meters, likely causes ranked by probability, stop/escalate conditions, customer explanation, work-order notes, and repair estimate recommendation.'],
  fieldInput: payload,
  historicalCompanyContext: historicalContext,
  companyRules,
  photoContext,
});

const safeSql = async (db, operation) => {
  try {
    if (!db?.sql) return [];
    const sql = typeof db.sql.bind === 'function' ? db.sql.bind(db) : db.sql;
    return await operation(sql);
  } catch (error) {
    console.warn('AI knowledge/audit persistence skipped.', error?.message || error);
    return [];
  }
};

export const saveAiRun = async ({ db, kind, entityId = null, model, promptVersion, inputSummary, output, validation, fallbackUsed = false, fallbackReason = '', fallbackSource = '', retryCount = 0 }) => {
  await safeSql(db, (sql) => sql`
    insert into ai_quote_runs (
      run_type, entity_id, model, prompt_version, input_summary, output_json,
      validation_result, validation_errors, fallback_used, fallback_reason,
      fallback_source, retry_count, ai_enhanced, service_type, work_category,
      trade, city, labor_hours_low, labor_hours_high, material_list,
      confidence_score, risk_flags, exclusions
    ) values (
      ${kind}, ${entityId}, ${model}, ${promptVersion}, ${JSON.stringify(inputSummary || {})}::jsonb,
      ${JSON.stringify(output || {})}::jsonb, ${validation?.ok ? 'valid' : 'invalid'},
      ${JSON.stringify(validation?.errors || [])}::jsonb, ${fallbackUsed}, ${fallbackReason || null},
      ${fallbackSource || null}, ${retryCount}, ${!fallbackUsed},
      ${clean(inputSummary?.customerRequest?.service_type || inputSummary?.fieldInput?.systemType, 120)},
      ${clean(inputSummary?.customerRequest?.work_category || inputSummary?.fieldInput?.component, 120)},
      ${clean(output?.tradeCategory || inputSummary?.fieldInput?.systemType, 120)},
      ${clean(inputSummary?.customerRequest?.city, 120)},
      ${Number.isFinite(Number(output?.laborHoursLow)) ? Number(output.laborHoursLow) : null},
      ${Number.isFinite(Number(output?.laborHoursHigh)) ? Number(output.laborHoursHigh) : null},
      ${JSON.stringify(output?.materialBreakdown || output?.partsLikelyNeeded || [])}::jsonb,
      ${Number.isFinite(Number(output?.confidenceScore)) ? Number(output.confidenceScore) : null},
      ${JSON.stringify(output?.riskFlags || output?.safetyWarnings || [])}::jsonb,
      ${JSON.stringify(output?.exclusions || [])}::jsonb
    )
  `);
};

export const saveKnowledgeFromQuote = async ({ db, quote, sourceRunId = null, jobRequest = {} }) => {
  const materials = toArray(quote.materialBreakdown);
  const labor = toArray(quote.laborPhases);
  for (const item of materials.slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_material_knowledge (source_run_id, name, trade, quantity_assumption, unit, source_payload, review_status)
      values (${sourceRunId}, ${clean(item.name, 200)}, ${clean(quote.tradeCategory || jobRequest.work_category, 120)}, ${toNumber(item.quantity ?? item.estimatedQuantity ?? 1, 1)}, ${clean(item.unit || 'each', 40)}, ${JSON.stringify(item)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
  for (const phase of labor.slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_labor_knowledge (source_run_id, phase_name, trade, hours_low, hours_high, source_payload, review_status)
      values (${sourceRunId}, ${clean(phase.name || phase.phase, 200)}, ${clean(quote.tradeCategory || jobRequest.work_category, 120)}, ${toNumber(phase.lowHours ?? phase.low_hours ?? quote.laborHoursLow, 0)}, ${toNumber(phase.highHours ?? phase.high_hours ?? quote.laborHoursHigh, 0)}, ${JSON.stringify(phase)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
};

export const saveKnowledgeFromTroubleshooting = async ({ db, plan, sourceRunId = null, payload = {} }) => {
  for (const step of toArray(plan.diagnosticSteps).slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_troubleshooting_knowledge (source_run_id, trade, component, symptom, knowledge_type, content, source_payload, review_status)
      values (${sourceRunId}, ${clean(payload.systemType, 120)}, ${clean(payload.component, 120)}, ${clean(payload.issue, 240)}, ${'diagnostic_step'}, ${clean(String(step), 1200)}, ${JSON.stringify(plan)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
};

export const saveAdminAiCorrection = async ({ db, quoteId, jobRequestId = null, originalAiResult = {}, adminChanges = {}, finalQuote = {}, actorUserId = null }) => {
  await safeSql(db, (sql) => sql`
    insert into ai_admin_corrections (quote_id, job_request_id, actor_user_id, original_ai_result, admin_changes, final_approved_quote, recommended_hours, approved_hours, price_adjustment_cents, exclusions_added, customer_wording_changes)
    values (
      ${quoteId}, ${jobRequestId}, ${actorUserId}, ${JSON.stringify(originalAiResult || {})}::jsonb,
      ${JSON.stringify(adminChanges || {})}::jsonb, ${JSON.stringify(finalQuote || {})}::jsonb,
      ${Number.isFinite(Number(originalAiResult?.laborHoursHigh)) ? Number(originalAiResult.laborHoursHigh) : null},
      ${Number.isFinite(Number(adminChanges?.laborHours ?? finalQuote?.laborHours)) ? Number(adminChanges?.laborHours ?? finalQuote?.laborHours) : null},
      ${Number.isFinite(Number(adminChanges?.priceAdjustmentCents)) ? Number(adminChanges.priceAdjustmentCents) : null},
      ${JSON.stringify(adminChanges?.exclusionsAdded || [])}::jsonb,
      ${clean(adminChanges?.customerWordingChanges, 4000)}
    )
  `);
};

export const loadHistoricalAiContext = async ({ db, serviceType = '', workCategory = '', city = '', limit = 6 }) => {
  const like = `%${clean(serviceType || workCategory, 80)}%`;
  const rows = await safeSql(db, (sql) => sql`
    select run_type, input_summary, output_json, created_at
    from ai_quote_runs
    where coalesce(input_summary::text, '') ilike ${like}
    order by created_at desc
    limit ${limit}
  `);
  return Array.isArray(rows) ? rows.map((row) => ({ type: row.run_type, input: row.input_summary, output: row.output_json, createdAt: row.created_at, city })) : [];
};

export const runAiFirstQuote = async ({ db, jobRequest, inventory = [], supplierPricing = [], companyRules = [], photoContext = [], apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', timeoutMs = Number(process.env.AI_QUOTE_TIMEOUT_MS || 14000), fetchImpl = fetch, fallbackBuilder = null }) => {
  const historicalContext = await loadHistoricalAiContext({ db, serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, city: jobRequest.city });
  const prompt = buildQuotePrompt({ jobRequest, inventory, supplierPricing, historicalContext, companyRules, photoContext });
  const system = 'You are the AI-first estimating engine for T&A Contracting. Use company history, inventory, supplier pricing, photos, and request details. Return strict JSON only with the required fields. Do not omit high-risk safety/stop guidance.';
  const result = await runOpenAiWithValidation({ kind: 'quote', apiKey, model, timeoutMs, system, user: prompt, validate: validateQuoteAiOutput, context: { serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, description: jobRequest.description }, fetchImpl });
  if (result.ok) {
    await saveAiRun({ db, kind: 'quote', entityId: jobRequest.id, model, promptVersion: AI_QUOTE_PROMPT_VERSION, inputSummary: prompt, output: result.output, validation: { ok: true, errors: [] }, retryCount: result.retryCount });
    await saveKnowledgeFromQuote({ db, quote: result.output, jobRequest });
    return { ...result.output, aiEnhanced: true, fallbackUsed: false, historicalMatchUsed: historicalContext.length > 0, model, promptVersion: AI_QUOTE_PROMPT_VERSION, retryCount: result.retryCount };
  }
  const fallback = fallbackBuilder ? await fallbackBuilder({ reason: result.error, attempts: result.attempts, historicalContext }) : null;
  const fallbackPayload = {
    ...(fallback || {}),
    aiEnhanced: false,
    fallbackUsed: true,
    fallbackReason: result.error || 'OpenAI failed validation after retry.',
    fallbackSource: fallback?.fallbackSource || (historicalContext.length ? 'company_history' : 'static_emergency_rules'),
    warning: 'OpenAI quote generation failed or returned invalid JSON after retry. Emergency fallback used; admin review required.',
    openAiAttempts: result.attempts,
  };
  await saveAiRun({ db, kind: 'quote', entityId: jobRequest.id, model, promptVersion: AI_QUOTE_PROMPT_VERSION, inputSummary: prompt, output: fallbackPayload, validation: { ok: false, errors: result.attempts.flatMap((a) => a.validationErrors || a.error || []) }, fallbackUsed: true, fallbackReason: fallbackPayload.fallbackReason, retryCount: result.retryCount });
  return fallbackPayload;
};

export const runAiFirstTroubleshooting = async ({ db, payload, companyRules = [], photoContext = [], apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_TROUBLESHOOTING_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', timeoutMs = Number(process.env.AI_TROUBLESHOOTING_TIMEOUT_MS || 12000), fetchImpl = fetch, fallbackBuilder = null }) => {
  const historicalContext = await loadHistoricalAiContext({ db, serviceType: payload.systemType, workCategory: payload.component, city: '', limit: 6 });
  const prompt = buildTroubleshootingPrompt({ payload, historicalContext, companyRules, photoContext });
  const system = 'You are the AI-first field troubleshooting engine for T&A Contracting. Return strict JSON only. Be safety-first and trade-specific. Include stop/escalate guidance for high-risk work.';
  const result = await runOpenAiWithValidation({ kind: 'troubleshooting', apiKey, model, timeoutMs, system, user: prompt, validate: validateTroubleshootingAiOutput, context: payload, fetchImpl });
  if (result.ok) {
    await saveAiRun({ db, kind: 'troubleshooting', entityId: payload.workOrderId || null, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, inputSummary: prompt, output: result.output, validation: { ok: true, errors: [] }, retryCount: result.retryCount });
    await saveKnowledgeFromTroubleshooting({ db, plan: result.output, payload });
    return { ...result.output, aiEnhanced: true, fallbackUsed: false, historicalMatchUsed: historicalContext.length > 0, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, retryCount: result.retryCount };
  }
  const fallback = fallbackBuilder ? await fallbackBuilder({ reason: result.error, attempts: result.attempts, historicalContext }) : null;
  const fallbackPayload = {
    ...(fallback || {}),
    aiEnhanced: false,
    fallbackUsed: true,
    fallbackReason: result.error || 'OpenAI troubleshooting failed validation after retry.',
    fallbackSource: fallback?.fallbackSource || (historicalContext.length ? 'company_troubleshooting_history' : 'static_emergency_rules'),
    warning: 'OpenAI troubleshooting failed or returned invalid JSON after retry. Emergency fallback used; verify before dispatch.',
    openAiAttempts: result.attempts,
  };
  await saveAiRun({ db, kind: 'troubleshooting', entityId: payload.workOrderId || null, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, inputSummary: prompt, output: fallbackPayload, validation: { ok: false, errors: result.attempts.flatMap((a) => a.validationErrors || a.error || []) }, fallbackUsed: true, fallbackReason: fallbackPayload.fallbackReason, fallbackSource: fallbackPayload.fallbackSource, retryCount: result.retryCount });
  return fallbackPayload;
};
