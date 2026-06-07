import { fail, json, parseJson } from './shared/response.mjs';
import { ENV_ALLOWLIST } from './shared/env-metadata.mjs';
import { readInstallState, writeInstallState } from './shared/install-state.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST to test an integration.');
  const body = await parseJson(event);
  if (!body || !ENV_ALLOWLIST.has(body.key)) return fail(400, 'INVALID_ENV_KEY', 'Environment variable is not allowlisted.', { field: 'key' });
  const state = await readInstallState();
  const environment = { ...(state.metadata?.environment || {}) };
  const configured = Boolean(process.env[body.key] || environment[body.key]?.configured || body.value);
  const now = new Date().toISOString();
  environment[body.key] = { ...(environment[body.key] || {}), configured, lastCheckedAt: now, testStatus: configured ? 'reachable' : 'missing' };
  await writeInstallState({ metadata: { environment } });
  return json(200, { ok: true, key: body.key, configured, valid: configured, lastCheckedAt: now, message: configured ? 'Configuration is present. Live provider verification runs server-side when credentials are available.' : 'No value is configured yet.' });
}
