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
  assert.equal(openedDatabase, false);
});

test('admin activity endpoint rejects non-admin users', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client' }],
    [],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});

test('admin activity endpoint lists recent audit events for admins', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{
      id: 'event-1',
      actor_user_id: 'admin-1',
      event_type: 'payment.confirmed',
      entity_type: 'invoice',
      entity_id: 'invoice-1',
      metadata: { amountCents: 42500, source: 'admin_dashboard' },
      created_at: '2026-05-09T00:00:00.000Z',
      actor_full_name: 'Admin User',
      actor_email: 'admin@example.com',
    }],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.events.length, 1);
  assert.equal(response.body.events[0].eventType, 'payment.confirmed');
  assert.equal(response.body.events[0].actor.email, 'admin@example.com');
  assert.equal(response.body.events[0].metadata.amountCents, 42500);
  assert.match(db.queries[4].text, /from audit_events/);
});

test('admin activity endpoint paginates audit events with a bounded limit', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [
      {
        id: 'event-1',
        actor_user_id: 'admin-1',
        event_type: 'payment.confirmed',
        entity_type: 'invoice',
        entity_id: 'invoice-1',
        metadata: {},
        created_at: '2026-05-09T00:00:00.000Z',
        actor_full_name: 'Admin User',
        actor_email: 'admin@example.com',
      },
      {
        id: 'event-2',
        actor_user_id: 'admin-1',
        event_type: 'invoice.opened',
        entity_type: 'invoice',
        entity_id: 'invoice-2',
        metadata: {},
        created_at: '2026-05-08T00:00:00.000Z',
        actor_full_name: 'Admin User',
        actor_email: 'admin@example.com',
      },
    ],
  ]);
  const handler = createAdminActivityHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/activity?page=2&limit=1', { headers: { cookie: 'ta_session=session-token' } })));

  assert.equal(response.status, 200);
  assert.equal(response.body.events.length, 1);
  assert.deepEqual(response.body.pagination, { page: 2, limit: 1, hasNextPage: true });
  assert.deepEqual(db.queries[4].values, [2, 1]);
});
