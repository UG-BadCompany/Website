// netlify/functions/ai-quote-drafts.mjs
const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  },
  body: JSON.stringify(body),
});

const makeId = () => `aiq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

async function getStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('ai-quote-drafts');
  } catch {}
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  const store = await getStore();

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }
    const record = { id: body.id || makeId(), createdAt: new Date().toISOString(), status: 'draft_admin_review', ...body };
    if (store) await store.setJSON(record.id, record);
    return json(200, { ok: true, persisted: Boolean(store), draft: record });
  }

  if (event.httpMethod === 'GET') {
    if (!store) return json(200, { ok: true, persisted: false, drafts: [] });
    const list = await store.list();
    const drafts = [];
    for (const blob of (list.blobs || []).slice(-75).reverse()) {
      try { drafts.push(await store.get(blob.key, { type: 'json' })); } catch {}
    }
    return json(200, { ok: true, persisted: true, drafts });
  }

  return json(405, { ok: false, message: 'Method not allowed' });
};

export default handler;
