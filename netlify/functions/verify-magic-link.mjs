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

export const getTokenFromRequest = (request) => {
  const url = new URL(request.url);

  return url.searchParams.get('token') || '';
};

export const createVerifyMagicLinkHandler = ({
  getDatabase = loadDatabase,
  makeSessionToken = createToken,
} = {}) => async (request) => {
  if (!['GET', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    return new Response(null, { status: 302, headers: { location: '/login/?auth=missing-token' } });
  }

  try {
    const db = await getDatabase();
    const tokenHash = hashToken(token);
    const [magicLink] = await db.sql`
      select id, email, expires_at, consumed_at,
        case when token_hash = ${tokenHash} then 'token' else 'id' end as matched_by
      from auth_magic_links
      where token_hash = ${tokenHash}
        or id::text = ${token}
      order by created_at desc
      limit 1
    `;
    const magicLinkStatus = getMagicLinkStatus(magicLink);

    if (magicLinkStatus !== 'active') {
      console.error('Magic link verification did not find an active link', {
        status: magicLinkStatus,
        matchedBy: magicLink?.matched_by || null,
        magicLinkId: magicLink?.id || null,
        hasConsumedAt: Boolean(magicLink?.consumed_at),
        expiresAt: magicLink?.expires_at || null,
      });

      return getInactiveRedirect(magicLinkStatus);
    }

    const user = await createOrUpdateMagicLinkUser(db, {
      email: magicLink.email,
    });

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

    try {
      await db.sql`
        update auth_magic_links
        set consumed_at = now()
        where id = ${magicLink.id}
      `;
    } catch (consumeError) {
      console.error('Failed to mark magic link consumed after session creation', consumeError);
    }

    return new Response(null, {
      status: request.method === 'POST' ? 303 : 302,
      headers: {
        location: `${getSiteUrl(request)}/dashboard/`,
        'set-cookie': createSessionCookie(sessionToken, request, verifySessionTtlMinutes),
      },
    });
  } catch (error) {
    console.error('Failed to verify magic link', error);

    return new Response(null, { status: 302, headers: { location: '/login/?auth=error' } });
  }
};

export default createVerifyMagicLinkHandler();

export const config = {
  path: '/api/auth/verify',
};
