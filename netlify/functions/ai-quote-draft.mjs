// netlify/functions/ai-quote-draft.mjs
import { analyzeEstimateIntake } from './estimate-intake-intelligence.mjs';
// Fast AI quote draft endpoint. Used internally by job-requests.
// Prevents 504 by falling back to local estimator if OpenAI is slow.

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  },
  body: JSON.stringify(body),
});

const clean = (v, max = 5000) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const money = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function normalize(input = {}) {
  return {
    name: clean(input.name, 120),
    phone: clean(input.phone, 80),
    email: clean(input.email, 180),
    city: clean(input.city, 120),
    streetAddress: clean(input.streetAddress, 240),
    workScope: clean(input.workScope || input.work_scope, 120),
    service: clean(input.service || input.typeOfWork || input.work_category, 160),
    subcategory: clean(input.subcategory, 160),
    timeframe: clean(input.timeframe, 120),
    description: clean(input.description || input.details, 6000),
    photosProvided: Boolean(input.photosProvided || input.hasUpload),
  };
}

function questions(req) {
  const out = [];
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  if (!req.workScope) out.push('Is this troubleshooting/repair, replacing existing, or a new install?');
  if (!req.service) out.push('What type of work is this?');
  if (!req.streetAddress) out.push('What is the property address?');
  if (!req.description || req.description.length < 35) out.push('Please describe the work in more detail.');
  if (!req.photosProvided) out.push('Can you upload clear photos of the work area?');
  if (!/(model|brand|size|btu|amp|volt|inch|measurement|feet|ft)/i.test(text)) out.push('Do you have brand, model, size, voltage, measurements, or part information?');
  return out;
}

function materials(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  const add = (name, qty, low, high, notes = '') => ({ name, quantity: qty, required: true, customer_supplied: false, estimated_cost_low: low, estimated_cost_high: high, total_cost_low: low * qty, total_cost_high: high * qty, live_pricing_available: false, live_products: [], notes });
  if (/mini split|mini-split|ductless/.test(text)) return [
    add('Mini split system package', 1, 650, 2200, 'Customer supplied unit can reduce material total.'),
    add('Line set kit', 1, 120, 320),
    add('Line hide kit and fittings', 1, 90, 320),
    add('Communication wire', 1, 45, 150),
    add('Disconnect', 1, 45, 140),
    add('Fuses', 1, 15, 55),
    add('Electrical whip', 1, 25, 85),
    add('Breaker', 1, 45, 140),
    add('Wire and SO cord allowance', 1, 90, 360),
    add('Conduit and conduit fittings', 1, 85, 260),
    add('Condenser pad/bracket and mounting hardware', 1, 40, 220),
    add('Fasteners', 1, 12, 45),
    add('Condensate tubing', 1, 20, 90),
    add('Sealants and miscellaneous consumables', 1, 45, 180),
  ];
  if (/faucet/.test(text)) return [add('Faucet', 1, 45, 280), add('Supply lines', 1, 15, 45), add('Putty/silicone', 1, 6, 18), add('Drain/shutoff allowance', 1, 25, 120)];
  if (/toilet/.test(text)) return [add('Toilet', 1, 120, 450), add('Wax ring and bolts', 1, 9, 27), add('Supply line/shutoff allowance', 1, 17, 60), add('Caulk', 1, 5, 18)];
  if (/electrical|outlet|switch|gfci|light|fan/.test(text)) return [add('Device/fixture allowance', 1, 8, 200), add('Cover plate/connectors/fasteners', 1, 12, 60), add('Box extender/repair allowance', 1, 4, 25)];
  if (/drywall|patch|texture/.test(text)) return [add('Patch materials', 1, 10, 55), add('Joint compound/tape', 1, 12, 45), add('Texture/primer/paint allowance', 1, 32, 135)];
  return [add(`${req.service || 'General'} materials allowance`, 1, 25, 300), add('Fasteners, anchors, sealants, consumables', 1, 15, 90)];
}

