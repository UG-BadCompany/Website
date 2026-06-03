import { clean, json, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_QUOTE_TIMEOUT_MS || 14000);
const SERP_TIMEOUT_MS = Number(process.env.AI_LIVE_RESEARCH_TIMEOUT_MS || 3500);

const normalizeText = (value = '') => clean(value, 6000);
const clampPercent = (value, fallback = 70) => Math.max(0, Math.min(100, Math.round(Number(value ?? fallback))));
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
const detectTrade = (payload = {}) => {
  const text = `${payload.trade || ''} ${payload.service || ''} ${payload.workCategory || ''} ${payload.workScope || ''} ${payload.description || ''}`.toLowerCase();
  if (/mini\s*-?split|ductless|hvac|heat pump|air handler|condenser|furnace|thermostat/.test(text)) return 'HVAC';
  if (/water heater|faucet|toilet|drain|plumb|leak|sink/.test(text)) return 'Plumbing';
  if (/breaker|panel|outlet|switch|wire|electrical|light|fan/.test(text)) return 'Electrical';
  if (/drywall|patch|texture/.test(text)) return 'Drywall';
  return normalizeText(payload.trade || payload.workCategory || payload.service || 'General Contracting');
};

const isLiveResearchEnabled = (mode = 'internal_live') => !['off', 'internal', 'internal_only', 'internal knowledge only'].includes(String(mode).toLowerCase().replace(/[+\s-]+/g, '_'));
const buildManualDraft = (payload = {}, message = 'AI estimate generation failed. Continue manually?') => ({
  message,
  customer_summary: normalizeText(payload.customerSummary || payload.customer || payload.name || payload.email || 'Customer information is available from the original request.'),
  property_summary: normalizeText(payload.propertySummary || payload.address || payload.streetAddress || payload.city || 'Property details should be copied from the original request.'),
  description: normalizeText(payload.description || payload.projectDetails || payload.workScope || ''),
  service_category: detectTrade(payload),
  trade: detectTrade(payload),
});

const miniSplitMaterials = (description = '') => {
  const feet = Math.max(25, Math.min(200, Number(String(description).match(/(\d{1,3})\s*(?:ft|feet|foot)/i)?.[1] || 25)));
  const lineQty = Math.max(1, Math.ceil(feet / 25));
  return [
    'Mini split equipment package', 'Insulated line set', 'Line hide and fittings', 'Condensate tubing', 'Disconnect', 'Fuses', 'Electrical whip', 'Breaker', 'Wire', 'Conduit', 'Conduit fittings', 'SO cord where required by equipment', 'Mounting hardware', 'Condenser pad or wall bracket', 'Fasteners', 'Sealants', 'Miscellaneous consumables',
  ].map((name) => ({ name, quantity: /line set|line hide/i.test(name) ? lineQty : 1, unit: /wire|conduit|tubing/i.test(name) ? 'allowance' : 'each', pricing_source: 'internal_material_playbook', notes: /line set|line hide/i.test(name) ? `${feet} ft requested/assumed line run basis.` : '' }));
};

const internalMaterials = (payload = {}) => {
  const text = `${payload.service || ''} ${payload.workScope || ''} ${payload.description || ''}`;
  if (/mini\s*-?split|ductless/i.test(text)) return miniSplitMaterials(text);
  if (/faucet/i.test(text)) return ['Faucet', 'Supply lines', 'Shutoff valves if needed', 'Plumber putty or silicone', 'Drain fittings allowance'].map((name) => ({ name, quantity: 1, unit: 'each', pricing_source: 'internal_material_playbook' }));
  if (/toilet/i.test(text)) return ['Toilet fixture', 'Wax ring', 'Closet bolts', 'Supply line', 'Shutoff valve if needed', 'Caulk'].map((name) => ({ name, quantity: 1, unit: 'each', pricing_source: 'internal_material_playbook' }));
  return ['Primary materials allowance', 'Fasteners/anchors', 'Sealants/consumables', 'Protection and cleanup supplies'].map((name) => ({ name, quantity: 1, unit: 'allowance', pricing_source: 'internal_material_playbook' }));
};

