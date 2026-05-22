import {
  clean,
  getPermissionKeysForRoles,
  getSiteUrl,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const SQUARE_API_VERSION = clean(process.env.SQUARE_API_VERSION, 40) || '2026-01-22';
const SQUARE_ENVIRONMENT = (clean(process.env.SQUARE_ENVIRONMENT, 20) || 'production').toLowerCase();
const SQUARE_ACCESS_TOKEN = clean(process.env.SQUARE_ACCESS_TOKEN, 400);
const SQUARE_LOCATION_ID = clean(process.env.SQUARE_LOCATION_ID, 120);
const SQUARE_REDIRECT_BASE_URL = clean(process.env.SQUARE_REDIRECT_BASE_URL, 500).replace(/\/$/, '');

const squareApiBase = () => SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const getSquareRedirectBaseUrl = (request) => {
  if (SQUARE_REDIRECT_BASE_URL) return SQUARE_REDIRECT_BASE_URL;
  return getSiteUrl(request);
};

const mapDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const RESERVED_INVOICE_TITLES = new Set(['invoice & payment desk']);

const getInvoiceTitle = (invoice = {}) => {
  const rawTitle = String(invoice.title || '').trim();
  if (rawTitle && !RESERVED_INVOICE_TITLES.has(rawTitle.toLowerCase())) return rawTitle;
  const service = String(invoice.service_type || '').trim() || 'Completed work';
  return `${service} invoice`;
};

const mapInvoice = (invoice) => ({
  id: invoice.id,
  jobRequestId: invoice.job_request_id,
  status: invoice.status,
  title: getInvoiceTitle(invoice),
  amountCents: invoice.amount_cents,
  dueAt: mapDate(invoice.due_at),
  paidAt: mapDate(invoice.paid_at),
  provider: {
    name: invoice.payment_provider || 'manual',
    invoiceId: invoice.provider_invoice_id,
    checkoutId: invoice.provider_checkout_id,
    checkoutUrl: invoice.provider_checkout_url,
    status: invoice.provider_status,
    metadata: invoice.provider_metadata || {},
  },
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

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key, roles.name
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const assignedRoleKeys = roles.map((role) => role.key);
  const roleKeys = assignedRoleKeys.length ? assignedRoleKeys : ['client'];

  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load client invoice permissions; using role defaults',
  });

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
  };
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
      invoices.payment_provider,
      invoices.provider_invoice_id,
      invoices.provider_checkout_id,
      invoices.provider_checkout_url,
      invoices.provider_status,
      invoices.provider_metadata,
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

const createSquareLinkForInvoice = async ({ invoice, request }) => {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) return null;
  const payload = {
    idempotency_key: `client-invoice-${invoice.id}-${invoice.amount_cents}`,
    quick_pay: {
      name: invoice.title || `Invoice ${invoice.id}`,
      price_money: { amount: invoice.amount_cents, currency: 'USD' },
      location_id: SQUARE_LOCATION_ID,
      reference_id: invoice.id,
      note: `Portal invoice ${invoice.id}`,
    },
    checkout_options: {
      ask_for_shipping_address: false,
      accepted_payment_methods: { card: true, square_gift_card: false, bank_account: true },
      redirect_url: new URL('/dashboard/?workspace=invoices', getSquareRedirectBaseUrl(request)).toString(),
    },
  };
  const response = await fetch(`${squareApiBase()}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'content-type': 'application/json',
      'square-version': SQUARE_API_VERSION,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result?.errors?.map((error) => error.detail).filter(Boolean).join('; ') || 'Square request failed.';
    throw new Error(detail);
  }
  return {
    checkoutId: clean(result?.payment_link?.id, 120),
    checkoutUrl: clean(result?.payment_link?.url, 500),
    providerStatus: clean(result?.payment_link?.version ? 'pending' : 'created', 40) || 'created',
  };
};

const ensureClientInvoiceLinks = async (db, request, invoices = []) => {
  for (const invoice of invoices) {
    if (invoice.status !== 'open' || invoice.provider_checkout_url || invoice.amount_cents <= 0) continue;
    try {
      const link = await createSquareLinkForInvoice({ invoice, request });
      if (!link?.checkoutUrl) continue;
      await db.sql`
        update invoices
        set payment_provider = coalesce(payment_provider, 'square'),
            provider_checkout_id = ${link.checkoutId || null},
            provider_checkout_url = ${link.checkoutUrl},
            provider_status = ${link.providerStatus || 'created'},
            updated_at = now()
        where id = ${invoice.id}
      `;
      invoice.payment_provider = 'square';
      invoice.provider_checkout_id = link.checkoutId || null;
      invoice.provider_checkout_url = link.checkoutUrl;
      invoice.provider_status = link.providerStatus || 'created';
    } catch (error) {
      console.error('Failed to auto-create Square link for client invoice', invoice.id, error);
    }
  }
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

    const { roleKeys, permissionKeys } = await loadAccess(db, session.user_id);

    if (!permissionKeys.includes('client.invoices.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client invoice permission is required.' });
    }

    const invoiceData = await listClientInvoices(db, session.user_id);
    await ensureClientInvoiceLinks(db, request, invoiceData.invoices.map((invoice) => ({
      id: invoice.id,
      title: invoice.title,
      status: invoice.status,
      amount_cents: invoice.amountCents,
      provider_checkout_url: invoice.provider?.checkoutUrl,
    })));
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
      ...invoiceData,
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
