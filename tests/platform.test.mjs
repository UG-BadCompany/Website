import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

test('installer pages are visible static documents', async () => {
  const install = await readFile('public/install/index.html','utf8');
  const recovery = await readFile('public/install/recovery/index.html','utf8');
  assert.match(install, /static fallback/);
  assert.match(install, /Finish Install/);
  assert.match(recovery, /Recovery shell/);
});

test('netlify redirects expose required install APIs and no nextjs plugin', async () => {
  const toml = await readFile('netlify.toml','utf8');
  for (const route of ['/api/install-status','/api/install/health','/api/install/draft','/api/install/finish']) assert.match(toml, new RegExp(route.replaceAll('/','\\/')));
  assert.doesNotMatch(toml, /plugin-nextjs|Next\.js/i);
  assert.match(toml, /publish = "out"/);
  assert.match(toml, /functions = "netlify\/functions"/);
});

test('environment wizard includes grouped tabs and does not expose secret values', async () => {
  const js = await readFile('public/assets/js/public/installer.js','utf8');
  for (const group of ['Required','AI','Payments','Security','Advanced','Future']) assert.match(js, new RegExp(group));
  for (const required of ['SITE_URL','MAGIC_LINK_FROM_EMAIL','RESEND_API_KEY']) assert.match(js, new RegExp(required));
  const response = await readFile('netlify/functions/shared/response.mjs','utf8');
  assert.match(response, /configured: Boolean/);
  assert.doesNotMatch(response, /process\.env\[name\][,}]/);
});

test('drop-in modules auto-register through generated registry', async () => {
  assert.ok(existsSync('public/config/module-registry.json'));
  const registry = JSON.parse(await readFile('public/config/module-registry.json','utf8'));
  assert.ok(registry.modules.length >= 18);
  for (const id of ['module-manager','ai-quote','work-orders','square-payments','audit-logs']) assert.ok(registry.modules.some(m => m.id === id));
});

test('core migration includes installation, module, audit, and workflow foundations', async () => {
  const sql = await readFile('netlify/database/migrations/0001_core_platform.sql','utf8');
  for (const table of ['platform_settings','companies','users','roles','modules','audit_logs','workflow_items']) assert.match(sql, new RegExp(table));
});

test('finish install validates, seeds, and returns installation complete without secrets', async () => {
  process.env.SITE_URL = 'https://example.test';
  process.env.MAGIC_LINK_FROM_EMAIL = 'noreply@example.test';
  process.env.RESEND_API_KEY = 'secret_test_key';
  const { handler } = await import('../netlify/functions/install-finish.mjs');
  const result = await handler({ httpMethod:'POST', body: JSON.stringify({ company:{name:'Demo',site_url:'https://example.test'}, owner:{name:'Owner',email:'owner@example.test'}, theme:{mode:'system'}, homepage:{headline:'Hi'}, env:{} }) });
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.installation_complete, true);
  assert.equal(body.seeded.roles, 6);
  assert.ok(body.seeded.modules >= 18);
  assert.doesNotMatch(result.body, /secret_test_key/);
});
