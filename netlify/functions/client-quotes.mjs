import {
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const WAITING_QUOTE_STATUSES = new Set(['sent', 'viewed']);

const mapQuote = (quote) => ({
  id: quote.id,
  status: quote.status,
  title: quote.title,
  summary: quote.summary,
  amountCents: quote.amount_cents,
  sentAt: quote.sent_at,
  viewedAt: quote.viewed_at,
  acceptedAt: quote.accepted_at,
  declinedAt: quote.declined_at,
  createdAt: quote.created_at,
  jobRequest: quote.job_request_id ? {
    id: quote.job_request_id,
    status: quote.job_request_status,
    serviceType: quote.job_request_service_type,
    description: quote.job_request_description,
  } : null,
  property: quote.property_id ? {
    id: quote.property_id,
    label: quote.property_label,
    street: quote.property_street,
    city: quote.property_city,
    state: quote.property_state,
  } : null,
});

const loadSession = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;

  if (!session) {
    return null;
  }

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  return session;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  return roles.map((role) => role.key);
};

export const createClientQuotesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to view your quotes.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const roleKeys = await loadRoleKeys(db, session.user_id);

    if (!roleKeys.includes('client') && !roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client role required to view quotes.' });
    }

    const quotes = await db.sql`
      select
        quotes.id,
        quotes.status,
        quotes.title,
        quotes.summary,
        quotes.amount_cents,
        quotes.sent_at,
        quotes.viewed_at,
        quotes.accepted_at,
        quotes.declined_at,
        quotes.created_at,
        job_requests.id as job_request_id,
        job_requests.status as job_request_status,
        job_requests.service_type as job_request_service_type,
        job_requests.description as job_request_description,
        properties.id as property_id,
        properties.label as property_label,
        properties.street as property_street,
        properties.city as property_city,
        properties.state as property_state
      from quotes
      left join job_requests on job_requests.id = quotes.job_request_id
        and job_requests.client_id = ${session.user_id}
      left join properties on properties.id = job_requests.property_id
        and properties.client_id = ${session.user_id}
      where quotes.client_id = ${session.user_id}
        and quotes.status <> 'draft'
      order by coalesce(quotes.sent_at, quotes.created_at) desc
      limit 25
    `;
    const mappedQuotes = quotes.map(mapQuote);

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        roles: roleKeys,
      },
      quotes: mappedQuotes,
      summary: {
        total: mappedQuotes.length,
        waiting: mappedQuotes.filter((quote) => WAITING_QUOTE_STATUSES.has(quote.status)).length,
      },
    });
  } catch (error) {
    console.error('Failed to load client quotes', error);

    return json(500, { ok: false, message: 'We could not load your quotes right now.' });
  }
};

export default createClientQuotesHandler();

export const config = {
  path: '/api/client/quotes',
};
