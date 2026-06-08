import { json, options } from './shared/json-response.mjs';
import { readState } from './shared/install-store.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  try {
    const state = await readState();
    const installed = Boolean(state.installation_complete);
    return json(200, installed ? { ok: true, installed: true, installationComplete: true, needsInstall: false, installedAt: state.installed_at, installedVersion: state.installed_version || '1.0.0' } : { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: state.current_step || 'welcome' });
  } catch (error) {
    return json(200, { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: 'welcome', warning: 'Install state unavailable; safe installer mode enabled.' });
  }
}
