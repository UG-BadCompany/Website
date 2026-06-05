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
import { createSquarePaymentLink } from './square-utils.mjs';

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
    if (!permissionKeys.includes('admin.invoices.manage') && !permissionKeys.includes('invoices.manage')) {
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

    const link = await createSquarePaymentLink({
      invoice: { ...invoice, amount_cents: desiredAmount },
      request,
      includeMetadata: true,
    });

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
