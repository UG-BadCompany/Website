import { createHash } from 'node:crypto';
import { clean, getSiteUrl } from './auth-utils.mjs';

const SQUARE_API_VERSION = clean(process.env.SQUARE_API_VERSION, 40) || '2026-01-22';
const SQUARE_ENVIRONMENT = (clean(process.env.SQUARE_ENVIRONMENT, 20) || 'production').toLowerCase();
const SQUARE_ACCESS_TOKEN = clean(process.env.SQUARE_ACCESS_TOKEN, 400);
const SQUARE_LOCATION_ID = clean(process.env.SQUARE_LOCATION_ID, 120);
const SQUARE_REDIRECT_BASE_URL = clean(process.env.SQUARE_REDIRECT_BASE_URL, 500).replace(/\/$/, '');

const squareApiBase = () => (SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com');

export const resolveSquareRedirectBaseUrl = (request) => {
  if (SQUARE_REDIRECT_BASE_URL) return SQUARE_REDIRECT_BASE_URL;
  return getSiteUrl(request);
};

export const mapSquareErrorMessage = (result = {}, fallbackMessage = 'Square request failed.') => (
  result?.errors?.map((error) => error.detail).filter(Boolean).join('; ') || fallbackMessage
);

export const createSquarePaymentLink = async ({ invoice, request, idempotencyKey, includeMetadata = false }) => {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    throw new Error('Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.');
  }

  const amountCents = Number(invoice?.amount_cents || 0);
  const resolvedIdempotencyKey = clean(
    idempotencyKey || createHash('sha256').update(`invoice:${invoice.id}:amount:${amountCents}`).digest('hex'),
    120,
  );

  const payload = {
    idempotency_key: resolvedIdempotencyKey,
    quick_pay: {
      name: invoice.title || `Invoice ${invoice.id}`,
      price_money: { amount: amountCents, currency: 'USD' },
      location_id: SQUARE_LOCATION_ID,
      reference_id: invoice.id,
      note: `Portal invoice ${invoice.id}`,
    },
    checkout_options: {
      ask_for_shipping_address: false,
      accepted_payment_methods: { card: true, square_gift_card: false, bank_account: true },
      redirect_url: new URL('/dashboard/?workspace=invoices', resolveSquareRedirectBaseUrl(request)).toString(),
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
  if (!response.ok) throw new Error(mapSquareErrorMessage(result));

  const orderId = clean(result?.payment_link?.order_id, 120);
  const link = {
    checkoutId: clean(result?.payment_link?.id, 120),
    checkoutUrl: clean(result?.payment_link?.url, 500),
    orderId,
    providerStatus: clean(result?.payment_link?.version ? 'pending' : 'created', 40) || 'created',
  };

  if (includeMetadata) {
    link.metadata = {
      squareEnvironment: SQUARE_ENVIRONMENT,
      squareApiVersion: SQUARE_API_VERSION,
      orderId,
      createdAt: new Date().toISOString(),
    };
  }

  return link;
};
