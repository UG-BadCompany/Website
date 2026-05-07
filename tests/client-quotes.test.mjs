import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientQuotesHandler } from '../netlify/functions/client-quotes.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('client quotes endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createClientQuotesHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('client quotes endpoint rejects users without client or admin access', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker', name: 'Worker' }],
  ]);
  const handler = createClientQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.equal(db.queries.length, 3);
});

test('client quotes endpoint returns only quotes for the signed-in client', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [
      {
        id: 'quote-1',
        status: 'sent',
        title: 'Drywall repair quote',
        summary: 'Patch and paint hallway drywall.',
        amount_cents: 27500,
        sent_at: '2026-05-08T00:00:00.000Z',
        viewed_at: null,
        accepted_at: null,
        declined_at: null,
        created_at: '2026-05-07T00:00:00.000Z',
        job_request_id: 'job-1',
        job_request_status: 'quote_sent',
        job_request_service_type: 'Drywall repair',
        job_request_description: 'Patch hallway drywall.',
        property_id: 'property-1',
        property_label: 'Home',
        property_street: '123 Main St',
        property_city: 'Mesa',
        property_state: 'AZ',
      },
      {
        id: 'quote-2',
        status: 'accepted',
        title: 'Fence repair quote',
        summary: null,
        amount_cents: 50000,
        sent_at: '2026-05-06T00:00:00.000Z',
        viewed_at: '2026-05-06T01:00:00.000Z',
        accepted_at: '2026-05-06T02:00:00.000Z',
        declined_at: null,
        created_at: '2026-05-05T00:00:00.000Z',
        job_request_id: 'job-2',
        job_request_status: 'accepted',
        job_request_service_type: 'Fence repair',
        job_request_description: 'Fix the gate.',
        property_id: 'property-2',
        property_label: 'Rental',
        property_street: '456 Oak Ave',
        property_city: 'Tempe',
        property_state: 'AZ',
      },
    ],
  ]);
  const handler = createClientQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authorized, true);
  assert.deepEqual(response.body.summary, { total: 2, waiting: 1 });
  assert.deepEqual(response.body.quotes, [
    {
      id: 'quote-1',
      status: 'sent',
      title: 'Drywall repair quote',
      summary: 'Patch and paint hallway drywall.',
      amountCents: 27500,
      sentAt: '2026-05-08T00:00:00.000Z',
      viewedAt: null,
      acceptedAt: null,
      declinedAt: null,
      createdAt: '2026-05-07T00:00:00.000Z',
      jobRequest: {
        id: 'job-1',
        status: 'quote_sent',
        serviceType: 'Drywall repair',
        description: 'Patch hallway drywall.',
      },
      property: {
        id: 'property-1',
        label: 'Home',
        street: '123 Main St',
        city: 'Mesa',
        state: 'AZ',
      },
    },
    {
      id: 'quote-2',
      status: 'accepted',
      title: 'Fence repair quote',
      summary: null,
      amountCents: 50000,
      sentAt: '2026-05-06T00:00:00.000Z',
      viewedAt: '2026-05-06T01:00:00.000Z',
      acceptedAt: '2026-05-06T02:00:00.000Z',
      declinedAt: null,
      createdAt: '2026-05-05T00:00:00.000Z',
      jobRequest: {
        id: 'job-2',
        status: 'accepted',
        serviceType: 'Fence repair',
        description: 'Fix the gate.',
      },
      property: {
        id: 'property-2',
        label: 'Rental',
        street: '456 Oak Ave',
        city: 'Tempe',
        state: 'AZ',
      },
    },
  ]);
  assert.match(db.queries[3].text, /where quotes.client_id = \?/);
  assert.match(db.queries[3].text, /job_requests.client_id = \?/);
  assert.match(db.queries[3].text, /properties.client_id = \?/);
  assert.equal(db.queries[3].values[0], 'client-1');
  assert.equal(db.queries[3].values[1], 'client-1');
  assert.equal(db.queries[3].values[2], 'client-1');
});

test('client quotes endpoint accepts an owned sent quote and updates the request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{ id: 'quote-1', job_request_id: 'job-1', client_id: 'client-1', status: 'sent' }],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'accepted',
      title: 'Drywall repair quote',
      summary: 'Patch hallway drywall.',
      amount_cents: 27500,
      sent_at: '2026-05-08T00:00:00.000Z',
      viewed_at: null,
      accepted_at: '2026-05-08T01:00:00.000Z',
      declined_at: null,
      created_at: '2026-05-07T00:00:00.000Z',
    }],
    [],
    [],
  ]);
  const handler = createClientQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'quote-1', action: 'accept' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Quote accepted.');
  assert.equal(response.body.quote.status, 'accepted');
  assert.match(db.queries[3].text, /where id = \?/);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.deepEqual(db.queries[3].values, ['quote-1', 'client-1']);
  assert.match(db.queries[4].text, /update quotes/);
  assert.equal(db.queries[4].values[0], 'accepted');
  assert.match(db.queries[5].text, /update job_requests/);
  assert.deepEqual(db.queries[5].values, ['job-1', 'client-1']);
  assert.match(db.queries[6].text, /insert into audit_events/);
});

test('client quotes endpoint declines an owned viewed quote without accepting the request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{ id: 'quote-2', job_request_id: 'job-2', client_id: 'client-1', status: 'viewed' }],
    [{
      id: 'quote-2',
      job_request_id: 'job-2',
      client_id: 'client-1',
      status: 'declined',
      title: 'Fence repair quote',
      summary: null,
      amount_cents: 50000,
      sent_at: '2026-05-08T00:00:00.000Z',
      viewed_at: '2026-05-08T00:30:00.000Z',
      accepted_at: null,
      declined_at: '2026-05-08T01:00:00.000Z',
      created_at: '2026-05-07T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createClientQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'quote-2', action: 'decline' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Quote declined.');
  assert.equal(response.body.quote.status, 'declined');
  assert.equal(db.queries.length, 6);
  assert.match(db.queries[4].text, /update quotes/);
  assert.doesNotMatch(db.queries[5].text, /update job_requests/);
  assert.match(db.queries[5].text, /insert into audit_events/);
});

test('client quotes endpoint blocks decisions for another client quote', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [],
  ]);
  const handler = createClientQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'other-quote', action: 'accept' }),
  })));

  assert.equal(response.status, 404);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries.length, 4);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.deepEqual(db.queries[3].values, ['other-quote', 'client-1']);
});