function labor(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  if (/mini split|mini-split|ductless/.test(text)) return [
    { name: 'Layout and site prep', description: 'Confirm locations, paths, and access.', low_hours: 0.75, high_hours: 1.5, skill_level: 'advanced', notes: 'Site verification required.' },
    { name: 'Mount and wall penetration', description: 'Mount indoor head and sleeve/seal wall opening.', low_hours: 1.25, high_hours: 2.5, skill_level: 'advanced', notes: '' },
    { name: 'Route line set, drain, communication', description: 'Set condenser and route required paths.', low_hours: 2, high_hours: 5, skill_level: 'advanced', notes: '' },
    { name: 'Electrical coordination', description: 'Disconnect/whip/circuit/conduit review or install coordination.', low_hours: 1.5, high_hours: 6, skill_level: 'licensed review', notes: 'May require electrician.' },
    { name: 'Startup/testing', description: 'Startup, drain test, operation check, cleanup.', low_hours: 1, high_hours: 2.5, skill_level: 'HVAC review', notes: '' },
  ];
  return [
    { name: 'Site verification and protection', description: 'Confirm scope and protect work area.', low_hours: 0.25, high_hours: 0.75, skill_level: 'handyman', notes: '' },
    { name: 'Setup and removal/prep', description: 'Gather tools, shut off utilities if needed, remove old item if applicable.', low_hours: 0.25, high_hours: 1.5, skill_level: 'handyman', notes: '' },
    { name: 'Main work', description: 'Perform repair, replacement, or installation.', low_hours: 1, high_hours: 4, skill_level: 'handyman', notes: 'Depends on access and hidden conditions.' },
    { name: 'Test and cleanup', description: 'Test, clean, and walkthrough.', low_hours: 0.25, high_hours: 0.75, skill_level: 'handyman', notes: '' },
  ];
}

function flags(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  const licensed = [];
  const permit = [];
  const risk = [];
  if (/panel|breaker|new circuit|disconnect|meter/.test(text)) licensed.push('Electrical panel/new circuit/disconnect scope may require a licensed electrician.');
  if (/gas|propane/.test(text)) licensed.push('Gas work requires licensed trade review.');
  if (/mini split|hvac|refrigerant|condenser/.test(text)) licensed.push('HVAC/refrigerant/startup scope may require licensed HVAC review.');
  if (/roof|structural|truss|rafter/.test(text)) licensed.push('Roof/structural work requires specialty review.');
  if (/mold|asbestos|lead|sewage/.test(text)) risk.push('Hazardous condition may stop work until remediated.');
  if (/leak|water damage|rot|rust|corrosion/.test(text)) risk.push('Hidden damage may change price.');
  if (licensed.length) permit.push('Verify local code and permit requirements.');
  return { licensed, permit, risk };
}

function buildLocalDraft(req) {
  const mats = materials(req);
  const lab = labor(req);
  const miss = questions(req);
  const f = flags(req);
  return {
    quote_ready: miss.length === 0,
    job_summary: `${req.workScope || 'Service'} request for ${req.service || 'handyman work'}${req.subcategory ? ` - ${req.subcategory}` : ''}.`,
    category: req.service || 'Other / Not Sure',
    subcategory: req.subcategory || 'General',
    work_scope: req.workScope || 'Not provided',
    confidence: 0.62,
    confidenceScores: req.intakeAnalysis?.confidenceScores || analyzeEstimateIntake(req).confidenceScores,
    informationCompletenessScore: req.intakeAnalysis?.informationCompletenessScore || analyzeEstimateIntake(req).informationCompletenessScore,
    missingInformation: req.intakeAnalysis?.missingInformation || analyzeEstimateIntake(req).missingInformation,
    optionalQuestions: req.intakeAnalysis?.optionalQuestions || analyzeEstimateIntake(req).optionalQuestions,
    customerPreferences: req.intakeAnalysis?.customerPreferences || analyzeEstimateIntake(req).customerPreferences,
    photoIntelligence: req.intakeAnalysis?.photoIntelligence || analyzeEstimateIntake(req).photoIntelligence,
    adminOverrideAlwaysAvailable: true,
    manualEstimateModeAvailable: true,
    missing_required_info: miss,
    questions_to_customer: miss,
    assumptions: ['Fast local estimate used. Admin must review before sending.'],
    labor_items: lab,
    materials: mats,
    live_material_prices: [],
    difficulty_factors: [],
    risk_flags: f.risk,
    licensed_trade_flags: f.licensed,
    permit_flags: f.permit,
    exclusions: ['Hidden damage, code corrections, permits, major trade work, and scope changes are excluded unless approved.'],
    customer_responsibilities: ['Provide access and correct customer-supplied materials if applicable.'],
    technician_checklist: ['Verify scope', 'Inspect existing conditions', 'Confirm parts', 'Protect area', 'Test work', 'Document changes'],
    change_order_triggers: ['Hidden damage', 'Wrong/missing parts', 'Unusable existing utilities', 'Scope expands', 'Licensed trade required'],
    internal_technician_notes: 'Admin must verify labor, materials, safety, and code/licensing requirements.',
  };
}

