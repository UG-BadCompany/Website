import { clean, getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody } from './auth-utils.mjs';

const STATUSES = new Set(['draft','photo_uploaded','ai_analyzing','needs_more_info','ready_for_review','quote_created','sent_to_client','accepted','declined','cancelled']);
const STAFF_ROLES = new Set(['owner', 'admin', 'manager', 'worker']);
const MAX_PHOTOS = 10;
const MAX_DATA_URL_CHARS = 11_500_000;
const IMAGE_RE = /^data:image\/(jpeg|png|webp|heic|heif);base64,[a-z0-9+/=\r\n]+$/i;

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const toCents = (value) => Math.round(Math.max(0, Number(value || 0)) * 100);
const readCents = (line = {}, keys = []) => {
  for (const key of keys) if (line[key] !== undefined && line[key] !== null && line[key] !== '') return Math.round(Number(line[key]));
  return null;
};
const cleanArray = (items, limit = 80) => asArray(items).map((item) => typeof item === 'string' ? clean(item, 1000) : item).filter(Boolean).slice(0, limit);
const normalizePhotos = (photos = []) => asArray(photos).slice(0, MAX_PHOTOS).map((photo) => ({ id: clean(photo.id, 80) || crypto.randomUUID(), name: clean(photo.name, 180), type: clean(photo.type, 80), size: Math.max(0, Number(photo.size || 0)), dataUrl: clean(photo.dataUrl || photo.url, MAX_DATA_URL_CHARS) })).filter((photo) => IMAGE_RE.test(photo.dataUrl) && photo.size <= 8 * 1024 * 1024);
const normalizeLine = (line = {}, type = 'labor') => {
  const quantity = Number(line.quantity ?? line.hours ?? 1) || 1;
  const unitCostCents = readCents(line, ['unitCostCents','unit_cost_cents','rateCents','rate_cents']) ?? toCents(line.unitCost ?? line.unit_cost ?? line.rate ?? 0);
  const markupPct = Number(line.markupPct ?? line.markup_percent ?? 0) || 0;
  const totalCents = Math.round(quantity * unitCostCents * (1 + markupPct / 100));
  return { type, name: clean(line.name || line.material || line.description, 180) || `${type === 'labor' ? 'Labor' : 'Material'} allowance`, description: clean(line.description || line.name, 800), quantity, unit: clean(line.unit || (type === 'labor' ? 'hours' : 'each'), 40), unitCostCents, unit_cost_cents: unitCostCents, markupPct, markup_percent: markupPct, totalCents, total_cents: totalCents, confidence: clean(line.confidence || 'medium', 40), source: clean(line.source || line.pricing_source, 240), optional: Boolean(line.optional) };
};
const pricing = (labor = [], materials = [], other = {}) => {
  const laborLines = asArray(labor).map((line) => normalizeLine(line, 'labor'));
  const materialLines = asArray(materials).map((line) => normalizeLine(line, 'material'));
  const laborTotal = laborLines.reduce((sum, line) => sum + line.totalCents, 0);
  const materialTotal = materialLines.reduce((sum, line) => sum + line.totalCents, 0);
  const otherTotal = ['tripChargeCents','trip_charge_cents','permitCents','permit_cents','disposalCents','disposal_cents','rentalCents','rental_cents','markupCents','markup_cents'].reduce((sum, key) => sum + (Number(other[key] || 0) || 0), 0);
  const taxCents = Number(other.taxCents ?? other.tax_cents ?? 0) || 0;
  const discountCents = Number(other.discountCents ?? other.discount_cents ?? 0) || 0;
  const subtotal = laborTotal + materialTotal + otherTotal;
  return { laborLines, materialLines, summary: { labor_total_cents: laborTotal, material_total_cents: materialTotal, other_total_cents: otherTotal, subtotal_cents: subtotal, tax_cents: taxCents, discount_cents: discountCents, grand_total_cents: Math.max(0, subtotal + taxCents - discountCents), pricing_note: 'Estimated — verification recommended.' } };
};
const normalizePayload = (body = {}) => {
  const p = pricing(body.laborLineItems || body.labor_line_items, body.materialLineItems || body.material_line_items, body.otherPricing || body.other_pricing || {});
  return { id: clean(body.id, 80), status: STATUSES.has(clean(body.status, 40)) ? clean(body.status, 40) : 'draft', customerId: clean(body.customerId || body.customer_id, 80), requestId: clean(body.requestId || body.request_id, 80), quoteId: clean(body.quoteId || body.quote_id, 80), workOrderId: clean(body.workOrderId || body.work_order_id, 80), serviceCategory: clean(body.serviceCategory || body.service_category, 180), description: clean(body.description, 8000), propertyAddress: clean(body.propertyAddress || body.property_address, 1000), measurements: clean(body.measurements, 1000), preferredMaterial: clean(body.preferredMaterial || body.preferred_material, 1000), preferredTimeframe: clean(body.preferredTimeframe || body.preferred_timeframe, 500), budget: clean(body.budget, 120), notes: clean(body.notes, 4000), photoUrls: normalizePhotos(body.photoUrls || body.photo_urls), aiAnalysis: body.aiAnalysis || body.ai_analysis || {}, laborLineItems: p.laborLines, materialLineItems: p.materialLines, pricingSummary: p.summary, confidence: body.confidence || body.aiAnalysis?.confidence || body.ai_analysis?.confidence || {}, adminNotes: clean(body.adminNotes || body.admin_notes || body.aiAnalysis?.admin_notes || '', 5000), customerSummary: clean(body.customerSummary || body.customer_summary || body.aiAnalysis?.customer_summary || 'Request received. Your estimate is being reviewed.', 3000) };
};

