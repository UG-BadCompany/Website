// netlify/functions/job-requests.mjs
// Unified Request Estimate endpoint.
// This is now the ONE request estimate / AI quoting system.
// It saves the request, generates AI quote draft, saves the draft, and returns both.

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
const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

async function getStore(name) {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore(name);
  } catch {}
  return null;
}

function originFromEvent(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL || 'localhost:8888';
  if (String(host).startsWith('http')) return host;
  return `${proto}://${host}`;
}

function normalizeRequest(body = {}) {
  return {
    id: makeId('req'),
    createdAt: new Date().toISOString(),
    status: 'new_ai_quote_drafted',
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
    photoNames: Array.isArray(body.photoNames) ? body.photoNames.map((x) => clean(x, 180)) : [],
  };
}

async function createAiDraft(event, request) {
  const origin = originFromEvent(event);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_JOB_REQUEST_TIMEOUT_MS || 14000));

  try {
    const response = await fetch(`${origin}/.netlify/functions/ai-quote-draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error('AI quote draft failed.');
    return result;
  } catch {
    clearTimeout(timer);
    return {
      ok: true,
      source: 'job-request-minimal-fallback',
      quote_ready: false,
      job_summary: `${request.workScope || 'Service'} request for ${request.service || 'handyman work'}.`,
      category: request.service || 'Other',
      subcategory: request.subcategory || 'General',
      work_scope: request.workScope || 'Not provided',
      questions_to_customer: ['Please review request details and add photos/specs before final quote.'],
      missing_required_info: ['Admin review required.'],
      labor_items: [],
      materials: [],
      totals: { total_low: 0, total_high: 0 },
      customer_facing_quote: 'Request received. T&A Contracting will review and follow up before sending a final quote.',
      internal_technician_notes: 'AI quote endpoint timed out or failed. Admin should manually review this request.',
      request,
    };
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  const requestStore = await getStore('job-requests');
  const draftStore = await getStore('ai-quote-drafts');

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { ok: false, message: 'Invalid JSON body' }); }

    const request = normalizeRequest(body);
    if (!request.description && !request.service && !request.workScope) {
      return json(400, { ok: false, message: 'Missing job description, service, or work scope.' });
    }

    if (requestStore) await requestStore.setJSON(request.id, request);

    const aiDraft = await createAiDraft(event, request);

    const draftRecord = {
      id: makeId('aiq'),
      createdAt: new Date().toISOString(),
      status: 'draft_admin_review',
      requestPayload: request,
      savedRequest: request,
      aiDraft,
    };

    if (draftStore) await draftStore.setJSON(draftRecord.id, draftRecord);

    return json(200, {
      ok: true,
      persisted: Boolean(requestStore),
      draftPersisted: Boolean(draftStore),
      request,
      aiDraft,
      draftRecord,
      message: 'Request saved and AI quote draft created for admin review.',
    });
  }

  if (event.httpMethod === 'GET') {
    if (!requestStore) return json(200, { ok: true, persisted: false, requests: [] });
    const list = await requestStore.list();
    const requests = [];
    for (const blob of (list.blobs || []).slice(-75).reverse()) {
      try { requests.push(await requestStore.get(blob.key, { type: 'json' })); } catch {}
    }
    return json(200, { ok: true, persisted: true, requests });
  }

  return json(405, { ok: false, message: 'Method not allowed' });
};

export default handler;
