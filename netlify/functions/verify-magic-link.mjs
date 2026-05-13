import {
  createOrUpdateMagicLinkUser,
  createSessionCookie,
  createToken,
  getSessionTtlMinutesForRoles,
  getSiteUrl,
  hashToken,
  json,
  loadDatabase,
  minutesFromNow,
} from './auth-utils.mjs';


const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

const signedInResponse = (request, sessionToken, ttlMinutes) => {
  const dashboardUrl = `${getSiteUrl(request)}/dashboard/`;

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(dashboardUrl)}">
  <title>Opening dashboard | T&amp;A Contracting</title>
</head>
<body>
  <p>Signing you in&hellip; <a href="${escapeHtml(dashboardUrl)}">Continue to your dashboard</a>.</p>
  <script>window.location.replace(${JSON.stringify(dashboardUrl)});</script>
</body>
</html>`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': createSessionCookie(sessionToken, request, ttlMinutes),
    },
  });
};

export const createVerifyMagicLinkHandler = ({
  getDatabase = loadDatabase,
  makeSessionToken = createToken,
} = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!token) {
    return Response.redirect(`${getSiteUrl(request)}/login/?auth=missing-token`, 302);
  }

  try {
    const db = await getDatabase();
    const [magicLink] = await db.sql`
      select id, email, purpose, client_name, client_phone
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
      name: magicLink.client_name,
      phone: magicLink.client_phone,
    });

    await db.sql`
      update auth_magic_links
      set consumed_at = now()
      where id = ${magicLink.id}
    `;

    const sessionToken = makeSessionToken();
    const sessionRoleRows = await db.sql`
      select roles.key
      from user_roles
      join roles on roles.id = user_roles.role_id
      where user_roles.user_id = ${user.id}
      order by roles.key
    `;
    const verifySessionTtlMinutes = getSessionTtlMinutesForRoles(sessionRoleRows.map((role) => role.key));

    await db.sql`
      insert into auth_sessions (user_id, session_hash, expires_at)
      values (${user.id}, ${hashToken(sessionToken)}, ${minutesFromNow(verifySessionTtlMinutes)}::timestamptz)
    `;

    return signedInResponse(request, sessionToken, verifySessionTtlMinutes);
  } catch (error) {
    console.error('Failed to verify magic link', error);

    return Response.redirect(`${getSiteUrl(request)}/login/?auth=error`, 302);
  }
};

export default createVerifyMagicLinkHandler();

export const config = {
  path: '/api/auth/verify',
};
