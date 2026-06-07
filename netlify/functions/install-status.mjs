import { json } from './shared/response.mjs';
import { readState } from './shared/state.mjs';
export async function handler() {
  try {
    const state = await readState();
    const installed = !!state.installation?.installation_complete;
    return json(200, installed ? { ok: true, installed: true, installationComplete: true, needsInstall: false, installedAt: state.installation.installed_at, installedVersion: state.installation.installed_version || '1.0.0' } : { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: state.installation?.current_step || 'welcome' });
  } catch { return json(200, { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: 'welcome' }); }
}