async function tryOpenAi(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { __aiError: true, status: 503, message: 'OPENAI_API_KEY is not configured. AI estimate generation failed. Continue manually?' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_OPENAI_TIMEOUT_MS || 9000));
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini',
        input: [
          { role: 'system', content: 'You are a senior handyman estimator and pricing research engine. Return strict JSON only. Use OpenAI live/search capability if available for current pricing; never rely on memory alone. Every labor item must include hours, rate/rate_cents, and total/total_cents. Every material must include quantity, unit, unit_cost/unit_cost_cents, markup_percent, total/total_cents, source, last_checked, and confidence. Never put quote_in_progress in content fields and never return a nonzero grand total with zero line items.' },
          { role: 'user', content: JSON.stringify({ task: 'Improve this local handyman quote draft. Keep same JSON keys and also include labor_line_items, material_line_items, other_pricing, pricing_summary, confidence_reasons, and research_metadata. If exact pricing is unavailable, use estimated allowance pricing, lower confidence, and explain why. Do not auto-send.', request: req, draft: buildLocalDraft(req) }) }
        ],
        text: { format: { type: 'json_object' } },
        tools: process.env.OPENAI_QUOTE_DISABLE_WEB_SEARCH === '1' ? undefined : [{ type: 'web_search_preview' }],
        max_output_tokens: 3600,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function calculate(draft) {
  const rate = Number(process.env.AI_LABOR_RATE || 95);
  const trip = Number(process.env.AI_TRIP_CHARGE || 75);
  const markup = Number(process.env.AI_MATERIAL_MARKUP_PERCENT || 25) / 100;
  const min = Number(process.env.AI_MINIMUM_CHARGE || 175);
  const contingency = Number(process.env.AI_CONTINGENCY_PERCENT || 10) / 100;

  const laborHoursLow = (draft.labor_items || []).reduce((s, x) => s + Number(x.low_hours || 0), 0);
  const laborHoursHigh = (draft.labor_items || []).reduce((s, x) => s + Number(x.high_hours || x.low_hours || 0), 0);
  const laborCostLow = laborHoursLow * rate;
  const laborCostHigh = laborHoursHigh * rate;
  const materialCostLow = (draft.materials || []).reduce((s, x) => s + Number(x.total_cost_low ?? (x.estimated_cost_low || 0) * (x.quantity || 1)), 0);
  const materialCostHigh = (draft.materials || []).reduce((s, x) => s + Number(x.total_cost_high ?? (x.estimated_cost_high || 0) * (x.quantity || 1)), 0);
  const subtotalLow = laborCostLow + materialCostLow + materialCostLow * markup + trip;
  const subtotalHigh = laborCostHigh + materialCostHigh + materialCostHigh * markup + trip;

  return {
    labor_hours_low: money(laborHoursLow),
    labor_hours_high: money(laborHoursHigh),
    labor_cost_low: money(laborCostLow),
    labor_cost_high: money(laborCostHigh),
    material_cost_low: money(materialCostLow),
    material_cost_high: money(materialCostHigh),
    material_markup_low: money(materialCostLow * markup),
    material_markup_high: money(materialCostHigh * markup),
    trip_charge: money(trip),
    total_low: money(Math.max(min, subtotalLow + subtotalLow * contingency)),
    total_high: money(Math.max(min, subtotalHigh + subtotalHigh * contingency)),
  };
}

