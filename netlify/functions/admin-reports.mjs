import {
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const loadSession = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load admin reports permissions; using role defaults',
  });
  return getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toCsv = (rows = []) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(headers.map((header) => csvEscape(row[header])).join(',')));
  return lines.join('\n');
};

const csvResponse = (rows, filename) => ({
  statusCode: 200,
  headers: {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename=\"${filename}\"`,
    'cache-control': 'no-store',
  },
  body: toCsv(rows),
});

const getInventoryRows = async (db) => {
  const rows = await db.sql`
    select name, sku, category, supplier, unit, quantity_on_hand, reorder_point, is_active
    from inventory_items
    order by name
  `;
  return rows.map((row) => ({
    name: row.name,
    sku: row.sku || '',
    category: row.category || '',
    supplier: row.supplier || '',
    unit: row.unit || 'each',
    quantity_on_hand: Number(row.quantity_on_hand || 0),
    reorder_point: Number(row.reorder_point || 0),
    stock_status: Number(row.quantity_on_hand || 0) <= Number(row.reorder_point || 0) ? 'low' : 'ok',
    is_active: Boolean(row.is_active),
  }));
};

const getInvoiceAgingRows = async (db) => {
  const rows = await db.sql`
    select id, title, requester_name, amount_due_cents, status, created_at,
      greatest(0, floor(extract(epoch from (now() - created_at)) / 86400))::int as age_days
    from invoices
    where status = 'open'
    order by created_at asc
  `;
  return rows.map((row) => ({
    invoice_id: row.id,
    title: row.title || '',
    requester_name: row.requester_name || '',
    status: row.status,
    amount_due: (Number(row.amount_due_cents || 0) / 100).toFixed(2),
    created_at: row.created_at,
    age_days: Number(row.age_days || 0),
    aging_bucket: Number(row.age_days || 0) <= 30 ? '0-30' : Number(row.age_days || 0) <= 60 ? '31-60' : Number(row.age_days || 0) <= 90 ? '61-90' : '90+',
  }));
};

const getThroughputRows = async (db) => {
  const rows = await db.sql`
    select status, count(*)::int as count
    from job_requests
    group by status
    order by status
  `;
  return rows.map((row) => ({ status: row.status, count: Number(row.count || 0) }));
};

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });
    const permissionKeys = await loadAccess(db, session.user_id);
    if (!permissionKeys.includes('admin.activity.view') && !permissionKeys.includes('admin.inventory.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin reporting access is required.' });
    }

    const url = new URL(request.url);
    const report = (url.searchParams.get('report') || 'inventory').trim().toLowerCase();
    const format = (url.searchParams.get('format') || 'json').trim().toLowerCase();

    const rows = report === 'invoice-aging'
      ? await getInvoiceAgingRows(db)
      : report === 'throughput'
        ? await getThroughputRows(db)
        : await getInventoryRows(db);

    if (format === 'csv') {
      const filename = report === 'invoice-aging' ? 'invoice-aging.csv' : report === 'throughput' ? 'throughput-metrics.csv' : 'inventory.csv';
      return csvResponse(rows, filename);
    }

    return json(200, { ok: true, report, count: rows.length, rows });
  } catch (error) {
    console.error('Failed to load admin report', error);
    return json(500, { ok: false, message: 'We could not load reports right now.' });
  }
};

export const config = { path: '/api/admin/reports' };
