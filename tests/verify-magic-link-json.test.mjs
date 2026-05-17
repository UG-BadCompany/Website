import assert from 'node:assert/strict';
import test from 'node:test';

import { hashToken } from '../netlify/functions/auth-utils.mjs';
import { createVerifyMagicLinkHandler } from '../netlify/functions/verify-magic-link.mjs';

const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('verify endpoint returns JSON and a session cookie for dashboard token exchanges', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null }],
    [{ id: 'user-1', email: 'Client@Example.com', full_name: '', phone: '' }],
    [{ id: 'user-1', email: 'Client@Example.com', full_name: '', phone: '' }],
    [],
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
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token: 'magic-token' }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, location: '/dashboard/' });
  assert.match(response.headers.get('set-cookie'), /ta_session=session-token/);
  assert.equal(db.queries[0].values[0], hashToken('magic-token'));
  assert.match(db.queries[6].text, /insert into auth_sessions/);
  assert.match(db.queries[7].text, /update auth_magic_links/);
});

test('verify endpoint returns JSON errors when dashboard token exchanges fail', async () => {
  const db = createMockDb([
    [{ id: 'link-1', email: 'client@example.com', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: new Date().toISOString() }],
  ]);
  const handler = createVerifyMagicLinkHandler({
    getDatabase: async () => db,
    makeSessionToken: () => 'session-token',
  });

  const response = await handler(new Request('https://site.test/api/auth/verify', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token: 'magic-token' }),
  }));
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.ok, false);
  assert.equal(body.auth, 'used');
  assert.equal(response.headers.has('set-cookie'), false);
});
