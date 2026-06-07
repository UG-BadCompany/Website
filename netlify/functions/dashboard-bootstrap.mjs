import { fail, json } from './shared/response.mjs';
import { readInstallState } from './shared/install-state.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
async function loadRegistry() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(path.join(here, '../generated/module-registry.json'), 'utf8');
  return JSON.parse(raw);
}

export async function handler() {
  const state = await readInstallState();
  if (!state.installation_complete) return fail(423, 'INSTALLATION_REQUIRED', 'Installation must be completed before dashboard bootstrap is available.', { redirectTo: '/install/' });
  const metadata = state.metadata || {};
  return json(200, {
    ok: true,
    user: { id: metadata.owner?.email || 'owner', name: metadata.owner?.fullName || 'Owner', email: metadata.owner?.email || '', roles: ['owner'], superOwner: true },
    company: metadata.company || {},
    theme: metadata.theme || {},
    permissions: ['*'],
    workspaces: ['owner','admin','manager','worker','client','public-homepage','public-portal','public-quote','public-invoice'],
    modules: (await loadRegistry()).modules,
    ownerTesting: { showBetaModules: true, showHiddenModules: true, showDisabledModules: true, showExperimentalModules: true },
    generatedAt: new Date().toISOString()
  });
}
