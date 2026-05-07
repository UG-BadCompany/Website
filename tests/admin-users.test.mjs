import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminUsersHandler } from '../netlify/functions/admin-users.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const request = (body, method = 'POST') => new Request('https://site.test/api/admin/users', {
  method,
  body: JSON.stringify(body),
  headers: {
    'content-type': 'application/json',
    cookie: 'ta_session=session-token',
  },
});

const readJson = async (response) => ({ status: response.status, body: await response.json() });

const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('admin users endpoint creates an account and assigns roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [{ id: 'user-1', email: 'worker@example.com', full_name: 'Worker', phone: '555-0100', company_name: 'T&A' }],
    [],
    [],
    [],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({
    email: 'Worker@Example.com',
    fullName: 'Worker',
    phone: '555-0100',
    companyName: 'T&A',
    roles: ['worker', 'admin', 'bogus'],
  })));

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.user.roles, ['worker', 'admin']);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.match(db.queries[3].text, /insert into app_users/);
  assert.match(db.queries[4].text, /delete from user_roles/);
  assert.match(db.queries[5].text, /insert into user_roles/);
  assert.match(db.queries[6].text, /insert into audit_events/);
});

test('admin users endpoint rejects non-admin users', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client' }],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({ email: 'new@example.com', roles: ['client'] })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
});

test('admin users endpoint updates existing roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100', company_name: null }],
    [],
    [],
    [],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({ userId: 'user-1', roles: ['client', 'worker'] }, 'PATCH')));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client', 'worker']);
  assert.match(db.queries[3].text, /from app_users/);
});
