import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_QUOTE_FIELDS,
  runAiFirstQuote,
  runAiFirstTroubleshooting,
  saveAdminAiCorrection,
  validateQuoteAiOutput,
} from '../netlify/functions/ai-intelligence-engine.mjs';

const validQuote = (overrides = {}) => ({
  jobClassification: 'Mini split diagnostic and repair',
  tradeCategory: 'HVAC',
  confidenceScore: 0.82,
  quoteReady: true,
  siteVisitRecommended: false,
  missingInfoQuestions: [],
  laborPhases: [{ name: 'Diagnose system', lowHours: 1, highHours: 2 }, { name: 'Repair and test', lowHours: 2, highHours: 4 }],
  laborHoursLow: 3,
  laborHoursHigh: 6,
  laborRateUsed: 125,
  materialBreakdown: [{ name: 'Mini split condensate pump', quantity: 1, unit: 'each', notes: 'Verify model before purchase' }],
  toolsNeeded: ['Multimeter', 'Manifold gauges if licensed HVAC scope requires them'],
  consumables: ['Wire nuts', 'Drain tubing'],
  inventoryMatchHints: ['condensate pump', 'mini split drain tubing'],
  supplierPricingRecommendations: ['Check current HVAC supplier price and in-stock status before sending'],
  riskFlags: ['Stop and escalate to licensed HVAC supervisor for refrigerant, high-voltage, or code concerns.'],
  exclusions: ['Refrigerant recovery/charge unless separately approved by licensed HVAC tech.'],
  changeOrderTriggers: ['Hidden electrical damage', 'Failed control board', 'Refrigerant leak repair'],
  customerReadySummary: 'Diagnose mini split, replace confirmed failed condensate pump if needed, and test operation.',
  adminReviewChecklist: ['Verify model/serial', 'Confirm safe access', 'Verify licensed HVAC scope before refrigerant work'],
  totalLowCents: 45000,
  totalHighCents: 95000,
  fixedPriceRecommendationCents: 72500,
  ...overrides,
});

const validTroubleshooting = (overrides = {}) => ({
  firstThingToCheck: 'Confirm power, disconnect, breaker, thermostat call, and visible error code without bypassing safeties.',
  safetyWarnings: ['Use lockout/tagout and stop/escalate for live high-voltage or refrigerant work.'],
  diagnosticSteps: ['Interview customer and reproduce complaint safely.', 'Check filters, drain, error codes, and control wiring.', 'Compare readings to manufacturer data.'],
  expectedReadings: ['Voltage should match nameplate/control requirements.', 'Temperature split should match manufacturer operating data.'],
  toolsMetersNeeded: ['Multimeter', 'Clamp meter', 'Manufacturer service manual'],
  likelyCauses: [{ cause: 'Blocked drain or pump failure', probability: 0.45 }, { cause: 'Control signal issue', probability: 0.25 }],
  partsLikelyNeeded: ['Condensate pump after readings confirm failure'],
  stopAndEscalateIf: ['Gas, refrigerant, exposed live wiring, code concern, or unsafe access is present.'],
  customerExplanation: 'We will start with safe checks and readings before recommending parts.',
  workOrderNotes: 'Document readings, photos, model/serial, and exact error code.',
  repairEstimateRecommendation: 'Quote diagnostic first, then fixed repair after confirmed part and access.',
  ...overrides,
});

const makeDb = ({ history = [] } = {}) => {
  const queries = [];
  const sql = async (strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    queries.push({ text, values });
    if (/from ai_quote_runs/i.test(text)) return history;
    return [];
  };
  return { sql, queries };
};

const openAiResponse = (payload) => ({ ok: true, json: async () => ({ output_text: JSON.stringify(payload) }) });

test('quote generation calls OpenAI first and does not invoke fallback when validated output succeeds', async () => {
  const db = makeDb();
  let fallbackCalled = false;
  let fetchCalled = false;
  const result = await runAiFirstQuote({
    db,
    apiKey: 'test-key',
    jobRequest: { id: 'req-1', service_type: 'HVAC', work_category: 'Mini split', description: 'Mini split is leaking water and not cooling in Phoenix.', city: 'Phoenix' },
    inventory: [{ name: 'Condensate pump', quantity_on_hand: 2 }],
    fetchImpl: async () => { fetchCalled = true; return openAiResponse(validQuote()); },
    fallbackBuilder: async () => { fallbackCalled = true; return {}; },
  });

  assert.equal(fetchCalled, true);
  assert.equal(fallbackCalled, false);
  assert.equal(result.aiEnhanced, true);
  assert.equal(result.fallbackUsed, false);
  assert.equal(db.queries.some((q) => /insert into ai_quote_runs/i.test(q.text)), true, 'successful AI run should be audited');
  assert.equal(db.queries.some((q) => /insert into ai_material_knowledge/i.test(q.text)), true, 'AI materials should be saved as pending knowledge');
});

