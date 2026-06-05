import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  parseJsonBody,
} from './auth-utils.mjs';

const INVOICE_FILTERS = new Set(['open', 'paid', 'all', 'void']);
const INVOICE_STATUSES = new Set(['open', 'paid', 'void']);

const normalizeInvoiceFilter = (value) => {
  const filter = clean(value, 20) || 'open';
  return INVOICE_FILTERS.has(filter) ? filter : 'open';
};


const normalizeCreatePayload = (body = {}) => ({
  jobRequestId: clean(body.jobRequestId || body.requestId, 80),
  quoteId: clean(body.quoteId, 80),
  clientId: clean(body.clientId, 80),
  title: clean(body.title, 180),
  amountCents: Number(body.amountCents),
  dueAt: clean(body.dueAt || body.dueDate, 80),
});

const normalizeStatusPayload = (body = {}) => ({
  invoiceId: clean(body.invoiceId || body.id, 80),
  status: clean(body.status, 20).toLowerCase(),
  action: clean(body.action, 40).toLowerCase(),
});

const normalizePaymentPayload = (body = {}) => ({
  invoiceId: clean(body.invoiceId, 80),
  amountCents: body.amountCents === undefined || body.amountCents === '' ? null : Number(body.amountCents),
  method: clean(body.method, 80),
  reference: clean(body.reference, 160),
});

const RESERVED_INVOICE_TITLES = new Set(['invoice & payment desk']);

const getInvoiceTitle = (invoice = {}) => {
  const rawTitle = clean(invoice.title, 180);
  if (rawTitle && !RESERVED_INVOICE_TITLES.has(rawTitle.toLowerCase())) return rawTitle;
  const service = clean(invoice.service_type, 120) || 'Completed work';
  const client = clean(invoice.client_full_name || invoice.client_email, 120);
  return `${service}${client ? ` — ${client}` : ''} invoice`;
};

const mapInvoice = (invoice) => ({
  id: invoice.id,
  jobRequestId: invoice.job_request_id,
  clientId: invoice.client_id,
  status: invoice.status,
  title: getInvoiceTitle(invoice),
  amountCents: invoice.amount_cents,
  dueAt: invoice.due_at,
  paidAt: invoice.paid_at,
  createdAt: invoice.created_at,
  updatedAt: invoice.updated_at,
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
    invoiceId: invoice.provider_invoice_id,
    checkoutId: invoice.provider_checkout_id,
    checkoutUrl: invoice.provider_checkout_url,
    status: invoice.provider_status,
    metadata: invoice.provider_metadata || {},
  },
  payment: invoice.payment_confirmed_at ? {
    amountCents: invoice.payment_amount_cents,
    method: invoice.payment_method,
    reference: invoice.payment_reference,
    confirmedAt: invoice.payment_confirmed_at,
    provider: {
      name: invoice.payment_payment_provider || 'manual',
      paymentId: invoice.payment_provider_payment_id,
      status: invoice.payment_provider_status,
      receiptUrl: invoice.payment_provider_receipt_url,
      metadata: invoice.payment_provider_metadata || {},
    },
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
  const roleKeys = roles.map((role) => role.key);

  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load admin invoice permissions; using role defaults',
  });

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
  };
};

