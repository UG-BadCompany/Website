import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  getAllowedSiteUrls,
  getFromEmail,
  getSiteUrl,
  getSessionTtlMinutesForRoles,
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
import { createAuthDebugHandler } from '../netlify/functions/auth-debug.mjs';

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


test('auth helper uses short client sessions and longer staff sessions', () => {
  assert.equal(getSessionTtlMinutesForRoles(['client']), 30);
  assert.equal(getSessionTtlMinutesForRoles(['worker']), 120);
  assert.equal(getSessionTtlMinutesForRoles(['client', 'admin']), 120);
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
    getSiteUrl(new Request('https://www.ta-contracting.org/login/')),
    'https://www.ta-contracting.org',
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



test('session cookies keep same-site behavior, add Secure, and share across configured www/apex hosts', () => {
  const original = {
    SITE_URL: process.env.SITE_URL,
    SITE_URL_ALIASES: process.env.SITE_URL_ALIASES,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  };

  delete process.env.SITE_URL;
  delete process.env.SITE_URL_ALIASES;
  delete process.env.AUTH_COOKIE_DOMAIN;

  const httpsCookie = createSessionCookie('session-token', new Request('https://site.test/api/auth/verify'));
  const forwardedCookie = createSessionCookie('session-token', new Request('http://site.test/api/auth/verify', {
    headers: { 'x-forwarded-proto': 'https' },
  }));
  const localCookie = createSessionCookie('session-token', new Request('http://localhost:8888/api/auth/verify'));
  const expiredCookie = createExpiredSessionCookie(new Request('https://site.test/api/auth/logout'));

  assert.match(httpsCookie, /SameSite=Lax/);
  assert.match(httpsCookie, /Secure/);
  assert.doesNotMatch(httpsCookie, /Domain=/);
  assert.match(forwardedCookie, /SameSite=Lax/);
  assert.match(forwardedCookie, /Secure/);
  assert.match(localCookie, /SameSite=Lax/);
  assert.doesNotMatch(localCookie, /Secure/);
  assert.match(expiredCookie, /SameSite=Lax/);
  assert.match(expiredCookie, /Max-Age=0/);

  process.env.SITE_URL = 'https://ta-contracting.org';
  const wwwCookie = createSessionCookie('session-token', new Request('https://www.ta-contracting.org/api/auth/verify'));
  assert.match(wwwCookie, /Domain=\.ta-contracting\.org/);
  assert.match(wwwCookie, /Secure/);

  process.env.AUTH_COOKIE_DOMAIN = 'ta-contracting.org';
  const apexCookie = createSessionCookie('session-token', new Request('https://ta-contracting.org/api/auth/verify'));
  assert.match(apexCookie, /Domain=\.ta-contracting\.org/);

  const netlifyCookie = createSessionCookie('session-token', new Request('https://tacontracting.netlify.app/api/auth/verify'));
  assert.doesNotMatch(netlifyCookie, /Domain=/);

  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('magic-link URL uses the request host so session cookies stay on the dashboard host', () => {
  const original = {
    SITE_URL: process.env.SITE_URL,
    SITE_URL_ALIASES: process.env.SITE_URL_ALIASES,
  };

  process.env.SITE_URL = 'https://ta-contracting.org';
  delete process.env.SITE_URL_ALIASES;

  assert.equal(
    createMagicLinkUrl(new Request('https://tacontracting.netlify.app/login/'), 'magic-token'),
    'https://tacontracting.netlify.app/api/auth/verify?token=magic-token',
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



test('magic-link user lookup reuses existing account case-insensitively', async () => {
  const db = createMockDb([
    [{ id: 'user-1' }],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }],
    [],
  ]);

  const user = await createOrUpdateMagicLinkUser(db, {
    email: 'CLIENT@example.com',
    name: 'Client',
    phone: '555-0100',
  });

  assert.equal(user.id, 'user-1');
  assert.match(db.queries[0].text, /where lower\(email\) = lower/);
  assert.equal(db.queries[0].values[0], 'client@example.com');
  assert.match(db.queries[1].text, /update app_users/);
  assert.equal(db.queries[2].values[0], 'user-1');
});

test('verify endpoint consumes a magic link, upserts the user, creates a session cookie, and opens the dashboard', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', purpose: 'client_account', client_name: 'Client', client_phone: '555-0100' }],
    [],
    [{ id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }],
    [],
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
  assert.equal(response.headers.get('location'), '/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=1800/);
  assert.equal(db.queries.length, 7);
  assert.match(db.queries[0].text, /from auth_magic_links/);
  assert.equal(db.queries[0].values[0], hashToken('magic-token'));
  assert.match(db.queries[5].text, /from user_roles/);
  assert.match(db.queries[6].text, /insert into auth_sessions/);
  assert.equal(db.queries[6].values[1], hashToken('session-token'));
});

test('verify endpoint gives admin and worker sessions a two-hour cookie', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'admin@example.com', purpose: 'login', client_name: null, client_phone: null }],
    [],
    [{ id: 'user-1', email: 'admin@example.com', full_name: 'Admin', phone: null }],
    [],
    [],
    [{ key: 'admin' }, { key: 'worker' }],
    [],
  ]);
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify?token=magic-token'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://site.test/dashboard/');
  assert.match(response.headers.get('set-cookie'), /Max-Age=7200/);
  assert.match(db.queries[6].text, /insert into auth_sessions/);
});