test('invalid OpenAI JSON retries once and only then uses emergency fallback', async () => {
  const db = makeDb();
  let fetchCalls = 0;
  let fallbackCalls = 0;
  const result = await runAiFirstQuote({
    db,
    apiKey: 'test-key',
    jobRequest: { id: 'req-2', service_type: 'General', work_category: 'Repair', description: 'Fix broken thing', city: 'Tempe' },
    fetchImpl: async () => { fetchCalls += 1; return { ok: true, json: async () => ({ output_text: 'not-json' }) }; },
    fallbackBuilder: async () => { fallbackCalls += 1; return { title: 'Emergency fallback', fallbackSource: 'static_emergency_rules' }; },
  });

  assert.equal(fetchCalls, 2);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.aiEnhanced, false);
  assert.equal(result.fallbackUsed, true);
  assert.match(result.warning, /Emergency fallback used/);
});

test('quote validation enforces every Phase 57 required field and rejects unsafe incomplete trades', () => {
  const missing = validQuote();
  delete missing.materialBreakdown;
  const validation = validateQuoteAiOutput(missing, { serviceType: 'Electrical', description: 'Outlet not working' });

  assert.equal(REQUIRED_QUOTE_FIELDS.includes('fixedPriceRecommendationCents'), true);
  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.includes('materialBreakdown')), true);
});

test('troubleshooting calls OpenAI before fallback and stores generated knowledge', async () => {
  const db = makeDb();
  let fallbackCalled = false;
  const result = await runAiFirstTroubleshooting({
    db,
    apiKey: 'test-key',
    payload: { workOrderId: 'wo-1', systemType: 'HVAC', component: 'mini split', issue: 'not cooling and dripping water' },
    fetchImpl: async () => openAiResponse(validTroubleshooting()),
    fallbackBuilder: async () => { fallbackCalled = true; return {}; },
  });

  assert.equal(fallbackCalled, false);
  assert.equal(result.aiEnhanced, true);
  assert.equal(result.fallbackUsed, false);
  assert.equal(db.queries.some((q) => /insert into ai_troubleshooting_knowledge/i.test(q.text)), true);
});

test('emergency fallback receives company history before falling back to static rules', async () => {
  const db = makeDb({ history: [{ run_type: 'quote', input_summary: { customerRequest: { service_type: 'HVAC' } }, output_json: validQuote({ laborHoursHigh: 14 }) }] });
  let seenHistory = [];
  const result = await runAiFirstQuote({
    db,
    apiKey: 'test-key',
    jobRequest: { id: 'req-3', service_type: 'HVAC', work_category: 'Mini split', description: 'Mini split repair', city: 'Mesa' },
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: { message: 'unavailable' } }) }),
    fallbackBuilder: async ({ historicalContext }) => { seenHistory = historicalContext; return { fallbackSource: historicalContext.length ? 'company_history' : 'static_emergency_rules' }; },
  });

  assert.equal(seenHistory.length, 1);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackSource, 'company_history');
});

test('admin quote edits are stored as AI corrections for future learning', async () => {
  const db = makeDb();
  await saveAdminAiCorrection({
    db,
    quoteId: 'quote-1',
    jobRequestId: 'req-1',
    actorUserId: 'admin-1',
    originalAiResult: validQuote({ laborHoursHigh: 10 }),
    adminChanges: { laborHours: 14, priceAdjustmentCents: 25000, exclusionsAdded: ['Drywall repair excluded'], customerWordingChanges: 'Simplified wording' },
    finalQuote: { amount_cents: 140000 },
  });

  const correction = db.queries.find((q) => /insert into ai_admin_corrections/i.test(q.text));
  assert.ok(correction, 'admin correction insert should be recorded');
  assert.equal(correction.values.includes(10), true, 'recommended AI hours should be stored');
  assert.equal(correction.values.includes(14), true, 'approved admin hours should be stored');
});
