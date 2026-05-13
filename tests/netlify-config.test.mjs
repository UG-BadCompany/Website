import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadNetlifyToml = () => readFile(new URL('../netlify.toml', import.meta.url), 'utf8');

test('Netlify redirects dashboard magic-link tokens before serving dashboard HTML', async () => {
  const config = await loadNetlifyToml();

  assert.match(config, /\[\[redirects\]\]\s+from = "\/dashboard\/"\s+to = "\/api\/auth\/verify\?token=:token"\s+status = 302\s+force = true\s+query = \{ token = ":token" \}/, 'dashboard slash path should redirect token query to auth verifier');
  assert.match(config, /\[\[redirects\]\]\s+from = "\/dashboard"\s+to = "\/api\/auth\/verify\?token=:token"\s+status = 302\s+force = true\s+query = \{ token = ":token" \}/, 'dashboard no-slash path should redirect token query to auth verifier');
  assert.ok(config.indexOf('[[redirects]]') < config.indexOf('[[headers]]'), 'token redirects should be declared before headers');
});
