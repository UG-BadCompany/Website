import { json, readStore, writeStore, audit } from './_shared.mjs';
export async function handler(event) {
  const store = readStore();
  if (event.httpMethod === 'GET') return json(200, { ok: true, draft: store.draft, installation: store.installation });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  try {
    const body = JSON.parse(event.body || '{}');
    store.draft = { ...store.draft, ...body.draft, updatedAt: new Date().toISOString() };
    store.installation.current_step = body.currentStep || store.installation.current_step;
    store.installation.updated_at = new Date().toISOString();
    audit(store, 'installer_draft_saved', { currentStep: store.installation.current_step });
    writeStore(store);
    return json(200, { ok: true, draft: store.draft, currentStep: store.installation.current_step });
  } catch { return json(400, { ok: false, code: 'INVALID_JSON', message: 'We could not save this installer step. Check the fields and try again.' }); }
}
