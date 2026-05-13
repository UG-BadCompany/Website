import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientInvoicesHandler } from '../netlify/functions/client-invoices.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('client invoices endpoint returns only unpaid client invoices', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{
      id: 'invoice-1',
      job_request_id: 'job-1',
      status: 'open',
      title: 'Invoice & payment desk',
      amount_cents: 42500,
      due_at: null,
      paid_at: null,
      created_at: '2026-05-09T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
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
  const handler = createClientInvoicesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/invoices', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.invoices.length, 1);
  assert.equal(response.body.summary.amountDueCents, 42500);
  assert.equal(response.body.invoices[0].title, 'Drywall repair invoice');
  assert.equal(response.body.invoices[0].provider.name, 'square');
  assert.equal(response.body.invoices[0].provider.checkoutUrl, 'https://square.link/pay/checkout-1');
  assert.match(db.queries[3].text, /invoices.status <> 'paid'/);
  assert.equal(db.queries[3].values[0], 'client-1');
  assert.equal(db.queries[3].values[1], 'client-1');
});
