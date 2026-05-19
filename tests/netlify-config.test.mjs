import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadNetlifyToml = () => readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const loadDashboardHtml = () => readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

const loadOutDashboardHtml = () => readFile(new URL('../out/dashboard/index.html', import.meta.url), 'utf8');


test('dashboard magic-link tokens are exchanged in place instead of Netlify redirects or reload loops', async () => {
  const config = await loadNetlifyToml();
  const dashboard = await loadDashboardHtml();

  assert.doesNotMatch(config, /to = "\/api\/auth\/verify\?token=:token"/, 'Netlify should not redirect every dashboard request through the verifier');
  assert.match(dashboard, /const tokenFromDashboardUrl = url\.searchParams\.get\('token'\)/, 'dashboard should read token links from email URLs');
  assert.match(dashboard, /fetch\('\/api\/auth\/verify', \{/, 'dashboard should exchange token links with the auth verifier without a page reload');
  assert.match(dashboard, /window\.history\.replaceState\(null, document\.title, cleanPath \|\| '\/dashboard\/'\)/, 'dashboard should remove used token query strings before checking the session');
  assert.doesNotMatch(dashboard, /window\.location\.replace\(`\/api\/auth\/verify\?token=/, 'dashboard should not bounce token links through another full-page redirect');
  assert.ok(config.indexOf('[[headers]]') >= 0, 'security headers should remain configured');
});

test('npm postbuild checks Netlify function syntax before verifying publish output', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(
    packageJson.scripts.postbuild,
    'node scripts/check-netlify-functions.mjs && node scripts/ensure-netlify-out.mjs',
  );
});


test('generated dashboard artifact preserves auth token exchange hooks', async () => {
  const dashboard = await loadOutDashboardHtml();

  assert.match(dashboard, /const tokenFromDashboardUrl = url\.searchParams\.get\('token'\)/);
  assert.match(dashboard, /fetch\('\/api\/auth\/verify', \{/);
  assert.match(dashboard, /window\.history\.replaceState\(null, document\.title, cleanPath \|\| '\/dashboard\/'\)/);
});
