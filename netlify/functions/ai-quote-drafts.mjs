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

const clean = (value, max = 5000) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
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

    const id = clean(body.id || makeId(), 80);
    const draft = {
      id,
      createdAt: new Date().toISOString(),
      status: 'draft_admin_review',
      requestPayload: body.requestPayload || null,
      savedRequest: body.savedRequest || null,
      aiDraft: body.aiDraft || body,
    };

    if (store) await store.setJSON(id, draft);

    return json(200, {
      ok: true,
      id,
      persisted: Boolean(store),
      message: store ? 'AI quote draft saved.' : 'AI draft accepted, but @netlify/blobs unavailable. Browser backup may still exist.',
      draft,
    });
  }

  if (event.httpMethod === 'GET') {
    if (!store) return json(200, { ok: true, persisted: false, drafts: [], message: '@netlify/blobs unavailable. Browser backups may still show on the admin page.' });
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
