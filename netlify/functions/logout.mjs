import {
  createExpiredSessionCookie,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

export const createLogoutHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'POST') {
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

      return json(500, { ok: false, message: 'We could not sign you out right now.' });
    }
  }

  return json(200, { ok: true, message: 'Signed out.' }, {
    'set-cookie': createExpiredSessionCookie(request),
  });
};

export default createLogoutHandler();

export const config = {
  path: '/api/auth/logout',
};
