import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminQuotesHandler } from '../netlify/functions/admin-quotes.mjs';
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

const quoteRequest = (body, cookie = 'ta_session=session-token') => new Request('https://site.test/api/admin/quotes', {
  method: 'POST',
  headers: { cookie, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});



test('admin quote endpoint rejects unsupported methods before auth or database work', async () => {
  let openedDatabase = false;
  const handler = createAdminQuotesHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/admin/quotes', { method: 'PUT' })));

  assert.equal(response.status, 405);
  assert.equal(response.body.message, 'Method not allowed.');
  assert.equal(openedDatabase, false);
});

test('admin quote endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createAdminQuotesHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/admin/quotes', {
    method: 'POST',
    body: JSON.stringify({ jobRequestId: 'job-1', title: 'Repair quote', amountCents: 25000 }),
  })));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('admin quote endpoint rejects non-admin users', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(quoteRequest({ jobRequestId: 'job-1', title: 'Repair quote', amountCents: 25000 })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.equal(db.queries.length, 3);
});



test('admin quote endpoint lists quotes with mobile UI metadata', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'draft',
      title: 'Mobile drywall quote',
      summary: 'Patch and paint.',
      amount_cents: 42500,
      ai_enhanced: true,
      fallback_used: false,
      fallback_reason: null,
      pricing_confidence_level: 'high',
      range_low_cents: 40000,
      range_high_cents: 45000,
      fixed_price_recommendation_cents: 42500,
      ai_metadata: { pricingConfidenceLevel: 'high', fixedPriceRecommendationCents: 42500 },
      sourcing_notes: 'Photo evidence and historical drywall quotes tightened price.',
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
      request_id: 'job-1',
      request_status: 'quote_in_progress',
      requester_name: 'Casey Client',
      requester_email: 'casey@example.com',
      requester_phone: '555-0100',
      city: 'Mesa',
      service_type: 'Drywall',
      preferred_timeframe: 'This week',
      description: 'Mobile quote request',
      admin_notes: '',
      estimated_start_date: null,
      completion_date: null,
      request_created_at: '2026-05-07T00:00:00.000Z',
      request_updated_at: '2026-05-08T00:00:00.000Z',
      client_name: 'Casey Client',
      client_email: 'casey@example.com',
    }],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/quotes?status=draft&search=drywall', { headers: { cookie: 'ta_session=session-token' } })));

  assert.equal(response.status, 200);
  assert.equal(response.body.quotes.length, 1);
  assert.equal(response.body.quotes[0].pricingConfidenceLevel, 'high');
  assert.equal(response.body.quotes[0].rangeLowCents, 40000);
  assert.equal(response.body.quotes[0].fixedPriceRecommendationCents, 42500);
  assert.equal(response.body.quotes[0].request.serviceType, 'Drywall');
  assert.match(db.queries[3].text, /from quotes/);
});

test('admin quote endpoint validates quote payloads before opening the database', async () => {
  let openedDatabase = false;
  const handler = createAdminQuotesHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });
  const response = await readJson(await handler(quoteRequest({ jobRequestId: '', title: '', amountCents: -1 })));

  assert.equal(response.status, 422);
  assert.equal(response.body.message, 'Job request is required.');
  assert.equal(openedDatabase, false);
});

test('admin quote endpoint creates a draft quote from a job request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'job-1', client_id: 'client-1' }],
    [],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'draft',
      title: 'Drywall repair quote',
      summary: 'Patch and paint hallway drywall.',
      amount_cents: 27500,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [],
    [],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(quoteRequest({
    jobRequestId: 'job-1',
    title: 'Drywall repair quote',
    summary: 'Patch and paint hallway drywall.',
    amountCents: 27500,
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.authorized, true);
  assert.equal(response.body.quote.id, 'quote-1');
  assert.equal(response.body.quote.jobRequestId, 'job-1');
  assert.equal(response.body.quote.clientId, 'client-1');
  assert.equal(response.body.quote.status, 'draft');
  assert.equal(response.body.quote.title, 'Drywall repair quote');
  assert.equal(response.body.quote.summary, 'Patch and paint hallway drywall.');
  assert.equal(response.body.quote.amountCents, 27500);
  assert.equal(response.body.quote.aiEnhanced, false);
  assert.equal(response.body.quote.fallbackUsed, false);
  assert.match(db.queries[3].text, /from job_requests/);
  assert.equal(db.queries[3].values[0], 'job-1');
  assert.match(db.queries[4].text, /from quotes/);
  assert.match(db.queries[5].text, /insert into quotes/);
  assert.equal(db.queries[5].values[0], 'job-1');
  assert.equal(db.queries[5].values[1], 'client-1');
  assert.equal(db.queries[5].values[2], 'draft');
  assert.equal(db.queries[5].values[3], 'Drywall repair quote');
  assert.equal(db.queries[5].values[4], 'Patch and paint hallway drywall.');
  assert.equal(db.queries[5].values[5], 27500);
  assert.equal(db.queries[5].values[6], null);
  assert.equal(db.queries[5].values[7], 'admin-1');
  assert.match(db.queries[6].text, /update job_requests/);
  assert.match(db.queries[7].text, /insert into audit_events/);
});



test('admin quote endpoint can send a quote so clients can accept or decline it', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'job-1', client_id: 'client-1' }],
    [],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'sent',
      title: 'Ceiling fan install quote',
      summary: 'Install customer-provided fixture.',
      amount_cents: 22500,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [],
    [],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(quoteRequest({
    jobRequestId: 'job-1',
    title: 'Ceiling fan install quote',
    summary: 'Install customer-provided fixture.',
    amountCents: 22500,
    sendToClient: true,
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.quote.status, 'sent');
  assert.equal(db.queries[5].values[2], 'sent');
  assert.match(db.queries[5].values[6], /T/);
  assert.equal(db.queries[6].values[0], 'quote_sent');
  assert.match(db.queries[7].values[4], /"sentToClient":true/);
});

test('admin quote endpoint returns not found for missing job requests', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(quoteRequest({ jobRequestId: 'missing-job', title: 'Repair quote', amountCents: 25000 })));

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Job request not found.');
  assert.equal(db.queries.length, 4);
});


test('admin quote endpoint blocks creating a second quote for an already quoted request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'job-1', client_id: 'client-1' }],
    [{ id: 'quote-1' }],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(quoteRequest({ jobRequestId: 'job-1', title: 'Repair quote', amountCents: 25000 })));

  assert.equal(response.status, 409);
  assert.match(response.body.message, /already has a quote/);
  assert.equal(db.queries.length, 5);
});

test('admin quote endpoint edits an existing quote from the open request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'quote-1', job_request_id: 'job-1', client_id: 'client-1', status: 'draft' }],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'sent',
      title: 'Updated repair quote',
      summary: 'Updated scope.',
      amount_cents: 32500,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
    }],
    [],
    [],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const request = new Request('https://site.test/api/admin/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'quote-1', title: 'Updated repair quote', summary: 'Updated scope.', amountCents: 32500, sendToClient: true }),
  });
  const response = await readJson(await handler(request));

  assert.equal(response.status, 200);
  assert.equal(response.body.quote.id, 'quote-1');
  assert.equal(response.body.quote.status, 'sent');
  assert.match(db.queries[4].text, /update quotes/);
  assert.equal(db.queries[4].values[0], 'Updated repair quote');
  assert.equal(db.queries[5].values[0], 'quote_sent');
  assert.equal(db.queries[6].values[1], 'quote.updated');
});
