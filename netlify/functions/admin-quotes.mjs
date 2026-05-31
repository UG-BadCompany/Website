import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';
import { saveAdminAiCorrection } from './ai-intelligence-engine.mjs';

const normalizePayload = (body = {}) => ({
  quoteId: clean(body.quoteId, 80),
  jobRequestId: clean(body.jobRequestId, 80),
  title: clean(body.title, 180),
  summary: clean(body.summary, 4000),
  amountCents: Number(body.amountCents),
  sendToClient: Boolean(body.sendToClient),
  aiOriginal: body.aiOriginal && typeof body.aiOriginal === 'object' ? body.aiOriginal : null,
  aiMetadata: body.aiMetadata && typeof body.aiMetadata === 'object' ? body.aiMetadata : null,
});

const validatePayload = (payload, method = 'POST') => {
  if (method === 'PATCH' && !payload.quoteId) {
    return 'Quote is required.';
  }

  if (method === 'POST' && !payload.jobRequestId) {
    return 'Job request is required.';
  }

  if (!payload.title) {
    return 'Quote title is required.';
  }

  if (!Number.isInteger(payload.amountCents) || payload.amountCents < 0) {
    return 'Quote amount must be a non-negative amount in cents.';
  }

  return null;
};

const mapQuote = (quote) => ({
  id: quote.id,
  jobRequestId: quote.job_request_id,
  clientId: quote.client_id,
  status: quote.status,
  title: quote.title,
  summary: quote.summary,
  amountCents: quote.amount_cents,
  createdAt: quote.created_at,
  updatedAt: quote.updated_at,
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

export const createAdminQuotesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['POST', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to create quotes.' });
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizePayload(body);
  const validationError = validatePayload(payload, request.method);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const roleKeys = await loadRoleKeys(db, session.user_id);

    if (!roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required to create quotes.' });
    }

    if (request.method === 'PATCH') {
      const [existingQuote] = await db.sql`
        select id, job_request_id, client_id, status
        from quotes
        where id = ${payload.quoteId}
        limit 1
      `;

      if (!existingQuote) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Quote not found.' });
      }

      const quoteStatus = payload.sendToClient ? 'sent' : existingQuote.status;
      const [quote] = await db.sql`
        update quotes
        set title = ${payload.title},
            summary = ${payload.summary || null},
            amount_cents = ${payload.amountCents},
            status = ${quoteStatus},
            sent_at = case when ${payload.sendToClient} then coalesce(sent_at, now()) else sent_at end,
            updated_at = now()
        where id = ${existingQuote.id}
        returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
      `;

      if (payload.sendToClient) {
        await db.sql`
          update job_requests
          set status = ${'quote_sent'}, updated_at = now()
          where id = ${existingQuote.job_request_id}
            and status in ('new', 'needs_review', 'quote_in_progress', 'quote_sent')
        `;
      }

      if (payload.aiOriginal || payload.aiMetadata) await saveAdminAiCorrection({
        db,
        quoteId: quote.id,
        jobRequestId: quote.job_request_id,
        actorUserId: session.user_id,
        originalAiResult: payload.aiOriginal || payload.aiMetadata?.aiStructuredQuote || {},
        adminChanges: {
          title: payload.title,
          summary: payload.summary,
          amountCents: payload.amountCents,
          priceAdjustmentCents: payload.aiMetadata?.fixedPriceRecommendationCents ? payload.amountCents - Number(payload.aiMetadata.fixedPriceRecommendationCents) : null,
          sentToClient: payload.sendToClient,
        },
        finalQuote: quote,
      });

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'quote.updated'},
          ${'quote'},
          ${quote.id},
          ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: quote.job_request_id, clientId: quote.client_id, amountCents: payload.amountCents, sentToClient: payload.sendToClient, aiCorrectionSaved: true })}::jsonb
        )
      `;

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
        quote: mapQuote(quote),
      });
    }

    const [jobRequest] = await db.sql`
      select id, client_id
      from job_requests
      where id = ${payload.jobRequestId}
      limit 1
    `;

    if (!jobRequest) {
      return json(404, { ok: false, authenticated: true, authorized: true, message: 'Job request not found.' });
    }

    if (!jobRequest.client_id) {
      return json(422, { ok: false, authenticated: true, authorized: true, message: 'Job request must be linked to a client before quoting.' });
    }

    const [existingQuote] = await db.sql`
      select id
      from quotes
      where job_request_id = ${jobRequest.id}
      order by created_at desc
      limit 1
    `;

    if (existingQuote) {
      return json(409, { ok: false, authenticated: true, authorized: true, message: 'This request already has a quote. Open the request and edit the saved quote.' });
    }

    const quoteStatus = payload.sendToClient ? 'sent' : 'draft';

    const [quote] = await db.sql`
      insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, sent_at, created_by)
      values (${jobRequest.id}, ${jobRequest.client_id}, ${quoteStatus}, ${payload.title}, ${payload.summary || null}, ${payload.amountCents}, ${payload.sendToClient ? new Date().toISOString() : null}::timestamptz, ${session.user_id})
      returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
    `;

    await db.sql`
      update job_requests
      set status = ${payload.sendToClient ? 'quote_sent' : 'quote_in_progress'}, updated_at = now()
      where id = ${jobRequest.id}
        and status in ('new', 'needs_review', 'quote_in_progress')
    `;

    if (payload.aiOriginal || payload.aiMetadata) await saveAdminAiCorrection({
      db,
      quoteId: quote.id,
      jobRequestId: quote.job_request_id,
      actorUserId: session.user_id,
      originalAiResult: payload.aiOriginal || payload.aiMetadata?.aiStructuredQuote || {},
      adminChanges: {
        title: payload.title,
        summary: payload.summary,
        amountCents: payload.amountCents,
        priceAdjustmentCents: payload.aiMetadata?.fixedPriceRecommendationCents ? payload.amountCents - Number(payload.aiMetadata.fixedPriceRecommendationCents) : null,
        sentToClient: payload.sendToClient,
      },
      finalQuote: quote,
    });

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'quote.created'},
        ${'quote'},
        ${quote.id},
        ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: jobRequest.id, clientId: jobRequest.client_id, amountCents: payload.amountCents, sentToClient: payload.sendToClient, aiCorrectionSaved: true })}::jsonb
      )
    `;

    return json(201, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        roles: roleKeys,
      },
      quote: mapQuote(quote),
    });
  } catch (error) {
    console.error('Failed to create admin quote', error);

    return json(500, { ok: false, message: 'We could not create the quote right now.' });
  }
};

export default createAdminQuotesHandler();

export const config = {
  path: '/api/admin/quotes',
};
