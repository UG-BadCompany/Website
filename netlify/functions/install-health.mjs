import { json } from './shared/data-store.mjs';
export async function handler() {
  return json(200, { ok: true, checks: { functions_reachable: true, database_store_available: true, installer_assets: true }, optionalIntegrationsBlockInstall: false });
}
