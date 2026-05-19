import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getAllowedSiteUrls,
  getFromEmail,
  getSiteUrl,
  getSessionTtlMinutesForRoles,
  hashToken,
  shouldSendEmail,
  normalizeClientAccountPayload,
  parseCookies,
  validateClientAccount,
  validateEmail,
  createOrUpdateMagicLinkUser,
  createMagicLinkUrl,
  createSessionCookie,
  createExpiredSessionCookie,
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
  const request = new Request('https://example.test/dashboard');
  assert.match(createSessionCookie('session-token', request, 30), /Max-Age=1800/);
  assert.match(createSessionCookie('session-token', request, 120), /Max-Age=7200/);
});


test('auth helper parses cookie headers through a single exported parser', () => {
  assert.deepEqual(parseCookies('ta_session=session-token; theme=light%20mode'), {
    ta_session: 'session-token',
    theme: 'light mode',
  });
});


test('me endpoint parses cleanly in Node syntax checks', async () => {
  await assert.doesNotReject(import('node:child_process').then(({ execFile }) => import('node:util').then(({ promisify }) => promisify(execFile)(process.execPath, ['--check', 'netlify/functions/me.mjs']))));
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

test('verify endpoint signs in directly from a magic-link GET without consuming the link and redirects to the dashboard', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null }],
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

  const response = await handler(new Request('https://site.test/api/auth/verify?token=magic-token'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.length, 7);
  assert.match(db.queries[0].text, /from auth_magic_links/);
  assert.equal(db.queries[0].values[0], hashToken('magic-token'));
  assert.match(db.queries[6].text, /insert into auth_sessions/);
  assert.equal(db.queries[6].values[1], hashToken('session-token'));
  assert.equal(db.queries.some((query) => /update auth_magic_links/.test(query.text)), false);
});

test('verify endpoint can recover when the link token is the database magic-link id', async () => {
  const db = createMockDb([
    [{ id: '6f6c428d-286f-41d3-b1a0-ec2e12c4c2be', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null, matched_by: 'id' }],
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

  const response = await handler(new Request('https://site.test/api/auth/verify?token=6f6c428d-286f-41d3-b1a0-ec2e12c4c2be'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries[0].values[2], '6f6c428d-286f-41d3-b1a0-ec2e12c4c2be');
});

test('verify endpoint redirects with a used-link status when a token was already consumed', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: new Date().toISOString(), matched_by: 'token' }],
  ]);
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify?token=magic-token'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login/?auth=used');
  assert.equal(db.queries.length, 1);
});

test('verify endpoint can recover when the link token is the database magic-link id', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null }],
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

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.length, 8);
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
  assert.match(db.queries[6].text, /insert into auth_sessions/);
  assert.equal(db.queries[6].values[1], hashToken('session-token'));
  assert.match(db.queries[7].text, /update auth_magic_links/);
});


test('verify endpoint still redirects when marking the used magic link fails after session creation', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_magic_links/.test(text)) return [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null }];
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

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/dashboard/');
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries.some((query) => /insert into auth_sessions/.test(query.text)), true);
  assert.equal(db.queries.some((query) => /update auth_magic_links/.test(query.text)), true);
});



