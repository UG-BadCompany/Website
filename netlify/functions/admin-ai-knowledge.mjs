import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const TABLES = {
  materials: { table: 'ai_material_knowledge', editableJson: 'source_payload' },
  labor: { table: 'ai_labor_knowledge', editableJson: 'source_payload' },
  troubleshooting: { table: 'ai_troubleshooting_knowledge', editableJson: 'source_payload' },
  quotes: { table: 'ai_quote_knowledge', editableJson: 'content' },
};

const loadSession = async (db, request) => {
  const token = getSessionToken(request);
  if (!token) return null;
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(token)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${session.user_id}
  `;
  return { ...session, roleKeys: roles.map((role) => role.key) };
};

const requireAdmin = async (request) => {
  const db = await loadDatabase();
  const session = await loadSession(db, request);
  if (!session) return { error: json(401, { ok: false, message: 'Sign in with an admin account.' }) };
  if (!session.roleKeys.includes('admin')) return { error: json(403, { ok: false, message: 'Admin access required.' }) };
  return { db, session };
};

const normalizeType = (value) => TABLES[clean(value, 40)] ? clean(value, 40) : 'materials';
const normalizeAction = (value) => ['approve', 'reject', 'promote', 'disable', 'edit'].includes(clean(value, 40)) ? clean(value, 40) : '';

const listKnowledge = async (db, type, status) => {
  if (type === 'labor') return await db.sql`
    select id, phase_name as title, trade, hours_low, hours_high, source_payload, review_status, promoted_to_company_standard, disabled_at, created_at, updated_at
    from ai_labor_knowledge
    where (${status || ''} = '' or review_status = ${status || ''})
    order by created_at desc
    limit 100
  `;
  if (type === 'troubleshooting') return await db.sql`
    select id, trade, component, symptom, knowledge_type, content, source_payload, review_status, promoted_to_company_standard, disabled_at, created_at, updated_at
    from ai_troubleshooting_knowledge
    where (${status || ''} = '' or review_status = ${status || ''})
    order by created_at desc
    limit 100
  `;
  if (type === 'quotes') return await db.sql`
    select id, trade, service_type, work_category, city, knowledge_type, content, confidence_score, review_status, promoted_to_company_standard, disabled_at, created_at, updated_at
    from ai_quote_knowledge
    where (${status || ''} = '' or review_status = ${status || ''})
    order by created_at desc
    limit 100
  `;
  return await db.sql`
    select id, name as title, trade, supplier, sku, quantity_assumption, unit, source_payload, review_status, promoted_to_company_standard, disabled_at, created_at, updated_at
    from ai_material_knowledge
    where (${status || ''} = '' or review_status = ${status || ''})
    order by created_at desc
    limit 100
  `;
};

const updateKnowledge = async ({ db, session, body }) => {
  const type = normalizeType(body.type);
  const table = TABLES[type];
  const action = normalizeAction(body.action);
  const id = clean(body.id, 80);
  if (!id || !action) return json(422, { ok: false, message: 'Knowledge id and action are required.' });

  let row;
  if (type === 'labor') {
    [row] = await db.sql`
      update ai_labor_knowledge
      set review_status = ${action === 'reject' ? 'rejected' : action === 'approve' || action === 'promote' ? 'approved' : action === 'disable' ? 'disabled' : 'pending_review'},
          promoted_to_company_standard = case when ${action} = 'promote' then true when ${action} = 'reject' then false else promoted_to_company_standard end,
          disabled_at = case when ${action} = 'disable' then now() else disabled_at end,
          source_payload = case when ${action} = 'edit' then ${JSON.stringify(body.content || {})}::jsonb else source_payload end,
          updated_at = now()
      where id::text = ${id}
      returning *
    `;
  } else if (type === 'troubleshooting') {
    [row] = await db.sql`
      update ai_troubleshooting_knowledge
      set review_status = ${action === 'reject' ? 'rejected' : action === 'approve' || action === 'promote' ? 'approved' : action === 'disable' ? 'disabled' : 'pending_review'},
          promoted_to_company_standard = case when ${action} = 'promote' then true when ${action} = 'reject' then false else promoted_to_company_standard end,
          disabled_at = case when ${action} = 'disable' then now() else disabled_at end,
          content = case when ${action} = 'edit' then ${clean(body.content?.content || body.content, 2000)} else content end,
          updated_at = now()
      where id::text = ${id}
      returning *
    `;
  } else if (type === 'quotes') {
    [row] = await db.sql`
      update ai_quote_knowledge
      set review_status = ${action === 'reject' ? 'rejected' : action === 'approve' || action === 'promote' ? 'approved' : action === 'disable' ? 'disabled' : 'pending_review'},
          promoted_to_company_standard = case when ${action} = 'promote' then true when ${action} = 'reject' then false else promoted_to_company_standard end,
          disabled_at = case when ${action} = 'disable' then now() else disabled_at end,
          content = case when ${action} = 'edit' then ${JSON.stringify(body.content || {})}::jsonb else content end,
          updated_at = now()
      where id::text = ${id}
      returning *
    `;
  } else {
    [row] = await db.sql`
      update ai_material_knowledge
      set review_status = ${action === 'reject' ? 'rejected' : action === 'approve' || action === 'promote' ? 'approved' : action === 'disable' ? 'disabled' : 'pending_review'},
          promoted_to_company_standard = case when ${action} = 'promote' then true when ${action} = 'reject' then false else promoted_to_company_standard end,
          disabled_at = case when ${action} = 'disable' then now() else disabled_at end,
          source_payload = case when ${action} = 'edit' then ${JSON.stringify(body.content || {})}::jsonb else source_payload end,
          updated_at = now()
      where id::text = ${id}
      returning *
    `;
  }

  if (!row) return json(404, { ok: false, message: 'Knowledge item not found.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'ai_knowledge.updated'}, ${table.table}, ${id}, ${JSON.stringify({ type, action, editableJson: table.editableJson })}::jsonb)
  `;
  return json(200, { ok: true, type, action, item: row });
};

export default async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const { db, session } = auth;
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const type = normalizeType(url.searchParams.get('type'));
      const status = clean(url.searchParams.get('status'), 40);
      const items = await listKnowledge(db, type, status);
      return json(200, { ok: true, type, status: status || 'all', items });
    }
    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    return await updateKnowledge({ db, session, body });
  } catch (error) {
    console.error('AI knowledge center failed', error);
    return json(500, { ok: false, message: 'AI Knowledge Center is unavailable right now.' });
  }
};

export const config = { path: '/api/admin/ai-knowledge' };