test('me endpoint loads the signed-in user and roles from the session cookie', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100', secondary_phone: '555-0101', company_name: 'T&A', mailing_address: '123 Main St' }],
    [{ key: 'client', name: 'Client' }, { key: 'admin', name: 'Admin' }],
    [],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const rawResponse = await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  }));
  const response = await readJson(rawResponse);

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
  assert.equal(response.body.user.permissions.canViewInvoices, true);
  assert.equal(response.body.user.permissions.canManageInvoices, true);
  assert.equal(response.body.user.permissions.canViewAdminActivity, true);
  assert.equal(response.body.user.permissions.defaultView, 'admin');
  assert.deepEqual(response.body.user.permissions.availableViews, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.permissionKeys.includes('admin.roles.manage'), true);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.match(rawResponse.headers.get('set-cookie'), /Max-Age=7200/);
  assert.match(db.queries[3].text, /expires_at/);
});






test('me endpoint chooses a usable duplicate session cookie over a revoked one', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text)) {
        if (values[0] === hashToken('revoked-token')) return [{
          id: 'revoked-session',
          user_id: 'user-1',
          email: 'admin@example.com',
          full_name: 'Admin User',
          phone: '555-0100',
          is_active: true,
          revoked_at: '2026-05-13T00:00:00.000Z',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        }];
        if (values[0] === hashToken('valid-token')) return [{
          id: 'valid-session',
          user_id: 'user-1',
          email: 'admin@example.com',
          full_name: 'Admin User',
          phone: '555-0100',
          is_active: true,
          revoked_at: null,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        }];
      }
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'admin', name: 'Admin' }, { key: 'client', name: 'Client' }, { key: 'worker', name: 'Worker' }];
      if (/role_permissions/.test(text)) return [];
      if (/update auth_sessions/.test(text)) return [];
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const rawResponse = await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=revoked-token; ta_session=valid-token' },
  }));
  const response = { status: rawResponse.status, body: await rawResponse.json() };

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.user.id, 'user-1');
  assert.deepEqual(response.body.user.roles, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(response.body.user.permissions.canManageInventory, true);
  assert.equal(rawResponse.headers.has('set-cookie'), false);
});

test('me endpoint retries role loading and still returns role defaults when the first role query fails', async () => {
  let roleQueryAttempts = 0;
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text)) return [{ id: 'session-1', user_id: 'user-1', email: 'admin@example.com', full_name: 'Admin User', phone: '555-0100' }];
      if (text.includes('from user_roles') && text.includes('join roles')) {
        roleQueryAttempts += 1;
        if (roleQueryAttempts === 1) throw new Error('temporary role load failure');
        return [{ key: 'admin', name: 'Admin' }, { key: 'client', name: 'Client' }, { key: 'worker', name: 'Worker' }];
      }
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, true);
  assert.equal(response.body.user.permissions.canManageUsers, true);
  assert.equal(response.body.user.permissions.canManageInventory, true);
});


test('me endpoint uses the debug-compatible session lookup when SQL now filters would fail', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/expires_at > now\(\)/.test(text)) throw new Error('database now filter should not be used for session lookup');
      if (/from auth_sessions/.test(text)) return [{
        id: 'session-1',
        user_id: 'user-1',
        email: 'admin@example.com',
        full_name: 'Admin User',
        phone: '555-0100',
        is_active: true,
        revoked_at: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }];
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'admin', name: 'Admin' }, { key: 'client', name: 'Client' }, { key: 'worker', name: 'Worker' }];
      if (/role_permissions/.test(text)) return [];
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(response.body.user.permissions.canManageInventory, true);
  assert.equal(db.queries.some((query) => /expires_at > now\(\)/.test(query.text)), false);
});



test('me endpoint falls back to debug-compatible session fields when app user profile columns are unavailable', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text) && /app_users\.phone/.test(text)) throw new Error('app_users.phone column is unavailable');
      if (/from auth_sessions/.test(text)) return [{
        id: 'session-1',
        user_id: 'user-1',
        email: 'admin@example.com',
        full_name: 'Admin User',
        is_active: true,
        revoked_at: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }];
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'admin' }, { key: 'client' }, { key: 'worker' }];
      if (/role_permissions/.test(text)) return [];
      if (/update auth_sessions/.test(text)) return [];
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.user.fullName, 'Admin User');
  assert.deepEqual(response.body.user.roles, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(db.queries.filter((query) => /from auth_sessions/.test(query.text)).length, 1);
  assert.equal(db.queries.some((query) => /from auth_sessions/.test(query.text) && !/app_users\.phone/.test(query.text)), true);
});

