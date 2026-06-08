export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function parseJson(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

export function apiPath(event) {
  const raw = String(event.path || '/');
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
    .replace(/\/+/g, '/') || '/';
}

export function notFound(path) {
  return json(404, { ok: false, error: 'API route not found.', path });
}

export function errorResponse(error) {
  return json(error.statusCode || 500, {
    ok: false,
    error: error.message || 'Unexpected server error.',
    code: error.code || 'SERVER_ERROR',
  });
}
