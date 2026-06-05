import { clean, json, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_QUOTE_TIMEOUT_MS || 18000);
const SERP_TIMEOUT_MS = Number(process.env.AI_LIVE_RESEARCH_TIMEOUT_MS || 3500);
const DEFAULT_LABOR_RATE_CENTS = moneyToCents(process.env.AI_LABOR_RATE || process.env.DEFAULT_LABOR_RATE || 125);
const DEFAULT_MARKUP_PERCENT = Number(process.env.AI_MATERIAL_MARKUP_PERCENT || 25);

const normalizeText = (value = '') => clean(value, 6000);
const toArray = (value) => Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined && item !== '') : value ? [value] : [];
const today = () => new Date().toISOString().slice(0, 10);

export function moneyToCents(value, { assumeCents = false } = {}) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (assumeCents || (Number.isInteger(value) && Math.abs(value) >= 10000)) return Math.round(value);
    return Math.round(value * 100);
  }
  const raw = String(value).trim().toLowerCase();
  if (!raw) return 0;
  const centsMatch = raw.match(/(-?\d[\d,]*)\s*(?:¢|cents?)\b/);
  if (centsMatch) return Math.round(Number(centsMatch[1].replace(/,/g, '')) || 0);
  const cleaned = raw.replace(/usd|dollars?|\$/g, '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!cleaned) return 0;
  const num = Number(cleaned[0]);
  if (!Number.isFinite(num)) return 0;
  if (assumeCents || (/cents?\b/.test(raw) && !/dollars?|\$|\./.test(raw))) return Math.round(num);
  return Math.round(num * 100);
}
const centsToMoney = (cents) => Math.round(Number(cents || 0)) / 100;
const firstMoney = (obj = {}, keys = [], opts = {}) => {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return moneyToCents(obj[key], opts);
  }
  return 0;
};
const firstValue = (obj = {}, keys = [], fallback = '') => {
  for (const key of keys) if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  return fallback;
};

const detectTrade = (payload = {}) => {
  const text = `${payload.trade || ''} ${payload.service || ''} ${payload.workCategory || ''} ${payload.workScope || ''} ${payload.description || ''}`.toLowerCase();
  if (/mini\s*-?split|ductless|hvac|heat pump|air handler|condenser|furnace|thermostat/.test(text)) return 'HVAC';
  if (/water heater|faucet|toilet|drain|plumb|leak|sink/.test(text)) return 'Plumbing';
  if (/breaker|panel|outlet|switch|wire|electrical|light|fan/.test(text)) return 'Electrical';
  if (/drywall|patch|texture/.test(text)) return 'Drywall';
  return normalizeText(payload.trade || payload.workCategory || payload.service || 'General Contracting');
};

const allowanceFor = (name = '', trade = 'General') => {
  const text = `${trade} ${name}`.toLowerCase();
  if (/mini split equipment|system package|heat pump|condenser|air handler/.test(text)) return 120000;
  if (/line set/.test(text)) return 18000;
  if (/line hide/.test(text)) return 14000;
  if (/wire|conduit|breaker|disconnect|whip/.test(text)) return 9500;
  if (/faucet/.test(text)) return 15000;
  if (/toilet/.test(text)) return 25000;
  if (/fixture|device|gfci|outlet|switch/.test(text)) return 6500;
  if (/drywall|patch|compound|texture|paint/.test(text)) return 5500;
  if (/fastener|anchor|seal|caulk|consumable|misc/.test(text)) return 3500;
  return 7500;
};

const pricedMaterial = (name, quantity = 1, unit = 'each', unitCostCents = 0, note = '') => ({
  name, description: note || `${name} for the requested scope.`, quantity, unit,
  unit_cost: centsToMoney(unitCostCents || allowanceFor(name)), unit_cost_cents: unitCostCents || allowanceFor(name),
  markup_percent: DEFAULT_MARKUP_PERCENT,
  total: centsToMoney(Math.round((unitCostCents || allowanceFor(name)) * quantity * (1 + DEFAULT_MARKUP_PERCENT / 100))),
  total_cents: Math.round((unitCostCents || allowanceFor(name)) * quantity * (1 + DEFAULT_MARKUP_PERCENT / 100)),
  source: 'internal catalog allowance', source_url: '', last_checked: today(), confidence: 'medium', notes: note,
});

const miniSplitMaterials = (description = '') => {
  const feet = Math.max(25, Math.min(200, Number(String(description).match(/(\d{1,3})\s*(?:ft|feet|foot)/i)?.[1] || 25)));
  const lineQty = Math.max(1, Math.ceil(feet / 25));
  return [
    pricedMaterial('Mini split equipment package', 1, 'each', 120000),
    pricedMaterial('Insulated line set', lineQty, 'kit', 18000, `${feet} ft requested/assumed line run basis.`),
    pricedMaterial('Line hide and fittings', lineQty, 'kit', 14000),
    pricedMaterial('Condensate tubing', 1, 'allowance', 5500),
    pricedMaterial('Disconnect, fuses, whip, breaker, wire, conduit, and fittings', 1, 'allowance', 26000),
    pricedMaterial('Condenser pad or wall bracket and mounting hardware', 1, 'allowance', 12500),
    pricedMaterial('Fasteners, sealants, and miscellaneous consumables', 1, 'allowance', 6500),
  ];
};

