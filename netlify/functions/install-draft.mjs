import { json, readStore, saveDraft } from './shared/data-store.mjs';
export async function handler(event) {
  if (event.httpMethod === 'GET') {
    const store = await readStore();
    return json(200, { ok: true, draft: store.install_draft || {} });
  }
  if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
    const input = event.body ? JSON.parse(event.body) : {};
    return json(200, { ok: true, draft: await saveDraft(input) });
  }
  return json(405, { ok: false, message: 'Method not allowed.' });
}