const selectAdminInvoiceRows = async (db, filter) => {
  if (filter === 'void') {
    return await db.sql`
      select
        invoices.id, invoices.job_request_id, invoices.client_id, invoices.status, invoices.title, invoices.amount_cents, invoices.due_at, invoices.paid_at, invoices.created_at, invoices.updated_at,
        invoices.payment_provider, invoices.provider_invoice_id, invoices.provider_checkout_id, invoices.provider_checkout_url, invoices.provider_status, invoices.provider_metadata,
        clients.full_name as client_full_name, clients.email as client_email, clients.phone as client_phone,
        job_requests.status as job_request_status, job_requests.service_type, job_requests.city, job_requests.street_address,
        null::integer as payment_amount_cents, null::text as payment_method, null::text as payment_reference, null::timestamptz as payment_confirmed_at,
        null::text as payment_payment_provider, null::text as payment_provider_payment_id, null::text as payment_provider_status, null::text as payment_provider_receipt_url, '{}'::jsonb as payment_provider_metadata
      from invoices
      left join app_users clients on clients.id = invoices.client_id
      left join job_requests on job_requests.id = invoices.job_request_id
      where invoices.status = 'void'
      order by invoices.updated_at desc
      limit 75
    `;
  }
  if (filter === 'paid') {
    return await db.sql`
      select
        invoices.id,
        invoices.job_request_id,
        invoices.client_id,
        invoices.status,
        invoices.title,
        invoices.amount_cents,
        invoices.due_at,
        invoices.paid_at,
        invoices.created_at,
        invoices.updated_at,
        invoices.payment_provider,
        invoices.provider_invoice_id,
        invoices.provider_checkout_id,
        invoices.provider_checkout_url,
        invoices.provider_status,
        invoices.provider_metadata,
        clients.full_name as client_full_name,
        clients.email as client_email,
        clients.phone as client_phone,
        job_requests.status as job_request_status,
        job_requests.service_type,
        job_requests.city,
        job_requests.street_address,
        latest_payment.amount_cents as payment_amount_cents,
        latest_payment.method as payment_method,
        latest_payment.reference as payment_reference,
        latest_payment.confirmed_at as payment_confirmed_at,
        latest_payment.payment_provider as payment_payment_provider,
        latest_payment.provider_payment_id as payment_provider_payment_id,
        latest_payment.provider_status as payment_provider_status,
        latest_payment.provider_receipt_url as payment_provider_receipt_url,
        latest_payment.provider_metadata as payment_provider_metadata
      from invoices
      left join app_users clients on clients.id = invoices.client_id
      left join job_requests on job_requests.id = invoices.job_request_id
      left join lateral (
        select payments.amount_cents, payments.method, payments.reference, payments.confirmed_at, payments.payment_provider, payments.provider_payment_id, payments.provider_status, payments.provider_receipt_url, payments.provider_metadata
        from payments
        where payments.invoice_id = invoices.id
        order by payments.confirmed_at desc
        limit 1
      ) latest_payment on true
      where invoices.status = ${'paid'}
      order by coalesce(invoices.paid_at, latest_payment.confirmed_at, invoices.updated_at) desc
      limit 75
    `;
  }

  if (filter === 'all') {
    return await db.sql`
      select
        invoices.id,
        invoices.job_request_id,
        invoices.client_id,
        invoices.status,
        invoices.title,
        invoices.amount_cents,
        invoices.due_at,
        invoices.paid_at,
        invoices.created_at,
        invoices.updated_at,
        invoices.payment_provider,
        invoices.provider_invoice_id,
        invoices.provider_checkout_id,
        invoices.provider_checkout_url,
        invoices.provider_status,
        invoices.provider_metadata,
        clients.full_name as client_full_name,
        clients.email as client_email,
        clients.phone as client_phone,
        job_requests.status as job_request_status,
        job_requests.service_type,
        job_requests.city,
        job_requests.street_address,
        latest_payment.amount_cents as payment_amount_cents,
        latest_payment.method as payment_method,
        latest_payment.reference as payment_reference,
        latest_payment.confirmed_at as payment_confirmed_at,
        latest_payment.payment_provider as payment_payment_provider,
        latest_payment.provider_payment_id as payment_provider_payment_id,
        latest_payment.provider_status as payment_provider_status,
        latest_payment.provider_receipt_url as payment_provider_receipt_url,
        latest_payment.provider_metadata as payment_provider_metadata
      from invoices
      left join app_users clients on clients.id = invoices.client_id
      left join job_requests on job_requests.id = invoices.job_request_id
      left join lateral (
        select payments.amount_cents, payments.method, payments.reference, payments.confirmed_at, payments.payment_provider, payments.provider_payment_id, payments.provider_status, payments.provider_receipt_url, payments.provider_metadata
        from payments
        where payments.invoice_id = invoices.id
        order by payments.confirmed_at desc
        limit 1
      ) latest_payment on true
      where invoices.status <> ${'void'}
      order by invoices.created_at desc
      limit 75
    `;
  }

  return await db.sql`
    select
      invoices.id,
      invoices.job_request_id,
      invoices.client_id,
      invoices.status,
      invoices.title,
      invoices.amount_cents,
      invoices.due_at,
      invoices.paid_at,
      invoices.created_at,
      invoices.updated_at,
      invoices.payment_provider,
      invoices.provider_invoice_id,
      invoices.provider_checkout_id,
      invoices.provider_checkout_url,
      invoices.provider_status,
      invoices.provider_metadata,
      clients.full_name as client_full_name,
      clients.email as client_email,
      clients.phone as client_phone,
      job_requests.status as job_request_status,
      job_requests.service_type,
      job_requests.city,
      job_requests.street_address,
      latest_payment.amount_cents as payment_amount_cents,
      latest_payment.method as payment_method,
      latest_payment.reference as payment_reference,
      latest_payment.confirmed_at as payment_confirmed_at,
      latest_payment.payment_provider as payment_payment_provider,
      latest_payment.provider_payment_id as payment_provider_payment_id,
      latest_payment.provider_status as payment_provider_status,
      latest_payment.provider_receipt_url as payment_provider_receipt_url,
      latest_payment.provider_metadata as payment_provider_metadata
    from invoices
    left join app_users clients on clients.id = invoices.client_id
    left join job_requests on job_requests.id = invoices.job_request_id
    left join lateral (
      select payments.amount_cents, payments.method, payments.reference, payments.confirmed_at, payments.payment_provider, payments.provider_payment_id, payments.provider_status, payments.provider_receipt_url, payments.provider_metadata
      from payments
      where payments.invoice_id = invoices.id
      order by payments.confirmed_at desc
      limit 1
    ) latest_payment on true
    where invoices.status = ${'open'}
    order by invoices.created_at desc
    limit 75
  `;
};

