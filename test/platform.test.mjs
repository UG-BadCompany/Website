import test from 'node:test';
import assert from 'node:assert/strict';
import { CORE_MODULES, ENVIRONMENT_VARIABLES, getIntegrationStatus, installPlatform, requestMagicLink, validateInstall } from '../lib/platformData.mjs';
import { handler } from '../netlify/functions/api.mjs';

const event = (method, path, body) => ({ httpMethod: method, path: `/api${path}`, body: body ? JSON.stringify(body) : null });

test('uses the exact environment variable names without exposing values', () => {
  const integrations = getIntegrationStatus({ OPENAI_API_KEY: 'secret', SERPAPI_API_KEY: 'search-secret' });
  assert.ok(ENVIRONMENT_VARIABLES.map(([key]) => key).includes('SERPAPI_API_KEY'));
  assert.ok(!ENVIRONMENT_VARIABLES.map(([key]) => key).includes(['SERPAPI', 'KEY'].join('_')));
  assert.ok(!JSON.stringify(integrations).includes('search-secret'));
  assert.equal(integrations.find(i => i.key === 'OPENAI_API_KEY').statusText, 'Configured');
});

test('finishes installation with owner, roles, permissions, modules, and settings', async () => {
  const result = await installPlatform({ owner: { email: 'Owner@Example.com', fullName: 'Owner User' }, company: { name: 'Acme Contractors' } }, {});
  assert.equal(result.ok, true);
  assert.equal(validateInstall().ok, true);
  assert.ok(CORE_MODULES.length >= 31);
});

test('exposes required installer API routes', async () => {
  const finish = await handler(event('POST','/install/finish',{ owner:{ email:'api@example.com' }}));
  assert.equal(finish.statusCode, 200);
  for (const route of ['/install-status','/install/health','/install/draft','/install/integration-status']) {
    const res = await handler(event('GET', route));
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).ok, true);
  }
});

test('magic login is secure and gracefully reports missing email configuration', () => {
  const missing = requestMagicLink('client@example.com', {});
  assert.equal(missing.message, 'Email not configured yet.');
  const configured = requestMagicLink('client@example.com', { RESEND_API_KEY:'secret', MAGIC_LINK_FROM_EMAIL:'noreply@example.com' });
  assert.equal(configured.ok, true);
  assert.ok(!('tokenHash' in configured));
});
