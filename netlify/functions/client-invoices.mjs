import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';
import { WORKFLOW } from './workflow-state.mjs';
import { createSquarePaymentLink } from './square-utils.mjs';

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

const isStaffRole = (roleKeys = []) => roleKeys.some((role) => ['owner', 'admin', 'manager'].includes(role));
const resolveClientUserId = (request, session, roleKeys) => {
  const requested = clean(new URL(request.url).searchParams.get('clientId'), 80);
  return requested && isStaffRole(roleKeys) ? requested : session.user_id;
};
const loadClientInvoiceRows = async (db, userId) => db.sql`
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
      and invoices.status <> 'void'
    order by invoices.created_at desc
    limit 50
  `;

const summarizeClientInvoices = (invoices = []) => ({
  invoices,
  summary: {
    total: invoices.length,
    open: invoices.filter((invoice) => WORKFLOW.invoiceActive.includes(invoice.status)).length,
    paid: invoices.filter((invoice) => WORKFLOW.invoiceHistory.includes(invoice.status)).length,
    amountDueCents: invoices.filter((invoice) => WORKFLOW.invoiceActive.includes(invoice.status)).reduce((sum, invoice) => sum + (invoice.amountCents || 0), 0),
  },
});

const createSquareLinkForInvoice = async ({ invoice, request }) => {
  if (!invoice || Number(invoice.amount_cents || 0) <= 0) return null;
  return createSquarePaymentLink({
    invoice,
    request,
    idempotencyKey: `client-invoice-${invoice.id}-${invoice.amount_cents}`,
    includeMetadata: false,
  });
};

const ensureClientInvoiceLinks = async (db, request, invoices = []) => {
  for (const invoice of invoices) {
    if (!WORKFLOW.invoiceActive.includes(invoice.status) || invoice.provider_checkout_url || invoice.amount_cents <= 0) continue;
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
  if (request.method === 'OPTIONS') return json(204, { ok: true });
  if (request.method === 'HEAD') return json(200, { ok: true });
  if (!['GET', 'POST'].includes(request.method)) {
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

    const canUseClientWorkspace = roleKeys.includes('client') || permissionKeys.includes('dashboard.view.client') || permissionKeys.includes('client.tools') || permissionKeys.includes('dashboard.switch_views') || isStaffRole(roleKeys);
    if (!canUseClientWorkspace) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Client workspace access is required to view invoices.' });
    }

    const clientUserId = resolveClientUserId(request, session, roleKeys);
    const rows = await loadClientInvoiceRows(db, clientUserId);

    if (request.method === 'POST') {
      const body = await parseJsonBody(request);
      if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
      const invoiceId = clean(body.invoiceId || body.id, 80);
      const action = clean(body.action, 40).toLowerCase();
      if (!invoiceId || !['payment_link', 'pay', 'square_payment_link'].includes(action)) {
        return json(422, { ok: false, missing: ['invoiceId', 'action'], message: 'Invoice and payment_link action are required.' });
      }
      const invoice = rows.find((row) => String(row.id) === invoiceId && WORKFLOW.invoiceActive.includes(row.status));
      if (!invoice) return json(404, { ok: false, message: 'Open invoice not found.' });
      if (!invoice.provider_checkout_url) await ensureClientInvoiceLinks(db, request, [invoice]);
      const [updated] = await db.sql`select id, provider_checkout_url, provider_checkout_id, provider_status from invoices where id = ${invoiceId} limit 1`;
      if (!updated?.provider_checkout_url) return json(503, { ok: false, message: 'Square payment link is not available. Please contact support.' });
      return json(200, { ok: true, invoiceId, provider: { name: 'square', checkoutUrl: updated.provider_checkout_url, checkoutId: updated.provider_checkout_id, status: updated.provider_status || 'created' } });
    }

    await ensureClientInvoiceLinks(db, request, rows);
    const refreshedRows = await loadClientInvoiceRows(db, clientUserId);
    const invoiceData = summarizeClientInvoices(refreshedRows.map(mapInvoice));
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
