import {
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const cents = (value) => Number(value || 0);

const PAYMENT_INTELLIGENCE_VERSION = 'phase22-payment-accounting-v1';

const daysUntil = (dateValue) => {
  if (!dateValue) return null;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
};

const buildPaymentPlan = (invoice) => {
  const amount = cents(invoice.amount_cents);
  const dueInDays = daysUntil(invoice.due_at);
  const isOpen = invoice.status === 'open';
  const isPaid = invoice.status === 'paid';
  const hasCheckout = Boolean(invoice.provider_checkout_url);
  const overdue = isOpen && dueInDays !== null && dueInDays < 0;
  const highValue = amount >= 100000;
  const depositRecommended = amount >= 75000 && isOpen;

  let readinessScore = 100;
  const actions = [];
  const warnings = [];

  if (isOpen && !hasCheckout) {
    readinessScore -= 25;
    actions.push('Create or attach a payment link before sending/reminding the customer.');
  }
  if (isOpen && !invoice.due_at) {
    readinessScore -= 15;
    actions.push('Set a due date for payment tracking.');
  }
  if (overdue) {
    readinessScore -= 30;
    warnings.push(`Invoice is overdue by ${Math.abs(dueInDays)} day(s).`);
    actions.push('Send payment reminder or follow up with customer.');
  }
  if (depositRecommended) {
    actions.push('Consider deposit + final payment split for larger job.');
  }
  if (isPaid && !invoice.paid_at) {
    readinessScore -= 10;
    actions.push('Confirm paid timestamp/payment record.');
  }
  if (highValue) {
    warnings.push('High-value invoice: verify scope, tax, deposit/final terms, and payment method fees.');
  }

  const paymentStructure = depositRecommended
    ? {
        recommended: 'deposit_plus_final',
        depositPercent: 50,
        depositAmountCents: Math.round(amount * 0.5),
        finalAmountCents: amount - Math.round(amount * 0.5),
      }
    : {
        recommended: 'single_payment',
        depositPercent: 0,
        depositAmountCents: 0,
        finalAmountCents: amount,
      };

  return {
    version: PAYMENT_INTELLIGENCE_VERSION,
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    dueInDays,
    overdue,
    hasCheckout,
    highValue,
    depositRecommended,
    paymentStructure,
    actions,
    warnings,
    closeoutStatus: isPaid ? 'paid_closeout_ready' : overdue ? 'overdue_followup' : isOpen ? 'open_payment_pending' : 'review',
  };
};


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
  paymentPlan: buildPaymentPlan(invoice),
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
