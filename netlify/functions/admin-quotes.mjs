import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const normalizePayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId, 80),
  title: clean(body.title, 180),
  summary: clean(body.summary, 4000),
  amountCents: Number(body.amountCents),
  sendToClient: Boolean(body.sendToClient),
  quoteId: clean(body.quoteId, 80),
  editConfirmed: Boolean(body.editConfirmed),
  editReason: clean(body.editReason, 500),
});

const validatePayload = (payload, method = 'POST') => {
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
      if (!payload.quoteId) {
        return json(422, { ok: false, message: 'Quote is required for editing.' });
      }

      if (!payload.editConfirmed) {
        return json(409, { ok: false, message: 'Click Edit quote before changing a sent quote.' });
      }

      const [existingQuote] = await db.sql`
        select id, job_request_id, client_id, status, amount_cents, revision
        from quotes
        where id = ${payload.quoteId}
        limit 1
      `;

      if (!existingQuote) {
        return json(404, { ok: false, authenticated: true, authorized: true, message: 'Quote not found.' });
      }

      if (!['sent', 'viewed', 'declined'].includes(existingQuote.status)) {
        return json(422, { ok: false, authenticated: true, authorized: true, message: 'Only sent quotes can be edited and resent to clients.' });
      }

      const [quote] = await db.sql`
        update quotes
        set title = ${payload.title},
            summary = ${payload.summary || null},
            amount_cents = ${payload.amountCents},
            status = ${'sent'},
            sent_at = now(),
            resent_at = now(),
            viewed_at = null,
            declined_at = null,
            revision = coalesce(revision, 1) + 1,
            edit_unlocked_at = now(),
            edit_unlocked_by = ${session.user_id},
            edit_reason = ${payload.editReason || 'Admin updated quote and resent for client approval'},
            updated_at = now()
        where id = ${existingQuote.id}
        returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
      `;

      await db.sql`
        update job_requests
        set status = ${'quote_sent'}, updated_at = now()
        where id = ${existingQuote.job_request_id}
      `;

      await db.sql`
        insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
        values (
          ${session.user_id},
          ${'quote.updated_and_resent'},
          ${'quote'},
          ${quote.id},
          ${JSON.stringify({ source: 'admin_dashboard', previousAmountCents: existingQuote.amount_cents, amountCents: payload.amountCents, revision: (existingQuote.revision || 1) + 1, editReason: payload.editReason || null })}::jsonb
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
        message: 'Updated quote sent to the client for approval.',
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

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'quote.created'},
        ${'quote'},
        ${quote.id},
        ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: jobRequest.id, clientId: jobRequest.client_id, amountCents: payload.amountCents, sentToClient: payload.sendToClient })}::jsonb
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
