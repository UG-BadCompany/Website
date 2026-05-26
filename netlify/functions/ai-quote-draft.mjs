const DEFAULT_MODEL = 'gpt-5-mini';
const MAX_LIVE_PRICE_LOOKUPS = 12;
const OPENAI_TIMEOUT_MS = 22000;
const SERPAPI_TIMEOUT_MS = 9000;

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    ...headers,
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 5000) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const money = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0)));
const slug = (value) => clean(value, 5000).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function pricing(payload = {}) {
  return {
    laborRate: Number(process.env.AI_LABOR_RATE || payload.laborRate || 95),
    tripCharge: Number(process.env.AI_TRIP_CHARGE || payload.tripCharge || 75),
    materialMarkupPercent: Number(process.env.AI_MATERIAL_MARKUP_PERCENT || payload.materialMarkupPercent || 25),
    minimumCharge: Number(process.env.AI_MINIMUM_CHARGE || payload.minimumCharge || 175),
    contingencyPercent: Number(process.env.AI_CONTINGENCY_PERCENT || payload.contingencyPercent || 10),
  };
}

function normalize(input = {}) {
  return {
    name: clean(input.name, 120),
    phone: clean(input.phone, 80),
    email: clean(input.email, 180),
    city: clean(input.city || input.area, 120),
    streetAddress: clean(input.streetAddress || input.address, 240),
    workScope: clean(input.workScope || input.work_scope || input.scope, 120),
    service: clean(input.service || input.typeOfWork || input.type_of_work || input.work_category, 160),
    subcategory: clean(input.subcategory || input.jobSubcategory, 160),
    timeframe: clean(input.timeframe || input.preferredTimeframe, 120),
    description: clean(input.description || input.details || input.message || input.projectDetails, 6000),
    photosProvided: Boolean(input.photosProvided || input.photos_provided || input.hasUpload || input.photoCount || input.photos?.length),
    photoNames: Array.isArray(input.photoNames) ? input.photoNames.map((x) => clean(x, 180)).filter(Boolean) : [],
    answers: input.answers && typeof input.answers === 'object' ? input.answers : {},
    savedRequest: input.savedRequest || null,
  };
}

function questions(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  const q = [];
  if (!req.workScope) q.push('Is this troubleshooting/repair, replacing existing, or a new install?');
  if (!req.service) q.push('What type of work is this: HVAC, electrical, plumbing, carpentry, drywall, painting, appliance/fixture, flooring, exterior, or general maintenance?');
  if (!req.streetAddress) q.push('What is the property address for the work?');
  if (!req.description || req.description.length < 35) q.push('Please describe what needs done, what is wrong, and what result you want.');
  if (!req.photosProvided) q.push('Can you upload clear photos of the work area and existing item?');
  if (!/(model|brand|size|btu|amp|volt|gallon|inch|measurement|ft|feet|linear|sq)/i.test(text)) q.push('Do you have brand, model, size, voltage, BTU, measurements, or part information?');
  return q.slice(0, 8);
}

function flags(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  const licensed = [], permit = [], risk = [];
  if (/panel|breaker|new circuit|dedicated circuit|disconnect|meter|service upgrade/.test(text)) { licensed.push('Electrical panel/new circuit/disconnect scope may require a licensed electrician.'); permit.push('Electrical permit/code review may be required.'); }
  if (/gas|natural gas|propane/.test(text)) licensed.push('Gas work requires licensed trade review.');
  if (/refrigerant|line set|mini split|mini-split|ductless|condenser|hvac/.test(text)) { licensed.push('HVAC/refrigerant/startup scope may require licensed HVAC review.'); permit.push('HVAC permit/inspection may be required depending on local code.'); }
  if (/roof leak|shingle|tile roof|roofing|truss|rafter/.test(text)) licensed.push('Roofing/structural roof work is excluded or requires specialty contractor review.');
  if (/mold|asbestos|lead paint|sewage/.test(text)) risk.push('Environmental/hazardous condition may stop work until remediated.');
  if (/water damage|rot|termite|corrosion|rust|leak/.test(text)) risk.push('Hidden damage may change price after inspection.');
  return { licensed, permit, risk };
}