const internalMaterials = (payload = {}) => {
  const text = `${payload.service || ''} ${payload.workScope || ''} ${payload.description || ''}`;
  if (/mini\s*-?split|ductless/i.test(text)) return miniSplitMaterials(text);
  if (/faucet/i.test(text)) return [pricedMaterial('Faucet', 1, 'each', 15000), pricedMaterial('Supply lines', 1, 'pair', 3500), pricedMaterial('Plumber putty or silicone', 1, 'allowance', 1200), pricedMaterial('Drain fittings and shutoff allowance', 1, 'allowance', 6500)];
  if (/toilet/i.test(text)) return [pricedMaterial('Toilet fixture', 1, 'each', 25000), pricedMaterial('Wax ring and closet bolts', 1, 'kit', 2500), pricedMaterial('Supply line and shutoff allowance', 1, 'allowance', 6000), pricedMaterial('Caulk', 1, 'tube', 1200)];
  return [pricedMaterial('Primary materials allowance', 1, 'allowance', 7500), pricedMaterial('Fasteners, anchors, caulk, sealant', 1, 'allowance', 3500), pricedMaterial('Protection and cleanup supplies', 1, 'allowance', 2500)];
};

const isLiveResearchEnabled = (mode = 'internal_live') => !['off', 'internal', 'internal_only', 'internal knowledge only'].includes(String(mode).toLowerCase().replace(/[+\s-]+/g, '_'));
const baseResearchMetadata = (mode = 'internal_live') => ({ research_mode: 'openai_first', requested_mode: mode, openai_live_search_used: false, fallback_search_used: false, internal_catalog_used: true, historical_quotes_used: false, serpapi_used: false, sources: [], pricing_confidence_reason: 'OpenAI is asked to use live search first when supported; internal catalog allowances are supplied for fallback and admin review.' });

