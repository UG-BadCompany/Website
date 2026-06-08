export function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) };
}
export function ok(body) { return json(200, { ok: true, ...body }); }
export function fail(statusCode, code, message, extra = {}) { return json(statusCode, { ok: false, error: { code, message }, ...extra }); }
export async function safe(handler) {
  try { return await handler(); }
  catch (error) { return fail(200, 'UNEXPECTED_ERROR', error?.message || 'Unexpected server error. Retry or open recovery mode.'); }
}
export function parseBody(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body); }
  catch { return {}; }
}