function addMaterialSeeds(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  const items = [];
  const add = (name, query, qty = 1, low = 0, high = 0, notes = '') => items.push({ name, search_query: query || name, quantity: qty, required: true, estimated_cost_low: low, estimated_cost_high: high, notes });
  if (/mini split|mini-split|ductless/.test(text)) {
    add('Mini split system package', 'ductless mini split heat pump system complete kit', 1, 650, 2200, 'Customer supplied unit can reduce material total.');
    add('Insulated copper line set kit', 'mini split insulated copper line set kit 25 ft', 1, 120, 320);
    add('Line hide cover kit', 'mini split line hide cover kit', 1, 70, 220);
    add('Line hide fittings', 'mini split line hide elbow coupling wall cap', 1, 25, 100);
    add('Communication/control wire', 'mini split communication wire 14/4 50 ft', 1, 45, 150);
    add('Outdoor AC disconnect', '60 amp outdoor air conditioner disconnect', 1, 15, 75);
    add('Electrical whip', 'liquid tight electrical whip 6 ft air conditioner', 1, 20, 60);
    add('Breaker allowance', '2 pole breaker 20 amp 30 amp', 1, 15, 90, 'Must match equipment MCA/MOCP and panel brand.');
    add('Conduit and fittings allowance', 'electrical conduit fittings straps LB outdoor', 1, 60, 300);
    add('Condenser pad or wall bracket', 'mini split condenser pad wall bracket', 1, 40, 220);
    add('Condensate drain kit', 'mini split condensate drain tubing kit', 1, 20, 100);
    add('Exterior sealant/anchors/consumables', 'exterior silicone anchors foam sealant HVAC install', 1, 25, 120);
  } else if (/faucet|sink faucet/.test(text)) {
    add('Faucet', 'bathroom kitchen faucet', 1, 45, 280);
    add('Faucet supply lines', '3/8 compression faucet supply line pair', 1, 15, 45);
    add('Plumber putty or silicone', 'plumbers putty silicone kitchen bath', 1, 6, 18);
    add('Drain assembly allowance', 'bathroom sink pop up drain assembly', 1, 15, 60);
    add('Shutoff valve allowance', 'angle stop shutoff valve 3/8 compression', 2, 18, 80);
  } else if (/toilet/.test(text)) {
    add('Toilet', 'elongated toilet complete kit', 1, 120, 450); add('Wax ring', 'extra thick toilet wax ring with flange', 1, 5, 15); add('Closet bolts', 'toilet closet bolt kit', 1, 4, 12); add('Supply line', 'toilet supply line 3/8 compression', 1, 8, 25); add('Shutoff valve allowance', 'toilet angle stop shutoff valve', 1, 9, 35); add('Caulk', 'bath kitchen silicone caulk white', 1, 5, 18);
  } else if (/outlet|gfci|switch|dimmer|light fixture|ceiling fan|electrical/.test(text)) {
    add('Device or fixture allowance', 'electrical switch outlet light fixture ceiling fan', 1, 8, 200); add('Cover plate', 'decorator wall plate white', 1, 2, 12); add('Wire connectors', 'wire nuts electrical connector assortment', 1, 5, 25); add('Electrical box extender or repair parts', 'electrical box extender outlet switch', 1, 4, 25); add('Fasteners and electrical tape', 'electrical tape machine screws grounding pigtail', 1, 5, 25);
  } else if (/drywall|patch|hole|texture/.test(text)) {
    add('Drywall patch materials', 'drywall patch repair kit', 1, 10, 55); add('Joint compound', 'joint compound small tub', 1, 8, 30); add('Drywall tape', 'drywall tape roll', 1, 4, 15); add('Texture match material', 'wall texture spray orange peel knockdown', 1, 12, 35); add('Primer and paint allowance', 'interior primer paint touch up', 1, 20, 100);
  } else {
    add(`${req.service || 'General'} material allowance`, `${req.service || 'handyman'} repair install parts materials`, 1, 25, 300);
    add('Fasteners anchors consumables', 'contractor fasteners anchors caulk sealant tape assortment', 1, 15, 90);
  }
  return items.slice(0, 16);
}

