import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminJobRequestsHandler } from '../netlify/functions/admin-job-requests.mjs';
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

test('admin job request endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createAdminJobRequestsHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('admin job request endpoint rejects non-admin users', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.equal(db.queries.length, 3);
});

test('admin job request endpoint returns recent requests and status counts for admins', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'job-1',
      status: 'new',
      requester_name: 'Jane Customer',
      requester_email: 'jane@example.com',
      requester_phone: '555-0100',
      city: 'Mesa',
      service_type: 'Home repair',
      preferred_timeframe: 'This week',
      description: 'Patch drywall.',
      created_at: '2026-05-07T00:00:00.000Z',
    }],
    [{ status: 'new', count: 1 }],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authorized, true);
  assert.deepEqual(response.body.user.roles, ['admin']);
  assert.deepEqual(response.body.statusCounts, { new: 1 });
  assert.deepEqual(response.body.requests, [{
    id: 'job-1',
    status: 'new',
    requesterName: 'Jane Customer',
    requesterEmail: 'jane@example.com',
    requesterPhone: '555-0100',
    city: 'Mesa',
    serviceType: 'Home repair',
    preferredTimeframe: 'This week',
    description: 'Patch drywall.',
    createdAt: '2026-05-07T00:00:00.000Z',
  }]);
  assert.match(db.queries[3].text, /from job_requests/);
  assert.match(db.queries[4].text, /group by status/);
});
