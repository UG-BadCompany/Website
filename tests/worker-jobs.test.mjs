import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkerJobsHandler } from '../netlify/functions/worker-jobs.mjs';
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

test('worker jobs endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createWorkerJobsHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/worker/jobs')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('worker jobs endpoint rejects users without worker access', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{ permission_key: 'client.tools' }],
  ]);
  const handler = createWorkerJobsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/jobs', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});

test('worker jobs endpoint returns only assignments for the signed-in worker', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker', name: 'Worker' }],
    [{ permission_key: 'worker.jobs.manage' }],
    [{
      id: 'assignment-1',
      status: 'assigned',
      scheduled_date: '2026-05-13',
      start_time: '09:00',
      end_time: '11:00',
      notes: 'Use side gate.',
      worker_notes: null,
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-08T00:00:00.000Z',
      worker_id: 'worker-1',
      worker_full_name: 'Worker',
      worker_email: 'worker@example.com',
      worker_phone: '555-0100',
      job_request_id: 'job-1',
      job_status: 'scheduled',
      service_type: 'Ceiling fan install',
      preferred_timeframe: 'Morning',
      description: 'Install two fans.',
      admin_notes: 'Bring ladder.',
      estimated_start_date: '2026-05-13',
      completion_date: null,
      requester_name: 'Jane Customer',
      requester_email: 'jane@example.com',
      requester_phone: '555-0200',
      city: 'Mesa',
      street_address: '123 Main St',
      property_id: 'property-1',
      property_label: 'Home',
      property_street: '123 Main St',
      property_city: 'Mesa',
      property_state: 'AZ',
      property_postal_code: '85201',
      property_access_notes: 'Gate code 1234',
    }],
  ]);
  const handler = createWorkerJobsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/jobs', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.assignments.length, 1);
  assert.equal(response.body.assignments[0].id, 'assignment-1');
  assert.equal(response.body.assignments[0].jobRequest.serviceType, 'Ceiling fan install');
  assert.equal(response.body.assignments[0].jobRequest.property.accessNotes, 'Gate code 1234');
  assert.match(db.queries[4].text, /where worker_assignments.worker_id = \?/);
  assert.equal(db.queries[4].values[0], 'worker-1');
});

test('worker jobs endpoint lets workers update their assigned job status and notes', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker', name: 'Worker' }],
    [{ permission_key: 'worker.jobs.manage' }],
    [{
      id: 'assignment-1',
      job_request_id: 'job-1',
      worker_id: 'worker-1',
      status: 'in_progress',
      scheduled_date: '2026-05-13',
      start_time: '09:00',
      end_time: '11:00',
      notes: 'Use side gate.',
      worker_notes: 'Started prep and confirmed parts.',
      created_at: '2026-05-08T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createWorkerJobsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/jobs', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ assignmentId: 'assignment-1', status: 'in_progress', workerNotes: 'Started prep and confirmed parts.' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.assignment.status, 'in_progress');
  assert.equal(response.body.assignment.workerNotes, 'Started prep and confirmed parts.');
  assert.match(db.queries[4].text, /update worker_assignments/);
  assert.match(db.queries[4].text, /and worker_id = \?/);
  assert.deepEqual(db.queries[4].values, ['in_progress', 'Started prep and confirmed parts.', 'assignment-1', 'worker-1']);
  assert.equal(db.queries[5].values[1], 'worker_assignment.updated');
});
