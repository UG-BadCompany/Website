import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  confidenceScores: { overall: 0.82, trade_certainty: 0.9, scope: 0.82, photo_quality: 0.6, equipment_identification: 0.72, pricing: 0.78, measurements: 0.7, materials: 0.76, regional_data: 0.66, code_requirements: 0.7, customer_description_quality: 0.78, labor: 0.8, information_completeness: 0.76, research: 0.68 },
  confidenceReasons: ['Specific trade, standard diagnostic phases, and known material allowance.'],
  recommendedAction: 'Ready for admin review.',
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
  totalLowCents: 65000,
  totalHighCents: 72500,
  fixedPriceRecommendationCents: 69500,
  pricingConfidenceLevel: 'high',
  pricingConfidenceReason: 'Scope is specific, similar jobs exist, standard parts are available, and labor phases are known.',
  rangeSpreadReason: 'Small allowance for access and confirmed part condition.',
  fixedPricePreferred: true,
  needsSiteVisitToTightenPrice: false,
  missingMeasurementsNeeded: [],
  assumptionsUsedForTightPrice: ['Standard wall access', 'No hidden electrical damage', 'Condensate pump is reachable'],
  photoNeeded: false,
  photoTypesNeeded: [],
  measurementNeeded: false,
  modelPlateNeeded: false,
  photoConfidenceImpact: 'Existing photo metadata is not required for this standard repair; model/access assumptions are stated.',
  jobSummary: 'Mini split diagnostic and repair with model verification and safe operational testing.',
  detailedScope: ['Verify equipment nameplate and complaint.', 'Diagnose condensate/no-cooling issue.', 'Replace confirmed failed component and test operation.'],
  equipmentBreakdown: [{ name: 'No rental equipment anticipated', quantity: 0, costCents: 0 }],
  permitBreakdown: [{ name: 'No permit expected for diagnostic/minor repair', costCents: 0 }],
  recommendedUpsells: ['Add seasonal HVAC maintenance after repair.'],
  maintenanceOpportunities: ['Clean filters, coils, and condensate path.'],
  safetyNotes: ['Use lockout/tagout and escalate refrigerant or high-voltage work.'],
  warrantyNotes: 'Manufacturer warranty depends on confirmed model/serial and part eligibility.',
  aiAnalysis: { tradeDetection: 'HVAC', scopeDetection: 'Mini split diagnostic/repair', complexityScore: 5, riskScore: 6, confidenceScore: 0.82 },
  pricingEngine: { laborHours: 4.5, laborRate: 125, laborCents: 56250, materialCostCents: 13250, permitCents: 0, markupRate: 0.18, markupCents: 2385, lowRangeCents: 65000, recommendedRangeCents: 69500, premiumRangeCents: 72500, why: ['Labor hours × rate plus material allowance and markup.'] },
  confidenceExplanation: { label: 'High', explanation: 'Trade, scope, labor, and standard material certainty are strong.', factors: { tradeCertainty: 0.9, scopeCertainty: 0.82, pricingCertainty: 0.78 } },
  photoAnalysis: { equipment: 'Mini split', condition: 'Not visible', accessDifficulty: 'Assumed standard', missingInformation: ['Model plate photo'] },
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
  technicianMode: { quickFix: ['Confirm thermostat call and filters.'], advancedDiagnosis: ['Measure condensate pump output and controls.'], expertMode: ['Compare readings to manufacturer service data before replacing parts.'] },
  diagnosticTests: [{ test: 'Measure voltage at equipment', expectedReading: 'Nameplate/control voltage within tolerance' }, { test: 'Measure condensate pump operation', expectedReading: 'Pump energizes and removes water' }],
  requiredTools: ['Multimeter', 'Clamp meter', 'Manufacturer service manual'],
  replacementRecommendation: 'Repair if confirmed part failure is isolated; consider replacement for major sealed-system or board failures on older units.',
  nextDiagnosticSteps: ['Capture model/serial plate.', 'Run tests in probability order.', 'Document readings and photos.'],
  confidenceScore: 0.78,
  confidenceExplanation: { label: 'High', explanation: 'Complaint and equipment type support a specific diagnostic tree.' },
  equipmentIdentification: { manufacturer: 'Unknown', model: 'Unknown', equipmentType: 'Mini split' },
  photoAnalysis: { quality: 'No photos supplied', confidenceImpact: 'Lower equipment/access certainty.' },
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


