export function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) };
}
export function ok(data = {}, message) { return json(200, { ok: true, data, ...(message ? { message } : {}) }); }
export function error(statusCode, code, message, extra = {}) { return json(statusCode, { ok: false, code, message, ...extra }); }
export function method(event, allowed) { return allowed.includes(event.httpMethod) ? null : error(405, 'METHOD_NOT_ALLOWED', `Use ${allowed.join(', ')}`); }