test('dashboard page renders a visible session status and login debug panel hook', async () => {
  const dashboard = await readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

  assert.match(dashboard, /https:\/\/github.com\/UG-BadCompany\/Website\/blob\/main\/images\/logo\/logo3\.png\?raw=true/);
  assert.match(dashboard, /data-debug-dashboard-link/);
  assert.match(dashboard, /sessionCard\.hidden = !authDebugEnabled/);
  assert.match(dashboard, /debugDashboardLink\.textContent = 'Dashboard'/);
  assert.match(dashboard, /thomas\.debacker\.ii@gmail\.com/);
  assert.match(dashboard, /\[hidden\] \{ display: none !important; \}/);
  assert.match(dashboard, /data-session-status/);
  assert.match(dashboard, /Session check/);
  assert.match(dashboard, /data-auth-debug-panel/);
  assert.match(dashboard, /\/api\/auth\/debug/);
  assert.match(dashboard, /data-debug-fallback-actions/);
  assert.match(dashboard, /Open the admin work-order command center/);
  assert.match(dashboard, /data-main-dashboard-actions/);
  assert.match(dashboard, /configureMainDashboardActions/);
  assert.match(dashboard, /visibleCount && \(permissions\.canViewAdminTools/);
  assert.match(dashboard, /enrichDashboardUserFromDebug/);
  assert.match(dashboard, /result\.permissionKeys/);
  assert.match(dashboard, /getAvailableDashboardViews/);
  assert.match(dashboard, /main-command-shortcuts/);
  assert.match(dashboard, /Work orders/);
  assert.match(dashboard, /Client invoices/);
  assert.match(dashboard, /Profile/);
  assert.match(dashboard, /Worker jobs/);
  assert.match(dashboard, /debugOutput\.hidden = true/);
  assert.match(dashboard, /insertBefore\(panel, document\.querySelector\('\[data-auth-debug-panel\]'\)/);
  assert.match(dashboard, /result\.canUseSession && result\.session/);
  assert.match(dashboard, /ensureFallbackActionPanel\(debugUser\)/);
  assert.match(dashboard, /recoverMainDashboardFromDebug/);
  assert.match(dashboard, /recoverMainDashboardSilently/);
  assert.match(dashboard, /showDebugPanel: false/);
  assert.match(dashboard, /showDebugPanel: true/);
  assert.match(dashboard, /recoverMainDashboard: true/);
  assert.match(dashboard, new RegExp("if \\(authDebugEnabled\\) \\{\\n\\s+const debugResult = await loadAuthDebug"));
  assert.match(dashboard, /The main dashboard has been loaded from the confirmed session and permissions/);

  const script = dashboard.slice(dashboard.lastIndexOf('<script>') + '<script>'.length, dashboard.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(script));
});

test('auth debug endpoint shows whether the session cookie reached the server without opening the database', async () => {
  let openedDatabase = false;
  const handler = createAuthDebugHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/auth/debug')));

  assert.equal(response.status, 200);
  assert.equal(response.body.cookies.expectedSessionCookieName, 'ta_session');
  assert.equal(response.body.cookies.hasSessionCookie, false);
  assert.equal(response.body.database.checked, false);
  assert.equal(openedDatabase, false);
});

test('auth debug endpoint reports the matching database session and roles for a session cookie', async () => {
  const db = createMockDb([
    [{
      id: 'session-1',
      user_id: 'user-1',
      email: 'client@example.com',
      is_active: true,
      revoked_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: '2026-05-13T00:00:00.000Z',
      last_seen_at: '2026-05-13T00:00:00.000Z',
    }],
    [{ key: 'client' }],
    [{ permission_key: 'client.requests.manage' }],
  ]);
  const handler = createAuthDebugHandler({ getDatabase: async () => db });

  const response = await readJson(await handler(new Request('https://site.test/api/auth/debug', {
    headers: { cookie: 'ta_session=session-token; other=value' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.cookies.hasSessionCookie, true);
  assert.deepEqual(response.body.cookies.cookieNames, ['ta_session', 'other']);
  assert.equal(response.body.database.available, true);
  assert.equal(response.body.canUseSession, true);
  assert.equal(response.body.canOpenDebugDashboard, false);
  assert.equal(response.body.session.id, 'session-1');
  assert.equal(response.body.session.email, 'cl***@example.com');
  assert.equal(response.body.session.expired, false);
  assert.deepEqual(response.body.roles, ['client']);
  assert.equal(response.body.permissionKeys.includes('client.tools'), true);
  assert.equal(response.body.permissionKeys.includes('client.requests.manage'), true);
  assert.match(db.queries[0].text, /from auth_sessions/);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});


test('auth debug endpoint allows the debug dashboard button only for Thomas account', async () => {
  const db = createMockDb([
    [{
      id: 'session-1',
      user_id: 'user-1',
      email: 'thomas.debacker.ii@gmail.com',
      is_active: true,
      revoked_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }],
    [{ key: 'admin' }, { key: 'client' }, { key: 'worker' }],
    [],
  ]);
  const handler = createAuthDebugHandler({ getDatabase: async () => db });

  const response = await readJson(await handler(new Request('https://site.test/api/auth/debug', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.canUseSession, true);
  assert.equal(response.body.canOpenDebugDashboard, true);
  assert.equal(response.body.session.email, 'th***@gmail.com');
});


test('auth debug endpoint chooses a usable duplicate session cookie over a revoked one', async () => {
  const db = {
    queries: [],
    sql(strings, ...values) {
      const text = strings.join('?');
      this.queries.push({ text, values });
      if (/from auth_sessions/.test(text)) {
        if (values[0] === hashToken('revoked-token')) return [{
          id: 'revoked-session',
          user_id: 'user-1',
          email: 'client@example.com',
          is_active: true,
          revoked_at: '2026-05-13T00:00:00.000Z',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        }];
        if (values[0] === hashToken('valid-token')) return [{
          id: 'valid-session',
          user_id: 'user-1',
          email: 'client@example.com',
          is_active: true,
          revoked_at: null,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        }];
      }
      if (text.includes('from user_roles') && text.includes('join roles') && !text.includes('role_permissions')) return [{ key: 'admin' }, { key: 'client' }];
      if (/role_permissions/.test(text)) return [];
      return [];
    },
  };
  const handler = createAuthDebugHandler({ getDatabase: async () => db });

  const response = await readJson(await handler(new Request('https://site.test/api/auth/debug', {
    headers: { cookie: 'ta_session=revoked-token; ta_session=valid-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.cookies.sessionCookieCount, 2);
  assert.equal(response.body.canUseSession, true);
  assert.equal(response.body.session.id, 'valid-session');
  assert.equal(response.body.session.revoked, false);
  assert.deepEqual(response.body.roles, ['admin', 'client']);
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
  assert.equal(rawResponse.headers.get('set-cookie'), null);
  assert.equal(db.queries.some((query) => /expires_at/.test(query.text)), true);
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
  assert.equal(db.queries.some((query) => /expires_at/.test(query.text)), true);
  assert.match(db.queries[4].text, /update app_users/);
  assert.match(db.queries[5].text, /insert into audit_events/);
});
