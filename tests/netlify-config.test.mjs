import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadNetlifyConfig = () => readFile(new URL('../netlify.toml', import.meta.url), 'utf8');

const expectedApiRedirects = [
  ['/api/auth/magic-link', '/.netlify/functions/request-magic-link'],
  ['/api/auth/verify', '/.netlify/functions/verify-magic-link'],
  ['/api/auth/logout', '/.netlify/functions/logout'],
  ['/api/me', '/.netlify/functions/me'],
  ['/api/job-requests', '/.netlify/functions/create-job-request'],
  ['/api/client/job-requests', '/.netlify/functions/client-job-requests'],
  ['/api/client/quotes', '/.netlify/functions/client-quotes'],
  ['/api/admin/job-requests', '/.netlify/functions/admin-job-requests'],
  ['/api/admin/quotes', '/.netlify/functions/admin-quotes'],
  ['/api/admin/roles', '/.netlify/functions/admin-roles'],
  ['/api/admin/users', '/.netlify/functions/admin-users'],
  ['/api/worker/jobs', '/.netlify/functions/worker-jobs'],
];

test('Netlify routes public API paths to serverless functions', async () => {
  const config = await loadNetlifyConfig();

  for (const [from, to] of expectedApiRedirects) {
    const redirectPattern = new RegExp(
      String.raw`\[\[redirects\]\]\s+from = "${from.replaceAll('/', String.raw`\/`)}"\s+to = "${to.replaceAll('/', String.raw`\/`)}"\s+status = 200`,
    );

    assert.match(config, redirectPattern, `${from} should proxy to ${to}`);
  }
});