const performLiveResearch = async ({ payload, materials, mode }) => {
  if (!isLiveResearchEnabled(mode)) return { mode, enabled: false, productFindings: [], priceFindings: [], warning: null };
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return { mode, enabled: true, productFindings: [], priceFindings: [], warning: 'SERPAPI_API_KEY is not configured; live web pricing skipped while internal knowledge still informs OpenAI.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERP_TIMEOUT_MS);
  try {
    const query = `${detectTrade(payload)} ${materials.slice(0, 4).map((m) => m.name).join(' ')} price specifications`;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', key);
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Live research failed with ${response.status}`);
    const results = (data.shopping_results || []).slice(0, mode === 'aggressive' ? 12 : 6).map((item) => ({ title: normalizeText(item.title), source: normalizeText(item.source), price: normalizeText(item.price), link: normalizeText(item.link), snippet: normalizeText(item.snippet || item.extracted_price || '') }));
    return { mode, enabled: true, productFindings: results, priceFindings: results, warning: null };
  } catch (error) {
    return { mode, enabled: true, productFindings: [], priceFindings: [], warning: `Live research unavailable: ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
};

const parseOpenAiJson = (data = {}) => {
  const raw = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text).filter(Boolean).join('\n') || data.choices?.[0]?.message?.content || '';
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};

const normalizeEstimate = (estimate = {}, payload = {}, research = {}) => ({
  service_category: normalizeText(estimate.service_category || detectTrade(payload)),
  trade: normalizeText(estimate.trade || detectTrade(payload)),
  customer_summary: normalizeText(estimate.customer_summary || payload.customerSummary || payload.name || payload.email || 'Original customer request'),
  property_summary: normalizeText(estimate.property_summary || payload.propertySummary || payload.address || payload.streetAddress || payload.city || 'Original property request'),
  scope_of_work: toArray(estimate.scope_of_work).length ? toArray(estimate.scope_of_work) : [normalizeText(estimate.scope_of_work || payload.description || payload.projectDetails || 'Admin review required to finalize scope.')],
  labor_line_items: toArray(estimate.labor_line_items).map((item) => typeof item === 'string' ? { name: item, hours_low: 1, hours_high: 2 } : item),
  material_line_items: toArray(estimate.material_line_items).length ? toArray(estimate.material_line_items) : internalMaterials(payload),
  pricing_summary: estimate.pricing_summary && typeof estimate.pricing_summary === 'object' ? estimate.pricing_summary : { total_low: null, total_high: null, status: 'admin_review_required' },
  assumptions: toArray(estimate.assumptions),
  exclusions: toArray(estimate.exclusions),
  warranty_notes: normalizeText(estimate.warranty_notes || 'Warranty terms require admin review before sending.'),
  customer_notes: normalizeText(estimate.customer_notes || 'Estimate draft is pending admin review.'),
  internal_admin_notes: normalizeText(estimate.internal_admin_notes || 'AI generated this draft for admin review only. Do not send without approval.'),
  recommended_questions: toArray(estimate.recommended_questions),
  confidence_scores: {
    overall: clampPercent(estimate.confidence_scores?.overall, 75),
    labor: clampPercent(estimate.confidence_scores?.labor, 75),
    materials: clampPercent(estimate.confidence_scores?.materials, research.priceFindings?.length ? 78 : 62),
    scope: clampPercent(estimate.confidence_scores?.scope, 72),
    pricing: clampPercent(estimate.confidence_scores?.pricing, research.priceFindings?.length ? 75 : 58),
    information_completeness: clampPercent(estimate.confidence_scores?.information_completeness, payload.description ? 72 : 45),
  },
  research_context: research,
  admin_approval_required: true,
});

const callOpenAI = async ({ payload, research }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, status: 503, message: 'OPENAI_API_KEY is not configured. AI estimate generation failed. Continue manually?' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: 'system', content: 'You are a server-side contractor estimating engine. Return structured JSON only. Do not approve, send, or finalize quotes. Never put status text into customer/property/scope/labor/material fields.' },
          { role: 'user', content: JSON.stringify({
            task: 'Generate a usable estimate draft even when optional information is missing. Use assumptions and recommended questions rather than blocking. Mini-splits are HVAC. Include full scope, labor, materials, pricing, notes, exclusions, and confidence.',
            required_json_keys: ['service_category','trade','customer_summary','property_summary','scope_of_work','labor_line_items','material_line_items','pricing_summary','assumptions','exclusions','warranty_notes','customer_notes','internal_admin_notes','recommended_questions','confidence_scores'],
            customer_request: payload,
            internal_material_playbook: internalMaterials(payload),
            live_research: research,
          }) },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: 502, message: data?.error?.message || 'AI estimate generation failed. Continue manually?' };
    const parsed = parseOpenAiJson(data);
    if (!parsed) return { ok: false, status: 502, message: 'AI returned invalid JSON. Continue manually?' };
    return { ok: true, estimate: normalizeEstimate(parsed, payload, research) };
  } catch (error) {
    return { ok: false, status: 502, message: `AI estimate generation failed. Continue manually? ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const payload = { ...body, trade: detectTrade(body), service_category: detectTrade(body) };
  const researchMode = normalizeText(body.researchMode || body.research_mode || 'internal_live').toLowerCase().includes('aggressive') ? 'aggressive' : normalizeText(body.researchMode || body.research_mode || 'internal_live');
  const research = await performLiveResearch({ payload, materials: internalMaterials(payload), mode: researchMode });
  const ai = await callOpenAI({ payload, research });
  if (!ai.ok) return json(ai.status || 502, { ok: false, message: ai.message, manualDraft: buildManualDraft(payload, ai.message), manualOverride: true, aiEstimateGenerationFailed: true, research });
  return json(200, { ok: true, result: ai.estimate, research, manualOverride: true, adminApprovalRequired: true });
};
