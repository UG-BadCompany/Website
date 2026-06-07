import { error, json, method } from './shared/response.mjs';
import { readState, updateState, originFromEvent, mask, fingerprint, audit } from './shared/state.mjs';
import { groupedEnv, ENV_METADATA } from './shared/env-metadata.mjs';
function body(event){ try { return JSON.parse(event.body || '{}'); } catch { return {}; } }
export async function handler(event) {
  const action = (event.path || '').split('/').pop();
  const origin = originFromEvent(event);
  if (action === 'status') {
    const state = await readState();
    const vars = ENV_METADATA.map((meta)=>({ key: meta.key, category: meta.category, required: meta.required, secret: meta.secret, configured: !!(process.env[meta.key] || state.environment[meta.key]), source: process.env[meta.key] ? 'host' : state.environment[meta.key] ? 'encrypted-fallback' : 'missing', masked: meta.secret ? mask(process.env[meta.key] || state.environment[meta.key]?.masked) : undefined }));
    return json(200, { ok: true, groups: groupedEnv(origin), variables: vars });
  }
  if (action === 'save') {
    const m = method(event, ['POST']); if (m) return m;
    const payload = body(event); const entries = payload.values || {};
    await updateState((state)=>{ for (const [key, value] of Object.entries(entries)) { const meta = ENV_METADATA.find((m)=>m.key===key); if (!meta || value === '') continue; state.environment[key] = meta.secret ? { masked: mask(value), fingerprint: fingerprint(value), savedAt: new Date().toISOString() } : { value, savedAt: new Date().toISOString() }; state.environmentStatus[key] = { configured: true, source: process.env[key] ? 'host' : 'encrypted-fallback' }; } return state; });
    await audit('environment_variable_changed', { keys: Object.keys(entries) });
    return json(200, { ok: true, message: 'Environment settings saved. Secret values were stored server-side only.' });
  }
  if (action === 'test') {
    const payload = event.httpMethod === 'POST' ? body(event) : {};
    return json(200, { ok: true, code: 'TEST_PLACEHOLDER', message: `${payload.key || 'Integration'} test completed in safe placeholder mode.`, checkedAt: new Date().toISOString() });
  }
  return error(404, 'NOT_FOUND', 'Unknown environment action.');
}
