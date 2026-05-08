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
      admin_notes: 'Call before quoting.',
      estimated_start_date: '2026-05-12',
      completion_date: null,
      created_at: '2026-05-07T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
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
    adminNotes: 'Call before quoting.',
    estimatedStartDate: '2026-05-12',
    completionDate: null,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  }]);
  assert.match(db.queries[3].text, /from job_requests/);
  assert.match(db.queries[4].text, /group by status/);
});


test('admin job request endpoint lets admins update request status and notes', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'job-1',
      status: 'scheduled',
      requester_name: 'Andrew Witter',
      requester_email: 'witterandrew13@gmail.com',
      requester_phone: '14808496959',
      city: 'Chandler',
      service_type: 'Fixture work',
      preferred_timeframe: 'Flexible',
      description: 'Ceiling fan install',
      admin_notes: 'Assign installer after quote acceptance.',
      estimated_start_date: '2026-05-13',
      completion_date: null,
      created_at: '2026-05-07T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ jobRequestId: 'job-1', status: 'scheduled', adminNotes: 'Assign installer after quote acceptance.', estimatedStartDate: '2026-05-13', completionDate: '' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.request.status, 'scheduled');
  assert.equal(response.body.request.adminNotes, 'Assign installer after quote acceptance.');
  assert.equal(response.body.request.estimatedStartDate, '2026-05-13');
  assert.equal(response.body.request.completionDate, null);
  assert.match(db.queries[3].text, /update job_requests/);
  assert.deepEqual(db.queries[3].values, ['scheduled', 'Assign installer after quote acceptance.', '2026-05-13', null, 'job-1']);
  assert.match(db.queries[4].text, /insert into audit_events/);
});


test('admin job request endpoint permanently deletes requests after confirmation', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'job-1',
      status: 'cancelled',
      requester_name: 'Andrew Witter',
      requester_email: 'witterandrew13@gmail.com',
      service_type: 'Fixture work',
    }],
    [],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    method: 'DELETE',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ jobRequestId: 'job-1', confirmation: 'DELETE' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.deleted, true);
  assert.equal(response.body.requestId, 'job-1');
  assert.match(db.queries[3].text, /delete from job_requests/);
  assert.deepEqual(db.queries[3].values, ['job-1']);
  assert.match(db.queries[4].text, /insert into audit_events/);
});

test('admin job request endpoint assigns workers while scheduling a request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'job-1',
      status: 'scheduled',
      requester_name: 'Jane Customer',
      requester_email: 'jane@example.com',
      requester_phone: '555-0100',
      city: 'Mesa',
      service_type: 'Fixture work',
      preferred_timeframe: 'Morning',
      description: 'Install fan.',
      admin_notes: 'Assign installer.',
      estimated_start_date: '2026-05-13',
      completion_date: null,
      created_at: '2026-05-07T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [{
      id: 'assignment-1',
      job_request_id: 'job-1',
      worker_id: 'worker-1',
      status: 'assigned',
      scheduled_date: '2026-05-13',
      start_time: '09:00',
      end_time: '11:00',
      notes: 'Bring ladder.',
      worker_notes: null,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      jobRequestId: 'job-1',
      status: 'scheduled',
      adminNotes: 'Assign installer.',
      estimatedStartDate: '2026-05-13',
      workerId: 'worker-1',
      scheduledDate: '2026-05-13',
      startTime: '09:00',
      endTime: '11:00',
      assignmentNotes: 'Bring ladder.',
    }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.request.status, 'scheduled');
  assert.equal(response.body.assignment.id, 'assignment-1');
  assert.match(db.queries[4].text, /insert into worker_assignments/);
  assert.match(db.queries[4].text, /on conflict \(job_request_id, worker_id\)/);
  assert.deepEqual(db.queries[4].values.slice(0, 8), ['job-1', 'worker-1', 'admin-1', 'assigned', '2026-05-13', '09:00', '11:00', 'Bring ladder.']);
  assert.equal(db.queries[5].values[1], 'worker_assignment.assigned');
});

test('admin job request endpoint verifies completion by moving request to waiting payment and opening invoice', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin', name: 'Admin' }],
    [{
      id: 'job-1',
      status: 'waiting_payment',
      requester_name: 'Jane Customer',
      requester_email: 'jane@example.com',
      requester_phone: '555-0100',
      city: 'Mesa',
      service_type: 'Drywall repair',
      preferred_timeframe: 'Morning',
      description: 'Patch hallway.',
      admin_notes: 'Verified with client.',
      estimated_start_date: '2026-05-13',
      completion_date: '2026-05-14',
      created_at: '2026-05-07T00:00:00.000Z',
      updated_at: '2026-05-14T00:00:00.000Z',
    }],
    [{ id: 'quote-1', client_id: 'client-1', title: 'Drywall repair quote', amount_cents: 42500 }],
    [{
      id: 'invoice-1',
      job_request_id: 'job-1',
      client_id: 'client-1',
      quote_id: 'quote-1',
      status: 'open',
      title: 'Drywall repair quote',
      amount_cents: 42500,
      created_at: '2026-05-14T00:00:00.000Z',
      updated_at: '2026-05-14T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createAdminJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/job-requests', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ jobRequestId: 'job-1', status: 'waiting_payment', adminNotes: 'Verified with client.', estimatedStartDate: '2026-05-13', completionDate: '2026-05-14' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.request.status, 'waiting_payment');
  assert.equal(response.body.invoice.id, 'invoice-1');
  assert.match(db.queries[4].text, /from quotes/);
  assert.match(db.queries[5].text, /insert into invoices/);
  assert.deepEqual(db.queries[5].values.slice(0, 7), ['job-1', 'client-1', 'quote-1', 'open', 'Drywall repair quote', 42500, 'admin-1']);
});
