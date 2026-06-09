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

test('installer has polished theme, services, and homepage builders', async () => {
  const app = await readFile('src/app.js','utf8');
  for (const preset of ['Contractor Dark','Modern Blue','Copper Canyon','Slate Pro','Arizona Sand','Clean Light','Forest Service','High Contrast']) assert(app.includes(preset), preset);
  for (const text of ['Primary Brand Color','Use custom sidebar colors','Use custom mobile nav colors','Live Theme Preview']) assert(app.includes(text), text);
  for (const template of ['Handyman','HVAC','Plumbing','Electrical','Remodeling','Property Maintenance','Commercial Maintenance','General Contractor']) assert(app.includes(template), template);
  for (const text of ['data-service-move','data-service-remove','data-service-toggle','Default labor rate optional']) assert(app.includes(text), text);
  assert(app.includes('Advanced Developer Settings'));
  assert(app.includes('<details class="builder-section"><summary><b>Advanced Developer Settings</b></summary>'));
  for (const text of ['Hero Section','Hero image upload','Featured Projects','Testimonials','Homepage Live Preview']) assert(app.includes(text), text);
});

test('finish install persists structured theme services and homepage data', async () => {
  const db = await readFile('netlify/functions/lib/db.mjs','utf8');
  for (const column of ['button_color','sidebar_text_color','mobile_nav_text_color','company_info','projects jsonb','testimonials jsonb','default_labor_rate','metadata jsonb']) assert(db.includes(column), column);
  assert(db.includes('serviceItems'));
  assert(db.includes('insert into service_categories(name,category,icon,color,default_labor_rate,active,sort_order,metadata'));
  assert(db.includes('insert into homepage_settings(id,hero_title,hero_subtitle,cta_label,cta_link,secondary_cta_label'));
});


test('magic login uses Resend SDK with explicit delivery outcomes and logging', async () => {
  const api = await readFile('netlify/functions/api.mjs','utf8');
  assert(api.includes("import { Resend } from 'resend';"));
  assert(api.includes('const resend = new Resend(process.env.RESEND_API_KEY);'));
  assert(api.includes('await resend.emails.send({'));
  assert(api.includes('await resend.domains.list()'));
  assert(api.includes('Resend domain ${fromDomain} is not verified or does not match MAGIC_LINK_FROM_EMAIL'));
  for (const envName of ['RESEND_API_KEY', 'MAGIC_LINK_FROM_EMAIL', 'SITE_URL']) assert(api.includes(envName), envName);
  assert(api.includes("code: 'MISSING_EMAIL_CONFIGURATION'"));
  for (const logLine of ['Magic token created', 'Magic login URL', 'Sending magic email to', 'Magic email send attempted', 'Magic email sent successfully', 'Magic email failed', 'Resend from domain verified']) assert(api.includes(logLine), logLine);
  assert(api.includes('return json(200, { ok: true, emailSent: true })'));
  assert(api.includes('return json(200, { ok: false, emailSent: false, error: stringifyError(error) })'));
  assert(!api.includes("fetch('https://api.resend.com/emails'"));
  assert(!api.includes('console.warn(\'[auth] Magic link email delivery failed'));
});

test('magic login verifies token storage and does not silently swallow exceptions', async () => {
  const db = await readFile('netlify/functions/lib/db.mjs','utf8');
  assert(db.includes('crypto.randomBytes(32).toString(\'base64url\')'));
  assert(db.includes('insert into magic_tokens(user_id, token_hash, expires_at, metadata)'));
  assert(db.includes("throw new Error('Magic token storage failed')"));
  const response = await readFile('netlify/functions/lib/response.mjs','utf8');
  assert(response.includes("console.error('[api] Unhandled exception', error)"));
  assert(response.includes("console.error('[api] Failed to parse request body', error)"));
});

test('resend dependency is declared for production email delivery', async () => {
  const pkg = JSON.parse(await readFile('package.json','utf8'));
  assert(pkg.dependencies.resend, 'package.json must include resend');
  const packageLock = await readFile('package-lock.json','utf8');
  assert(packageLock.includes('node_modules/resend'), 'package-lock.json must include resend');
});
