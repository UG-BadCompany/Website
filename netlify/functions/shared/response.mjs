export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function ok(data = {}, message = 'OK') {
  return json(200, { ok: true, data, message });
}

export function fail(statusCode, code, message, extra = {}) {
  return json(statusCode, { ok: false, code, message, ...extra });
}

export async function parseJson(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return null; }
}
