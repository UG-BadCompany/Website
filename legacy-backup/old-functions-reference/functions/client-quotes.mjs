import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const WAITING_QUOTE_STATUSES = new Set(['sent', 'viewed']);
const DECISION_ACTIONS = new Set(['accept', 'decline']);

const deriveClientQuoteStatus = (quote = {}) => {
  const quoteStatus = String(quote.status || '').toLowerCase();
  const requestStatus = String(quote.job_request_status || '').toLowerCase();
  if (quoteStatus === 'accepted' && ['completed', 'pending_review', 'waiting_payment'].includes(requestStatus)) {
    return 'completed';
  }
  return quoteStatus || 'draft';
};

const mapQuote = (quote) => ({
  id: quote.id,
  status: deriveClientQuoteStatus(quote),
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

const normalizeDecisionPayload = (body = {}) => ({
  quoteId: clean(body.quoteId, 80),
  action: clean(body.action, 20).toLowerCase(),
});

const validateDecisionPayload = (payload) => {
  if (!payload.quoteId) {
    return 'Quote is required.';
  }

  if (!DECISION_ACTIONS.has(payload.action)) {
    return 'Quote action must be accept or decline.';
  }

  return null;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  const roleKeys = roles.map((role) => role.key);

  return roleKeys.length ? roleKeys : ['client'];
};

const buildUser = (session, roleKeys) => ({
  id: session.user_id,
  email: session.email,
  fullName: session.full_name,
  roles: roleKeys,
});

const listClientQuotes = async (db, userId) => {
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
      and job_requests.client_id = ${userId}
    left join properties on properties.id = job_requests.property_id
      and properties.client_id = ${userId}
    where quotes.client_id = ${userId}
      and quotes.status <> 'draft'
    order by coalesce(quotes.sent_at, quotes.created_at) desc
    limit 25
  `;
  const mappedQuotes = quotes.map(mapQuote);

  return {
    quotes: mappedQuotes,
    summary: {
      total: mappedQuotes.length,
      waiting: mappedQuotes.filter((quote) => WAITING_QUOTE_STATUSES.has(quote.status)).length,
    },
  };
};

const handleGet = async ({ db, session, roleKeys }) => json(200, {
  ok: true,
  authenticated: true,
  authorized: true,
  user: buildUser(session, roleKeys),
  ...(await listClientQuotes(db, session.user_id)),
});

const handlePatch = async ({ request, db, session, roleKeys }) => {
  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizeDecisionPayload(body);
  const validationError = validateDecisionPayload(payload);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  const [quote] = await db.sql`
    select id, job_request_id, client_id, status
    from quotes
    where id = ${payload.quoteId}
      and client_id = ${session.user_id}
      and status in ('sent', 'viewed')
    limit 1
  `;

  if (!quote) {
    return json(404, { ok: false, authenticated: true, authorized: false, message: 'Quote not found or not ready for a decision.' });
  }

  const accepted = payload.action === 'accept';
  const [updatedQuote] = await db.sql`
    update quotes
    set
      status = ${accepted ? 'accepted' : 'declined'},
      accepted_at = case when ${accepted} then now() else accepted_at end,
      declined_at = case when ${!accepted} then now() else declined_at end,
      updated_at = now()
    where id = ${quote.id}
      and client_id = ${session.user_id}
    returning id, job_request_id, client_id, status, title, summary, amount_cents, sent_at, viewed_at, accepted_at, declined_at, created_at
  `;

  if (accepted && quote.job_request_id) {
    await db.sql`
      update job_requests
      set status = 'accepted', updated_at = now()
      where id = ${quote.job_request_id}
        and client_id = ${session.user_id}
    `;
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${session.user_id},
      ${accepted ? 'quote.accepted' : 'quote.declined'},
      ${'quote'},
      ${quote.id},
      ${JSON.stringify({ source: 'client_dashboard', jobRequestId: quote.job_request_id })}::jsonb
    )
  `;

  return json(200, {
    ok: true,
    authenticated: true,
    authorized: true,
    user: buildUser(session, roleKeys),
    quote: mapQuote(updatedQuote),
    message: accepted ? 'Quote accepted.' : 'Quote declined.',
  });
};

export const createClientQuotesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
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

    if (request.method === 'PATCH') {
      return await handlePatch({ request, db, session, roleKeys });
    }

    return await handleGet({ db, session, roleKeys });
  } catch (error) {
    console.error('Failed to load client quotes', error);

    return json(500, { ok: false, message: 'We could not load your quotes right now.' });
  }
};

export default createClientQuotesHandler();

export const config = {
  path: '/api/client/quotes',
};
