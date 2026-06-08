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


test('installer separates database client, connection, schema, and write states', async () => {
  const app = await readFile('src/app.js','utf8');
  assert(app.includes('Database Client'));
  assert(app.includes('Database Connection'));
  assert(app.includes('Schema Bootstrap'));
  assert(app.includes('Write Verification'));
  assert(app.includes('Waiting for Netlify Database provisioning...'));
  assert(app.includes('This platform includes @netlify/database, so Netlify should automatically provision a database during deploy.'));
  assert(!app.includes('No database connection has been detected.'));
  assert(!app.includes('deploy with the @netlify/database dependency'));
});

test('database detection supports linked Netlify and Postgres URL variables without exposing values', async () => {
  const db = await readFile('netlify/functions/lib/db.mjs','utf8');
  assert(db.includes('getConnectionString()'));
  assert(db.includes("new pg.Pool({ connectionString"));
  assert(db.includes("['DATABASE_URL','NETLIFY_DATABASE_URL','getConnectionString()','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','NEON_DATABASE_URL']"));
  for (const name of ['DATABASE_URL','NETLIFY_DATABASE_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','NEON_DATABASE_URL']) assert(db.includes(name), name);
  const app = await readFile('src/app.js','utf8');
  assert(app.includes('Actual database URL values are never displayed.'));
  assert(app.includes('Selected Connection Source'));
  assert(app.includes('A database connection string was found, but the connection attempt failed.'));
});

test('database bootstrap schema is idempotent and versioned', async () => {
  const db = await readFile('netlify/functions/lib/db.mjs','utf8');
  assert(!/create\s+table(?!\s+if\s+not\s+exists)/i.test(db));
  assert(!/create\s+(?:unique\s+)?index(?!\s+if\s+not\s+exists)/i.test(db));
  assert(db.includes('schema_version integer'));
  assert(db.includes('alter table platform_installation add column if not exists schema_version'));
  assert(db.includes('tablesDetected'));
  assert(db.includes('seedRecordsInserted'));
  assert(db.includes("error?.code === '42P07'"));
});
