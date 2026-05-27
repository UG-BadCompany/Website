import {
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const cents = (value) => Number(value || 0);

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

  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load admin finance permissions; using role defaults',
  });

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
  };
};

const mapInvoice = (invoice) => ({
  id: invoice.id,
  status: invoice.status,
  title: invoice.title,
  amountCents: invoice.amount_cents,
  dueAt: invoice.due_at,
  paidAt: invoice.paid_at,
  createdAt: invoice.created_at,
  client: {
    fullName: invoice.client_full_name,
    email: invoice.client_email,
    phone: invoice.client_phone,
  },
  jobRequest: invoice.job_request_id ? {
    id: invoice.job_request_id,
    status: invoice.job_request_status,
    serviceType: invoice.service_type,
    city: invoice.city,
    streetAddress: invoice.street_address,
  } : null,
  provider: {
    name: invoice.payment_provider || 'manual',
    checkoutUrl: invoice.provider_checkout_url,
    status: invoice.provider_status,
  },
});

export default async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });
  }

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });

    const { roleKeys, permissionKeys } = await loadAccess(db, session.user_id);
    if (!permissionKeys.includes('admin.invoices.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin invoice permission is required.' });
    }

    const invoices = await db.sql`
      select
        invoices.id,
        invoices.status,
        invoices.title,
        invoices.amount_cents,
        invoices.due_at,
        invoices.paid_at,
        invoices.created_at,
        invoices.payment_provider,
        invoices.provider_checkout_url,
        invoices.provider_status,
        app_users.full_name as client_full_name,
        app_users.email as client_email,
        app_users.phone as client_phone,
        job_requests.id as job_request_id,
        job_requests.status as job_request_status,
        job_requests.service_type,
        job_requests.city,
        job_requests.street_address
      from invoices
      left join app_users on app_users.id = invoices.client_id
      left join job_requests on job_requests.id = invoices.job_request_id
      order by
        case invoices.status when 'open' then 1 when 'paid' then 2 else 3 end,
        invoices.created_at desc
      limit 150
    `;

    const now = Date.now();
    const mapped = invoices.map(mapInvoice);
    const openInvoices = mapped.filter((invoice) => invoice.status === 'open');
    const paidInvoices = mapped.filter((invoice) => invoice.status === 'paid');
    const overdueInvoices = openInvoices.filter((invoice) => invoice.dueAt && new Date(invoice.dueAt).getTime() < now);
    const missingCheckout = openInvoices.filter((invoice) => !invoice.provider.checkoutUrl);

    const stats = {
      openCount: openInvoices.length,
      paidCount: paidInvoices.length,
      overdueCount: overdueInvoices.length,
      missingCheckoutCount: missingCheckout.length,
      openAmountCents: openInvoices.reduce((sum, invoice) => sum + cents(invoice.amountCents), 0),
      paidAmountCents: paidInvoices.reduce((sum, invoice) => sum + cents(invoice.amountCents), 0),
      overdueAmountCents: overdueInvoices.reduce((sum, invoice) => sum + cents(invoice.amountCents), 0),
      squareConfigured: Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
    };

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
      stats,
      openInvoices: openInvoices.slice(0, 25),
      overdueInvoices: overdueInvoices.slice(0, 25),
      missingCheckout: missingCheckout.slice(0, 25),
      paidInvoices: paidInvoices.slice(0, 25),
    });
  } catch (error) {
    console.error('Failed to load finance overview', error);
    return json(500, { ok: false, message: 'Could not load finance overview right now.' });
  }
};

export const config = {
  path: '/api/admin/finance-overview',
};
