import { json } from './shared/response.mjs';
import { installStatusPayload, readInstallState } from './shared/install-state.mjs';

export async function handler() {
  const state = await readInstallState();
  return json(200, installStatusPayload(state));
}
