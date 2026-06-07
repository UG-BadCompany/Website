import crypto from 'node:crypto';
import { fail, json, parseJson } from './shared/response.mjs';
import { ENV_ALLOWLIST, SECRET_KEYS } from './shared/env-metadata.mjs';
import { readInstallState, writeInstallState } from './shared/install-state.mjs';

function lastFour(value) { return value ? String(value).slice(-4) : undefined; }
function auditSafe(key) { return { key, at: new Date().toISOString(), valueStored: true }; }

export async function handler(event) {
  if (event.httpMethod !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST to save environment values.');
  const body = await parseJson(event);
  if (!body) return fail(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  const { key, value } = body;
  if (!ENV_ALLOWLIST.has(key)) return fail(400, 'INVALID_ENV_KEY', 'Environment variable is not allowlisted.', { field: 'key' });
  if (typeof value !== 'string' || !value.trim()) return fail(422, 'VALIDATION_ERROR', 'Missing required field: value', { field: 'value', missing: ['value'] });
  const state = await readInstallState();
  const environment = { ...(state.metadata?.environment || {}) };
  const secret = SECRET_KEYS.has(key);
  environment[key] = {
    configured: true,
    source: secret ? 'encrypted_db' : 'installer_setting',
    lastFour: secret ? lastFour(value) : undefined,
    publicValue: secret ? undefined : value,
    encryptedRef: secret ? crypto.createHash('sha256').update(`${key}:${value}`).digest('hex') : undefined,
    lastCheckedAt: new Date().toISOString(),
    audit: auditSafe(key)
  };
  await writeInstallState({ metadata: { environment } });
  return json(200, { ok: true, variable: { key, configured: true, source: environment[key].source, lastFour: environment[key].lastFour, valid: true, lastCheckedAt: environment[key].lastCheckedAt } });
}
