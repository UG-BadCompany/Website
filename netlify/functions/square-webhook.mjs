import { createHmac, timingSafeEqual } from 'node:crypto';
import { clean, json, loadDatabase } from './auth-utils.mjs';

const SQUARE_WEBHOOK_SIGNATURE_KEY = clean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY, 300);

const verifySquareSignature = async (request, rawBody) => {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) return false;
  const signature = request.headers.get('x-square-hmacsha256-signature') || '';
  const url = request.url;
  const digest = createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(url + rawBody)
    .digest('base64');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
};

const mapPayload = (payload = {}) => {
  const payment = payload?.data?.object?.payment;
  const checkout = payload?.data?.object?.payment_link;
  return {
    eventType: clean(payload?.type, 120),
    paymentId: clean(payment?.id, 120),
    orderId: clean(payment?.order_id, 120),
    amountCents: Number(payment?.amount_money?.amount || 0),
    status: clean(payment?.status, 80).toLowerCase(),
    receiptUrl: clean(payment?.receipt_url, 500),
    checkoutId: clean(checkout?.id, 120),
  };
};

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const rawBody = await request.text();
  const verified = await verifySquareSignature(request, rawBody);
  if (!verified) {
    return json(401, { ok: false, message: 'Invalid Square webhook signature.' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, message: 'Invalid JSON payload.' });
  }

  const mapped = mapPayload(payload);
  try {
    const db = await loadDatabase();

    if (!mapped.paymentId && !mapped.checkoutId && !mapped.orderId) {
      return json(202, { ok: true, ignored: true, message: 'No payment reference in webhook.' });
    }

    const [invoice] = await db.sql`
      select id, client_id, job_request_id, amount_cents, status, provider_checkout_id, provider_checkout_url
      from invoices
      where provider_checkout_id = ${mapped.checkoutId || null}
         or provider_metadata->>'orderId' = ${mapped.orderId || null}
      limit 1
    `;

    if (!invoice) {
      await db.sql`
        insert into audit_events (event_type, entity_type, entity_id, metadata)
        values ('square.webhook.error', 'invoice', null, ${JSON.stringify({ reason: 'invoice_not_found', mapped })}::jsonb)
      `;
      return json(202, { ok: true, ignored: true, message: 'No matching invoice found.' });
    }

    const [existingPayment] = await db.sql`
      select id from payments where provider_payment_id = ${mapped.paymentId || null} limit 1
    `;

    if (!existingPayment && mapped.status === 'completed') {
      await db.sql`
        insert into payments (invoice_id, job_request_id, client_id, amount_cents, method, reference, payment_provider, provider_payment_id, provider_status, provider_receipt_url, provider_metadata)
        values (
          ${invoice.id},
          ${invoice.job_request_id},
          ${invoice.client_id},
          ${mapped.amountCents || invoice.amount_cents || 0},
          ${'square_checkout'},
          ${mapped.orderId || null},
          'square',
          ${mapped.paymentId || null},
          ${mapped.status || 'completed'},
          ${mapped.receiptUrl || null},
          ${JSON.stringify({ webhookType: mapped.eventType })}::jsonb
        )
      `;
    }

    if (mapped.status === 'completed') {
      await db.sql`
        update invoices
        set status = 'payment_verified',
            paid_at = coalesce(paid_at, now()),
            provider_status = ${mapped.status || 'completed'},
            updated_at = now()
        where id = ${invoice.id}
      `;

      await db.sql`
        update job_requests
        set status = 'closed',
            completion_date = coalesce(completion_date, now()::date),
            updated_at = now()
        where id = ${invoice.job_request_id}
      `;

      await db.sql`
        insert into audit_events (event_type, entity_type, entity_id, metadata)
        values ('payment.verified', 'invoice', ${invoice.id}, ${JSON.stringify({ paymentId: mapped.paymentId, orderId: mapped.orderId, amountCents: mapped.amountCents })}::jsonb)
      `;
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Square webhook processing failed', error);
    return json(500, { ok: false, message: 'Webhook processing failed.' });
  }
};

export const config = {
  path: '/api/payments/square/webhook',
};
