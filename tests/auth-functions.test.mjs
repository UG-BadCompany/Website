import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authProviderStatus,
  normalizeClientAccountPayload,
  validateClientAccount,
  validateEmail,
} from '../netlify/functions/auth-utils.mjs';
import { createClientAccountHandler } from '../netlify/functions/create-client-account.mjs';
import { createMagicLinkHandler } from '../netlify/functions/request-magic-link.mjs';

const request = (body, method = 'POST') => new Request('https://example.test/api/auth', {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: body === undefined ? undefined : { 'content-type': 'application/json' },
});

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

test('auth helper normalizes account fields and validates email/phone input', () => {
  const normalized = normalizeClientAccountPayload({
    name: ` ${'A'.repeat(200)} `,
    email: ' OWNER@EXAMPLE.COM ',
    phone: ' 555-0100 ',
    'bot-field': ' ',
  });

  assert.equal(normalized.name.length, 140);
  assert.equal(normalized.email, 'owner@example.com');
  assert.equal(normalized.phone, '555-0100');
  assert.equal(normalized.botField, '');
  assert.equal(validateEmail('bad-email'), 'Enter a valid email address.');
  assert.equal(validateClientAccount({ name: 'Owner', email: 'owner@example.com', phone: '555-0100' }), null);
});

test('auth provider status requires all provider environment settings', () => {
  const original = {
    AUTH_PROVIDER: process.env.AUTH_PROVIDER,
    AUTH_ISSUER_URL: process.env.AUTH_ISSUER_URL,
    AUTH_CLIENT_ID: process.env.AUTH_CLIENT_ID,
    AUTH_CLIENT_SECRET: process.env.AUTH_CLIENT_SECRET,
  };

  delete process.env.AUTH_PROVIDER;
  delete process.env.AUTH_ISSUER_URL;
  delete process.env.AUTH_CLIENT_ID;
  delete process.env.AUTH_CLIENT_SECRET;

  assert.deepEqual(authProviderStatus(), { provider: '', configured: false });

  process.env.AUTH_PROVIDER = 'Clerk';
  process.env.AUTH_ISSUER_URL = 'https://issuer.example';
  process.env.AUTH_CLIENT_ID = 'client-id';
  process.env.AUTH_CLIENT_SECRET = 'client-secret';

  assert.deepEqual(authProviderStatus(), { provider: 'clerk', configured: true });

  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('magic-link endpoint validates email before reporting auth readiness', async () => {
  const handler = createMagicLinkHandler({ getAuthProviderStatus: () => ({ provider: '', configured: false }) });

  assert.deepEqual(await readJson(await handler(request({ email: 'bad' }))), {
    status: 422,
    body: { ok: false, message: 'Enter a valid email address.' },
  });

  assert.deepEqual(await readJson(await handler(request({ email: 'client@example.com' }))), {
    status: 501,
    body: {
      ok: false,
      code: 'AUTH_PROVIDER_NOT_CONFIGURED',
      message: 'Secure magic-link login is not connected yet. Configure the auth provider environment variables before turning on account creation or dashboard access.',
    },
  });
});

test('client-account endpoint validates required fields and reports adapter readiness', async () => {
  const notConfiguredHandler = createClientAccountHandler({ getAuthProviderStatus: () => ({ provider: '', configured: false }) });

  assert.deepEqual(await readJson(await notConfiguredHandler(request({ name: '', email: '', phone: '' }))), {
    status: 422,
    body: { ok: false, message: 'Name is required.' },
  });

  assert.equal(
    (await readJson(await notConfiguredHandler(request({ name: 'Client', email: 'client@example.com', phone: '555-0100' })))).status,
    501,
  );

  const configuredHandler = createClientAccountHandler({ getAuthProviderStatus: () => ({ provider: 'clerk', configured: true }) });
  const response = await readJson(await configuredHandler(request({ name: 'Client', email: 'client@example.com', phone: '555-0100' })));

  assert.equal(response.status, 501);
  assert.equal(response.body.code, 'AUTH_PROVIDER_ADAPTER_PENDING');
  assert.equal(response.body.provider, 'clerk');
});

test('auth endpoints accept honeypot submissions without exposing readiness', async () => {
  const magicLinkHandler = createMagicLinkHandler({ getAuthProviderStatus: () => ({ provider: 'clerk', configured: true }) });
  const clientAccountHandler = createClientAccountHandler({ getAuthProviderStatus: () => ({ provider: 'clerk', configured: true }) });

  assert.deepEqual(await readJson(await magicLinkHandler(request({ 'bot-field': 'spam' }))), {
    status: 200,
    body: { ok: true, message: 'If this email can sign in, a secure link will be sent.' },
  });

  assert.deepEqual(await readJson(await clientAccountHandler(request({ 'bot-field': 'spam' }))), {
    status: 200,
    body: { ok: true, message: 'If this account can be created, a secure link will be sent.' },
  });
});
