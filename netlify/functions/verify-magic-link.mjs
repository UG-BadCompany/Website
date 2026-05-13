import {
  createOrUpdateMagicLinkUser,
  createSessionCookie,
  createToken,
  getSiteUrl,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 14);

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();


const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const createContinueResponse = (request, token) => new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Signing in to T&A Contracting</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff7ec; color: #1e1915; }
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { max-width: 520px; padding: 32px; border: 1px solid rgba(17, 17, 17, .1); border-radius: 28px; background: #fff; box-shadow: 0 24px 80px rgba(45, 27, 13, .12); }
    h1 { margin: 0 0 12px; font-size: clamp(2rem, 5vw, 3rem); line-height: 1; }
    p { color: #67594d; line-height: 1.6; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; margin-top: 14px; padding: 0 20px; border: 0; border-radius: 999px; background: #ad3f18; color: #fff; font-weight: 900; font: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>Signing you in…</h1>
      <p>We are opening your secure portal. If you are not redirected automatically, use the button below.</p>
      <form method="POST" action="${escapeHtml(new URL(request.url).pathname)}" data-continue-form>
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <button class="btn" type="submit">Continue to dashboard</button>
      </form>
      <script>document.querySelector('[data-continue-form]').requestSubmit();</script>
    </section>
  </main>
</body>
</html>`, {
  status: 200,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const getTokenFromRequest = async (request) => {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    return url.searchParams.get('token') || '';
  }

  if (request.method === 'POST') {
    const formData = await request.formData();
    return String(formData.get('token') || '');
  }

  return '';
};

export const createVerifyMagicLinkHandler = ({
  getDatabase = loadDatabase,
  makeSessionToken = createToken,
} = {}) => async (request) => {
  if (!['GET', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const token = await getTokenFromRequest(request);

  if (!token) {
    return Response.redirect(`${getSiteUrl(request)}/login/?auth=missing-token`, 302);
  }

  if (request.method === 'GET') {
    return createContinueResponse(request, token);
  }

  try {
    const db = await getDatabase();
    const [magicLink] = await db.sql`
      select id, email
      from auth_magic_links
      where token_hash = ${hashToken(token)}
        and consumed_at is null
        and expires_at > now()
      limit 1
    `;

    if (!magicLink) {
      return Response.redirect(`${getSiteUrl(request)}/login/?auth=expired`, 302);
    }

    const user = await createOrUpdateMagicLinkUser(db, {
      email: magicLink.email,
    });

    await db.sql`
      update auth_magic_links
      set consumed_at = now()
      where id = ${magicLink.id}
    `;

    const sessionToken = makeSessionToken();

    await db.sql`
      insert into auth_sessions (user_id, session_hash, expires_at)
      values (${user.id}, ${hashToken(sessionToken)}, ${daysFromNow(SESSION_TTL_DAYS)}::timestamptz)
    `;

    return new Response(null, {
      status: 302,
      headers: {
        location: `${getSiteUrl(request)}/dashboard/`,
        'set-cookie': createSessionCookie(sessionToken, request),
      },
    });
  } catch (error) {
    console.error('Failed to verify magic link', error);

    return Response.redirect(`${getSiteUrl(request)}/login/?auth=error`, 302);
  }
};

export default createVerifyMagicLinkHandler();

export const config = {
  path: '/api/auth/verify',
};