function laborSeeds(req) {
  const text = slug(`${req.workScope} ${req.service} ${req.subcategory} ${req.description}`);
  if (/mini split|mini-split|ductless/.test(text)) return [
    { name: 'Layout and site prep', description: 'Confirm indoor/outdoor locations, line-set path, drain path, electrical path, and protect work areas.', low_hours: 0.75, high_hours: 1.5, skill_level: 'advanced', notes: 'Photos/site verification required.' },
    { name: 'Mount indoor head and wall penetration', description: 'Install mounting plate, drill/sleeve wall penetration, and seal wall opening.', low_hours: 1.25, high_hours: 2.5, skill_level: 'advanced', notes: 'Stucco/block/two-story adds time.' },
    { name: 'Set condenser and route line set/drain/control wire', description: 'Place condenser, route lines, drain, insulation, and communication cable.', low_hours: 2, high_hours: 5, skill_level: 'advanced', notes: 'Line-set length/access affects quote.' },
    { name: 'Line hide and exterior finish', description: 'Install line hide, fittings, clamps, sealant, and exterior finish details.', low_hours: 1, high_hours: 3, skill_level: 'handyman', notes: '' },
    { name: 'Electrical coordination', description: 'Disconnect/whip/circuit/conduit review and installation or coordination.', low_hours: 1.5, high_hours: 6, skill_level: 'licensed electrical review', notes: 'New circuit/panel work may require licensed electrician.' },
    { name: 'Startup/testing/customer walkthrough', description: 'Vacuum/startup if in scope, drain test, operation test, cleanup, and customer walkthrough.', low_hours: 1, high_hours: 2.5, skill_level: 'HVAC review', notes: 'Refrigerant handling/licensing may apply.' },
  ];
  const base = [
    { name: 'Site verification and protection', description: 'Review request, confirm scope, inspect work area, protect surrounding surfaces.', low_hours: 0.25, high_hours: 0.75, skill_level: 'handyman', notes: 'Photos or site visit may change scope.' },
    { name: 'Setup and utility shutoff if needed', description: 'Gather tools/materials, shut off power/water if required, and prepare area.', low_hours: 0.25, high_hours: 0.75, skill_level: 'handyman', notes: '' },
    { name: 'Main work', description: 'Perform the requested handyman repair, replacement, or installation.', low_hours: 1, high_hours: 3.5, skill_level: 'handyman', notes: 'Adjusted by category and access.' },
    { name: 'Test, cleanup, and walkthrough', description: 'Test operation, check for leaks/safety/fit, clean work area, and review with customer.', low_hours: 0.25, high_hours: 0.75, skill_level: 'handyman', notes: '' },
  ];
  if (/troubleshoot|repair|not working|leak|clog|trip|tripping|noise/.test(text)) base[2] = { name: 'Diagnosis and repair attempt', description: 'Troubleshoot issue, identify failed parts/conditions, perform approved repair if possible.', low_hours: 1, high_hours: 4, skill_level: 'handyman', notes: 'Final repair depends on diagnosis.' };
  if (/replace|replacement/.test(text)) base.splice(2, 0, { name: 'Remove existing item', description: 'Disconnect/remove old item and prepare area for replacement.', low_hours: 0.25, high_hours: 1.5, skill_level: 'handyman', notes: 'Corrosion, damage, or stuck fasteners add time.' });
  if (/new install|install/.test(text)) base[2] = { name: 'New install', description: 'Layout, mount, connect, secure, seal, and test the new item.', low_hours: 1.25, high_hours: 4.5, skill_level: 'handyman', notes: 'No existing utilities/support may require extra work.' };
  return base;
}