const performFallbackResearch = async ({ payload, materials, mode }) => {
  const metadata = baseResearchMetadata(mode);
  if (!isLiveResearchEnabled(mode)) return { mode, enabled: false, productFindings: [], priceFindings: [], warning: null, research_metadata: metadata };
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return { mode, enabled: true, productFindings: [], priceFindings: [], warning: 'SERPAPI_API_KEY is not configured; fallback live web pricing skipped.', research_metadata: metadata };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERP_TIMEOUT_MS);
  try {
    const query = `${detectTrade(payload)} ${materials.slice(0, 4).map((m) => m.name).join(' ')} current supplier price`;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping'); url.searchParams.set('q', query); url.searchParams.set('api_key', key);
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Fallback research failed with ${response.status}`);
    const results = (data.shopping_results || []).slice(0, mode === 'aggressive' ? 12 : 6).map((item) => ({ title: normalizeText(item.title), source: normalizeText(item.source), price: normalizeText(item.price), link: normalizeText(item.link), snippet: normalizeText(item.snippet || item.extracted_price || '') }));
    metadata.fallback_search_used = true; metadata.serpapi_used = true; metadata.sources = results.map((item) => ({ title: item.title, source: item.source, url: item.link, price: item.price }));
    metadata.pricing_confidence_reason = results.length ? 'OpenAI live search was unavailable or not returned by the API; SERPAPI fallback returned current shopping results for admin review.' : 'SERPAPI fallback returned no shopping results; internal allowances were used.';
    return { mode, enabled: true, productFindings: results, priceFindings: results, warning: null, research_metadata: metadata };
  } catch (error) {
    metadata.pricing_confidence_reason = `Fallback search unavailable: ${error.message}. Internal allowances were used.`;
    return { mode, enabled: true, productFindings: [], priceFindings: [], warning: `Fallback live research unavailable: ${error.message}`, research_metadata: metadata };
  } finally { clearTimeout(timer); }
};

const normalizeOtherPricing = (source = {}) => {
  const cents = (keys) => firstMoney(source, keys) || firstMoney(source, [`${keys[0]}_cents`, `${keys[0]}Cents`], { assumeCents: true });
  const out = {
    trip_charge_cents: cents(['trip_charge', 'tripCharge', 'travel', 'travel_charge']), permit_cents: cents(['permit', 'permit_fee']), disposal_cents: cents(['disposal', 'disposal_fee']), rental_cents: cents(['rental', 'rental_fee']), tax_cents: cents(['tax', 'sales_tax']), discount_cents: cents(['discount']), markup_cents: cents(['markup', 'additional_markup']),
  };
  return { trip_charge: centsToMoney(out.trip_charge_cents), ...out, permit: centsToMoney(out.permit_cents), disposal: centsToMoney(out.disposal_cents), rental: centsToMoney(out.rental_cents), tax: centsToMoney(out.tax_cents), discount: centsToMoney(out.discount_cents), markup: centsToMoney(out.markup_cents) };
};


const laborSanityProfile = (text = '') => {
  const t = String(text || '').toLowerCase();
  if (/ceiling\s+fan/.test(t) && /replace|replacement|swap/.test(t) && !/new\s+(circuit|wire|box)|home\s*run|attic|high\s+ceiling|scaffold/.test(t)) return { maxHours: 2, reason: 'Ceiling fan replacement sanity check capped labor at 1–2 hours unless new wiring/access complexity is documented.' };
  if (/ceiling\s+fan/.test(t)) return { maxHours: 4, reason: 'Ceiling fan install sanity check capped labor unless new circuit/access complexity is documented.' };
  return null;
};

const normalizeLaborLine = (item = {}, index = 0, pricingSummary = {}, assumptions = [], contextText = '') => {
  const obj = typeof item === 'string' ? { name: item } : item;
  const name = normalizeText(firstValue(obj, ['name', 'description', 'label', 'phase'], `Labor allowance ${index + 1}`));
  let hours = Number(firstValue(obj, ['hours', 'quantity', 'low_hours', 'lowHours', 'hours_low'], 0));
  let rateCents = firstMoney(obj, ['rate', 'hourly_rate', 'labor_rate', 'unit_cost', 'unitCost']) || firstMoney(obj, ['rate_cents', 'rateCents', 'unit_cost_cents', 'unitCostCents'], { assumeCents: true });
  let totalCents = firstMoney(obj, ['total', 'total_cost', 'line_total']) || firstMoney(obj, ['total_cents', 'totalCents'], { assumeCents: true });
  if (!rateCents) { rateCents = DEFAULT_LABOR_RATE_CENTS; assumptions.push(`Labor rate was missing for "${name}"; default rate ${centsToMoney(rateCents).toFixed(2)}/hr was applied.`); }
  if (!hours && totalCents) hours = Math.round((totalCents / rateCents) * 100) / 100;
  if (!hours) hours = 1;
  const sanity = laborSanityProfile(`${contextText} ${name} ${obj.description || ''}`);
  if (sanity && hours > sanity.maxHours) { assumptions.push(sanity.reason); hours = sanity.maxHours; totalCents = Math.round(hours * rateCents); }
  if (!totalCents) totalCents = Math.round(hours * rateCents);
  return { name, description: normalizeText(obj.description || name), hours, quantity: hours, unit: obj.unit || 'hours', rate: centsToMoney(rateCents), rate_cents: rateCents, unit_cost: centsToMoney(rateCents), unit_cost_cents: rateCents, total: centsToMoney(totalCents), total_cents: totalCents, confidence: obj.confidence || 'medium', notes: obj.notes || '' };
};

const normalizeMaterialLine = (item = {}, index = 0, trade = 'General', assumptions = []) => {
  const obj = typeof item === 'string' ? { name: item } : item;
  const name = normalizeText(firstValue(obj, ['name', 'material', 'description', 'label'], `Materials allowance ${index + 1}`));
  const quantity = Math.max(0.01, Number(firstValue(obj, ['quantity', 'qty'], 1)) || 1);
  const unit = normalizeText(firstValue(obj, ['unit'], 'each')) || 'each';
  const markup = Number(firstValue(obj, ['markup_percent', 'markupPct', 'markup'], DEFAULT_MARKUP_PERCENT));
  let unitCostCents = firstMoney(obj, ['unit_cost', 'unitCost', 'unit_price', 'unitPrice', 'price', 'estimated_price']) || firstMoney(obj, ['estimatedBuyCostCents', 'unit_cost_cents', 'unitCostCents'], { assumeCents: true });
  let totalCents = firstMoney(obj, ['total', 'total_cost', 'line_total']) || firstMoney(obj, ['total_cents', 'totalCents', 'totalCostCents'], { assumeCents: true });
  if (!unitCostCents && totalCents) unitCostCents = Math.round(totalCents / quantity / (1 + markup / 100));
  if (!unitCostCents) { unitCostCents = allowanceFor(name, trade); assumptions.push(`Material price was missing for "${name}"; estimated allowance pricing was applied for admin review.`); }
  if (/ceiling\s+fan|fan fixture/i.test(`${trade} ${name}`) && !/wire nut|hardware|box|consumable|connector/i.test(name) && unitCostCents > 0 && unitCostCents < 6500) {
    assumptions.push(`Material sanity check raised "${name}" from an impossible low price to a reviewable ceiling-fan allowance.`);
    unitCostCents = 12900;
    totalCents = 0;
  }
  if (!totalCents) totalCents = Math.round(quantity * unitCostCents * (1 + markup / 100));
  return { name, description: normalizeText(obj.description || name), quantity, unit, unit_cost: centsToMoney(unitCostCents), unit_cost_cents: unitCostCents, markup_percent: Number.isFinite(markup) ? markup : DEFAULT_MARKUP_PERCENT, total: centsToMoney(totalCents), total_cents: totalCents, source: normalizeText(obj.source || obj.pricing_source || obj.pricingSource || (unitCostCents ? 'OpenAI research / internal catalog' : 'estimated allowance')), source_url: normalizeText(obj.source_url || obj.url || obj.link || ''), last_checked: normalizeText(obj.last_checked || obj.lastChecked || today()), confidence: obj.confidence || (obj.source || obj.source_url ? 'medium' : 'low'), notes: obj.notes || '' };
};

const normalizePricingSummary = ({ laborLines, materialLines, otherPricing, estimate = {} }) => {
  const source = estimate.pricing_summary || estimate.pricingSummary || estimate || {};
  const laborTotal = laborLines.reduce((s, l) => s + l.total_cents, 0);
  const materialTotal = materialLines.reduce((s, l) => s + l.total_cents, 0);
  const otherTotal = otherPricing.trip_charge_cents + otherPricing.permit_cents + otherPricing.disposal_cents + otherPricing.rental_cents + otherPricing.markup_cents;
  const subtotal = laborTotal + materialTotal + otherTotal;
  const grandTotal = subtotal + otherPricing.tax_cents - otherPricing.discount_cents;
  const sourceGrand = firstMoney(source, ['grand_total', 'grandTotal', 'total', 'recommended_total', 'fixed_price_recommendation']) || firstMoney(source, ['grand_total_cents', 'grandTotalCents', 'total_cents', 'recommended_total_cents', 'fixed_price_recommendation_cents'], { assumeCents: true });
  return { labor_total: centsToMoney(laborTotal), labor_total_cents: laborTotal, material_total: centsToMoney(materialTotal), material_total_cents: materialTotal, other_total: centsToMoney(otherTotal), other_total_cents: otherTotal, subtotal: centsToMoney(subtotal), subtotal_cents: subtotal, tax: centsToMoney(otherPricing.tax_cents), tax_cents: otherPricing.tax_cents, discount: centsToMoney(otherPricing.discount_cents), discount_cents: otherPricing.discount_cents, grand_total: centsToMoney(grandTotal), grand_total_cents: grandTotal, ai_reported_grand_total_cents: sourceGrand || grandTotal };
};

const backfillIncompletePricing = ({ estimate, payload, laborLines, materialLines, otherPricing, assumptions, warnings }) => {
  const source = estimate.pricing_summary || estimate.pricingSummary || estimate || {};
  const laborSummary = firstMoney(source, ['labor_total', 'laborTotal']) || firstMoney(source, ['labor_total_cents', 'laborTotalCents'], { assumeCents: true });
  const materialSummary = firstMoney(source, ['material_total', 'materials_total', 'materialTotal']) || firstMoney(source, ['material_total_cents', 'materialTotalCents'], { assumeCents: true });
  const grandSummary = firstMoney(source, ['grand_total', 'grandTotal', 'recommended_total', 'fixed_price_recommendation', 'total']) || firstMoney(source, ['grand_total_cents', 'grandTotalCents', 'recommended_total_cents', 'fixed_price_recommendation_cents', 'total_cents'], { assumeCents: true });
  if (!laborLines.length && laborSummary > 0) laborLines.push(normalizeLaborLine({ name: 'Labor allowance', hours: Math.max(1, Math.round((laborSummary / DEFAULT_LABOR_RATE_CENTS) * 100) / 100), rate_cents: DEFAULT_LABOR_RATE_CENTS, total_cents: laborSummary, confidence: 'low' }, 0, source, assumptions));
  if (!materialLines.length && materialSummary > 0) materialLines.push(normalizeMaterialLine({ name: 'Materials allowance', quantity: 1, unit: 'allowance', total_cents: materialSummary, markup_percent: 0, source: 'estimated allowance', confidence: 'low' }, 0, detectTrade(payload), assumptions));
  if (!laborLines.length && !materialLines.length && grandSummary > 0) {
    const otherTotal = otherPricing.trip_charge_cents + otherPricing.permit_cents + otherPricing.disposal_cents + otherPricing.rental_cents + otherPricing.markup_cents + otherPricing.tax_cents - otherPricing.discount_cents;
    const remaining = Math.max(0, grandSummary - otherTotal);
    const laborCents = Math.max(DEFAULT_LABOR_RATE_CENTS, Math.round(remaining * 0.65));
    const materialCents = Math.max(allowanceFor('Materials allowance', detectTrade(payload)), remaining - laborCents);
    laborLines.push(normalizeLaborLine({ name: 'Labor allowance', total_cents: laborCents, rate_cents: DEFAULT_LABOR_RATE_CENTS, confidence: 'low' }, 0, source, assumptions));
    materialLines.push(normalizeMaterialLine({ name: 'Materials allowance', quantity: 1, unit: 'allowance', total_cents: materialCents, markup_percent: 0, source: 'estimated allowance', confidence: 'low' }, 0, detectTrade(payload), assumptions));
  }
  const lineTotal = laborLines.reduce((s, l) => s + l.total_cents, 0) + materialLines.reduce((s, l) => s + l.total_cents, 0);
  if (grandSummary > 0 && lineTotal === 0) warnings.push('AI returned a total but incomplete line-item pricing. Allowance lines were created for admin review.');
};

const score01 = (points, total) => Math.max(0, Math.min(1, Math.round((total ? points / total : 0) * 100) / 100));
const has = (value) => Boolean(normalizeText(value));
const computeConfidence = ({ estimate = {}, payload = {}, research = {} }) => {
  const text = `${payload.description || ''} ${payload.projectDetails || ''} ${payload.workScope || ''}`;
  const materials = toArray(estimate.material_line_items);
  const labor = toArray(estimate.labor_line_items);
  const pricedMaterials = materials.filter((m) => Number(m.unit_cost_cents) > 0 && Number(m.total_cents) > 0);
  const pricedLabor = labor.filter((l) => Number(l.rate_cents) > 0 && Number(l.total_cents) > 0);
  const summary = estimate.pricing_summary || {};
  const lineGrand = [...labor, ...materials].reduce((sum, line) => sum + Number(line.total_cents || 0), 0) + Number(estimate.other_pricing?.trip_charge_cents || 0) + Number(estimate.other_pricing?.permit_cents || 0) + Number(estimate.other_pricing?.disposal_cents || 0) + Number(estimate.other_pricing?.rental_cents || 0) + Number(estimate.other_pricing?.markup_cents || 0) + Number(estimate.other_pricing?.tax_cents || 0) - Number(estimate.other_pricing?.discount_cents || 0);
  const grandMatches = !summary.grand_total_cents || Math.abs(Number(summary.grand_total_cents || 0) - lineGrand) <= 1;
  const knownJob = /mini\s*-?split|ductless|faucet|toilet|water heater|outlet|switch|drywall|ceiling|fan|hvac|plumb|electric/i.test(text);
  const hiddenRiskHigh = /unknown|hidden|behind wall|crawl|attic|roof|leak|mold|water damage/i.test(text);
  const info = score01([has(text) && text.length > 30, has(payload.service || payload.service_category), has(payload.address || payload.streetAddress || payload.propertySummary), Boolean(payload.photosProvided || payload.files?.length || payload.photos?.length), /model|serial|btu|ton|amp|volt|brand/i.test(text), /\d+\s*(ft|feet|inch|in|ton|btu|amp|volt|sq\s*ft)/i.test(text), /repair|replace|install|troubleshoot|quote|estimate/i.test(text)].filter(Boolean).length, 7);
  const scopeScore = score01([detectTrade(payload) !== 'General Contracting', knownJob, has(payload.workScope || estimate.scope_of_work), text.length > 50, !hiddenRiskHigh].filter(Boolean).length, 5);
  const laborScore = score01([labor.length > 0, pricedLabor.length === labor.length && labor.length > 0, knownJob, Boolean(estimate.historical_matches?.length || estimate.research_metadata?.historical_quotes_used), !/access unknown|unknown access/i.test(text)].filter(Boolean).length, 5);
  const materialScore = score01([materials.length > 0, pricedMaterials.length === materials.length && materials.length > 0, materials.every((m) => Number(m.quantity || 0) > 0), materials.some((m) => /supplier|catalog|openai|home depot|lowe|grainger|ferguson|allowance/i.test(m.source || '')), !materials.every((m) => /allowance/i.test(`${m.unit || ''} ${m.source || ''}`))].filter(Boolean).length, 5);
  const pricingScore = score01([pricedMaterials.length === materials.length && materials.length > 0, pricedLabor.length === labor.length && labor.length > 0, Boolean(summary.grand_total_cents), grandMatches, ![...labor, ...materials].some((line) => Number(line.total_cents || 0) <= 0), !estimate.pricing_warnings?.length].filter(Boolean).length, 6);
  const researchScore = score01([Boolean(estimate.research_metadata?.internal_catalog_used), Boolean(estimate.research_metadata?.historical_quotes_used), Boolean(estimate.research_metadata?.openai_live_search_used), Boolean(estimate.research_metadata?.fallback_search_used || research.priceFindings?.length), Boolean(estimate.research_metadata?.sources?.length)].filter(Boolean).length, 5);
  const scores = { information_completeness: info, data_completeness: info, scope: scopeScore, scope_completeness: scopeScore, labor: laborScore, materials: materialScore, material_certainty: materialScore, pricing: pricingScore, pricing_certainty: pricingScore, research: researchScore };
  scores.overall = Math.round(((info * 0.20) + (scopeScore * 0.20) + (laborScore * 0.15) + (materialScore * 0.15) + (pricingScore * 0.20) + (researchScore * 0.10)) * 100) / 100;
  scores.level = scores.overall >= 0.88 ? 'Very High' : scores.overall >= 0.74 ? 'High' : scores.overall >= 0.55 ? 'Medium' : 'Low';
  const positive = [];
  const negative = [];
  if (text.length > 50) positive.push('Customer provided a clear description.'); else negative.push('Customer description is short or vague.');
  if (materials.some((m) => Number(m.unit_cost_cents) > 0)) positive.push('Material pricing found.'); else negative.push('Material pricing missing.');
  if (labor.length) positive.push('Labor rule or labor line matched.'); else negative.push('No labor rule matched.');
  if (grandMatches) positive.push('Grand total equals line items.'); else negative.push('Grand total does not match line items.');
  if (!payload.photosProvided && !payload.files?.length && !payload.photos?.length) negative.push('No photos provided.');
  if (!/\d+\s*(ft|feet|inch|in|ton|btu|amp|volt|sq\s*ft)/i.test(text)) negative.push('Measurements missing.');
  if (!estimate.research_metadata?.openai_live_search_used && !research.priceFindings?.length) negative.push('Live pricing timed out or was unavailable.');
  if (estimate.pricing_warnings?.length) negative.push('Line items were backfilled.');
  const reasons = [`${scores.level} confidence: info ${Math.round(info * 100)}%, scope ${Math.round(scopeScore * 100)}%, labor ${Math.round(laborScore * 100)}%, materials ${Math.round(materialScore * 100)}%, pricing ${Math.round(pricingScore * 100)}%, research ${Math.round(researchScore * 100)}%.`, ...positive, ...negative];
  const recommended_action = scores.level === 'Very High' || scores.level === 'High' ? 'Ready for admin review.' : scores.level === 'Medium' ? 'Review assumptions before sending.' : 'Request more information or continue manually.';
  return { scores, reasons, positive_reasons: positive, negative_reasons: negative, recommended_action, level: scores.level, explanation: reasons[0] };
};


const openAiWebSearchUsed = (data = {}) => asArray(data.output).some((item) => item?.type === 'web_search_call');
const openAiWebSources = (data = {}) => asArray(data.output).flatMap((item) => asArray(item?.action?.sources).map((source) => ({ title: source.title || source.url || 'OpenAI web source', url: source.url || '', source: source.source || 'OpenAI web search' }))).filter((source) => source.url);

const parseOpenAiJson = (data = {}) => {
  const raw = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text).filter(Boolean).join('\n') || data.choices?.[0]?.message?.content || '';
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};

const normalizeEstimate = (estimate = {}, payload = {}, research = {}) => {
  const assumptions = toArray(estimate.assumptions).map((item) => normalizeText(typeof item === 'string' ? item : item.description || item.name || JSON.stringify(item)));
  const warnings = [];
  const trade = normalizeText(estimate.trade || estimate.service_category || detectTrade(payload));
  let laborLines = toArray(estimate.labor_line_items || estimate.laborLineItems || estimate.labor_items || estimate.laborItems).map((item, i) => normalizeLaborLine(item, i, estimate.pricing_summary, assumptions, `${payload.service || ''} ${payload.workScope || ''} ${payload.description || ''}`));
  let materialSource = toArray(estimate.material_line_items || estimate.materialLineItems || estimate.materials || estimate.materialBreakdown || estimate.material_breakdown);
  if (!materialSource.length) materialSource = internalMaterials(payload);
  let materialLines = materialSource.map((item, i) => normalizeMaterialLine(item, i, trade, assumptions));
  const otherPricing = normalizeOtherPricing(estimate.other_pricing || estimate.otherPricing || estimate.pricing_summary || estimate.pricingSummary || {});
  backfillIncompletePricing({ estimate, payload, laborLines, materialLines, otherPricing, assumptions, warnings });
  if (!laborLines.length) laborLines = [normalizeLaborLine({ name: 'Diagnostic / setup / verification', description: 'Inspect issue, verify scope, test operation.', hours: 1.5, rate_cents: DEFAULT_LABOR_RATE_CENTS, confidence: 'medium' }, 0, estimate.pricing_summary, assumptions, `${payload.service || ''} ${payload.workScope || ''} ${payload.description || ''}`)];
  if (!materialLines.length) materialLines = [normalizeMaterialLine({ name: 'Fasteners, anchors, caulk, sealant', description: 'Consumable installation materials.', quantity: 1, unit: 'allowance', source: 'estimated allowance', confidence: 'medium' }, 0, trade, assumptions)];
  const pricingSummary = normalizePricingSummary({ laborLines, materialLines, otherPricing, estimate });
  if (pricingSummary.ai_reported_grand_total_cents && Math.abs(pricingSummary.ai_reported_grand_total_cents - pricingSummary.grand_total_cents) > 100) warnings.push('AI reported total differed from editable line-item totals; grand total was recalculated from editable lines.');
  const researchMetadata = { ...baseResearchMetadata(research.mode), ...(research.research_metadata || {}), ...(estimate.research_metadata || estimate.researchMetadata || {}) };
  const sources = toArray(researchMetadata.sources).concat(toArray(research.priceFindings).map((item) => ({ title: item.title, source: item.source, url: item.link, price: item.price }))).filter(Boolean);
  researchMetadata.sources = sources;
  researchMetadata.internal_catalog_used = true;
  researchMetadata.research_mode = 'openai_first';
  const base = {
    service_category: normalizeText(estimate.service_category || trade), trade,
    customer_summary: normalizeText(estimate.customer_summary || payload.customerSummary || payload.name || payload.email || 'Original customer request'),
    property_summary: normalizeText(estimate.property_summary || payload.propertySummary || [payload.address || payload.streetAddress, payload.city, payload.state, payload.zip].filter(Boolean).join(', ') || 'Original property request'),
    scope_of_work: normalizeText(Array.isArray(estimate.scope_of_work) ? estimate.scope_of_work.join('\n') : estimate.scope_of_work || payload.description || payload.projectDetails || 'Admin review required to finalize scope.'),
    labor_line_items: laborLines, material_line_items: materialLines, other_pricing: otherPricing, pricing_summary: pricingSummary,
    suggested_price_range: estimate.suggested_price_range || estimate.price_range || null,
    equipment: toArray(estimate.equipment), permits: toArray(estimate.permits || estimate.permit_requirements), code_requirements: toArray(estimate.code_requirements || estimate.codeRequirements), maintenance_items: toArray(estimate.maintenance_items || estimate.maintenanceItems), recommendations: toArray(estimate.recommendations), risk_flags: toArray(estimate.risk_flags || estimate.riskFlags), questions_needed: toArray(estimate.questions_needed || estimate.recommended_questions),
    assumptions: [...new Set(assumptions.filter(Boolean))], exclusions: toArray(estimate.exclusions), warranty_notes: normalizeText(estimate.warranty_notes || 'Warranty terms require admin review before sending.'), customer_notes: normalizeText(estimate.customer_notes || 'Estimate draft is pending admin review.'), internal_admin_notes: normalizeText(estimate.internal_admin_notes || 'AI generated this draft for admin review only. Do not send without approval.'), recommended_questions: toArray(estimate.recommended_questions), research_metadata: researchMetadata, research_context: research, pricing_warnings: warnings, admin_approval_required: true,
  };
  if (warnings.length) base.assumptions.push(...warnings);
  const confidence = computeConfidence({ estimate: base, payload, research });
  return { ...base, confidence_scores: { ...(estimate.confidence_scores || estimate.confidenceScores || {}), ...confidence.scores }, confidence_level: confidence.level, confidence_explanation: confidence.explanation, confidence_reasons: [...confidence.reasons, ...toArray(estimate.confidence_reasons || estimate.confidenceReasons)], recommended_action: estimate.recommended_action || confidence.recommended_action };
};

const buildManualDraft = (payload = {}, message = 'AI estimate generation failed. Continue manually?') => normalizeEstimate({ customer_summary: payload.customerSummary || payload.customer || payload.name || payload.email, property_summary: payload.propertySummary || payload.address || payload.streetAddress || payload.city, scope_of_work: payload.description || payload.projectDetails || payload.workScope, assumptions: [message], research_metadata: baseResearchMetadata('manual') }, payload, { mode: 'manual', research_metadata: baseResearchMetadata('manual') });

const openAiRequestBody = ({ payload, research, useSearchTools = true }) => {
  const schemaKeys = ['service_category','trade','customer_summary','property_summary','scope_of_work','labor_line_items','material_line_items','other_pricing','pricing_summary','assumptions','exclusions','warranty_notes','customer_notes','internal_admin_notes','recommended_questions','confidence_scores','confidence_reasons','research_metadata'];
  const body = {
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: 'You are a server-side contractor quoting and pricing research engine. Use OpenAI live/search tools first when available for current material pricing; never rely on memory alone for current prices. Return JSON only. Admin must review before sending. Never put status text such as quote_in_progress into customer/property/scope/labor/material/content fields.' },
      { role: 'user', content: JSON.stringify({
        task: 'Generate a complete priced quote editor draft. Determine trade, labor, materials, live pricing needs, research queries, analyze research/fallback data, and return fully priced editable line items. If exact pricing is unavailable, use estimated allowance pricing, set source="estimated allowance", lower pricing confidence, and explain why. Never return a nonzero grand_total with zero/missing labor or material line pricing.',
        required_top_level_json_keys: schemaKeys,
        strict_labor_line_shape: { name: 'Diagnostic / setup / verification', description: 'Inspect issue, verify scope, test operation.', hours: 1.5, unit: 'hours', rate: 125, rate_cents: 12500, total: 187.5, total_cents: 18750, confidence: 'medium' },
        strict_material_line_shape: { name: 'Fasteners, anchors, caulk, sealant', description: 'Consumable installation materials.', quantity: 1, unit: 'allowance', unit_cost: 35, unit_cost_cents: 3500, markup_percent: 25, total: 43.75, total_cents: 4375, source: 'OpenAI research / internal catalog / supplier', source_url: '', last_checked: today(), confidence: 'medium' },
        required_other_pricing_shape: { trip_charge: 0, trip_charge_cents: 0, permit: 0, permit_cents: 0, disposal: 0, disposal_cents: 0, rental: 0, rental_cents: 0, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, markup: 0, markup_cents: 0 },
        required_pricing_summary_shape: { labor_total: 187.5, labor_total_cents: 18750, material_total: 43.75, material_total_cents: 4375, other_total: 0, other_total_cents: 0, subtotal: 231.25, subtotal_cents: 23125, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, grand_total: 231.25, grand_total_cents: 23125 },
        research_metadata_shape: { research_mode: 'openai_first', openai_live_search_used: useSearchTools, fallback_search_used: false, internal_catalog_used: true, historical_quotes_used: false, serpapi_used: false, sources: [], pricing_confidence_reason: '' },
        customer_request: payload,
        internal_quote_catalog_allowances: internalMaterials(payload),
        fallback_research_context: research,
      }) },
    ],
    text: { format: { type: 'json_object' } },
    max_output_tokens: 5000,
  };
  if (useSearchTools) body.tools = [{ type: 'web_search', external_web_access: true }];
  return body;
};

const fetchOpenAI = async (apiKey, body, signal) => {
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal, headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI failed with ${response.status}`);
  return data;
};

