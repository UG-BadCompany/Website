import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminRolesHandler } from '../netlify/functions/admin-roles.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const request = (body, method = 'POST') => new Request('https://site.test/api/admin/roles', {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
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

test('admin roles endpoint lists roles and available permissions', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'role-1', key: 'crew-lead', name: 'Crew Lead', description: 'Runs jobs.', is_system: false, created_at: '2026-05-07T00:00:00.000Z', updated_at: '2026-05-07T00:00:00.000Z' }],
    [{ role_key: 'crew-lead', permission_key: 'worker.tools' }],
  ]);
  const handler = createAdminRolesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request(undefined, 'GET')));

  assert.equal(response.status, 200);
  assert.equal(response.body.permissions.length > 0, true);
  assert.equal(response.body.permissions.some((permission) => permission.key === 'client.invoices.manage'), true);
  assert.equal(response.body.permissions.some((permission) => permission.key === 'admin.invoices.manage'), true);
  assert.equal(response.body.permissions.some((permission) => permission.key === 'admin.activity.view'), true);
  assert.deepEqual(response.body.roles[0].permissions, ['worker.tools']);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});

test('admin roles endpoint creates custom roles with selected permissions', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'role-1', key: 'crew-lead', name: 'Crew Lead', description: 'Runs jobs.', is_system: false, created_at: '2026-05-07T00:00:00.000Z', updated_at: '2026-05-07T00:00:00.000Z' }],
    [],
    [],
    [],
  ]);
  const handler = createAdminRolesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({
    key: 'Crew Lead!',
    name: 'Crew Lead',
    description: 'Runs jobs.',
    permissions: ['worker.tools', 'admin.requests.manage', 'not-real'],
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.role.key, 'crew-lead');
  assert.deepEqual(response.body.role.permissions, ['admin.requests.manage', 'worker.tools']);
  assert.match(db.queries[4].text, /insert into roles/);
  assert.equal(db.queries[4].values[0], 'crew-lead');
  assert.match(db.queries[6].text, /insert into role_permissions/);
  assert.deepEqual(db.queries[6].values[1], ['worker.tools', 'admin.requests.manage']);
});

test('admin role always keeps all permissions when updated', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'role-admin', key: 'admin', name: 'Admin', description: 'Owner.', is_system: true, created_at: '2026-05-07T00:00:00.000Z', updated_at: '2026-05-07T00:00:00.000Z' }],
    [],
    [],
    [],
  ]);
  const handler = createAdminRolesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(request({ roleId: 'role-admin', key: 'admin', name: 'Admin', permissions: [] }, 'PATCH')));

  assert.equal(response.status, 200);
  assert.equal(response.body.role.permissions.includes('admin.roles.manage'), true);
  assert.equal(response.body.role.permissions.includes('admin.invoices.manage'), true);
  assert.equal(response.body.role.permissions.includes('admin.activity.view'), true);
  assert.equal(response.body.role.permissions.includes('dashboard.switch_views'), true);
});
