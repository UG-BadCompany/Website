import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_QUOTE_REWRITE_TIMEOUT_MS || 12000);

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

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
  if (!sessionToken) return { error: json(401, { ok: false, message: 'Sign in with an admin account.' }) };

  const db = await loadDatabase();
  const session = await loadSession(db, sessionToken);
  if (!session) return { error: json(401, { ok: false, message: 'Session expired. Request a new magic link.' }) };

  const roleKeys = await loadRoleKeys(db, session.user_id);
  if (!roleKeys.includes('admin')) return { error: json(403, { ok: false, message: 'Admin role required.' }) };

  return { db, session, roleKeys };
};

const normalizePayload = (body = {}) => ({
  quoteId: clean(body.quoteId, 80),
  title: clean(body.title, 220),
  summary: clean(body.summary, 12000),
  missingInfo: clean(body.missingInfo, 6000),
  amountCents: Number(body.amountCents),
  rewriteStyle: clean(body.rewriteStyle, 40) || 'customer_ready',
});

const compactList = (items = [], prefix = '- ') => Array.isArray(items)
  ? items.slice(0, 10).map((item) => `${prefix}${typeof item === 'string' ? item : item.name || item.label || item.notes || JSON.stringify(item)}`)
  : [];

const fallbackRewrite = ({ quote, job, metadata, payload }) => {
  const title = payload.title || quote.title || `${job.service_type || 'Service'} quote`;
  const amountCents = Number.isInteger(payload.amountCents) && payload.amountCents >= 0
    ? payload.amountCents
    : Number(quote.amount_cents || 0);

  const lines = [
    `Quote: ${title}`,
    '',
    `Customer: ${job.requester_name || 'Customer'}`,
    `Project: ${job.service_type || 'Service'}${job.work_scope ? ` — ${job.work_scope}` : ''}`,
    `Address: ${[job.street_address, job.city, 'AZ'].filter(Boolean).join(', ')}`,
    '',
    'Scope of work:',
    payload.summary || quote.summary || job.description || 'Review requested service and complete approved work described by customer.',
    '',
    'Labor included:',
    ...compactList(metadata.laborItems, '- '),
    ...(Array.isArray(metadata.laborItems) && metadata.laborItems.length ? [] : ['- Labor allowance included for diagnosis, setup, installation/repair, testing, and cleanup.']),
    '',
    'Materials / allowances:',
    ...compactList(metadata.materials, '- '),
    ...(Array.isArray(metadata.materials) && metadata.materials.length ? [] : ['- Standard materials and consumables allowance included.']),
    '',
    payload.missingInfo ? 'Updated information provided by admin:' : '',
    ...(payload.missingInfo ? payload.missingInfo.split('\n').filter(Boolean).map((line) => `- ${line}`) : []),
    '',
    Array.isArray(metadata.missingInfoQuestions) && metadata.missingInfoQuestions.length ? 'Items to verify before final approval:' : '',
    ...compactList(metadata.missingInfoQuestions, '- '),
    '',
    Array.isArray(metadata.riskFlags) && metadata.riskFlags.length ? 'Important notes / risks:' : '',
    ...compactList(metadata.riskFlags, '- '),
    '',
    Array.isArray(metadata.exclusions) && metadata.exclusions.length ? 'Exclusions / change-order triggers:' : '',
    ...compactList(metadata.exclusions, '- '),
    '',
    `Estimated quote amount: ${money(amountCents)}`,
    '',
    'This quote is subject to final admin approval, site conditions, material availability, and any changes discovered during work.',
  ].filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');

  return {
    title,
    summary: lines,
    amountCents,
    rewriteNotes: [
      'Fallback rewrite used because AI was unavailable or not configured.',
      'Review material pricing, permit/licensed trade requirements, and site conditions before sending.',
    ],
    missingInfoResolved: payload.missingInfo ? payload.missingInfo.split('\n').filter(Boolean).slice(0, 10) : [],
    remainingQuestions: Array.isArray(metadata.missingInfoQuestions) ? metadata.missingInfoQuestions.slice(0, 10) : [],
    riskFlags: Array.isArray(metadata.riskFlags) ? metadata.riskFlags.slice(0, 10) : [],
    exclusions: Array.isArray(metadata.exclusions) ? metadata.exclusions.slice(0, 10) : [],
    aiEnhanced: false,
  };
};