const listAdminInvoices = async (db, filter = 'open') => {
  const mappedInvoices = (await selectAdminInvoiceRows(db, filter)).map(mapInvoice);
  const openInvoices = mappedInvoices.filter((invoice) => invoice.status === 'open');
  const paidInvoices = mappedInvoices.filter((invoice) => invoice.status === 'paid');

  return {
    filter,
    invoices: mappedInvoices,
    summary: {
      open: openInvoices.length,
      paid: paidInvoices.length,
      amountDueCents: openInvoices.reduce((sum, invoice) => sum + (invoice.amountCents || 0), 0),
      amountCollectedCents: paidInvoices.reduce((sum, invoice) => sum + (invoice.payment?.amountCents || invoice.amountCents || 0), 0),
    },
  };
};


const handlePost = async ({ request, db, session }) => {
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const payload = normalizeCreatePayload(body);

  if (!payload.jobRequestId && !payload.quoteId) {
    return json(422, { ok: false, missing: ['jobRequestId or quoteId'], message: 'A job request or accepted quote is required to create an invoice.' });
  }
  if (!Number.isInteger(payload.amountCents) || payload.amountCents <= 0) {
    return json(422, { ok: false, missing: ['amountCents'], message: 'Invoice amount must be a positive amount in cents.' });
  }

  const [source] = payload.quoteId ? await db.sql`
    select quotes.id as quote_id, quotes.job_request_id, quotes.client_id, quotes.title, quotes.amount_cents, job_requests.service_type, clients.full_name as client_full_name, clients.email as client_email
    from quotes
    left join job_requests on job_requests.id = quotes.job_request_id
    left join app_users clients on clients.id = quotes.client_id
    where quotes.id = ${payload.quoteId}
      and quotes.status = 'accepted'
    limit 1
  ` : await db.sql`
    select null::uuid as quote_id, job_requests.id as job_request_id, coalesce(job_requests.client_id, ${payload.clientId || null}::uuid) as client_id, job_requests.service_type as title, null::integer as amount_cents, job_requests.service_type, clients.full_name as client_full_name, clients.email as client_email
    from job_requests
    left join app_users clients on clients.id = job_requests.client_id
    where job_requests.id = ${payload.jobRequestId}
    limit 1
  `;

  if (!source?.job_request_id) {
    return json(404, { ok: false, message: payload.quoteId ? 'Accepted quote not found.' : 'Job request not found.' });
  }

  const title = payload.title || getInvoiceTitle(source);
  const dueAt = payload.dueAt || null;
  const [invoice] = await db.sql`
    insert into invoices (job_request_id, client_id, quote_id, status, title, amount_cents, due_at, created_by)
    values (${source.job_request_id}, ${source.client_id || payload.clientId || null}, ${source.quote_id || null}, 'open', ${title}, ${payload.amountCents}, coalesce(nullif(${dueAt}, '')::timestamptz, now() + interval '14 days'), ${session.user_id})
    on conflict (job_request_id) do update set
      client_id = coalesce(excluded.client_id, invoices.client_id),
      quote_id = coalesce(excluded.quote_id, invoices.quote_id),
      status = case when invoices.status = 'void' then 'open' else invoices.status end,
      title = excluded.title,
      amount_cents = excluded.amount_cents,
      due_at = excluded.due_at,
      updated_at = now()
    returning id, job_request_id, client_id, status, title, amount_cents, due_at, paid_at, created_at, updated_at
  `;

  await db.sql`update job_requests set status = 'waiting_payment', updated_at = now() where id = ${invoice.job_request_id}`;
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, 'invoice.created', 'invoice', ${invoice.id}, ${JSON.stringify({ source: 'admin_dashboard', quoteId: source.quote_id, jobRequestId: invoice.job_request_id })}::jsonb)
  `;

  return json(201, { ok: true, authenticated: true, authorized: true, message: 'Invoice created.', invoice: mapInvoice(invoice) });
};

const handleDelete = async ({ request, db, session }) => {
  const url = new URL(request.url);
  const body = await parseJsonBody(request).catch(() => ({}));
  const invoiceId = clean(body?.invoiceId || body?.id || url.searchParams.get('invoiceId') || url.searchParams.get('id'), 80);
  if (!invoiceId) return json(422, { ok: false, missing: ['invoiceId'], message: 'Invoice is required.' });
  const [invoice] = await db.sql`
    update invoices
    set status = 'void', provider_status = coalesce(provider_status, 'void'), updated_at = now()
    where id = ${invoiceId} and status <> 'paid'
    returning id, job_request_id, client_id, status, title, amount_cents, due_at, paid_at, created_at, updated_at
  `;
  if (!invoice) return json(404, { ok: false, message: 'Cancelable invoice not found.' });
  await db.sql`insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata) values (${session.user_id}, 'invoice.voided', 'invoice', ${invoice.id}, ${JSON.stringify({ source: 'admin_dashboard' })}::jsonb)`;
  return json(200, { ok: true, authenticated: true, authorized: true, message: 'Invoice voided.', invoice: mapInvoice(invoice) });
};

const handlePatch = async ({ request, db, session }) => {
  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const statusPayload = normalizeStatusPayload(body);
  if (statusPayload.action === 'void' || statusPayload.action === 'cancel' || statusPayload.status === 'void') {
    return handleDelete({ request, db, session });
  }
  if (statusPayload.invoiceId && statusPayload.status && INVOICE_STATUSES.has(statusPayload.status) && statusPayload.status !== 'paid') {
    const [invoice] = await db.sql`update invoices set status = ${statusPayload.status}, updated_at = now() where id = ${statusPayload.invoiceId} returning id, job_request_id, client_id, status, title, amount_cents, due_at, paid_at, created_at, updated_at`;
    if (!invoice) return json(404, { ok: false, message: 'Invoice not found.' });
    return json(200, { ok: true, authenticated: true, authorized: true, message: 'Invoice status updated.', invoice: mapInvoice(invoice) });
  }

  const payload = normalizePaymentPayload(body);

  if (!payload.invoiceId) {
    return json(422, { ok: false, message: 'Invoice is required.' });
  }

  if (payload.amountCents !== null && (!Number.isInteger(payload.amountCents) || payload.amountCents <= 0)) {
    return json(422, { ok: false, message: 'Payment amount must be a positive amount in cents.' });
  }

  const [openInvoice] = await db.sql`
    select id, job_request_id, client_id, status, title, amount_cents, due_at, paid_at, created_at, updated_at
    from invoices
    where id = ${payload.invoiceId}
      and status = ${'open'}
    limit 1
  `;

  if (!openInvoice) {
    return json(404, { ok: false, authenticated: true, authorized: true, message: 'Open invoice not found.' });
  }

  const paymentAmountCents = payload.amountCents ?? openInvoice.amount_cents ?? 0;

  if (paymentAmountCents !== openInvoice.amount_cents) {
    return json(422, { ok: false, message: 'Payment amount must match the open invoice balance.' });
  }

  const [invoice] = await db.sql`
    update invoices
    set status = ${'paid'},
        paid_at = now(),
        updated_at = now()
    where id = ${openInvoice.id}
      and status = ${'open'}
    returning id, job_request_id, client_id, status, title, amount_cents, due_at, paid_at, created_at, updated_at
  `;

  const [payment] = await db.sql`
    insert into payments (invoice_id, job_request_id, client_id, amount_cents, method, reference, confirmed_by)
    values (${invoice.id}, ${invoice.job_request_id}, ${invoice.client_id}, ${paymentAmountCents}, ${payload.method || null}, ${payload.reference || null}, ${session.user_id})
    returning id, invoice_id, amount_cents, method, reference, confirmed_at
  `;

  await db.sql`
    update job_requests
    set status = ${'completed'},
        completion_date = coalesce(completion_date, now()::date),
        updated_at = now()
    where id = ${invoice.job_request_id}
  `;

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (
      ${session.user_id},
      ${'payment.confirmed'},
      ${'invoice'},
      ${invoice.id},
      ${JSON.stringify({ source: 'admin_dashboard', jobRequestId: invoice.job_request_id, paymentId: payment.id, amountCents: paymentAmountCents })}::jsonb
    )
  `;

  return json(200, {
    ok: true,
    authenticated: true,
    authorized: true,
    invoice: mapInvoice(invoice),
    payment: {
      id: payment.id,
      invoiceId: payment.invoice_id,
      amountCents: payment.amount_cents,
      method: payment.method,
      reference: payment.reference,
      confirmedAt: payment.confirmed_at,
    },
  });
};

export const createAdminInvoicesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to manage invoices.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const { roleKeys, permissionKeys } = await loadAccess(db, session.user_id);

    if (!permissionKeys.includes('admin.invoices.manage') && !permissionKeys.includes('invoices.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin invoice management permission is required.' });
    }

    if (request.method === 'POST') {
      return await handlePost({ request, db, session });
    }
    if (request.method === 'PATCH') {
      return await handlePatch({ request, db, session });
    }
    if (request.method === 'DELETE') {
      return await handleDelete({ request, db, session });
    }

    const invoiceFilter = normalizeInvoiceFilter(new URL(request.url).searchParams.get('status'));

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
      ...(await listAdminInvoices(db, invoiceFilter)),
    });
  } catch (error) {
    console.error('Failed to load admin invoices', error);

    return json(500, { ok: false, message: 'We could not load invoices right now.' });
  }
};

export default createAdminInvoicesHandler();

export const config = {
  path: '/api/admin/invoices',
};
