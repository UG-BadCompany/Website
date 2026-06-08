import { json, options } from './shared/json-response.mjs';
import { readState, writeState, normalizeDraft } from './shared/install-store.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  try {
    const state = await readState();
    if (event.httpMethod === 'GET') return json(200, { ok: true, draft: normalizeDraft(state.draft || {}) });
    if (event.httpMethod === 'POST') {
      const payload = event.body ? JSON.parse(event.body) : {};
      const draft = normalizeDraft(payload.draft || payload);
      const next = await writeState({ ...state, draft, current_step: draft.currentStep });
      return json(200, { ok: true, draft: next.draft, savedAt: next.updated_at });
    }
    return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST for installer draft.' });
  } catch (error) {
    return json(500, { ok: false, code: 'INSTALL_DRAFT_ERROR', message: error.message || 'Installer draft could not be saved.', safeMode: true });
  }
}