const loadSessionContext = async (db, request) => {
  const token = getSessionToken(request);
  if (!token) return null;
  const [session] = await db.sql`select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name from auth_sessions join app_users on app_users.id = auth_sessions.user_id where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true limit 1`;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  const roles = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id} order by roles.key`;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load photo estimate permissions; using role defaults' });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
  return { session, roleKeys, permissionKeys, isStaff: roleKeys.some((role) => STAFF_ROLES.has(role)) };
};
const canAccess = (context, row) => context.isStaff || row.customer_id === context.session.user_id || row.created_by === context.session.user_id;
const mapRow = (row, context) => {
  const staff = context?.isStaff;
  return { id: row.id, customerId: row.customer_id, requestId: row.request_id, quoteId: row.quote_id, workOrderId: row.work_order_id, createdBy: row.created_by, status: row.status, serviceCategory: row.service_category, description: row.description, propertyAddress: row.property_address, photoUrls: row.photo_urls || [], aiAnalysis: staff ? row.ai_analysis || {} : undefined, laborLineItems: staff ? row.labor_line_items || [] : undefined, materialLineItems: staff ? row.material_line_items || [] : undefined, pricingSummary: row.pricing_summary || {}, confidence: staff ? row.confidence || {} : undefined, adminNotes: staff ? row.admin_notes : undefined, customerSummary: row.customer_summary, createdAt: row.created_at, updatedAt: row.updated_at };
};

const getPhotoEstimates = async (db, context, request) => {
  const url = new URL(request.url); const id = clean(url.searchParams.get('id'), 80);
  const rows = context.isStaff ? await db.sql`select * from photo_estimates ${id ? db.sql`where id = ${id}` : db.sql``} order by updated_at desc limit 100` : await db.sql`select * from photo_estimates where (customer_id = ${context.session.user_id} or created_by = ${context.session.user_id}) ${id ? db.sql`and id = ${id}` : db.sql``} order by updated_at desc limit 100`;
  return json(200, { ok: true, photoEstimates: rows.filter((row) => canAccess(context, row)).map((row) => mapRow(row, context)) });
};
const upsertPhotoEstimate = async (db, context, payload) => {
  const customerId = payload.customerId || (!context.isStaff ? context.session.user_id : null);
  const [row] = payload.id ? await db.sql`update photo_estimates set customer_id = coalesce(${customerId}, customer_id), request_id = nullif(${payload.requestId}, '')::uuid, quote_id = nullif(${payload.quoteId}, '')::uuid, work_order_id = nullif(${payload.workOrderId}, '')::uuid, status = ${payload.status}, service_category = ${payload.serviceCategory}, description = ${payload.description}, property_address = ${payload.propertyAddress}, photo_urls = ${JSON.stringify(payload.photoUrls)}::jsonb, ai_analysis = ${JSON.stringify(payload.aiAnalysis)}::jsonb, labor_line_items = ${JSON.stringify(payload.laborLineItems)}::jsonb, material_line_items = ${JSON.stringify(payload.materialLineItems)}::jsonb, pricing_summary = ${JSON.stringify(payload.pricingSummary)}::jsonb, confidence = ${JSON.stringify(payload.confidence)}::jsonb, admin_notes = ${context.isStaff ? payload.adminNotes : ''}, customer_summary = ${payload.customerSummary}, updated_at = now() where id = ${payload.id} and (${context.isStaff} or customer_id = ${context.session.user_id} or created_by = ${context.session.user_id}) returning *` : await db.sql`insert into photo_estimates (customer_id, request_id, quote_id, work_order_id, created_by, status, service_category, description, property_address, photo_urls, ai_analysis, labor_line_items, material_line_items, pricing_summary, confidence, admin_notes, customer_summary) values (${customerId}, nullif(${payload.requestId}, '')::uuid, nullif(${payload.quoteId}, '')::uuid, nullif(${payload.workOrderId}, '')::uuid, ${context.session.user_id}, ${payload.status}, ${payload.serviceCategory}, ${payload.description}, ${payload.propertyAddress}, ${JSON.stringify(payload.photoUrls)}::jsonb, ${JSON.stringify(payload.aiAnalysis)}::jsonb, ${JSON.stringify(payload.laborLineItems)}::jsonb, ${JSON.stringify(payload.materialLineItems)}::jsonb, ${JSON.stringify(payload.pricingSummary)}::jsonb, ${JSON.stringify(payload.confidence)}::jsonb, ${context.isStaff ? payload.adminNotes : ''}, ${payload.customerSummary}) returning *`;
  if (!row) return null;
  return row;
};
const createQuoteFromPhotoEstimate = async (db, context, payload, row) => {
  if (!context.isStaff) throw new Error('Only staff can convert photo estimates to quotes.');
  const title = `${payload.serviceCategory || row.service_category || 'Photo estimate'} quote`;
  const summary = [payload.customerSummary, payload.description, `Photo estimate ${row.id}`].filter(Boolean).join('\n\n');
  const amountCents = Number(payload.pricingSummary?.grand_total_cents || row.pricing_summary?.grand_total_cents || 0);
  const [quote] = await db.sql`insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, created_by, ai_enhanced, ai_metadata, sourcing_notes) values (nullif(${payload.requestId || row.request_id || ''}, '')::uuid, ${row.customer_id || null}, 'draft', ${title}, ${summary}, ${amountCents}, ${context.session.user_id}, true, ${JSON.stringify({ source: 'ai_photo_estimate', photoEstimateId: row.id, aiAnalysis: payload.aiAnalysis || row.ai_analysis || {}, pricingSummary: payload.pricingSummary || row.pricing_summary || {} })}::jsonb, ${'AI Photo Estimate converted draft. Estimated — verification recommended.'}) returning *`;
  await db.sql`update photo_estimates set quote_id = ${quote.id}, status = 'quote_created', updated_at = now() where id = ${row.id}`;
  return quote;
};

export default async (request) => {
  if (!['GET','POST','PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const context = await loadSessionContext(db, request);
    if (!context) return json(401, { ok: false, authenticated: false, message: 'Sign in required.' });
    if (request.method === 'GET') return getPhotoEstimates(db, context, request);
    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const payload = normalizePayload(body);
    let row = await upsertPhotoEstimate(db, context, payload);
    if (!row) return json(404, { ok: false, message: 'Photo estimate not found.' });
    let quote = null;
    const action = clean(body.action, 80);
    if (request.method === 'PATCH' && action === 'request_more_info') [row] = await db.sql`update photo_estimates set status = 'needs_more_info', updated_at = now() where id = ${row.id} returning *`;
    if (request.method === 'PATCH' && action === 'convert_to_quote') { quote = await createQuoteFromPhotoEstimate(db, context, payload, row); [row] = await db.sql`select * from photo_estimates where id = ${row.id}`; }
    if (request.method === 'PATCH' && action === 'send_quote') {
      const quoteId = clean(body.quoteId || row.quote_id, 80);
      if (quoteId && context.isStaff) await db.sql`update quotes set status = 'sent', sent_at = coalesce(sent_at, now()), updated_at = now() where id = ${quoteId}`;
      [row] = await db.sql`update photo_estimates set status = 'sent_to_client', updated_at = now() where id = ${row.id} returning *`;
    }
    return json(request.method === 'POST' ? 201 : 200, { ok: true, photoEstimate: mapRow(row, context), quote });
  } catch (error) {
    console.error('Photo estimates endpoint failed', error);
    return json(500, { ok: false, message: error.message || 'Could not manage photo estimates.' });
  }
};
export const config = { path: '/api/photo-estimates' };