function outputSchema() {
  return { job_summary:'string', category:'string', subcategory:'string', work_scope:'string', confidence:'number 0-1', is_quote_ready:'boolean', missing_required_info:['string'], questions_to_customer:['string'], assumptions:['string'], labor_items:[{ name:'string', description:'string', low_hours:'number', high_hours:'number', skill_level:'string', notes:'string' }], material_search_items:[{ name:'string', search_query:'string', quantity:'number', required:'boolean', notes:'string' }], materials:[{ name:'string', quantity:'number', required:'boolean', customer_supplied:'boolean', estimated_cost_low:'number', estimated_cost_high:'number', notes:'string' }], difficulty_factors:['string'], risk_flags:['string'], licensed_trade_flags:['string'], permit_flags:['string'], exclusions:['string'], customer_responsibilities:['string'], technician_checklist:['string'], change_order_triggers:['string'], customer_facing_quote:'string', internal_technician_notes:'string' };
}

async function openAi(req, price) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          { role: 'system', content: 'You are a senior handyman estimator for T&A Contracting. Return strict valid JSON only. No markdown. Do not auto-send or final-approve quotes.' },
          { role: 'user', content: JSON.stringify({ task: 'Create a complete AI handyman quote draft for admin review.', request: req, pricing_settings: price, rules: ['Think like an experienced handyman estimator.', 'Ask missing questions if incomplete.', 'Break labor into real phases.', 'Include hidden materials, fittings, fasteners, sealants, consumables, disposal, finish work, access, safety.', 'Flag unsafe/licensed/permitted work.', 'If important info is missing, set is_quote_ready=false.', 'Return material_search_items as Google Shopping search queries.', 'Do not invent exact law/code claims; use verify local code.'], output_schema: outputSchema() }) }
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 5500,
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

function normalizeDraft(ai, req) {
  const seedMats = addMaterialSeeds(req), seedLabor = laborSeeds(req), miss = questions(req), fl = flags(req), draft = ai && typeof ai === 'object' ? ai : {};
  const matSearch = Array.isArray(draft.material_search_items) && draft.material_search_items.length ? draft.material_search_items : seedMats.map((m) => ({ name: m.name, search_query: m.search_query, quantity: m.quantity, required: true, notes: m.notes || '' }));
  const mats = Array.isArray(draft.materials) && draft.materials.length ? draft.materials : seedMats.map((m) => ({ name: m.name, quantity: m.quantity, required: true, customer_supplied: false, estimated_cost_low: m.estimated_cost_low, estimated_cost_high: m.estimated_cost_high, notes: m.notes || '' }));
  const mergedMissing = [...new Set([...(Array.isArray(draft.missing_required_info) ? draft.missing_required_info : []), ...miss])].slice(0, 10);
  return {
    job_summary: clean(draft.job_summary || `${req.workScope || 'Service'} request for ${req.service || 'handyman work'}: ${req.description}`, 1000),
    category: clean(draft.category || req.service || 'Other / Not Sure', 160),
    subcategory: clean(draft.subcategory || req.subcategory || 'General', 160),
    work_scope: clean(draft.work_scope || req.workScope || 'Not provided', 120),
    confidence: clamp(draft.confidence ?? (ai ? 0.7 : 0.5), 0, 1),
    is_quote_ready: Boolean(draft.is_quote_ready) && mergedMissing.length === 0,
    missing_required_info: mergedMissing,
    questions_to_customer: Array.isArray(draft.questions_to_customer) && draft.questions_to_customer.length ? draft.questions_to_customer : mergedMissing,
    assumptions: Array.isArray(draft.assumptions) ? draft.assumptions : ['AI draft requires admin review before sending.'],
    labor_items: Array.isArray(draft.labor_items) && draft.labor_items.length ? draft.labor_items : seedLabor,
    material_search_items: matSearch.slice(0, 18),
    materials: mats.slice(0, 18),
    difficulty_factors: Array.isArray(draft.difficulty_factors) ? draft.difficulty_factors : [],
    risk_flags: [...new Set([...(Array.isArray(draft.risk_flags) ? draft.risk_flags : []), ...fl.risk])],
    licensed_trade_flags: [...new Set([...(Array.isArray(draft.licensed_trade_flags) ? draft.licensed_trade_flags : []), ...fl.licensed])],
    permit_flags: [...new Set([...(Array.isArray(draft.permit_flags) ? draft.permit_flags : []), ...fl.permit, 'Verify local code/permit requirements when electrical, HVAC, plumbing, gas, structural, or roofing scope is involved.'])],
    exclusions: Array.isArray(draft.exclusions) && draft.exclusions.length ? draft.exclusions : ['Hidden damage, code corrections, permit fees, major electrical/plumbing/HVAC/gas/structural work, painting/patching beyond listed scope, and customer-requested changes are excluded unless approved.'],
    customer_responsibilities: Array.isArray(draft.customer_responsibilities) ? draft.customer_responsibilities : ['Provide clear access to the work area and correct customer-supplied materials if applicable.'],
    technician_checklist: Array.isArray(draft.technician_checklist) ? draft.technician_checklist : ['Verify scope', 'Inspect existing conditions', 'Confirm parts', 'Protect work area', 'Perform work safely', 'Test', 'Clean up', 'Document change orders'],
    change_order_triggers: Array.isArray(draft.change_order_triggers) ? draft.change_order_triggers : ['Hidden damage found', 'Wrong/missing customer-supplied parts', 'Existing utilities are unsafe/unusable', 'Scope expands', 'Permit/licensed trade required'],
    customer_facing_quote: clean(draft.customer_facing_quote || 'Thank you for the request. This is an AI-assisted draft estimate pending admin review. Final pricing may change after photos, site inspection, hidden conditions, or scope changes.', 5000),
    internal_technician_notes: clean(draft.internal_technician_notes || 'Admin must verify labor, parts, access, safety, and code/licensing requirements before sending quote.', 5000),
  };
}

