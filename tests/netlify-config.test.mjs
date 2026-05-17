import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadNetlifyToml = () => readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const loadDashboardHtml = () => readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

test('dashboard magic-link tokens are handled by dashboard JavaScript instead of Netlify redirects', async () => {
  const config = await loadNetlifyToml();
  const dashboard = await loadDashboardHtml();

  assert.doesNotMatch(config, /to = "\/api\/auth\/verify\?token=:token"/, 'Netlify should not redirect every dashboard request through the verifier');
  assert.match(dashboard, /new URLSearchParams\(window\.location\.search\)\.get\('token'\)/, 'dashboard should read token links from email URLs');
  assert.match(dashboard, /window\.location\.replace\(`\/api\/auth\/verify\?token=\$\{encodeURIComponent\(tokenFromDashboardUrl\)\}`\)/, 'dashboard should forward token links to the auth verifier once');
  assert.ok(config.indexOf('[[headers]]') >= 0, 'security headers should remain configured');
});

test('npm postbuild checks Netlify function syntax before verifying publish output', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(
    packageJson.scripts.postbuild,
    'node scripts/check-netlify-functions.mjs && node scripts/ensure-netlify-out.mjs',
  );
});
