import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminActivityHandler } from '../netlify/functions/admin-activity.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('admin activity endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createAdminActivityHandler({ getDatabase: async () => { openedDatabase = true; return createMockDb(); } });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, true);
});

test('admin activity endpoint rejects users without activity permission', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker' }],
    [{ permission_key: 'worker.tools' }],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity', { headers: { cookie: 'ta_session=session-token' } })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
});

test('admin activity endpoint lists recent audit events for admins', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [{ permission_key: 'admin.activity.view' }],
    [{
      id: 'event-1',
      actor_user_id: 'admin-1',
      event_type: 'payment.confirmed',
      entity_type: 'invoice',
      entity_id: 'invoice-1',
      metadata: { amountCents: 25000 },
      created_at: '2026-05-13T00:00:00.000Z',
      actor_email: 'admin@example.com',
      actor_full_name: 'Admin',
    }],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity?limit=10&eventType=payment.confirmed', { headers: { cookie: 'ta_session=session-token' } })));

  assert.equal(response.status, 200);
  assert.equal(response.body.events.length, 1);
  assert.equal(response.body.events[0].eventType, 'payment.confirmed');
  assert.equal(response.body.events[0].metadata.amountCents, 25000);
  assert.equal(response.body.events[0].actor.email, 'admin@example.com');
  assert.equal(response.body.filters.limit, 10);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.match(db.queries[4].text, /from audit_events/);
});


test('admin activity endpoint clamps oversized limits and safely parses invalid metadata', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [{ permission_key: 'admin.activity.view' }],
    [{
      id: 'event-2',
      actor_user_id: null,
      event_type: 'job.updated',
      entity_type: 'job',
      entity_id: 'job-1',
      metadata: '{not-valid-json}',
      created_at: '2026-05-14T00:00:00.000Z',
      actor_email: null,
      actor_full_name: null,
    }],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity?limit=500', { headers: { cookie: 'ta_session=session-token' } })));

  assert.equal(response.status, 200);
  assert.equal(response.body.filters.limit, 100);
  assert.equal(response.body.events[0].metadata && Object.keys(response.body.events[0].metadata).length, 0);
  assert.equal(response.body.events[0].actor, null);
  assert.ok(db.queries[4].values.includes(100));
});
