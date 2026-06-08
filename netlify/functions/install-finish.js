import { json, readStore, writeStore, audit, validateCore, integrationWarnings, getOrigin } from './_shared.mjs';
export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  const store = readStore();
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, code: 'INVALID_JSON', message: 'Finish Install received invalid data.' }); }
  if (!body.confirm) return json(400, { ok: false, code: 'CONFIRM_REQUIRED', message: 'Please confirm you are ready to finish installation.' });
  const draft = { ...store.draft, ...(body.draft || {}) };
  if (!draft.company?.siteUrl) draft.company = { ...(draft.company || {}), siteUrl: getOrigin(event) };
  const missing = validateCore(draft);
  if (missing.length) return json(422, { ok: false, code: 'INSTALL_VALIDATION_FAILED', message: 'Required installer setup is incomplete.', missing });
  const now = new Date().toISOString();
  store.draft = draft;
  store.users = [{ id: 'owner-default', name: draft.owner.name, email: draft.owner.email, role: 'owner', workspaces: ['owner','admin','manager','worker','client','public'] }];
  store.permissions = [...new Set(draft.modules.flatMap(m => [`${m}:view`, `${m}:manage`]))];
  store.installation = { ...store.installation, installation_complete: true, installed_version: '1.0.0', installed_at: now, installed_by_user_id: 'owner-default', current_step: 'complete', license_status: 'verification_disabled', bootstrap_generated: true, updated_at: now, metadata: { company: draft.company, theme: draft.theme, homepage: draft.homepage, modules: draft.modules, services: draft.services, optionalIntegrationWarnings: integrationWarnings() } };
  audit(store, 'installer_completed', { installedBy: draft.owner.email, warnings: integrationWarnings() });
  writeStore(store);
  return json(200, { ok: true, installationComplete: true, warnings: integrationWarnings(), redirectTo: '/dashboard/' });
}
