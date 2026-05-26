// netlify/functions/me.mjs
const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

function parseCookies(header = '') {
  return Object.fromEntries(
    String(header).split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('=') || '')];
    }).filter(([key]) => key)
  );
}

async function getSessionStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('auth-sessions');
  } catch {}
  return null;
}

export const handler = async (event) => {
  const cookies = parseCookies(event.headers.cookie || '');
  const sessionId = cookies.ta_session;
  if (!sessionId) return json(200, { ok: true, authenticated: false });

  const store = await getSessionStore();
  if (!store) return json(200, { ok: true, authenticated: false });

  const session = await store.get(sessionId, { type: 'json' }).catch(() => null);
  if (!session || Date.now() > Number(session.expiresAt || 0)) {
    return json(200, { ok: true, authenticated: false });
  }

  return json(200, { ok: true, authenticated: true, user: session.user });
};

export default handler;
