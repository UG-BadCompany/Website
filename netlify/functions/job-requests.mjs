// netlify/functions/job-requests.mjs
import { analyzeEstimateIntake } from './estimate-intake-intelligence.mjs';
// Unified Request Estimate endpoint.
// Public flow: Request Estimate -> /api/job-requests
// This endpoint saves the request, creates the AI estimate draft, saves the draft, and returns both.
// Do NOT call /api/ai-quote-draft from the frontend.

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
  return String(host).startsWith('http') ? host : `${proto}://${host}`;
}

function normalizeRequest(body = {}) {
  return {
    id: makeId('req'),
    createdAt: new Date().toISOString(),
    status: 'request_saved_estimate_intake',
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
    preferredBrand: clean(body.preferredBrand, 120),
    preferredManufacturer: clean(body.preferredManufacturer, 120),
    preferredModel: clean(body.preferredModel, 160),
    preferredProduct: clean(body.preferredProduct, 160),
    preferredFeatures: clean(body.preferredFeatures, 800),
    budgetRange: clean(body.budgetRange, 120),
    upgradePreferences: clean(body.upgradePreferences, 800),
    additionalNotes: clean(body.additionalNotes, 1000),
  };
}

async function createEstimateDraft(event, request) {
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
    if (!response.ok || !result) throw new Error('Estimate draft failed.');
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
      questions_to_customer: ['Please review request details and add photos/specs before final estimate.'],
      confidenceScores: request.intakeAnalysis?.confidenceScores || { overall: 25, labor: 25, material: 25, scope: 25 },
      informationCompletenessScore: request.intakeAnalysis?.informationCompletenessScore || 25,
      missingInformation: request.intakeAnalysis?.missingInformation || ['Admin review required.'],
      optionalQuestions: request.intakeAnalysis?.optionalQuestions || [],
      customerPreferences: request.intakeAnalysis?.customerPreferences || {},
      photoIntelligence: request.intakeAnalysis?.photoIntelligence || {},
      adminOverrideAlwaysAvailable: true,
      manualEstimateModeAvailable: true,
      missing_required_info: ['Admin review required.'],
      labor_items: [],
      materials: [],
      totals: { total_low: 0, total_high: 0 },
      customer_facing_quote: 'Request received. T&A Contracting will review and follow up before sending a final estimate.',
      internal_technician_notes: 'Estimate engine timed out or failed. Admin should manually review this request.',
      request,
    };
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  const requestStore = await getStore('job-requests');
  const draftStore = await getStore('estimate-drafts');

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, message: 'Invalid JSON body' });
    }

    const request = normalizeRequest(body);

    const intakeAnalysis = analyzeEstimateIntake(request);
    request.intakeAnalysis = intakeAnalysis;

    if (requestStore) await requestStore.setJSON(request.id, request);

    const estimateDraft = await createEstimateDraft(event, request);

    const draftRecord = {
      id: makeId('est'),
      createdAt: new Date().toISOString(),
      status: 'draft_admin_review',
      intakeAnalysis,
      informationCompletenessScore: intakeAnalysis.informationCompletenessScore,
      confidenceScores: intakeAnalysis.confidenceScores,
      missingInformation: intakeAnalysis.missingInformation,
      optionalQuestions: intakeAnalysis.optionalQuestions,
      customerPreferences: intakeAnalysis.customerPreferences,
      photoIntelligence: intakeAnalysis.photoIntelligence,
      adminOverrideAlwaysAvailable: true,
      manualEstimateModeAvailable: true,
      requestPayload: request,
      savedRequest: request,
      estimateDraft,
      optionalInformation: {
        message: intakeAnalysis.optionalCollectionMessage,
        buttons: intakeAnalysis.optionalCollectionButtons,
        questions: intakeAnalysis.optionalQuestions,
      },
      // Backward compatibility for existing admin screens:
      aiDraft: estimateDraft,
    };

    if (draftStore) await draftStore.setJSON(draftRecord.id, draftRecord);

    return json(200, {
      ok: true,
      persisted: Boolean(requestStore),
      draftPersisted: Boolean(draftStore),
      request,
      estimateDraft,
      optionalInformation: {
        message: intakeAnalysis.optionalCollectionMessage,
        buttons: intakeAnalysis.optionalCollectionButtons,
        questions: intakeAnalysis.optionalQuestions,
      },
      // Backward compatibility for existing JS/admin:
      aiDraft: estimateDraft,
      draftRecord,
      message: 'Request saved immediately. Optional information can improve estimate accuracy, but the request is not blocked.',
    });
  }

  if (event.httpMethod === 'GET') {
    if (!requestStore) return json(200, { ok: true, persisted: false, requests: [] });

    const list = await requestStore.list();
    const requests = [];

    for (const blob of (list.blobs || []).slice(-75).reverse()) {
      try {
        requests.push(await requestStore.get(blob.key, { type: 'json' }));
      } catch {}
    }

    return json(200, { ok: true, persisted: true, requests });
  }

  return json(405, { ok: false, message: 'Method not allowed' });
};

export default handler;
