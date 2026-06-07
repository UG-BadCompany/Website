import { json } from './shared/response.mjs';
import { ENV_METADATA, publicEnvMetadata, safeStatusFor } from './shared/env-metadata.mjs';
import { readInstallState } from './shared/install-state.mjs';

export async function handler() {
  const state = await readInstallState();
  const saved = state.metadata?.environment || {};
  const variables = ENV_METADATA.map((meta) => {
    const savedStatus = saved[meta.key];
    if (savedStatus?.configured) return { key: meta.key, required: meta.required, configured: true, source: savedStatus.source || 'encrypted_db', lastFour: savedStatus.lastFour, valid: true, lastCheckedAt: savedStatus.lastCheckedAt || null };
    return safeStatusFor(meta.key, process.env[meta.key] ? 'netlify_env' : 'missing');
  });
  return json(200, { ok: true, ...publicEnvMetadata(), variables });
}
