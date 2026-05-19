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



test('admin users endpoint rejects unsupported methods before opening database', async () => {
  let openedDatabase = false;
  const handler = createAdminUsersHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/admin/users', {
    method: 'PUT',
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 405);
  assert.equal(response.body.message, 'Method not allowed.');
  assert.equal(openedDatabase, false);
});
test('admin users endpoint creates an account and assigns roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'user-1', email: 'worker@example.com', full_name: 'Worker', phone: '555-0100', secondary_phone: '555-0101', company_name: 'T&A', mailing_address: '123 Main St, Mesa, AZ', internal_notes: 'Prefers text.', is_active: true }],
    [],
    [],
    [],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({
    email: 'Worker@Example.com',
    fullName: 'Worker',
    phone: '555-0100',
    secondaryPhone: '555-0101',
    companyName: 'T&A',
    mailingAddress: '123 Main St, Mesa, AZ',
    internalNotes: 'Prefers text.',
    roles: ['worker', 'admin', 'crew-lead'],
  })));

  assert.equal(response.status, 201);
  assert.deepEqual(response.body.user.roles, ['worker', 'admin', 'crew-lead']);
  assert.equal(response.body.user.secondaryPhone, '555-0101');
  assert.equal(response.body.user.mailingAddress, '123 Main St, Mesa, AZ');
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.match(db.queries[4].text, /insert into app_users/);
  assert.match(db.queries[5].text, /delete from user_roles/);
  assert.match(db.queries[6].text, /insert into user_roles/);
  assert.match(db.queries[7].text, /insert into audit_events/);
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
    [],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client Updated', phone: '555-0100', secondary_phone: '555-0102', company_name: null, mailing_address: '456 Oak Ave, Tempe, AZ', internal_notes: 'Has two properties.', is_active: true }],
    [],
    [],
    [],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({ userId: 'user-1', fullName: 'Client Updated', phone: '555-0100', secondaryPhone: '555-0102', mailingAddress: '456 Oak Ave, Tempe, AZ', internalNotes: 'Has two properties.', roles: ['client', 'worker'] }, 'PATCH')));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client', 'worker']);
  assert.equal(response.body.user.secondaryPhone, '555-0102');
  assert.equal(response.body.user.mailingAddress, '456 Oak Ave, Tempe, AZ');
  assert.match(db.queries[4].text, /update app_users/);
});


test('admin users endpoint lists users and assignable custom roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'user-1', email: 'worker@example.com', full_name: 'Worker', phone: '555-0100', secondary_phone: '555-0101', company_name: 'T&A', mailing_address: '123 Main St, Mesa, AZ', internal_notes: 'VIP client.', is_active: true, roles: ['crew-lead'], properties: [{ id: 'property-1', label: 'Home', street: '123 Main St', city: 'Mesa', state: 'AZ', postalCode: '85201', accessNotes: 'Gate code 1234' }], created_at: '2026-05-07T00:00:00.000Z' }],
    [{ id: 'role-1', key: 'crew-lead', name: 'Crew Lead', description: 'Runs jobs.', is_system: false, permissions: ['worker.tools'] }],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request(undefined, 'GET')));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.users[0].roles, ['crew-lead']);
  assert.equal(response.body.users[0].secondaryPhone, '555-0101');
  assert.equal(response.body.users[0].mailingAddress, '123 Main St, Mesa, AZ');
  assert.equal(response.body.users[0].properties[0].street, '123 Main St');
  assert.equal(response.body.roles[0].key, 'crew-lead');
  assert.deepEqual(response.body.roles[0].permissions, ['worker.tools']);
});


test('admin users endpoint deletes a user by deactivating and revoking sessions', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100', secondary_phone: null, company_name: null, mailing_address: null, internal_notes: null, is_active: false }],
    [],
    [],
  ]);
  const handler = createAdminUsersHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({ userId: 'user-1', confirmation: 'DELETE' }, 'DELETE')));

  assert.equal(response.status, 200);
  assert.equal(response.body.deleted, true);
  assert.equal(response.body.user.isActive, false);
  assert.match(db.queries[4].text, /update app_users/);
  assert.match(db.queries[5].text, /update auth_sessions/);
  assert.match(db.queries[6].text, /insert into audit_events/);
});
