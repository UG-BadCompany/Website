import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAllowedSiteUrls,
  getFromEmail,
  getSiteUrl,
  hashToken,
  shouldSendEmail,
  normalizeClientAccountPayload,
  validateClientAccount,
  validateEmail,
} from '../netlify/functions/auth-utils.mjs';
import { createMeHandler } from '../netlify/functions/me.mjs';
import { createLogoutHandler } from '../netlify/functions/logout.mjs';
import { createMagicLinkHandler } from '../netlify/functions/request-magic-link.mjs';
import { createVerifyMagicLinkHandler } from '../netlify/functions/verify-magic-link.mjs';

const request = (body, method = 'POST', url = 'https://example.test/api/auth') => new Request(url, {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: body === undefined ? undefined : { 'content-type': 'application/json' },
});

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
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


test('email delivery stays disabled for missing or placeholder Resend settings', () => {
  const original = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAGIC_LINK_FROM_EMAIL: process.env.MAGIC_LINK_FROM_EMAIL,
    QUOTE_FROM_EMAIL: process.env.QUOTE_FROM_EMAIL,
  };

  delete process.env.RESEND_API_KEY;
  process.env.MAGIC_LINK_FROM_EMAIL = 'portal@your-domain.example';
  process.env.QUOTE_FROM_EMAIL = 'quotes@your-domain.example';

  assert.equal(shouldSendEmail(), false);
  assert.equal(getFromEmail(), 'portal@ta-contracting.org');

  process.env.RESEND_API_KEY = 're_replace_me';
  assert.equal(shouldSendEmail(), false);

  process.env.RESEND_API_KEY = 're_real_key';
  assert.equal(shouldSendEmail(), false);

  process.env.MAGIC_LINK_FROM_EMAIL = 'portal@example.com';
  assert.equal(shouldSendEmail(), true);
  assert.equal(getFromEmail(), 'portal@example.com');

  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});


test('site URL helper supports the production domain and Netlify subdomain alias', () => {
  const original = {
    SITE_URL: process.env.SITE_URL,
    SITE_URL_ALIASES: process.env.SITE_URL_ALIASES,
  };

  process.env.SITE_URL = 'https://ta-contracting.org/';
  process.env.SITE_URL_ALIASES = 'https://tacontracting.netlify.app';

  assert.deepEqual(getAllowedSiteUrls(), ['https://ta-contracting.org', 'https://tacontracting.netlify.app']);
  assert.equal(
    getSiteUrl(new Request('https://tacontracting.netlify.app/login/')),
    'https://tacontracting.netlify.app',
  );
  assert.equal(
    getSiteUrl(new Request('https://ta-contracting.org/login/')),
    'https://ta-contracting.org',
  );
  assert.equal(
    getSiteUrl(new Request('https://unexpected.example/login/')),
    'https://ta-contracting.org',
  );

  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('magic-link endpoint stores a hashed token and returns a development link when email is not configured', async () => {
  const db = createMockDb();
  const handler = createMagicLinkHandler({
    getDatabase: async () => db,
    makeToken: () => 'magic-token',
    sendEmail: async () => ({ sent: false }),
  });

  assert.deepEqual(await readJson(await handler(request({ email: 'bad' }))), {
    status: 422,
    body: { ok: false, message: 'Enter a valid email address.' },
  });

  const response = await readJson(await handler(request({ email: 'Client@Example.com' }, 'POST', 'https://site.test/login/')));

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.emailSent, false);
  assert.equal(response.body.devMagicLink, 'https://site.test/api/auth/verify?token=magic-token');
  assert.equal(db.queries.length, 1);
  assert.match(db.queries[0].text, /insert into auth_magic_links/);
  assert.equal(db.queries[0].values[0], 'client@example.com');
  assert.equal(db.queries[0].values[1], hashToken('magic-token'));
});


test('magic-link endpoint still returns a usable development link when email delivery fails', async () => {
  const db = createMockDb();
  const handler = createMagicLinkHandler({
    getDatabase: async () => db,
    makeToken: () => 'magic-token',
    sendEmail: async () => {
      throw new Error('Resend rejected sender');
    },
  });

  const response = await readJson(await handler(request({ email: 'client@example.com' }, 'POST', 'https://site.test/login/')));

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.emailSent, false);
  assert.match(response.body.message, /Email delivery failed/);
  assert.equal(response.body.devMagicLink, 'https://site.test/api/auth/verify?token=magic-token');
  assert.equal(db.queries.length, 1);
});

test('verify endpoint consumes a magic link, upserts the user, creates a session cookie, and redirects', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', purpose: 'client_account', client_name: 'Client', client_phone: '555-0100' }],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }],
    [],
    [],
    [],
  ]);
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify?token=magic-token'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://site.test/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.length, 5);
  assert.match(db.queries[0].text, /from auth_magic_links/);
  assert.equal(db.queries[0].values[0], hashToken('magic-token'));
  assert.match(db.queries[4].text, /insert into auth_sessions/);
  assert.equal(db.queries[4].values[1], hashToken('session-token'));
});

test('me endpoint loads the signed-in user and roles from the session cookie', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }, { key: 'admin', name: 'Admin' }],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['client', 'admin']);
  assert.deepEqual(response.body.user.permissions, {
    canViewClientTools: true,
    canViewWorkerTools: true,
    canViewAdminTools: true,
    canSwitchDashboardView: true,
    defaultView: 'admin',
    availableViews: ['admin', 'client', 'worker'],
  });
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});


test('me endpoint scopes plain client users to client-only dashboard permissions', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client']);
  assert.deepEqual(response.body.user.permissions, {
    canViewClientTools: true,
    canViewWorkerTools: false,
    canViewAdminTools: false,
    canSwitchDashboardView: false,
    defaultView: 'client',
    availableViews: ['client'],
  });
});

test('logout endpoint revokes the current session and clears the session cookie', async () => {
  const db = createMockDb();
  const handler = createLogoutHandler({ getDatabase: async () => db });

  const response = await handler(new Request('https://site.test/api/auth/logout', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token' },
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(response.headers.get('set-cookie'), /ta_session=;/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(db.queries.length, 1);
  assert.match(db.queries[0].text, /update auth_sessions/);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});

test('magic-link endpoint accepts honeypot submissions without writing tokens', async () => {
  let openedDatabase = false;
  const getDatabase = async () => {
    openedDatabase = true;
    return createMockDb();
  };
  const magicLinkHandler = createMagicLinkHandler({ getDatabase });

  assert.deepEqual(await readJson(await magicLinkHandler(request({ 'bot-field': 'spam' }))), {
    status: 200,
    body: { ok: true, message: 'If this email can sign in, a secure link will be sent.' },
  });


  assert.equal(openedDatabase, false);
});