const callOpenAI = async ({ payload, research }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, status: 503, message: 'OPENAI_API_KEY is not configured. AI estimate generation failed. Continue manually?' };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    let data; let usedSearchTools = false; let fallbackResearch = research;
    try {
      data = await fetchOpenAI(apiKey, openAiRequestBody({ payload, research, useSearchTools: process.env.OPENAI_QUOTE_DISABLE_WEB_SEARCH !== '1' }), controller.signal);
      usedSearchTools = process.env.OPENAI_QUOTE_DISABLE_WEB_SEARCH !== '1';
    } catch (error) {
      fallbackResearch = await performFallbackResearch({ payload, materials: internalMaterials(payload), mode: research.mode || 'internal_live' });
      data = await fetchOpenAI(apiKey, openAiRequestBody({ payload, research: fallbackResearch, useSearchTools: false }), controller.signal);
    }
    const parsed = parseOpenAiJson(data);
    if (!parsed) return { ok: false, status: 502, message: 'AI returned invalid JSON. Continue manually?' };
    const actualWebSearchUsed = openAiWebSearchUsed(data);
    const sourcesFromTool = openAiWebSources(data);
    const priorSources = asArray(parsed.research_metadata?.sources);
    parsed.research_metadata = {
      ...(parsed.research_metadata || {}),
      research_mode: 'openai_first',
      openai_live_search_used: actualWebSearchUsed,
      openai_live_search_requested: usedSearchTools,
      openai_live_search_unavailable: usedSearchTools && !actualWebSearchUsed,
      fallback_search_used: Boolean(fallbackResearch.research_metadata?.fallback_search_used) || (usedSearchTools && !actualWebSearchUsed),
      serpapi_used: Boolean(fallbackResearch.research_metadata?.serpapi_used),
      internal_catalog_used: true,
      sources: [...priorSources, ...sourcesFromTool],
      pricing_confidence_reason: actualWebSearchUsed
        ? (parsed.research_metadata?.pricing_confidence_reason || 'OpenAI Responses API web_search was used for live pricing support.')
        : 'OpenAI live web_search did not execute; confidence was reduced and internal catalog/fallback pricing must be reviewed.',
    };
    return { ok: true, estimate: normalizeEstimate(parsed, payload, fallbackResearch) };
  } catch (error) {
    return { ok: false, status: 502, message: `AI estimate generation failed. Continue manually? ${error.message}` };
  } finally { clearTimeout(timer); }
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const payload = { ...body, trade: detectTrade(body), service_category: detectTrade(body) };
  const researchMode = normalizeText(body.researchMode || body.research_mode || 'internal_live').toLowerCase().includes('aggressive') ? 'aggressive' : normalizeText(body.researchMode || body.research_mode || 'internal_live');
  const research = { mode: researchMode, enabled: isLiveResearchEnabled(researchMode), productFindings: [], priceFindings: [], warning: null, research_metadata: baseResearchMetadata(researchMode) };
  const ai = await callOpenAI({ payload, research });
  if (!ai.ok) return json(200, { ok: false, message: ai.message, manualDraft: buildManualDraft(payload, ai.message), manualOverride: true, aiEstimateGenerationFailed: true, research });
  return json(200, { ok: true, result: ai.estimate, research: ai.estimate.research_context || research, manualOverride: true, adminApprovalRequired: true });
};
