import { clean, getSessionToken, hashToken, json, loadDatabase, parseJsonBody } from './auth-utils.mjs';

const asRows = (result) => (Array.isArray(result) ? result : (Array.isArray(result?.rows) ? result.rows : []));

const requireAdmin = async (db, request) => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return null;
  const [session] = asRows(await db.sql`
    select user_id
    from auth_sessions
    where session_hash = ${hashToken(sessionToken)}
      and revoked_at is null
      and expires_at > now()
    limit 1
  `);
  if (!session) return null;
  const roles = asRows(await db.sql`select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${session.user_id}`);
  if (!roles.some((r) => r.key === 'admin')) return null;
  return session;
};

export default async (request) => {
  if (!['GET', 'PATCH', 'POST'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  const db = await loadDatabase();
  const admin = await requireAdmin(db, request);
  if (!admin) return json(403, { ok: false, message: 'Admin role required.' });

  if (request.method === 'GET') {
    const status = clean(new URL(request.url).searchParams.get('status') || 'new', 20);
    const rows = asRows(await db.sql`
      select id, job_request_id, city, candidate_name, candidate_unit_cost_cents, evidence, status, confidence_score, normalized_key, created_at, reviewed_at
      from quote_research_queue
      where (${status} = 'all' or status = ${status})
      order by created_at desc
      limit 200
    `);
    return json(200, { ok: true, items: rows });
  }

  const body = await parseJsonBody(request);

  if (request.method === 'POST') {
    const id = Number(body?.id || 0);
    const jobTypeKey = clean(body?.jobTypeKey || '', 80);
    const itemKey = clean(body?.itemKey || '', 80);
    const itemName = clean(body?.itemName || '', 180);
    const aliases = clean(body?.aliases || '', 300);
    if (!id || !jobTypeKey || !itemKey || !itemName) return json(422, { ok: false, message: 'id, jobTypeKey, itemKey, itemName are required.' });

    await db.sql`
      insert into quote_catalog_items (job_type_key, item_key, item_name, default_unit_cost_cents, default_quantity, aliases)
      select ${jobTypeKey}, ${itemKey}, ${itemName}, coalesce((select candidate_unit_cost_cents from quote_research_queue where id = ${id}), 0), 1, ${aliases}
      on conflict (job_type_key, item_key) do update
      set item_name = excluded.item_name,
          default_unit_cost_cents = greatest(quote_catalog_items.default_unit_cost_cents, excluded.default_unit_cost_cents),
          aliases = case when excluded.aliases = '' then quote_catalog_items.aliases else excluded.aliases end,
          updated_at = now()
    `;

    const [updated] = asRows(await db.sql`
      update quote_research_queue
      set status = 'added_to_catalog', reviewed_by = ${admin.user_id}, reviewed_at = now(), updated_at = now(), notes = coalesce(notes, '') || ' Added to catalog.'
      where id = ${id}
      returning id, status, reviewed_at
    `);

    return json(200, { ok: true, item: updated || null });
  }

  const id = Number(body?.id || 0);
  const nextStatus = clean(body?.status || '', 20);
  if (!id || !['new', 'reviewed', 'added_to_catalog', 'dismissed'].includes(nextStatus)) {
    return json(422, { ok: false, message: 'Valid id and status are required.' });
  }

  const [updated] = asRows(await db.sql`
    update quote_research_queue
    set status = ${nextStatus}, reviewed_by = ${admin.user_id}, reviewed_at = now(), updated_at = now()
    where id = ${id}
    returning id, status, reviewed_at
  `);
  return json(200, { ok: true, item: updated || null });
};

export const config = { path: '/api/admin/research-queue' };