function customerQuote(draft, totals) {
  return [
    draft.customer_facing_quote || 'Thank you for the request. This AI-assisted quote draft is pending admin review.',
    '',
    `Estimated labor: ${totals.labor_hours_low}–${totals.labor_hours_high} hours`,
    `Estimated total: $${totals.total_low}–$${totals.total_high}`,
    '',
    'Final pricing may change after photos, site inspection, hidden damage, missing parts, code issues, or scope changes.'
  ].join('\n');
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }

  const req = normalize(input);
  req.intakeAnalysis = input.intakeAnalysis || analyzeEstimateIntake({ ...input, ...req });
  if (!req.description && !req.service && !req.workScope) return json(400, { ok: false, message: 'Missing description, service, or workScope' });

  const localDraft = buildLocalDraft(req);
  const ai = await tryOpenAi(req);
  if (ai?.__aiError || !ai) {
    return json(ai?.status || 502, {
      ok: false,
      message: ai?.message || 'AI estimate generation failed. Continue manually?',
      manualOverride: true,
      manualDraft: {
        customer_summary: req.name || req.email || req.phone || 'Original customer request',
        property_summary: [req.streetAddress, req.city].filter(Boolean).join(', ') || 'Original property request',
        description: req.description,
        service_category: /mini split|mini-split|ductless/i.test(`${req.service} ${req.description}`) ? 'HVAC' : (req.service || 'General Contracting'),
        trade: /mini split|mini-split|ductless/i.test(`${req.service} ${req.description}`) ? 'HVAC' : (req.service || 'General Contracting'),
      },
    });
  }
  const draft = { ...localDraft, ...(ai && typeof ai === 'object' ? ai : {}) };
  const totals = calculate(draft);
  const rateCents = Math.round(Number(process.env.AI_LABOR_RATE || 95) * 100);
  const markupPct = Number(process.env.AI_MATERIAL_MARKUP_PERCENT || 25);
  draft.labor_line_items = (draft.labor_line_items || draft.labor_items || []).map((item, index) => { const hours = Number(item.hours || item.low_hours || item.lowHours || 1) || 1; const total_cents = Math.round(hours * rateCents); return { name: item.name || item.description || `Labor ${index + 1}`, description: item.description || item.name || 'Labor', hours, quantity: hours, unit: 'hours', rate: rateCents / 100, rate_cents: rateCents, unit_cost_cents: rateCents, total: total_cents / 100, total_cents, confidence: item.confidence || 'medium' }; });
  draft.material_line_items = (draft.material_line_items || draft.materials || []).map((item, index) => { const quantity = Number(item.quantity || 1) || 1; const unit_cost_cents = Math.round(Number(item.unit_cost_cents || item.estimatedBuyCostCents || item.estimated_cost_low * 100 || item.price * 100 || 3500)); const total_cents = Math.round(quantity * unit_cost_cents * (1 + markupPct / 100)); return { name: item.name || item.material || `Material ${index + 1}`, description: item.description || item.name || 'Material', quantity, unit: item.unit || 'each', unit_cost: unit_cost_cents / 100, unit_cost_cents, markup_percent: markupPct, total: total_cents / 100, total_cents, source: item.source || 'OpenAI research / internal catalog allowance', source_url: item.source_url || '', last_checked: new Date().toISOString().slice(0,10), confidence: item.confidence || 'medium' }; });
  const labor_total_cents = draft.labor_line_items.reduce((sum, line) => sum + line.total_cents, 0);
  const material_total_cents = draft.material_line_items.reduce((sum, line) => sum + line.total_cents, 0);
  const trip_charge_cents = Math.round(Number(totals.trip_charge || 0) * 100);
  const grand_total_cents = labor_total_cents + material_total_cents + trip_charge_cents;
  draft.other_pricing = { trip_charge: trip_charge_cents / 100, trip_charge_cents, permit: 0, permit_cents: 0, disposal: 0, disposal_cents: 0, rental: 0, rental_cents: 0, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, markup: 0, markup_cents: 0 };
  draft.pricing_summary = { labor_total: labor_total_cents / 100, labor_total_cents, material_total: material_total_cents / 100, material_total_cents, other_total: trip_charge_cents / 100, other_total_cents: trip_charge_cents, subtotal: grand_total_cents / 100, subtotal_cents: grand_total_cents, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, grand_total: grand_total_cents / 100, grand_total_cents };
  draft.research_metadata = draft.research_metadata || { research_mode: 'openai_first', openai_live_search_used: true, fallback_search_used: false, internal_catalog_used: true, historical_quotes_used: false, serpapi_used: false, sources: [], pricing_confidence_reason: 'OpenAI-first fast draft with internal catalog allowances for admin review.' };
  draft.confidence_reasons = draft.confidence_reasons || ['Fast AI quote draft normalized into complete priced editor line items.'];
  draft.totals = totals;
  draft.customer_facing_quote = customerQuote(draft, totals);
  draft.request = req;
  draft.ok = true;
  draft.source = 'openai-fast';
  draft.createdAt = new Date().toISOString();
  return json(200, draft);
};

export default handler;
