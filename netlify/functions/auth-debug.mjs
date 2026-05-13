import {
  SESSION_COOKIE_NAME,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const maskEmail = (email = '') => {
  const [name = '', domain = ''] = String(email).split('@');
  if (!name || !domain) return '';

  return `${name.slice(0, 2)}***@${domain}`;
};

const getCookieNames = (request) => (request.headers.get('cookie') || '')
  .split(';')
  .map((cookie) => cookie.trim().split('=')[0])
  .filter(Boolean);

const mapSessionDebug = (session) => {
  if (!session) return null;

  const expiresAt = session.expires_at ? new Date(session.expires_at).toISOString() : null;
  const expired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : null;

  return {
    id: session.id,
    userId: session.user_id,
    email: maskEmail(session.email),
    fullName: session.full_name || '',
    userIsActive: session.is_active ?? null,
    revoked: Boolean(session.revoked_at),
    expired,
    expiresAt,
    createdAt: session.created_at || null,
    lastSeenAt: session.last_seen_at || null,
  };
};

export const createAuthDebugHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const url = new URL(request.url);
  const sessionToken = getSessionToken(request);
  const cookieNames = getCookieNames(request);
  const debug = {
    ok: true,
    request: {
      host: url.host,
      protocol: url.protocol,
      path: url.pathname,
      forwardedProto: request.headers.get('x-forwarded-proto') || '',
    },
    cookies: {
      expectedSessionCookieName: SESSION_COOKIE_NAME,
      cookieNames,
      hasSessionCookie: Boolean(sessionToken),
      sessionCookieLength: sessionToken.length,
    },
    database: {
      checked: false,
      available: null,
      error: null,
    },
    session: null,
    roles: [],
    canUseSession: false,
  };

  if (!sessionToken) {
    return json(200, debug);
  }

  try {
    const db = await getDatabase();
    debug.database.checked = true;
    debug.database.available = true;

    const [session] = await db.sql`
      select auth_sessions.id, auth_sessions.user_id, auth_sessions.expires_at,
        auth_sessions.revoked_at, auth_sessions.created_at, auth_sessions.last_seen_at,
        app_users.email, app_users.full_name, app_users.is_active
      from auth_sessions
      left join app_users on app_users.id = auth_sessions.user_id
      where auth_sessions.session_hash = ${hashToken(sessionToken)}
      order by auth_sessions.created_at desc
      limit 1
    `;

    debug.session = mapSessionDebug(session);

    if (session) {
      debug.canUseSession = Boolean(session.is_active && !session.revoked_at && debug.session && !debug.session.expired);
    }

    if (session?.user_id) {
      const roles = await db.sql`
        select roles.key
        from user_roles
        join roles on roles.id = user_roles.role_id
        where user_roles.user_id = ${session.user_id}
        order by roles.key
      `;
      debug.roles = roles.map((role) => role.key);
    }
  } catch (error) {
    debug.database.checked = true;
    debug.database.available = false;
    debug.database.error = error?.message || 'Unknown database error';
  }

  return json(200, debug);
};

export default createAuthDebugHandler();

export const config = {
  path: '/api/auth/debug',
};