async function serp(item) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS);
  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping'); url.searchParams.set('q', item.search_query || item.name); url.searchParams.set('gl', 'us'); url.searchParams.set('hl', 'en'); url.searchParams.set('api_key', apiKey);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const products = (data.shopping_results || []).map((p) => ({ title: clean(p.title, 220), source: clean(p.source, 120), link: clean(p.link || p.product_link, 1000), price_text: clean(p.price, 80), price: Number(p.extracted_price || String(p.price || '').replace(/[^0-9.]/g, '')), delivery: clean(p.delivery, 160), rating: p.rating || null, reviews: p.reviews || null, thumbnail: clean(p.thumbnail, 1000) })).filter((p) => Number.isFinite(p.price) && p.price > 0).slice(0, 5);
    if (!products.length) return null;
    const prices = products.map((p) => p.price).sort((a, b) => a - b);
    return { live_pricing_available: true, selected_unit_price: prices[0], unit_price_low: prices[0], unit_price_high: prices[prices.length - 1], products };
  } catch { clearTimeout(timer); return null; }
}

async function livePrices(draft) {
  const out = [];
  for (const item of (draft.material_search_items || []).slice(0, MAX_LIVE_PRICE_LOOKUPS)) {
    const result = await serp(item);
    out.push({ name: clean(item.name, 180), search_query: clean(item.search_query || item.name, 240), quantity: Number(item.quantity || 1), required: Boolean(item.required), notes: clean(item.notes, 500), ...(result || { live_pricing_available: false, selected_unit_price: null, unit_price_low: null, unit_price_high: null, products: [] }) });
  }
  return out;
}

