import { json, readStore } from './_shared.mjs';
export async function handler() {
  try {
    const state = readStore().installation;
    const installed = Boolean(state.installation_complete);
    return json(200, installed ? { ok: true, installed: true, installationComplete: true, needsInstall: false, installedAt: state.installed_at, installedVersion: state.installed_version || '1.0.0' } : { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: state.current_step || 'welcome' });
  } catch { return json(200, { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: 'welcome' }); }
}
