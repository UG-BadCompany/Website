import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const mapDate = (value) => value ? String(value).slice(0, 10) : null;

const mapPlan = (row) => ({
  id: row.id,
  clientId: row.client_id,
  propertyId: row.property_id,
  planName: row.plan_name,
  planType: row.plan_type,
  frequency: row.frequency,
  nextDueDate: mapDate(row.next_due_date),
  assignedWorkerId: row.assigned_worker_id,
  status: row.status,
  notes: row.notes,
  clientName: row.client_name,
  clientEmail: row.client_email,
  propertyLabel: row.property_label,
  propertyCity: row.property_city,
  workerName: row.worker_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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
  return session;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
  `;
  return roles.map((role) => role.key);
};

const listPlans = async (db) => db.sql`
  select maintenance_plans.*, clients.full_name as client_name, clients.email as client_email,
         properties.label as property_label, properties.city as property_city,
         workers.full_name as worker_name
  from maintenance_plans
  left join app_users clients on clients.id = maintenance_plans.client_id
  left join properties on properties.id = maintenance_plans.property_id
  left join app_users workers on workers.id = maintenance_plans.assigned_worker_id
  order by maintenance_plans.next_due_date nulls last, maintenance_plans.updated_at desc
  limit 200
`;

const normalizePayload = (body = {}) => ({
  planId: clean(body.planId, 80),
  clientId: clean(body.clientId, 80),
  propertyId: clean(body.propertyId, 80),
  planName: clean(body.planName || body.name, 160),
  planType: clean(body.planType, 80) || 'property_care',
  frequency: clean(body.frequency, 80) || 'quarterly',
  nextDueDate: clean(body.nextDueDate, 40),
  assignedWorkerId: clean(body.assignedWorkerId, 80),
  status: clean(body.status, 40) || 'active',
  notes: clean(body.notes, 2000),
});

export default async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const session = await loadSession(db, request);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });
    const roleKeys = await loadRoleKeys(db, session.user_id);
    if (!roleKeys.includes('admin')) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required.' });

    if (request.method === 'GET') {
      const plans = await listPlans(db);
      return json(200, { ok: true, plans: plans.map(mapPlan) });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const payload = normalizePayload(body);
    if (!payload.planName) return json(422, { ok: false, message: 'Plan name is required.' });
    if (!['active', 'paused', 'completed', 'cancelled'].includes(payload.status)) return json(422, { ok: false, message: 'Choose a valid plan status.' });

    const [plan] = payload.planId ? await db.sql`
      update maintenance_plans
      set client_id = ${payload.clientId || null}, property_id = ${payload.propertyId || null}, plan_name = ${payload.planName},
          plan_type = ${payload.planType}, frequency = ${payload.frequency}, next_due_date = ${payload.nextDueDate || null}::date,
          assigned_worker_id = ${payload.assignedWorkerId || null}, status = ${payload.status}, notes = ${payload.notes || null}, updated_at = now()
      where id = ${payload.planId}
      returning *
    ` : await db.sql`
      insert into maintenance_plans (client_id, property_id, plan_name, plan_type, frequency, next_due_date, assigned_worker_id, status, notes, created_by)
      values (${payload.clientId || null}, ${payload.propertyId || null}, ${payload.planName}, ${payload.planType}, ${payload.frequency}, ${payload.nextDueDate || null}::date, ${payload.assignedWorkerId || null}, ${payload.status}, ${payload.notes || null}, ${session.user_id})
      returning *
    `;

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (${session.user_id}, ${payload.planId ? 'maintenance_plan.updated' : 'maintenance_plan.created'}, ${'maintenance_plan'}, ${plan.id}, ${JSON.stringify({ planName: plan.plan_name, frequency: plan.frequency })}::jsonb)
    `;
    return json(200, { ok: true, plan: mapPlan(plan) });
  } catch (error) {
    console.error('Failed to manage maintenance plans', error);
    return json(500, { ok: false, message: 'Maintenance plans are not available right now.' });
  }
};

export const config = { path: '/api/admin/maintenance-plans' };
