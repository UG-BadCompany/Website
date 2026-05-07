import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientJobRequestsHandler } from '../netlify/functions/client-job-requests.mjs';
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

test('client job request endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createClientJobRequestsHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('client job request endpoint rejects users without client or admin access', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker', name: 'Worker' }],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.equal(db.queries.length, 3);
});

test('client job request endpoint returns only requests for the signed-in client', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [
      {
        id: 'job-1',
        status: 'new',
        city: 'Mesa',
        street_address: '123 Main St',
        service_type: 'Drywall repair',
        preferred_timeframe: 'This week',
        description: 'Patch garage drywall.',
        created_at: '2026-05-07T00:00:00.000Z',
      },
      {
        id: 'job-2',
        status: 'completed',
        city: 'Tempe',
        street_address: '456 Oak Ave',
        service_type: 'Fence repair',
        preferred_timeframe: null,
        description: 'Re-hang gate.',
        created_at: '2026-05-06T00:00:00.000Z',
      },
    ],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authorized, true);
  assert.deepEqual(response.body.summary, { total: 2, active: 1 });
  assert.deepEqual(response.body.requests, [
    {
      id: 'job-1',
      status: 'new',
      city: 'Mesa',
      streetAddress: '123 Main St',
      serviceType: 'Drywall repair',
      preferredTimeframe: 'This week',
      description: 'Patch garage drywall.',
      createdAt: '2026-05-07T00:00:00.000Z',
    },
    {
      id: 'job-2',
      status: 'completed',
      city: 'Tempe',
      streetAddress: '456 Oak Ave',
      serviceType: 'Fence repair',
      preferredTimeframe: null,
      description: 'Re-hang gate.',
      createdAt: '2026-05-06T00:00:00.000Z',
    },
  ]);
  assert.match(db.queries[3].text, /where client_id = \?/);
  assert.equal(db.queries[3].values[0], 'client-1');
});
