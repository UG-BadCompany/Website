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
const makeId = () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

async function getStore() {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore('job-requests');
  } catch {}
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  const store = await getStore();

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }
    const request = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      status: 'new',
      name: clean(body.name, 120),
      phone: clean(body.phone, 80),
      email: clean(body.email, 180),
      city: clean(body.city, 120),
      streetAddress: clean(body.streetAddress, 240),
      workScope: clean(body.workScope, 120),
      service: clean(body.service, 160),
      subcategory: clean(body.subcategory, 160),
      timeframe: clean(body.timeframe, 120),
      description: clean(body.description, 6000),
      photosProvided: Boolean(body.photosProvided || body.hasUpload),
      photoNames: Array.isArray(body.photoNames) ? body.photoNames : [],
    };

    if (store) await store.setJSON(request.id, request);

    return json(200, {
      ok: true,
      persisted: Boolean(store),
      request,
      message: store ? 'Request saved.' : 'Request accepted. @netlify/blobs unavailable, so request was not persisted server-side.',
    });
  }

  if (event.httpMethod === 'GET') {
    if (!store) return json(200, { ok: true, persisted: false, requests: [] });
    const list = await store.list();
    const requests = [];
    for (const blob of (list.blobs || []).slice(-50).reverse()) {
      try { requests.push(await store.get(blob.key, { type: 'json' })); } catch {}
    }
    return json(200, { ok: true, persisted: true, requests });
  }

  return json(405, { ok: false, message: 'Method not allowed' });
};

export default handler;
