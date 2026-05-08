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
  assert.deepEqual(response.body.quote, {
    id: 'quote-1',
    jobRequestId: 'job-1',
    clientId: 'client-1',
    status: 'draft',
    title: 'Drywall repair quote',
    summary: 'Patch and paint hallway drywall.',
    amountCents: 27500,
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  });
  assert.match(db.queries[3].text, /from job_requests/);
  assert.equal(db.queries[3].values[0], 'job-1');
  assert.match(db.queries[4].text, /insert into quotes/);
  assert.equal(db.queries[4].values[0], 'job-1');
  assert.equal(db.queries[4].values[1], 'client-1');
  assert.equal(db.queries[4].values[2], 'draft');
  assert.equal(db.queries[4].values[3], 'Drywall repair quote');
  assert.equal(db.queries[4].values[4], 'Patch and paint hallway drywall.');
  assert.equal(db.queries[4].values[5], 27500);
  assert.equal(db.queries[4].values[6], null);
  assert.equal(db.queries[4].values[7], 'admin-1');
  assert.match(db.queries[5].text, /update job_requests/);
  assert.match(db.queries[6].text, /insert into audit_events/);
});



test('admin quote endpoint can send a quote so clients can accept or decline it', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'job-1', client_id: 'client-1' }],
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
  assert.equal(db.queries[4].values[2], 'sent');
  assert.match(db.queries[4].values[6], /T/);
  assert.equal(db.queries[5].values[0], 'quote_sent');
  assert.match(db.queries[6].values[4], /"sentToClient":true/);
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

test('admin quote endpoint requires explicit edit confirmation before resending a sent quote', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'quote-1', title: 'Updated quote', amountCents: 30000 }),
  })));

  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'Click Edit quote before changing a sent quote.');
  assert.equal(db.queries.length, 3);
});

test('admin quote endpoint updates and resends sent quotes after explicit edit confirmation', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{ id: 'quote-1', job_request_id: 'job-1', client_id: 'client-1', status: 'sent', amount_cents: 22500, revision: 1 }],
    [{
      id: 'quote-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      status: 'sent',
      title: 'Updated quote',
      summary: 'Added materials.',
      amount_cents: 30000,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
    }],
    [],
    [],
  ]);
  const handler = createAdminQuotesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/quotes', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ quoteId: 'quote-1', title: 'Updated quote', summary: 'Added materials.', amountCents: 30000, editConfirmed: true, editReason: 'Material cost changed.' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.quote.amountCents, 30000);
  assert.equal(response.body.message, 'Updated quote sent to the client for approval.');
  assert.match(db.queries[4].text, /update quotes/);
  assert.equal(db.queries[4].values[2], 30000);
  assert.equal(db.queries[6].values[1], 'quote.updated_and_resent');
});
