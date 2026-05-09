import {
  createOrUpdateMagicLinkUser,
  createSessionCookie,
  createToken,
  getSiteUrl,
  hashToken,
  json,
  loadDatabase,
  getSessionTtlMinutesForRoles,
  minutesFromNow,
} from './auth-utils.mjs';

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

    const roles = await db.sql`
      select roles.key
      from user_roles
      join roles on roles.id = user_roles.role_id
      where user_roles.user_id = ${user.id}
      order by roles.key
    `;
    const roleKeys = roles.map((role) => role.key);
    const sessionTtlMinutes = getSessionTtlMinutesForRoles(roleKeys);

    await db.sql`
      insert into auth_sessions (user_id, session_hash, expires_at)
      values (${user.id}, ${hashToken(sessionToken)}, ${minutesFromNow(sessionTtlMinutes)}::timestamptz)
    `;

    return new Response(null, {
      status: 302,
      headers: {
        location: `${getSiteUrl(request)}/dashboard/`,
        'set-cookie': createSessionCookie(sessionToken, request, sessionTtlMinutes),
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
