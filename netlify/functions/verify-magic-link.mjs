// netlify/functions/verify-magic-link.mjs
// Verifies real magic-link tokens and sets HttpOnly session cookie.

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const makeSession = () => `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;

async function getStore(name) {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore(name);
  } catch {}
  return null;
}

function sessionCookie(sessionId) {
  const secure = process.env.CONTEXT === 'dev' ? '' : '; Secure';
  return `ta_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}${secure}`;
}

function htmlPage(title, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui;padding:32px;line-height:1.6"><h1>${title}</h1><p>${message}</p><p><a href="/login/?next=dashboard">Request a new link</a></p></body></html>`;
}

async function verify(token) {
  const tokenStore = await getStore('magic-link-tokens');
  const sessionStore = await getStore('auth-sessions');

  if (!tokenStore || !sessionStore) {
    return { ok: false, status: 500, message: 'Auth storage is not configured.' };
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

  return { ok: true, sessionId, user, next: record.next || '/dashboard/' };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed' });
  }

  let token = '';

  if (event.httpMethod === 'GET') {
    const params = new URLSearchParams(event.rawQuery || '');
    token = clean(params.get('token'), 300);
  } else {
    try {
      const body = JSON.parse(event.body || '{}');
      token = clean(body.token, 300);
    } catch {
      return json(400, { ok: false, message: 'Invalid request body.' });
    }
  }

  if (!token) {
    return event.httpMethod === 'GET'
      ? { statusCode: 400, headers: { 'content-type': 'text/html; charset=utf-8' }, body: htmlPage('Magic link failed', 'Missing token.') }
      : json(400, { ok: false, message: 'Missing token.' });
  }

  const result = await verify(token);

  if (!result.ok) {
    return event.httpMethod === 'GET'
      ? { statusCode: result.status || 400, headers: { 'content-type': 'text/html; charset=utf-8' }, body: htmlPage('Magic link failed', result.message) }
      : json(result.status || 400, { ok: false, message: result.message });
  }

  if (event.httpMethod === 'GET') {
    const safeNext = String(result.next || '/dashboard/').startsWith('/') ? result.next : '/dashboard/';
    return {
      statusCode: 302,
      headers: {
        'set-cookie': sessionCookie(result.sessionId),
        location: safeNext,
        'cache-control': 'no-store',
      },
      body: '',
    };
  }

  return json(200, { ok: true, user: result.user }, { 'set-cookie': sessionCookie(result.sessionId) });
};

export default handler;
