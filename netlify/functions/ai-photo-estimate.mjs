import { clean, getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_PHOTO_ESTIMATE_MODEL || process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_PHOTO_ESTIMATE_TIMEOUT_MS || 22000);
const STAFF_ROLES = new Set(['owner', 'admin', 'manager', 'worker']);
const IMAGE_RE = /^data:image\/(jpeg|png|webp|heic|heif);base64,[a-z0-9+/=\r\n]+$/i;
const MAX_PHOTOS = 10;
const MAX_DATA_URL_CHARS = 11_500_000;

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const cents = (value) => Math.round(Math.max(0, Number(value || 0)) * 100);
const parseOpenAiJson = (data = {}) => {
  const raw = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text).filter(Boolean).join('\n') || data.choices?.[0]?.message?.content || '';
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};
const validatePhotos = (photos = []) => asArray(photos).slice(0, MAX_PHOTOS).map((photo) => ({ id: clean(photo.id, 80), name: clean(photo.name, 180), type: clean(photo.type, 80), size: number(photo.size), dataUrl: clean(photo.dataUrl || photo.url, MAX_DATA_URL_CHARS) })).filter((photo) => IMAGE_RE.test(photo.dataUrl) && photo.size <= 8 * 1024 * 1024);
const normalizeLine = (line = {}, type = 'labor') => {
  const quantity = number(line.quantity ?? line.hours ?? 1, 1);
  const unitCostCents = number(line.unitCostCents ?? line.unit_cost_cents ?? line.rateCents ?? line.rate_cents, NaN);
  const resolvedUnitCents = Number.isFinite(unitCostCents) ? Math.max(0, Math.round(unitCostCents)) : cents(line.unitCost ?? line.unit_cost ?? line.rate ?? 0);
  const markupPct = number(line.markupPct ?? line.markup_percent, 0);
  const totalCents = Math.round(quantity * resolvedUnitCents * (1 + markupPct / 100));
  return { name: clean(line.name || line.material || line.description, 180) || `${type === 'labor' ? 'Labor' : 'Material'} allowance`, description: clean(line.description || line.name, 700), quantity, hours: type === 'labor' ? quantity : undefined, unit: clean(line.unit || (type === 'labor' ? 'hours' : 'each'), 40), unitCostCents: resolvedUnitCents, unit_cost_cents: resolvedUnitCents, rateCents: type === 'labor' ? resolvedUnitCents : undefined, markupPct, markup_percent: markupPct, totalCents, total_cents: totalCents, confidence: clean(line.confidence || 'medium', 40), source: clean(line.source || line.pricing_source || 'Internal catalog / AI research / allowance', 240), optional: Boolean(line.optional), verification_required: line.verification_required !== false };
};
const normalizeAnalysis = (raw = {}, payload = {}) => {
  const labor = asArray(raw.labor_line_items).map((line) => normalizeLine(line, 'labor'));
  const materials = asArray(raw.material_line_items).map((line) => normalizeLine(line, 'material'));
  const laborTotal = labor.reduce((sum, line) => sum + line.totalCents, 0);
  const materialTotal = materials.reduce((sum, line) => sum + line.totalCents, 0);
  const other = raw.other_pricing && typeof raw.other_pricing === 'object' ? raw.other_pricing : {};
  const otherTotal = ['trip_charge_cents','permit_cents','disposal_cents','rental_cents','markup_cents'].reduce((sum, key) => sum + number(other[key]), 0);
  const tax = number(other.tax_cents); const discount = number(other.discount_cents);
  const summary = { ...(raw.pricing_summary || {}), labor_total_cents: laborTotal, material_total_cents: materialTotal, other_total_cents: otherTotal, subtotal_cents: laborTotal + materialTotal + otherTotal, tax_cents: tax, discount_cents: discount, grand_total_cents: Math.max(0, laborTotal + materialTotal + otherTotal + tax - discount), pricing_note: raw.pricing_summary?.pricing_note || 'Estimated — verification recommended.' };
  const confidence = raw.confidence && typeof raw.confidence === 'object' ? raw.confidence : {};
  return {
    detected_trade: clean(raw.detected_trade || payload.serviceCategory || 'General contractor', 160),
    detected_scope: clean(raw.detected_scope || payload.description || 'Admin review required to confirm photo scope.', 800),
    photo_findings: asArray(raw.photo_findings).slice(0, 30), visible_materials: asArray(raw.visible_materials).slice(0, 30), visible_damage: asArray(raw.visible_damage).slice(0, 30), safety_concerns: asArray(raw.safety_concerns).slice(0, 30), access_notes: asArray(raw.access_notes).slice(0, 30), missing_information: asArray(raw.missing_information).slice(0, 30), recommended_questions: asArray(raw.recommended_questions).slice(0, 30),
    labor_line_items: labor.length ? labor : [normalizeLine({ name: 'Photo-scope review / diagnostic allowance', quantity: 1, unit_cost_cents: 12500, confidence: 'low' }, 'labor')],
    material_line_items: materials,
    other_pricing: other,
    pricing_summary: summary,
    assumptions: [...asArray(raw.assumptions), 'Pricing is estimated from photos and requires admin verification before sending.'].filter(Boolean),
    exclusions: asArray(raw.exclusions),
    customer_summary: clean(raw.customer_summary || 'We received your photo estimate request. The team is reviewing the photos and may ask for optional details before sending a final quote.', 2500),
    admin_notes: clean(raw.admin_notes || 'AI photo estimate draft generated for staff review only. Do not send without verifying scope, measurements, materials, and access.', 4000),
    confidence: { overall: number(confidence.overall, 55), photo_quality: number(confidence.photo_quality, 50), scope: number(confidence.scope, 50), labor: number(confidence.labor, 45), materials: number(confidence.materials, 45), pricing: number(confidence.pricing, 35) },
    upsell_suggestions: asArray(raw.upsell_suggestions || raw.recommendations).slice(0, 20),
    research_sources: asArray(raw.research_sources || raw.research_metadata?.sources).slice(0, 20),
    research_metadata: { ...(raw.research_metadata || {}), openai_model: OPENAI_MODEL, responses_api_used: true, openai_live_search_requested: process.env.OPENAI_PHOTO_ESTIMATE_DISABLE_WEB_SEARCH !== '1' },
  };
};
const loadSessionContext = async (db, request) => {
  const token = getSessionToken(request); if (!token) return null;
  const [session] = await db.sql`select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name from auth_sessions join app_users on app_users.id = auth_sessions.user_id where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true limit 1`;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  const roles = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id} order by roles.key`;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load AI photo estimate permissions; using role defaults' });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
  return { session, roleKeys, permissionKeys, isStaff: roleKeys.some((role) => STAFF_ROLES.has(role)) };
};
const buildPrompt = (payload, photos) => [{ role: 'system', content: [{ type: 'input_text', text: 'You are a premium contractor estimating assistant. Analyze job photos and intake details. Return structured JSON only. Never reveal internal chain-of-thought. Do not invent exact prices; mark uncertain prices as Estimated — verification recommended. Include optional upsells separately.' }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ required_schema: { detected_trade:'', detected_scope:'', photo_findings:[], visible_materials:[], visible_damage:[], safety_concerns:[], access_notes:[], missing_information:[], recommended_questions:[], labor_line_items:[], material_line_items:[], other_pricing:{}, pricing_summary:{}, assumptions:[], exclusions:[], customer_summary:'', admin_notes:'', confidence:{ overall:0, photo_quality:0, scope:0, labor:0, materials:0, pricing:0 } }, intake: payload, pricing_rules: ['Use internal catalog/historical/supplier/research when available.', 'Use fallback allowance pricing only when uncertain.', 'Every uncertain price must be marked Estimated — verification recommended.', 'Everything is a draft for admin review.'] }) }, ...photos.map((photo) => ({ type: 'input_image', image_url: photo.dataUrl }))] }];
const callOpenAI = async (payload, photos) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 240);
  if (!apiKey) return { ok: false, status: 503, message: 'OPENAI_API_KEY is not configured. AI photo analysis is unavailable; save a manual draft instead.' };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const body = { model: OPENAI_MODEL, input: buildPrompt(payload, photos), text: { format: { type: 'json_object' } }, max_output_tokens: 4500 };
    if (process.env.OPENAI_PHOTO_ESTIMATE_DISABLE_WEB_SEARCH !== '1') { body.tools = [{ type: 'web_search', external_web_access: true, user_location: { type: 'approximate', country: 'US' } }]; body.tool_choice = 'auto'; body.include = ['web_search_call.action.sources']; }
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: controller.signal, headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: 502, message: data?.error?.message || `OpenAI failed with ${response.status}` };
    const parsed = parseOpenAiJson(data);
    if (!parsed) return { ok: false, status: 502, message: 'AI returned invalid JSON. No fake analysis was created.' };
    return { ok: true, analysis: normalizeAnalysis(parsed, payload) };
  } catch (error) {
    return { ok: false, status: 502, message: `AI photo analysis failed: ${error.message}` };
  } finally { clearTimeout(timer); }
};
const saveAnalysis = async (db, context, id, payload, photos, analysis) => {
  if (!id) return null;
  const [row] = await db.sql`update photo_estimates set status = 'ready_for_review', service_category = ${clean(payload.serviceCategory, 180)}, description = ${clean(payload.description, 8000)}, property_address = ${clean(payload.propertyAddress, 1000)}, photo_urls = ${JSON.stringify(photos)}::jsonb, ai_analysis = ${JSON.stringify(analysis)}::jsonb, labor_line_items = ${JSON.stringify(analysis.labor_line_items)}::jsonb, material_line_items = ${JSON.stringify(analysis.material_line_items)}::jsonb, pricing_summary = ${JSON.stringify(analysis.pricing_summary)}::jsonb, confidence = ${JSON.stringify(analysis.confidence)}::jsonb, admin_notes = ${context.isStaff ? analysis.admin_notes : ''}, customer_summary = ${analysis.customer_summary}, updated_at = now() where id = ${id} and (${context.isStaff} or customer_id = ${context.session.user_id} or created_by = ${context.session.user_id}) returning *`;
  return row;
};
const mapRow = (row, context) => row ? { id: row.id, status: row.status, quoteId: row.quote_id, serviceCategory: row.service_category, description: row.description, propertyAddress: row.property_address, photoUrls: row.photo_urls || [], aiAnalysis: context.isStaff ? row.ai_analysis : undefined, laborLineItems: context.isStaff ? row.labor_line_items : undefined, materialLineItems: context.isStaff ? row.material_line_items : undefined, pricingSummary: row.pricing_summary, confidence: context.isStaff ? row.confidence : undefined, customerSummary: row.customer_summary, adminNotes: context.isStaff ? row.admin_notes : undefined, createdAt: row.created_at, updatedAt: row.updated_at } : null;

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const context = await loadSessionContext(db, request);
    if (!context) return json(401, { ok: false, authenticated: false, message: 'Sign in required.' });
    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const photos = validatePhotos(body.photoUrls || body.photo_urls);
    if (!photos.length) return json(400, { ok: false, message: 'Upload at least one valid photo before analysis.' });
    const payload = { serviceCategory: clean(body.serviceCategory || body.service_category, 180), description: clean(body.description, 8000), propertyAddress: clean(body.propertyAddress || body.property_address, 1000), measurements: clean(body.measurements, 1000), preferredMaterial: clean(body.preferredMaterial || body.preferred_material, 1000), preferredTimeframe: clean(body.preferredTimeframe || body.preferred_timeframe, 500), budget: clean(body.budget, 120), notes: clean(body.notes, 4000) };
    const ai = await callOpenAI(payload, photos);
    if (!ai.ok) return json(ai.status || 502, { ok: false, message: ai.message, endpointStatus: 'server-side OpenAI call failed; no fake analysis generated' });
    const row = await saveAnalysis(db, context, clean(body.id, 80), payload, photos, ai.analysis);
    return json(200, { ok: true, analysis: ai.analysis, photoEstimate: mapRow(row, context), endpointStatus: 'server-side OpenAI photo analysis complete' });
  } catch (error) {
    console.error('AI photo estimate endpoint failed', error);
    return json(500, { ok: false, message: 'Could not analyze photo estimate right now.' });
  }
};
export const config = { path: '/api/ai-photo-estimate' };