test('me endpoint loads roles without requiring the optional role name column', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text)) return [{
        id: 'session-1',
        user_id: 'user-1',
        email: 'admin@example.com',
        full_name: 'Admin User',
        phone: '555-0100',
        is_active: true,
        revoked_at: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }];
      if (/select roles\.key, roles\.name/.test(text)) throw new Error('roles.name column is unavailable');
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'admin' }, { key: 'client' }, { key: 'worker' }];
      if (/role_permissions/.test(text)) return [];
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['admin', 'client', 'worker']);
  assert.equal(response.body.user.permissions.canViewAdminTools, true);
  assert.equal(db.queries.some((query) => /select roles\.key, roles\.name/.test(query.text)), false);
});

test('me endpoint uses role defaults when role permission table is unavailable', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text)) return [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }];
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'client', name: 'Client' }];
      if (/role_permissions/.test(text)) throw new Error('role_permissions missing');
      return [];
    },
  };
  const handler = createMeHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authenticated, true);
  assert.deepEqual(response.body.user.roles, ['client']);
  assert.equal(response.body.user.permissions.canViewClientTools, true);
  assert.equal(response.body.user.permissions.canViewInvoices, true);
});

test('me endpoint falls back to client access when a magic-link account has no assigned roles', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client' }],
    [{ key: 'client', name: 'Client' }],
    [],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const rawResponse = await handler(new Request('https://site.test/api/me', {
    headers: { cookie: 'ta_session=session-token' },
  }));
  const response = await readJson(rawResponse);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.roles, ['client']);
  assert.equal(response.body.user.permissions.canViewClientTools, true);
  assert.equal(response.body.user.permissions.canViewWorkerTools, false);
  assert.equal(response.body.user.permissions.canViewAdminTools, false);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, false);
  assert.equal(response.body.user.permissions.canSwitchDashboardView, false);
  assert.equal(response.body.user.permissions.defaultView, 'client');
  assert.deepEqual(response.body.user.permissions.availableViews, ['client']);
  assert.equal(response.body.user.permissions.canViewInvoices, true);
  assert.equal(response.body.user.permissions.canManageInvoices, false);
  assert.equal(response.body.user.permissions.canViewAdminActivity, false);
  assert.deepEqual(response.body.user.permissions.permissionKeys, ['client.invoices.manage', 'client.quotes.manage', 'client.requests.manage', 'client.tools']);
  assert.match(rawResponse.headers.get('set-cookie'), /Max-Age=1800/);
  assert.match(db.queries[3].text, /expires_at/);
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



test('logout endpoint supports link-based sign out and clears the session cookie', async () => {
  const db = createMockDb();
  const handler = createLogoutHandler({ getDatabase: async () => db });

  const response = await handler(new Request('https://site.test/api/auth/logout?redirect=/login/?signed-out=1', {
    method: 'GET',
    headers: { cookie: 'ta_session=session-token' },
  }));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login/?signed-out=1');
  assert.match(response.headers.get('set-cookie'), /ta_session=;/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(db.queries.length, 1);
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
    [{ key: 'client', name: 'Client' }],
    [],
    [],
    [{ id: 'user-1', user_id: 'user-1', email: 'client@example.com', full_name: 'Client Updated', phone: '555-0200', secondary_phone: '555-0300', company_name: 'Client Co', mailing_address: '456 Oak Ave' }],
    [],
  ]);
  const handler = createMeHandler({ getDatabase: async () => db });
  const rawResponse = await handler(new Request('https://site.test/api/me', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Client Updated', phone: '555-0200', secondaryPhone: '555-0300', companyName: 'Client Co', mailingAddress: '456 Oak Ave' }),
  }));
  const response = await readJson(rawResponse);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.fullName, 'Client Updated');
  assert.equal(response.body.user.phone, '555-0200');
  assert.equal(response.body.user.secondaryPhone, '555-0300');
  assert.equal(response.body.user.companyName, 'Client Co');
  assert.equal(response.body.user.mailingAddress, '456 Oak Ave');
  assert.match(rawResponse.headers.get('set-cookie'), /Max-Age=1800/);
  assert.match(db.queries[3].text, /update auth_sessions/);
  assert.match(db.queries[3].text, /expires_at/);
  assert.match(db.queries[4].text, /update app_users/);
  assert.match(db.queries[5].text, /insert into audit_events/);
});
