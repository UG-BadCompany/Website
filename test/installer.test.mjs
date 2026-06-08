import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
process.env.PLATFORM_STORE_PATH = `${os.tmpdir()}/platform-test-${Date.now()}.json`;
const status = await import('../netlify/functions/install-status.js');
const finish = await import('../netlify/functions/install-finish.js');

test('install-status always returns safe JSON before install', async () => {
  fs.rmSync(process.env.PLATFORM_STORE_PATH, { force: true });
  const res = await status.handler({ headers: {} });
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.needsInstall, true);
});

test('finish install succeeds without optional integrations and sets complete', async () => {
  const draft = { company: { name: 'Demo Co' }, owner: { name: 'Owner', email: 'owner@example.com' }, theme: { mode: 'system', primaryColor: '#2563eb' }, services: ['HVAC'], modules: ['quote-center'], homepage: { headline: 'Demo' } };
  const res = await finish.handler({ httpMethod: 'POST', headers: { host: 'example.test' }, body: JSON.stringify({ confirm: true, draft }) });
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.installationComplete, true);
  assert.ok(body.warnings.includes('OpenAI is not configured yet.'));
  const res2 = await status.handler({ headers: {} });
  assert.equal(JSON.parse(res2.body).installationComplete, true);
});
