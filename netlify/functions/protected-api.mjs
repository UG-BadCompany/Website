import { fail, json } from './shared/response.mjs';
import { readInstallState } from './shared/install-state.mjs';

export async function handler(event) {
  const state = await readInstallState();
  if (!state.installation_complete) return fail(423, 'INSTALLATION_REQUIRED', 'This API is locked until installation is complete.', { redirectTo: '/install/' });
  return json(200, { ok: true, data: { path: event.path, message: 'Protected platform API placeholder is online.' } });
}