test('huge quote-ready range fails validation and triggers correction retry', async () => {
  const wideQuote = validQuote({ pricingConfidenceLevel: 'high', totalLowCents: 50000, totalHighCents: 250000, fixedPriceRecommendationCents: 100000 });
  const validation = validateQuoteAiOutput(wideQuote, { serviceType: 'Handyman', description: 'Replace a simple door handle with standard hardware.' });
  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => /range|spread|15%|\$250/i.test(error)), true);

  const db = makeDb();
  let fetchCalls = 0;
  const result = await runAiFirstQuote({
    db,
    apiKey: 'test-key',
    jobRequest: { id: 'req-range', service_type: 'Handyman', work_category: 'Door hardware', description: 'Replace a simple door handle with standard hardware.', city: 'Phoenix' },
    fetchImpl: async () => {
      fetchCalls += 1;
      return openAiResponse(fetchCalls === 1 ? wideQuote : validQuote({ totalLowCents: 65000, totalHighCents: 72500, fixedPriceRecommendationCents: 69500 }));
    },
  });

  assert.equal(fetchCalls, 2, 'wide ranges should trigger one OpenAI correction retry');
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.totalHighCents, 72500);
});

test('low-confidence quote-ready output fails validation', () => {
  const lowConfidence = validQuote({ pricingConfidenceLevel: 'low', quoteReady: true, siteVisitRecommended: false });
  const validation = validateQuoteAiOutput(lowConfidence, { serviceType: 'Handyman', description: 'Install owner supplied shelves in a standard closet.' });
  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => /Low-confidence output cannot be quoteReady/i.test(error)), true);
});

test('site visit can allow wider range only when rangeSpreadReason explains it', () => {
  const noReason = validQuote({ quoteReady: false, siteVisitRecommended: true, needsSiteVisitToTightenPrice: true, pricingConfidenceLevel: 'low', totalLowCents: 200000, totalHighCents: 450000, fixedPriceRecommendationCents: 300000, rangeSpreadReason: '' });
  const withReason = validQuote({ ...noReason, missingInfoQuestions: ['Measure damaged drywall square footage before fixed quote.'], rangeSpreadReason: 'Wall access and measurements are unknown until site visit.' });
  assert.equal(validateQuoteAiOutput(noReason, { serviceType: 'Drywall', description: 'Repair water damaged drywall across multiple rooms.' }).ok, false);
  assert.equal(validateQuoteAiOutput(withReason, { serviceType: 'Drywall', description: 'Repair water damaged drywall across multiple rooms.' }).ok, true);
});



test('AI quote prompt loads job photo metadata into photoContext', async () => {
  const db = makeDb({ history: [] });
  const originalSql = db.sql;
  db.sql = async (strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    db.queries.push({ text, values });
    if (/from ai_quote_runs/i.test(text)) return [];
    if (/from files/i.test(text)) return [{ id: 'file-1', job_request_id: 'req-photo', path: 'req-photo/issue/leak.jpg', file_name: 'leak.jpg', mime_type: 'image/jpeg', caption: 'Leak under sink', notes: 'Shows access and damage', photo_type: 'damage', source_context: 'client_request', created_at: '2026-05-31T00:00:00Z', metadata: {} }];
    return originalSql(strings, ...values);
  };
  let prompt = null;
  await runAiFirstQuote({
    db,
    apiKey: 'test-key',
    jobRequest: { id: 'req-photo', service_type: 'Plumbing', work_category: 'Leak', description: 'Repair visible under-sink leak with photo evidence.', city: 'Phoenix' },
    fetchImpl: async (_url, options) => { prompt = JSON.parse(options.body).input[1].content; return openAiResponse(validQuote({ tradeCategory: 'Plumbing' })); },
  });
  assert.match(prompt, /leak\.jpg/);
  assert.match(prompt, /damage/);
  assert.match(prompt, /Shows access and damage/);
});

test('quote UI exposes recommended fixed price, tight range, confidence, and override controls', async () => {
  const draftFunction = await readFile('netlify/functions/admin-quote-draft.mjs', 'utf8');
  const quoteUi = await readFile('public/dashboard/modules/admin/quotes/module.js', 'utf8');

  assert.match(draftFunction, /fixed_price_recommendation_cents/);
  assert.match(draftFunction, /pricing_engine/);
  assert.match(draftFunction, /confidence_explanation/);
  assert.match(quoteUi, /AI Quote Studio 2\.0/);
  assert.match(quoteUi, /SECTION 5 · Pricing Engine/);
  assert.match(quoteUi, /Accept AI Quote/);
  assert.match(quoteUi, /Save Final Version/);
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
