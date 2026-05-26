// netlify/functions/verify-magic-link.mjs
// Supports both GET link clicks and POST verification.
// On success, sets an HttpOnly session cookie and redirects to next.

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    ...headers,
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const makeSession = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

async function getTokenStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('magic-link-tokens');
  } catch {}
  return null;
}

async function getSessionStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('auth-sessions');
  } catch {}
  return null;
}

function cookie(sessionId) {
  const secure = process.env.CONTEXT === 'dev' ? '' : '; Secure';
  return `ta_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure}`;
}

async function verifyToken(token) {
  const tokenStore = await getTokenStore();
  const sessionStore = await getSessionStore();

  if (!tokenStore || !sessionStore) {
    return { ok: false, status: 500, message: '@netlify/blobs is required for magic-link login.' };
  }

  const record = await tokenStore.get(token, { type: 'json' }).catch(() => null);
  if (!record) return { ok: false, status: 400, message: 'Magic link is invalid or expired.' };
  if (record.used) return { ok: false, status: 400, message: 'Magic link was already used.' };
  if (Date.now() > Number(record.expiresAt || 0)) return { ok: false, status: 400, message: 'Magic link expired.' };

  record.used = true;
  record.usedAt = Date.now();
  await tokenStore.setJSON(token, record);

  const sessionId = makeSession();
  const user = { email: record.email };
  await sessionStore.setJSON(sessionId, {
    sessionId,
    user,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
  });

  return { ok: true, sessionId, user };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  if (event.httpMethod === 'GET') {
    const params = new URLSearchParams(event.rawQuery || '');
    const token = clean(params.get('token'), 300);
    const next = clean(params.get('next') || '/dashboard/', 300);
    const safeNext = next.startsWith('/') ? next : '/dashboard/';
    const result = await verifyToken(token);

    if (!result.ok) {
      return {
        statusCode: result.status || 400,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: `<h1>Magic link failed</h1><p>${result.message}</p><p><a href="/login/?next=dashboard">Request a new link</a></p>`,
      };
    }

    return {
      statusCode: 302,
      headers: {
        'set-cookie': cookie(result.sessionId),
        location: safeNext,
        'cache-control': 'no-store',
      },
      body: '',
    };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }

    const result = await verifyToken(clean(body.token, 300));
    if (!result.ok) return json(result.status || 400, { ok: false, message: result.message });

    return json(200, { ok: true, user: result.user }, { 'set-cookie': cookie(result.sessionId) });
  }

  return json(405, { ok: false, message: 'Method not allowed' });
};

export default handler;