const parseOpenAiJson = (result) => {
  const text = result.output_text ||
    result.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('\n') ||
    '';

  if (!text) return null;

  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

const aiRewrite = async ({ quote, job, metadata, payload }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [
              'You are a senior handyman/contractor estimator for T&A Contracting in Arizona.',
              'Rewrite the quote into a clear admin-review-ready and customer-ready format.',
              'Use plain language, realistic scope, material allowances, labor phases, verification notes, and exclusions.',
              'Include admin-provided missing/updated information.',
              'Do not claim work is guaranteed or final beyond approved scope.',
              'Return strict JSON only with title, summary, amountCents, rewriteNotes, missingInfoResolved, remainingQuestions, riskFlags, exclusions.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              currentQuote: {
                title: payload.title || quote.title,
                summary: payload.summary || quote.summary,
                amountCents: Number.isInteger(payload.amountCents) ? payload.amountCents : quote.amount_cents,
              },
              customerRequest: job,
              estimateMetadata: metadata,
              adminUpdatedInformation: payload.missingInfo,
              rewriteStyle: payload.rewriteStyle,
            }),
          },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });

    if (!response.ok) return null;
    const result = await response.json();
    const rewritten = parseOpenAiJson(result);
    if (!rewritten || !rewritten.summary) return null;

    return {
      title: clean(rewritten.title || payload.title || quote.title, 220),
      summary: clean(rewritten.summary, 12000),
      amountCents: Number.isInteger(Number(rewritten.amountCents)) && Number(rewritten.amountCents) >= 0
        ? Number(rewritten.amountCents)
        : Number(payload.amountCents || quote.amount_cents || 0),
      rewriteNotes: Array.isArray(rewritten.rewriteNotes) ? rewritten.rewriteNotes.slice(0, 10) : [],
      missingInfoResolved: Array.isArray(rewritten.missingInfoResolved) ? rewritten.missingInfoResolved.slice(0, 10) : [],
      remainingQuestions: Array.isArray(rewritten.remainingQuestions) ? rewritten.remainingQuestions.slice(0, 10) : [],
      riskFlags: Array.isArray(rewritten.riskFlags) ? rewritten.riskFlags.slice(0, 10) : [],
      exclusions: Array.isArray(rewritten.exclusions) ? rewritten.exclusions.slice(0, 10) : [],
      aiEnhanced: true,
    };
  } catch (error) {
    console.error('AI quote rewrite failed', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const { db, session } = auth;

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });

    const payload = normalizePayload(body);
    if (!payload.quoteId) return json(422, { ok: false, message: 'Quote is required.' });

    const [row] = await db.sql`
      select
        q.id as quote_id,
        q.job_request_id,
        q.client_id,
        q.status as quote_status,
        q.title,
        q.summary,
        q.amount_cents,
        jr.requester_name,
        jr.requester_email,
        jr.requester_phone,
        jr.city,
        jr.street_address,
        jr.service_type,
        jr.work_scope,
        jr.work_category,
        jr.preferred_timeframe,
        jr.description,
        estimate_event.metadata as estimate_metadata
      from quotes q
      join job_requests jr on jr.id = q.job_request_id
      left join lateral (
        select metadata
        from audit_events
        where entity_type = ${'job_request'}
          and entity_id = q.job_request_id
          and event_type in (${ 'job_request.ai_estimate_draft_created' }, ${ 'job_request.created' })
        order by created_at desc
        limit 1
      ) estimate_event on true
      where q.id = ${payload.quoteId}
      limit 1
    `;

    if (!row) return json(404, { ok: false, message: 'Quote not found.' });

    const metadata = parseMetadata(row.estimate_metadata);
    const aiResult = await aiRewrite({ quote: row, job: row, metadata, payload });
    const rewrite = aiResult || fallbackRewrite({ quote: row, job: row, metadata, payload });

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        ${'quote.ai_rewrite_generated'},
        ${'quote'},
        ${row.quote_id},
        ${JSON.stringify({ source: 'estimate_review_editor', aiEnhanced: rewrite.aiEnhanced, rewriteStyle: payload.rewriteStyle })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      quoteId: row.quote_id,
      rewrite,
    });
  } catch (error) {
    console.error('Failed to rewrite quote', error);
    return json(500, { ok: false, message: 'Could not rewrite quote right now.' });
  }
};

export const config = {
  path: '/api/admin/estimate-rewrite',
};
