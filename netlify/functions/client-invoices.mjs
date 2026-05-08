import {
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
} from './auth-utils.mjs';

const mapDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const mapInvoice = (invoice) => ({
  id: invoice.id,
  jobRequestId: invoice.job_request_id,
  status: invoice.status,
  title: invoice.title,
  amountCents: invoice.amount_cents,
  dueAt: mapDate(invoice.due_at),
  paidAt: mapDate(invoice.paid_at),
  createdAt: invoice.created_at,
  updatedAt: invoice.updated_at,
  jobRequest: invoice.job_request_id ? {
    id: invoice.job_request_id,
    status: invoice.job_request_status,
    serviceType: invoice.service_type,
    city: invoice.city,
    streetAddress: invoice.street_address,
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
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;

  return roles.map((role) => role.key);
};

const listClientInvoices = async (db, userId) => {
  const invoices = await db.sql`
    select
      invoices.id,
      invoices.job_request_id,
      invoices.status,
      invoices.title,
      invoices.amount_cents,
      invoices.due_at,
      invoices.paid_at,
      invoices.created_at,
      invoices.updated_at,
      job_requests.status as job_request_status,
      job_requests.service_type,
      job_requests.city,
      job_requests.street_address
    from invoices
    left join job_requests on job_requests.id = invoices.job_request_id
      and job_requests.client_id = ${userId}
    where invoices.client_id = ${userId}
      and invoices.status <> 'paid'
    order by invoices.created_at desc
    limit 25
  `;

  const mappedInvoices = invoices.map(mapInvoice);

  return {
    invoices: mappedInvoices,
    summary: {
      total: mappedInvoices.length,
      open: mappedInvoices.filter((invoice) => invoice.status === 'open').length,
      amountDueCents: mappedInvoices.filter((invoice) => invoice.status === 'open').reduce((sum, invoice) => sum + (invoice.amountCents || 0), 0),
    },
  };
};

export const createClientInvoicesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to view invoices.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const roleKeys = await loadRoleKeys(db, session.user_id);

    if (!roleKeys.includes('client') && !roleKeys.includes('admin')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client role required to view invoices.' });
    }

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
      ...(await listClientInvoices(db, session.user_id)),
    });
  } catch (error) {
    console.error('Failed to load client invoices', error);

    return json(500, { ok: false, message: 'We could not load invoices right now.' });
  }
};

export default createClientInvoicesHandler();

export const config = {
  path: '/api/client/invoices',
};
