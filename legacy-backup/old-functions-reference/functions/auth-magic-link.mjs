// netlify/functions/auth-magic-link.mjs
// Handles POST /api/auth/magic-link through netlify.toml redirect.
// Real production magic-link sender. No dev login link.

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const makeToken = () => `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;

async function getStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('magic-link-tokens');
  } catch {}
  return null;
}

function originFromEvent(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL || 'localhost:8888';
  return String(host).startsWith('http') ? host : `${proto}://${host}`;
}

async function sendResendEmail({ to, link }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAGIC_LINK_FROM;

  if (!apiKey || !from) {
    return {
      ok: false,
      status: 503,
      message: 'Magic-link email is not configured. Set RESEND_API_KEY and MAGIC_LINK_FROM in Netlify.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your secure T&A Contracting portal link',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Sign in to T&A Contracting</h2>
          <p>Use this secure one-time link to access your portal:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#f97316;color:#fff;text-decoration:none;font-weight:700">Open Client Portal</a></p>
          <p>This link expires in 20 minutes. If you did not request it, ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    return {
      ok: false,
      status: 502,
      message: `Email provider failed to send the magic link. ${details}`.slice(0, 500),
    };
  }

  return { ok: true };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: 'Invalid request body.' });
  }

  if (clean(body.botField || body['bot-field'], 200)) {
    return json(200, { ok: true, message: 'Request accepted.' });
  }

  const email = clean(body.email, 180).toLowerCase();
  const next = clean(body.next || '/dashboard/', 300);
  const safeNext = next.startsWith('/') ? next : '/dashboard/';

  if (!emailOk(email)) {
    return json(400, { ok: false, message: 'Enter a valid email address.' });
  }

  const store = await getStore();
  if (!store) {
    return json(500, {
      ok: false,
      message: 'Magic-link token storage is not configured. Install @netlify/blobs and redeploy.',
    });
  }

  const token = makeToken();
  const createdAt = Date.now();
  const expiresAt = createdAt + 1000 * 60 * 20;
  const origin = originFromEvent(event);
  const link = `${origin}/.netlify/functions/verify-magic-link?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeNext)}`;

  await store.setJSON(token, {
    email,
    createdAt,
    expiresAt,
    used: false,
    next: safeNext,
  });

  const sent = await sendResendEmail({ to: email, link });

  if (!sent.ok) {
    return json(sent.status || 500, { ok: false, message: sent.message });
  }

  return json(200, {
    ok: true,
    message: 'Secure link sent. Check your email.',
  });
};

export default handler;
