import { clean, getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody } from './auth-utils.mjs';

const configuredPhotoModel = clean(process.env.OPENAI_PHOTO_ESTIMATE_MODEL, 80);
const configuredFallbackModel = clean(process.env.OPENAI_MODEL, 80) || clean(process.env.OPENAI_RESPONSES_MODEL, 80);
const legacyQuoteModel = clean(process.env.OPENAI_QUOTE_MODEL, 80);
const OPENAI_MODEL = configuredPhotoModel || configuredFallbackModel || (/mini/i.test(legacyQuoteModel) ? '' : legacyQuoteModel) || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Math.min(Number(process.env.AI_PHOTO_ESTIMATE_TIMEOUT_MS || 18000), 23000);
const STAFF_ROLES = new Set(['owner', 'admin', 'manager', 'worker']);
const IMAGE_RE = /^data:image\/(jpeg|png|webp|heic|heif);base64,[a-z0-9+/=\r\n]+$/i;
const HOSTED_IMAGE_RE = /^https?:\/\/[^\s]+$/i;
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
const validatePhotos = (photos = []) => asArray(photos).slice(0, MAX_PHOTOS).map((photo) => ({ id: clean(photo.id, 80), name: clean(photo.name, 180), type: clean(photo.type, 80), size: number(photo.size), dataUrl: clean(photo.dataUrl || photo.url || photo.fileUrl, MAX_DATA_URL_CHARS), url: clean(photo.url || photo.fileUrl || photo.dataUrl, MAX_DATA_URL_CHARS) })).filter((photo) => (IMAGE_RE.test(photo.dataUrl) || HOSTED_IMAGE_RE.test(photo.url)) && photo.size <= 8 * 1024 * 1024);
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
    research_metadata: { ...(raw.research_metadata || {}), openai_model: OPENAI_MODEL, model_source: configuredPhotoModel ? 'OPENAI_PHOTO_ESTIMATE_MODEL' : (configuredFallbackModel ? 'OPENAI_MODEL' : 'default'), responses_api_used: true, structured_output_used: true, web_search_disabled_for_json: true },
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
const photoEstimateJsonSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    detected_trade: { type: 'string' }, detected_scope: { type: 'string' },
    photo_findings: { type: 'array', items: { type: 'string' } }, visible_materials: { type: 'array', items: { type: 'string' } }, visible_damage: { type: 'array', items: { type: 'string' } }, safety_concerns: { type: 'array', items: { type: 'string' } }, access_notes: { type: 'array', items: { type: 'string' } }, missing_information: { type: 'array', items: { type: 'string' } }, recommended_questions: { type: 'array', items: { type: 'string' } },
    labor_line_items: { type: 'array', items: { type: 'object', additionalProperties: true } }, material_line_items: { type: 'array', items: { type: 'object', additionalProperties: true } }, other_pricing: { type: 'object', additionalProperties: true }, pricing_summary: { type: 'object', additionalProperties: true }, assumptions: { type: 'array', items: { type: 'string' } }, exclusions: { type: 'array', items: { type: 'string' } }, customer_summary: { type: 'string' }, admin_notes: { type: 'string' }, confidence: { type: 'object', additionalProperties: true }, upsell_suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['detected_trade', 'detected_scope', 'photo_findings', 'labor_line_items', 'material_line_items', 'pricing_summary', 'customer_summary', 'admin_notes', 'confidence'],
};
const buildPrompt = (payload, photos) => [{ role: 'system', content: [{ type: 'input_text', text: 'You are a premium contractor estimating assistant. Analyze job photos and intake details. Return JSON matching the provided schema only. Never reveal internal chain-of-thought. Do not browse the web. Use photo evidence and intake only. Do not invent exact prices; mark uncertain prices as Estimated — verification recommended. Include optional upsells separately.' }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ intake: payload, pricing_rules: ['Use internal catalog, historical pricing, supplier info supplied in intake, or fallback allowance pricing only.', 'Every uncertain price must be marked Estimated — verification recommended.', 'Everything is a draft for admin review.', 'Web search is intentionally disabled because this endpoint requires structured JSON output.'] }) }, ...photos.map((photo) => ({ type: 'input_image', image_url: photo.url || photo.dataUrl }))] }];
const callOpenAI = async (payload, photos) => {
  const analysisStarted = new Date().toISOString();
  const startedAt = Date.now();
  const baseDebug = { model: OPENAI_MODEL, analysisStarted, imageCount: photos.length };
  const finish = (extra = {}) => ({ ...extra, analysisCompleted: new Date().toISOString(), processingTimeMs: Date.now() - startedAt });
  const apiKey = clean(process.env.OPENAI_API_KEY, 240);
  if (!apiKey) return finish({ ok: false, status: 503, message: 'AI image analysis unavailable. Photos saved for manual review.', fallbackReason: 'OPENAI_API_KEY is not configured', fallbackUsed: true, openaiSuccess: false, imageAnalysisUsed: false, model: OPENAI_MODEL, ...baseDebug });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const body = { model: OPENAI_MODEL, input: buildPrompt(payload, photos), text: { format: { type: 'json_schema', name: 'photo_estimate_analysis', schema: photoEstimateJsonSchema, strict: false } }, max_output_tokens: 4500 };
    console.info('AI photo estimate OpenAI request started', { model: OPENAI_MODEL, photoCount: photos.length, hasDescription: Boolean(payload.description), jsonSchema: true, webSearch: false });
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: controller.signal, headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    console.info('AI photo estimate OpenAI response received', { ok: response.ok, status: response.status, responseId: data?.id || null, outputItems: Array.isArray(data?.output) ? data.output.length : 0 });
    if (!response.ok) return finish({ ok: false, status: 502, message: data?.error?.message || `OpenAI failed with ${response.status}`, fallbackReason: data?.error?.message || `OpenAI failed with ${response.status}`, fallbackUsed: true, openaiSuccess: false, imageAnalysisUsed: false, model: OPENAI_MODEL, usage: data?.usage || null, ...baseDebug });
    const parsed = parseOpenAiJson(data);
    if (!parsed) return finish({ ok: false, status: 502, message: 'AI returned invalid JSON. No fake analysis was created.', fallbackReason: 'AI returned invalid JSON', fallbackUsed: true, openaiSuccess: false, imageAnalysisUsed: false, model: OPENAI_MODEL, usage: data?.usage || null, ...baseDebug });
    const analysis = normalizeAnalysis(parsed, payload);
    const result = finish({ ok: true, analysis, model: OPENAI_MODEL, imageAnalysisUsed: true, fallbackUsed: false, openaiSuccess: true, usage: data?.usage || null, ...baseDebug });
    analysis.research_metadata = { ...(analysis.research_metadata || {}), image_analysis_used: true, token_usage: data?.usage || null, openai_success: true, fallback_used: false, image_count: photos.length, analysis_started_at: result.analysisStarted, analysis_completed_at: result.analysisCompleted, processing_time_ms: result.processingTimeMs };
    return result;
  } catch (error) {
    console.error('AI photo estimate OpenAI request failed', { message: error?.message, name: error?.name });
    return finish({ ok: false, status: error?.name === 'AbortError' ? 504 : 502, message: error?.name === 'AbortError' ? 'AI photo analysis timed out. Photos were saved for manual review.' : `AI photo analysis failed: ${error.message}`, fallbackReason: error?.name === 'AbortError' ? 'OpenAI request timed out' : error.message, fallbackUsed: true, openaiSuccess: false, imageAnalysisUsed: false, model: OPENAI_MODEL, ...baseDebug });
  } finally { clearTimeout(timer); }
};
const ensureDraftRecord = async (db, context, id, payload, photos) => {
  if (id) {
    const [row] = await db.sql`update photo_estimates set status = 'analyzing', service_category = ${clean(payload.serviceCategory, 180)}, description = ${clean(payload.description, 8000)}, property_address = ${clean(payload.propertyAddress, 1000)}, photo_urls = ${JSON.stringify(photos)}::jsonb, updated_at = now() where id = ${id} and (${context.isStaff} or customer_id = ${context.session.user_id} or created_by = ${context.session.user_id}) returning *`;
    return row;
  }
  const [row] = await db.sql`insert into photo_estimates (customer_id, created_by, status, service_category, description, property_address, photo_urls, customer_summary) values (${context.isStaff ? null : context.session.user_id}, ${context.session.user_id}, 'analyzing', ${clean(payload.serviceCategory, 180)}, ${clean(payload.description, 8000)}, ${clean(payload.propertyAddress, 1000)}, ${JSON.stringify(photos)}::jsonb, 'Photo estimate is being analyzed.') returning *`;
  return row;
};
const savePhotoFiles = async (db, context, row, photos, analysis = {}) => {
  if (!row?.id) return;
  for (const photo of photos) {
    const fileUrl = photo.url || photo.dataUrl;
    if (!fileUrl) continue;
    await db.sql`insert into files (owner_id, uploaded_by_user_id, customer_id, path, file_path, file_url, file_name, mime_type, file_type, size_bytes, file_size, photo_type, file_category, visibility, source_context, photo_estimate_id, metadata, ai_analysis) values (${context.session.user_id}, ${context.session.user_id}, ${row.customer_id || context.session.user_id}, ${fileUrl}, ${fileUrl}, ${fileUrl}, ${photo.name || 'photo-estimate-image'}, ${photo.type || 'image/url'}, ${photo.type || 'image/url'}, ${photo.size || null}, ${photo.size || null}, ${'photo_estimate'}, ${'photo_estimate'}, ${context.isStaff ? 'worker_visible' : 'client_visible'}, ${'ai_photo_estimate'}, ${row.id}, ${JSON.stringify({ source: 'ai-photo-estimate', photoId: photo.id, imageAnalysisUsed: Boolean(analysis?.research_metadata?.image_analysis_used) })}::jsonb, ${JSON.stringify(analysis || {})}::jsonb)`;
  }
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
    console.info('AI photo estimate endpoint analyze request', { userId: context.session.user_id, photoCount: photos.length, hasRecordId: Boolean(body.id), isStaff: context.isStaff });
    let row = await ensureDraftRecord(db, context, clean(body.id, 80), payload, photos);
    if (!row) return json(404, { ok: false, message: 'Photo estimate not found.' });
    await savePhotoFiles(db, context, row, photos);
    const ai = await callOpenAI(payload, photos);
    if (!ai.ok) {
      console.warn('AI photo estimate analysis unavailable', { status: ai.status, message: ai.message, recordId: clean(body.id, 80) || null });
      return json(200, { ok: false, code: ai.status === 504 ? 'AI_PHOTO_TIMEOUT' : 'AI_PHOTO_FAILED', message: 'Unable to analyze image. Please try again.', detail: ai.message || 'AI image analysis is unavailable right now.', endpointStatus: 'AI image analysis unavailable. Photos were saved for manual review; no fake analysis was generated.', retryable: true, debug: context.isStaff ? { model: ai.model || OPENAI_MODEL, analysisStarted: ai.analysisStarted, analysisCompleted: ai.analysisCompleted, openaiSuccess: false, fallbackUsed: true, imageCount: photos.length, processingTimeMs: ai.processingTimeMs, imageAnalysisUsed: false, fallbackReason: ai.fallbackReason || ai.message, tokenUsage: ai.usage || null } : undefined });
    }
    row = await saveAnalysis(db, context, row.id, payload, photos, ai.analysis);
    await db.sql`update files set ai_analysis = ${JSON.stringify(ai.analysis)}::jsonb, metadata = coalesce(metadata, '{}'::jsonb) || ${JSON.stringify({ imageAnalysisUsed: true, openaiModel: OPENAI_MODEL })}::jsonb where photo_estimate_id = ${row.id} and source_context in ('ai_photo_estimate', 'photo_estimate')`; 
    await db.sql`insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata) values (${context.session.user_id}, 'photo.analyzed', 'photo_estimate', ${clean(body.id, 80) || null}, ${JSON.stringify({ photoCount: photos.length })}::jsonb)`;
    console.info('AI photo estimate endpoint completed', { recordId: clean(body.id, 80) || null, model: OPENAI_MODEL, saved: Boolean(row) });
    return json(200, { ok: true, analysis: ai.analysis, photoEstimate: mapRow(row, context), endpointStatus: `server-side OpenAI photo analysis complete (${OPENAI_MODEL})`, model: OPENAI_MODEL, debug: context.isStaff ? { model: OPENAI_MODEL, analysisStarted: ai.analysisStarted, analysisCompleted: ai.analysisCompleted, openaiSuccess: true, fallbackUsed: false, imageCount: photos.length, processingTimeMs: ai.processingTimeMs, imageAnalysisUsed: true, fallbackReason: '', tokenUsage: ai.usage || null } : undefined });
  } catch (error) {
    console.error('AI photo estimate endpoint failed', error);
    return json(200, { ok: false, code: 'AI_PHOTO_ERROR', message: 'Unable to analyze image. Please try again.', retryable: true });
  }
};
export const config = { path: '/api/ai-photo-estimate' };
