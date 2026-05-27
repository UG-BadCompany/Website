import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};

const mapDraft = (row) => {
  const metadata = parseMetadata(row.estimate_metadata);
  return {
    quoteId: row.quote_id,
    jobRequestId: row.job_request_id,
    clientId: row.client_id,
    status: row.quote_status,
    title: row.title,
    summary: row.summary,
    amountCents: row.amount_cents,
    lowAmountCents: metadata.lowAmountCents || null,
    confidence: metadata.confidence || null,
    quoteReady: Boolean(metadata.quoteReady),
    laborItems: metadata.laborItems || [],
    materials: metadata.materials || [],
    missingInfoQuestions: metadata.missingInfoQuestions || [],
    riskFlags: metadata.riskFlags || [],
    exclusions: metadata.exclusions || [],
    totals: metadata.totals || {},
    job: metadata.job || null,
    aiEnhanced: Boolean(metadata.aiEnhanced),
    createdAt: row.quote_created_at,
    updatedAt: row.quote_updated_at,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    city: row.city,
    streetAddress: row.street_address,
    serviceType: row.service_type,
    workScope: row.work_scope,
    workCategory: row.work_category,
    preferredTimeframe: row.preferred_timeframe,
    requestDescription: row.request_description,
    requestStatus: row.request_status,
  };
};

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

  if (!session) return null;

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  return session;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  return roles.map((role) => role.key);
};

const requireAdmin = async (request) => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return { error: json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' }) };
  }

  const db = await loadDatabase();
  const session = await loadSession(db, sessionToken);

  if (!session) {
    return { error: json(401, { ok: false, authenticated: false, message: 'Session expired. Request a new magic link.' }) };
  }

  const roleKeys = await loadRoleKeys(db, session.user_id);

  if (!roleKeys.includes('admin')) {
    return { error: json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required.' }) };
  }

  return { db, session, roleKeys };
};

const normalizeDecisionPayload = (body = {}) => ({
  quoteId: clean(body.quoteId, 80),
  title: clean(body.title, 180),
  summary: clean(body.summary, 6000),
  amountCents: Number(body.amountCents),
  action: clean(body.action, 40),
});

export default async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { db, session, roleKeys } = auth;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const status = clean(url.searchParams.get('status'), 40) || 'draft';
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)));

      const rows = await db.sql`
        select
          q.id as quote_id,
          q.job_request_id,
          q.client_id,
          q.status as quote_status,
          q.title,
          q.summary,
          q.amount_cents,
          q.created_at as quote_created_at,
          q.updated_at as quote_updated_at,
          jr.requester_name,
          jr.requester_email,
          jr.requester_phone,
          jr.city,
          jr.street_address,
          jr.service_type,
          jr.work_scope,
          jr.work_category,
          jr.preferred_timeframe,
          jr.description as request_description,
          jr.status as request_status,
          estimate_event.metadata as estimate_metadata
        from quotes q
        left join job_requests jr on jr.id = q.job_request_id
        left join lateral (
          select metadata
          from audit_events
          where audit_events.entity_type = 'quote'
            and audit_events.entity_id = q.id
            and audit_events.event_type = 'estimate_draft.created'
          order by created_at desc
          limit 1
        ) estimate_event on true
        where q.status = ${status}
        order by q.created_at desc
        limit ${limit}
      `;

      const drafts = rows.map(mapDraft);
      const readyCount = drafts.filter((draft) => Number(draft.amountCents || 0) > 0).length;
      const needsReviewCount = drafts.length - readyCount;

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
        stats: {
          totalDrafts: drafts.length,
          readyCount,
          needsReviewCount,
        },
        drafts,
      });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

    const payload = normalizeDecisionPayload(body);
    if (!payload.quoteId) return json(422, { ok: false, message: 'Quote is required.' });

    const [existingQuote] = await db.sql`
      select id, job_request_id, client_id, status, title, summary, amount_cents
      from quotes
      where id = ${payload.quoteId}
      limit 1
    `;

    if (!existingQuote) {
      return json(404, { ok: false, message: 'Estimate draft not found.' });
    }

    const nextStatus = payload.action === 'send' ? 'sent' : 'draft';
    const title = payload.title || existingQuote.title;
    const summary = payload.summary || existingQuote.summary;
    const amountCents = Number.isInteger(payload.amountCents) && payload.amountCents >= 0
      ? payload.amountCents
      : Number(existingQuote.amount_cents || 0);

    const [quote] = await db.sql`
      update quotes
      set title = ${title},
          summary = ${summary || null},
          amount_cents = ${amountCents},
          status = ${nextStatus},
          sent_at = case when ${payload.action === 'send'} then coalesce(sent_at, now()) else sent_at end,
          updated_at = now()
      where id = ${existingQuote.id}
      returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
    `;

    if (payload.action === 'send') {
      await db.sql`
        update job_requests
        set status = 'quote_sent', updated_at = now()
        where id = ${quote.job_request_id}
      `;
    }

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${payload.action === 'send' ? 'estimate_review.sent' : 'estimate_review.updated'},
        ${'quote'},
        ${quote.id},
        ${JSON.stringify({ source: 'admin_estimate_review', jobRequestId: quote.job_request_id, amountCents, action: payload.action || 'save' })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      quote: {
        id: quote.id,
        jobRequestId: quote.job_request_id,
        clientId: quote.client_id,
        status: quote.status,
        title: quote.title,
        summary: quote.summary,
        amountCents: quote.amount_cents,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to load or update estimate review queue', error);
    return json(500, { ok: false, message: 'Could not load estimate review right now.' });
  }
};

export const config = {
  path: '/api/admin/estimate-review',
};
