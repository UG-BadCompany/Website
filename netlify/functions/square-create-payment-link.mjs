import { createHash, randomUUID } from 'node:crypto';
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

const SQUARE_API_VERSION = clean(process.env.SQUARE_API_VERSION, 40) || '2026-01-22';
const SQUARE_ENVIRONMENT = (clean(process.env.SQUARE_ENVIRONMENT, 20) || 'production').toLowerCase();
const SQUARE_ACCESS_TOKEN = clean(process.env.SQUARE_ACCESS_TOKEN, 400);
const SQUARE_LOCATION_ID = clean(process.env.SQUARE_LOCATION_ID, 120);

const squareApiBase = () => SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const dollarsToCents = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
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
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load Square payment-link permissions; using role defaults',
  });
  return getPermissionKeysForRoles(roleKeys, assignedPermissionKeys);
};

const createSquareLink = async ({ invoice, request }) => {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    throw new Error('Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.');
  }

  const idempotencyKey = createHash('sha256').update(`invoice:${invoice.id}:amount:${invoice.amount_cents}`).digest('hex');
  const payload = {
    idempotency_key: idempotencyKey,
    quick_pay: {
      name: invoice.title || `Invoice ${invoice.id}`,
      price_money: {
        amount: invoice.amount_cents,
        currency: 'USD',
      },
      location_id: SQUARE_LOCATION_ID,
      reference_id: invoice.id,
      note: `Portal invoice ${invoice.id}`,
    },
    checkout_options: {
      ask_for_shipping_address: false,
      accepted_payment_methods: {
        card: true,
        square_gift_card: false,
        bank_account: true,
      },
      redirect_url: new URL('/dashboard/?workspace=invoices', request.url).toString(),
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
    orderId: clean(result?.payment_link?.order_id, 120),
    providerStatus: clean(result?.payment_link?.version ? 'pending' : 'created', 40) || 'created',
    metadata: {
      squareEnvironment: SQUARE_ENVIRONMENT,
      squareApiVersion: SQUARE_API_VERSION,
      orderId: clean(result?.payment_link?.order_id, 120),
      createdAt: new Date().toISOString(),
    },
  };
};

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });
  }

  const body = await parseJsonBody(request);
  const invoiceId = clean(body?.invoiceId, 80);
  const amountOverrideCents = body?.amountCents === undefined ? null : Number(body.amountCents);
  const amountOverrideDollars = body?.amountDollars === undefined ? null : dollarsToCents(body.amountDollars);

  if (!invoiceId) {
    return json(422, { ok: false, message: 'Invoice is required.' });
  }

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });

    const permissionKeys = await loadAccess(db, session.user_id);
    if (!permissionKeys.includes('admin.invoices.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin invoice permission is required.' });
    }

    const [invoice] = await db.sql`
      select id, title, amount_cents, status, provider_checkout_url
      from invoices
      where id = ${invoiceId}
      limit 1
    `;

    if (!invoice || invoice.status !== 'open') {
      return json(404, { ok: false, message: 'Open invoice not found.' });
    }

    const desiredAmount = amountOverrideCents || amountOverrideDollars || Number(invoice.amount_cents || 0);
    if (!Number.isInteger(desiredAmount) || desiredAmount <= 0) {
      return json(422, { ok: false, message: 'Invoice amount must be a positive number of cents.' });
    }

    const link = await createSquareLink({ invoice: { ...invoice, amount_cents: desiredAmount }, request });

    await db.sql`
      update invoices
      set payment_provider = 'square',
          provider_checkout_id = ${link.checkoutId || null},
          provider_checkout_url = ${link.checkoutUrl || null},
          provider_status = ${link.providerStatus},
          provider_metadata = coalesce(provider_metadata, '{}'::jsonb) || ${JSON.stringify(link.metadata)}::jsonb,
          updated_at = now()
      where id = ${invoice.id}
    `;

    await db.sql`
      insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
      values (
        ${session.user_id},
        'square.payment_link.created',
        'invoice',
        ${invoice.id},
        ${JSON.stringify({ checkoutId: link.checkoutId, checkoutUrl: link.checkoutUrl, amountCents: desiredAmount })}::jsonb
      )
    `;

    return json(200, {
      ok: true,
      invoiceId: invoice.id,
      provider: {
        name: 'square',
        checkoutId: link.checkoutId,
        checkoutUrl: link.checkoutUrl,
        status: link.providerStatus,
      },
    });
  } catch (error) {
    console.error('Failed to create Square payment link', error);
    return json(500, { ok: false, message: error.message || 'Could not create Square payment link.' });
  }
};

export const config = {
  path: '/api/admin/square/payment-link',
};
