import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { coreModules, permissions, defaultRoles } from '../src/modules/moduleData.mjs';

test('core modules include required non-AI modules', () => {
  const ids = coreModules.map(m => m.id);
  for (const id of ['dashboard-overview','customers','request-estimate','estimate-quote-center','work-orders','schedule-calendar','inventory','invoices','finance']) assert(ids.includes(id), id);
});

test('default roles and permissions are declared', () => {
  assert.deepEqual(defaultRoles, ['owner','admin','manager','worker','client']);
  for (const permission of ['dashboard.view','modules.manage','system.manage','impersonation.use']) assert(permissions.includes(permission));
});

test('api always uses safe json wrapper', async () => {
  const api = await readFile('netlify/functions/api.mjs','utf8');
  assert(api.includes('safe(async () =>'));
  assert(api.includes('/api/install/bootstrap-database'));
});

test('no obsolete SERPAPI key name', async () => {
  const integrations = await readFile('netlify/functions/lib/integrations.mjs','utf8');
  assert(integrations.includes('SERPAPI_API_KEY'));
  assert(!integrations.includes('SERPAPI_KEY,'));
});
