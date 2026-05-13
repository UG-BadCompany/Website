import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  getAllowedSiteUrls,
  getFromEmail,
  getSiteUrl,
  hashToken,
  shouldSendEmail,
  normalizeClientAccountPayload,
  validateClientAccount,
  validateEmail,
  createOrUpdateMagicLinkUser,
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


test('latest magic-link migration restores profile metadata columns for existing databases', async () => {
  const migration = await readFile(new URL('../netlify/database/migrations/0019_magic_link_profile_columns.sql', import.meta.url), 'utf8');

  assert.match(migration, /alter table auth_magic_links/);
  assert.match(migration, /add column if not exists client_name text/);
  assert.match(migration, /add column if not exists client_phone text/);
});



test('magic-link user helper does not fail sign-in when role assignment has a stale schema problem', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from app_users/.test(text)) return [{ id: 'user-1', email: 'client@example.com', full_name: '', phone: '' }];
      if (/update app_users/.test(text)) return [{ id: 'user-1', email: 'client@example.com', full_name: '', phone: '' }];
      if (/insert into roles/.test(text)) throw new Error('roles schema mismatch');
      return [];
    },
  };

  const user = await createOrUpdateMagicLinkUser(db, { email: 'client@example.com' });

  assert.equal(user.id, 'user-1');
  assert.equal(db.queries.some((query) => /insert into roles/.test(query.text)), true);
});

test('verify endpoint shows an auto-submit continue page on GET without consuming scanner visits', async () => {
  let openedDatabase = false;
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await handler(new Request('https://site.test/api/auth/verify?token=magic-token'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(html, /method="POST"/);
  assert.match(html, /name="token" value="magic-token"/);
  assert.match(html, /requestSubmit/);
  assert.equal(openedDatabase, false);
});

test('verify endpoint consumes a magic link, upserts the user, creates a session cookie, and redirects', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com' }],
    [{ id: 'user-1', email: 'Client@Example.com', full_name: '', phone: '' }],
    [{ id: 'user-1', email: 'Client@Example.com', full_name: '', phone: '' }],
    [],
    [],
    [],
    [],
  ]);
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify', {
    method: 'POST',
    body: new URLSearchParams({ token: 'magic-token' }),
  }));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://site.test/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.length, 7);
  assert.match(db.queries[0].text, /from auth_magic_links/);
  assert.equal(db.queries[0].values[0], hashToken('magic-token'));
  assert.match(db.queries[1].text, /from app_users/);
  assert.equal(db.queries[1].values[0], 'client@example.com');
  assert.match(db.queries[2].text, /update app_users/);
  assert.equal(db.queries[2].values[0], null);
  assert.equal(db.queries[2].values[1], null);
  assert.equal(db.queries[2].values[2], 'user-1');
  assert.doesNotMatch(db.queries[0].text, /client_name|client_phone/);
  assert.match(db.queries[3].text, /insert into roles/);
  assert.match(db.queries[4].text, /insert into user_roles/);
  assert.match(db.queries[5].text, /insert into auth_sessions/);
  assert.equal(db.queries[5].values[1], hashToken('session-token'));
  assert.match(db.queries[6].text, /update auth_magic_links/);
});


test('verify endpoint still redirects when marking the used magic link fails after session creation', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_magic_links/.test(text)) return [{ id: 'link-1', email: 'client@example.com' }];
      if (/from app_users/.test(text)) return [{ id: 'user-1', email: 'client@example.com', full_name: '', phone: '' }];
      if (/update app_users/.test(text)) return [{ id: 'user-1', email: 'client@example.com', full_name: '', phone: '' }];
      if (/update auth_magic_links/.test(text)) throw new Error('consumed_at schema mismatch');
      return [];
    },
  };
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify', {
    method: 'POST',
    body: new URLSearchParams({ token: 'magic-token' }),
  }));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://site.test/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.some((query) => /insert into auth_sessions/.test(query.text)), true);
  assert.equal(db.queries.some((query) => /update auth_magic_links/.test(query.text)), true);
});

