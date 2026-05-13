import {
  createOrUpdateMagicLinkUser,
  createSessionCookie,
  createToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 14);

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();


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
    return new Response(null, { status: 302, headers: { location: '/login/?auth=missing-token' } });
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
      return new Response(null, { status: 302, headers: { location: '/login/?auth=expired' } });
    }

    const user = await createOrUpdateMagicLinkUser(db, {
      email: magicLink.email,
    });

    const sessionToken = makeSessionToken();

    await db.sql`
      insert into auth_sessions (user_id, session_hash, expires_at)
      values (${user.id}, ${hashToken(sessionToken)}, ${daysFromNow(SESSION_TTL_DAYS)}::timestamptz)
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
        location: '/dashboard/',
        'set-cookie': createSessionCookie(sessionToken, request),
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