function totals(draft, live, price) {
  const labor_items = draft.labor_items.map((item) => { const low = Math.max(0, Number(item.low_hours || 0)); const high = Math.max(low, Number(item.high_hours || low || 0)); return { name: clean(item.name, 180), description: clean(item.description, 900), low_hours: money(low), high_hours: money(high), skill_level: clean(item.skill_level, 120), notes: clean(item.notes, 900) }; });
  const labor_hours_low = labor_items.reduce((s,x)=>s+x.low_hours,0), labor_hours_high = labor_items.reduce((s,x)=>s+x.high_hours,0);
  const labor_cost_low = labor_hours_low * price.laborRate, labor_cost_high = labor_hours_high * price.laborRate;
  const materials = draft.materials.map((m) => { const qty = Math.max(1, Number(m.quantity || 1)); const lp = live.find((p) => slug(p.name) === slug(m.name) || slug(p.name).includes(slug(m.name)) || slug(m.name).includes(slug(p.name))); const unitLow = Number(lp?.unit_price_low ?? m.estimated_cost_low ?? 0); const unitHigh = Number(lp?.unit_price_high ?? m.estimated_cost_high ?? unitLow); return { name: clean(m.name, 180), quantity: qty, required: Boolean(m.required), customer_supplied: Boolean(m.customer_supplied), estimated_cost_low: money(unitLow), estimated_cost_high: money(unitHigh), total_cost_low: money(unitLow * qty), total_cost_high: money(unitHigh * qty), live_pricing_available: Boolean(lp?.live_pricing_available), live_products: lp?.products || [], notes: clean(m.notes, 900) }; });
  const material_cost_low = materials.reduce((s,m)=>s+(m.customer_supplied?0:m.total_cost_low),0), material_cost_high = materials.reduce((s,m)=>s+(m.customer_supplied?0:m.total_cost_high),0);
  const material_markup_low = material_cost_low * (price.materialMarkupPercent / 100), material_markup_high = material_cost_high * (price.materialMarkupPercent / 100);
  const subtotalLow = labor_cost_low + material_cost_low + material_markup_low + price.tripCharge, subtotalHigh = labor_cost_high + material_cost_high + material_markup_high + price.tripCharge;
  const contingency_low = subtotalLow * (price.contingencyPercent / 100), contingency_high = subtotalHigh * (price.contingencyPercent / 100);
  return { labor_items, materials, labor_hours_low: money(labor_hours_low), labor_hours_high: money(labor_hours_high), labor_cost_low: money(labor_cost_low), labor_cost_high: money(labor_cost_high), material_cost_low: money(material_cost_low), material_cost_high: money(material_cost_high), material_markup_low: money(material_markup_low), material_markup_high: money(material_markup_high), trip_charge: money(price.tripCharge), contingency_low: money(contingency_low), contingency_high: money(contingency_high), total_low: money(Math.max(price.minimumCharge, subtotalLow + contingency_low)), total_high: money(Math.max(price.minimumCharge, subtotalHigh + contingency_high)) };
}

function customerQuote(draft, t) {
  return [draft.customer_facing_quote, '', `Estimated labor: ${t.labor_hours_low}–${t.labor_hours_high} hours`, `Estimated labor cost: $${t.labor_cost_low}–$${t.labor_cost_high}`, `Estimated materials before markup: $${t.material_cost_low}–$${t.material_cost_high}`, `Estimated total: $${t.total_low}–$${t.total_high}`, '', 'This is an AI-assisted draft and must be reviewed/approved by T&A Contracting before it is sent as a final quote.'].join('\\n').trim();
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });
  let input; try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }
  const request = normalize(input);
  if (!request.description && !request.service && !request.workScope) return json(400, { ok: false, message: 'Missing description, service, or workScope' });
  const price = pricing(input);
  const aiRaw = await openAi(request, price);
  const draft = normalizeDraft(aiRaw, request);
  const live_material_prices = await livePrices(draft);
  const t = totals(draft, live_material_prices, price);
  return json(200, { ok: true, source: aiRaw ? 'openai' : 'local-fallback', createdAt: new Date().toISOString(), request, quote_ready: draft.is_quote_ready, job_summary: draft.job_summary, category: draft.category, subcategory: draft.subcategory, work_scope: draft.work_scope, confidence: draft.confidence, missing_required_info: draft.missing_required_info, questions_to_customer: draft.questions_to_customer, assumptions: draft.assumptions, labor_items: t.labor_items, materials: t.materials, live_material_prices, difficulty_factors: draft.difficulty_factors, risk_flags: draft.risk_flags, licensed_trade_flags: draft.licensed_trade_flags, permit_flags: draft.permit_flags, exclusions: draft.exclusions, customer_responsibilities: draft.customer_responsibilities, technician_checklist: draft.technician_checklist, change_order_triggers: draft.change_order_triggers, internal_technician_notes: draft.internal_technician_notes, customer_facing_quote: customerQuote(draft, t), totals: t, pricing_settings_used: price, admin_note: 'Save as draft quote. Admin must review/edit before sending.' });
};

export default handler;
