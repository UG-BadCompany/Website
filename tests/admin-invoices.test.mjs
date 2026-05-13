import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminInvoicesHandler } from '../netlify/functions/admin-invoices.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('admin invoices endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createAdminInvoicesHandler({ getDatabase: async () => { openedDatabase = true; return createMockDb(); } });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/invoices')));
  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('admin invoices endpoint lists open invoices for admins', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'invoice-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'open',
      title: 'Invoice & payment desk',
      amount_cents: 42500,
      paid_at: null,
      created_at: '2026-05-09T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
      client_full_name: 'Client',
      client_email: 'client@example.com',
      client_phone: '555-0100',
      job_request_status: 'waiting_payment',
      service_type: 'Drywall repair',
      city: 'Mesa',
      street_address: '123 Main St',
      payment_provider: 'square',
      provider_checkout_id: 'checkout-1',
      provider_checkout_url: 'https://square.link/pay/checkout-1',
      provider_status: 'created',
      provider_metadata: { orderId: 'order-1' },
    }],
  ]);
  const handler = createAdminInvoicesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/invoices', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.invoices.length, 1);
  assert.equal(response.body.summary.amountDueCents, 42500);
  assert.equal(response.body.invoices[0].title, 'Drywall repair — Client invoice');
  assert.equal(response.body.invoices[0].provider.name, 'square');
  assert.equal(response.body.invoices[0].provider.checkoutUrl, 'https://square.link/pay/checkout-1');
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});


test('admin invoices endpoint lists paid payment history for admins', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'invoice-2',
      job_request_id: 'job-2',
      client_id: 'client-2',
      status: 'paid',
      title: 'Fence invoice',
      amount_cents: 90000,
      paid_at: '2026-05-11T00:00:00.000Z',
      created_at: '2026-05-09T00:00:00.000Z',
      updated_at: '2026-05-11T00:00:00.000Z',
      client_full_name: 'Paid Client',
      client_email: 'paid@example.com',
      client_phone: '555-0199',
      job_request_status: 'completed',
      service_type: 'Fence repair',
      city: 'Tempe',
      street_address: '456 Main St',
      payment_amount_cents: 87500,
      payment_method: 'check',
      payment_reference: 'check-1001',
      payment_confirmed_at: '2026-05-11T00:00:00.000Z',
    }],
  ]);
  const handler = createAdminInvoicesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/invoices?status=paid', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.filter, 'paid');
  assert.equal(response.body.invoices[0].payment.reference, 'check-1001');
  assert.equal(response.body.summary.paid, 1);
  assert.equal(response.body.summary.amountCollectedCents, 87500);
  assert.match(db.queries[3].text, /where invoices\.status = \?/);
  assert.equal(db.queries[3].values[0], 'paid');
});

test('admin invoices endpoint confirms payment and completes the job request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'invoice-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'paid',
      title: 'Repair invoice',
      amount_cents: 42500,
      paid_at: '2026-05-10T00:00:00.000Z',
      created_at: '2026-05-09T00:00:00.000Z',
      updated_at: '2026-05-10T00:00:00.000Z',
    }],
    [{ id: 'payment-1', invoice_id: 'invoice-1', amount_cents: 42500, method: 'cash', reference: 'receipt-1', confirmed_at: '2026-05-10T00:00:00.000Z' }],
    [],
    [],
  ]);
  const handler = createAdminInvoicesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/invoices', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ invoiceId: 'invoice-1', amountCents: 42500, method: 'cash', reference: 'receipt-1' }),
  })));
  assert.equal(response.status, 200);
  assert.equal(response.body.invoice.status, 'paid');
  assert.equal(response.body.payment.id, 'payment-1');
  assert.match(db.queries[3].text, /update invoices/);
  assert.match(db.queries[5].text, /update job_requests/);
  assert.equal(db.queries[5].values[0], 'completed');
  assert.equal(db.queries[5].values[1], 'job-1');
  assert.equal(db.queries[6].values[1], 'payment.confirmed');
});
