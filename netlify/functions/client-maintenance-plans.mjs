import { getSessionToken, hashToken, json, loadDatabase } from './auth-utils.mjs';

const mapDate = (value) => value ? String(value).slice(0, 10) : null;
const mapPlan = (row) => ({
  id: row.id,
  planName: row.plan_name,
  planType: row.plan_type,
  frequency: row.frequency,
  nextDueDate: mapDate(row.next_due_date),
  status: row.status,
  notes: row.notes,
  propertyLabel: row.property_label,
  propertyCity: row.property_city,
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

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const session = await loadSession(db, request);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Sign in to view maintenance plans.' });
    const plans = await db.sql`
      select maintenance_plans.*, properties.label as property_label, properties.city as property_city
      from maintenance_plans
      left join properties on properties.id = maintenance_plans.property_id
      where maintenance_plans.client_id = ${session.user_id}
         or properties.client_id = ${session.user_id}
      order by maintenance_plans.next_due_date nulls last, maintenance_plans.updated_at desc
      limit 100
    `;
    return json(200, { ok: true, plans: plans.map(mapPlan) });
  } catch (error) {
    console.error('Failed to load client maintenance plans', error);
    return json(500, { ok: false, message: 'Maintenance plans are not available right now.' });
  }
};

export const config = { path: '/api/client/maintenance-plans' };
