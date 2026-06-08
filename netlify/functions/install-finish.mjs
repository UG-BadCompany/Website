import { json, options } from './shared/json-response.mjs';
import { readState, writeState, normalizeDraft, validateFinish, goToStepForMissing, seedRolesAndPermissions } from './shared/install-store.mjs';
import { moduleApiRegistry } from '../generated/module-api-registry.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST to finish installation.' });
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const state = await readState();
    const draft = normalizeDraft(payload.draft || state.draft || {});
    const missing = validateFinish(draft);
    if (missing.length) {
      const first = missing[0];
      return json(400, { ok: false, code: 'INSTALL_VALIDATION_FAILED', message: `${first.replaceAll('_', ' ')} is missing.`, missing, goToStep: goToStepForMissing(first) });
    }
    const selected = new Set(draft.modules);
    const modules = moduleApiRegistry.filter((m) => selected.has(m.id)).map((m) => ({ ...m, enabled: true }));
    const { roles, permissions } = seedRolesAndPermissions(modules);
    const now = new Date().toISOString();
    await writeState({
      ...state,
      installation_complete: true,
      installed_version: '1.0.0',
      installed_at: now,
      installed_by_user_id: draft.owner.email,
      current_step: 'finish',
      bootstrap_generated: true,
      draft,
      company: draft.company,
      owner: { ...draft.owner, role: 'owner', superOwner: true, workspaceAccess: ['owner','admin','manager','worker','client'], canImpersonate: true, canAccessHiddenModules: true, canAccessBetaModules: true, canAccessExperimentalModules: true },
      theme: draft.theme,
      homepage: draft.homepage,
      services: draft.services,
      modules,
      roles,
      permissions,
      auditLog: [...(state.auditLog || []), { action: 'installer.completed', actor: draft.owner.email, at: now }],
      metadata: { optionalIntegrations: { openai: 'not_configured', resend: 'not_configured', square: 'not_configured', smtp: 'not_configured', serpapi: 'not_configured', license: 'disabled' } }
    });
    return json(200, { ok: true, installationComplete: true, warnings: ['Email is not configured yet.', 'AI is not configured yet.', 'Square payments are not configured yet.'], redirectTo: '/dashboard/' });
  } catch (error) {
    return json(500, { ok: false, code: 'INSTALL_FINISH_ERROR', message: error.message || 'Installation could not finish.', missing: ['system_error'], goToStep: 'review' });
  }
}
