import { json, readStore, writeStore, allowedSecretKeys, audit, mask } from './_shared.mjs';
export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  const store = readStore();
  let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, code: 'INVALID_JSON' }); }
  const { key, value, clear } = body;
  if (!allowedSecretKeys.has(key)) return json(400, { ok: false, code: 'KEY_NOT_ALLOWED', message: 'This integration key is not supported.' });
  if (clear) delete store.secrets[key]; else store.secrets[key] = { encryptedValue: Buffer.from(String(value || ''), 'utf8').toString('base64'), provider: 'encrypted_db', lastFour: mask(value), status: value ? 'configured' : 'missing', lastCheckedAt: new Date().toISOString() };
  audit(store, 'environment_variable_changed', { key, configured: !clear && Boolean(value) });
  writeStore(store);
  return json(200, { ok: true, key, configured: Boolean(!clear && value), lastFour: !clear ? mask(value) : null });
}