test('me endpoint loads the signed-in user and roles from the session cookie', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100', secondary_phone: '555-0101', company_name: 'T&A', mailing_address: '123 Main St' }],
    [{ key: 'client', name: 'Client' }, { key: 'admin', name: 'Admin' }],
    [],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['client', 'admin']);
  assert.equal(response.body.user.phone, '555-0100');
  assert.equal(response.body.user.secondaryPhone, '555-0101');
  assert.equal(response.body.user.companyName, 'T&A');
  assert.equal(response.body.user.mailingAddress, '123 Main St');
  assert.equal(response.body.user.permissions.canViewClientTools, true);
  assert.equal(response.body.user.permissions.canViewWorkerTools, true);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, true);
  assert.equal(response.body.user.permissions.canManageUsers, true);
  assert.equal(response.body.user.permissions.canManageRoles, true);
  assert.equal(response.body.user.permissions.defaultView, 'admin');
  assert.deepEqual(response.body.user.permissions.availableViews, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.permissionKeys.includes('admin.roles.manage'), true);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});



test('me endpoint falls back to client access when a magic-link account has no assigned roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client']);
  assert.equal(response.body.user.permissions.canViewClientTools, true);
  assert.equal(response.body.user.permissions.defaultView, 'client');
  assert.deepEqual(response.body.user.permissions.availableViews, ['client']);
});

test('me endpoint scopes plain client users to client-only dashboard permissions', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [{ key: 'client', name: 'Client' }],
    [],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client']);
  assert.equal(response.body.user.permissions.canViewClientTools, true);
  assert.equal(response.body.user.permissions.canViewWorkerTools, false);
  assert.equal(response.body.user.permissions.canViewAdminTools, false);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, false);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, false);
  assert.equal(response.body.user.permissions.defaultView, 'client');
  assert.deepEqual(response.body.user.permissions.availableViews, ['client']);
  assert.deepEqual(response.body.user.permissions.permissionKeys, ['client.invoices.manage', 'client.quotes.manage', 'client.requests.manage', 'client.tools']);
});


test('me endpoint optional session check returns signed-out state without a 401', async () => {
  let openedDatabase = false;
  const handler = createMeHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/me?optional=1')));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, false);
  assert.equal(response.body.ok, true);
  assert.equal(openedDatabase, false);
});

test('me endpoint optional session check clears an expired cookie without a 401', async () => {
  const db = createMockDb([[]]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await handler(new Request('https://site.test/api/me?optional=1', {
    headers: { cookie: 'ta_session=expired-token' },
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.authenticated, false);
  assert.match(body.message, /session expired/i);
  assert.match(response.headers.get('set-cookie'), /ta_session=;/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(db.queries.length, 1);
  assert.equal(db.queries[0].values[0], hashToken('expired-token'));
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


test('me endpoint lets a signed-in client update their profile', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100', secondary_phone: null, company_name: null, mailing_address: null }],
    [],
    [{ key: 'client', name: 'Client' }],
    [],
    [{ id: 'user-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client Updated', phone: '555-0200', secondary_phone: '555-0300', company_name: 'Client Co', mailing_address: '456 Oak Ave' }],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Client Updated', phone: '555-0200', secondaryPhone: '555-0300', companyName: 'Client Co', mailingAddress: '456 Oak Ave' }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.user.fullName, 'Client Updated');
  assert.equal(response.body.user.phone, '555-0200');
  assert.equal(response.body.user.secondaryPhone, '555-0300');
  assert.equal(response.body.user.companyName, 'Client Co');
  assert.equal(response.body.user.mailingAddress, '456 Oak Ave');
  assert.match(db.queries[4].text, /update app_users/);
  assert.match(db.queries[5].text, /insert into audit_events/);
});
