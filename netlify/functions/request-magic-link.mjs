// netlify/functions/request-magic-link.mjs
// Magic-link login request.
// If RESEND_API_KEY and MAGIC_LINK_FROM are set, sends email through Resend.
// If not set, returns devMagicLink so you can test.

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
const token = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

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
  if (String(host).startsWith('http')) return host;
  return `${proto}://${host}`;
}

async function sendResendEmail({ to, link }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAGIC_LINK_FROM;
  if (!apiKey || !from) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Your T&A Contracting login link',
      html: `<p>Click the secure link below to sign in:</p><p><a href="${link}">${link}</a></p><p>This link expires soon. If you did not request it, ignore this email.</p>`,
    }),
  });

  return response.ok;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }

  const email = clean(body.email, 180).toLowerCase();
  const next = clean(body.next || '/dashboard/', 300);
  if (!emailOk(email)) return json(400, { ok: false, message: 'Enter a valid email address.' });

  const store = await getStore();
  const magicToken = token();
  const createdAt = Date.now();
  const expiresAt = createdAt + 1000 * 60 * 20;
  const safeNext = next.startsWith('/') ? next : '/dashboard/';
  const origin = originFromEvent(event);
  const link = `${origin}/.netlify/functions/verify-magic-link?token=${encodeURIComponent(magicToken)}&next=${encodeURIComponent(safeNext)}`;

  if (store) {
    await store.setJSON(magicToken, { email, createdAt, expiresAt, used: false });
  }

  const sent = await sendResendEmail({ to: email, link }).catch(() => false);

  return json(200, {
    ok: true,
    sent,
    message: sent ? 'Magic link sent.' : 'Magic link created in dev mode. Configure RESEND_API_KEY and MAGIC_LINK_FROM to send email.',
    devMagicLink: sent ? undefined : link,
  });
};

export default handler;
