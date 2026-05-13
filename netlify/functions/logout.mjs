import {
  createExpiredSessionCookie,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const getLogoutRedirect = (request) => {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/login/?signed-out=1';

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/login/?signed-out=1';
  }

  return redirect;
};

export const createLogoutHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (sessionToken) {
    try {
      const db = await getDatabase();

      await db.sql`
        update auth_sessions
        set revoked_at = now()
        where session_hash = ${hashToken(sessionToken)}
          and revoked_at is null
      `;
    } catch (error) {
      console.error('Failed to revoke session', error);
      // Still clear the browser cookie below so users can leave a stale session immediately.
    }
  }

  if (request.method === 'GET') {
    return new Response(null, {
      status: 302,
      headers: {
        location: getLogoutRedirect(request),
        'set-cookie': createExpiredSessionCookie(request),
        'cache-control': 'no-store',
      },
    });
  }

  return json(200, { ok: true, message: 'Signed out.' }, {
    'set-cookie': createExpiredSessionCookie(request),
  });
};

export default createLogoutHandler();

export const config = {
  path: '/api/auth/logout',
};
