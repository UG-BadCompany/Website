import { json, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('AI timed out')), ms));

const normalizeTrade = (value = '') => /mini\s?-?split|ductless/i.test(String(value)) ? 'HVAC' : (value || 'General Contracting');

const fallbackDraft = (body) => ({
  trade: normalizeTrade(body.workCategory || body.workScope || body.service),
  scope: body.description || 'Manual scope needed.',
  missingInfo: ['photos', 'measurements', 'access conditions'].filter(Boolean),
  optionalQuestions: ['Can you provide photos?', 'Do you know the model or measurements?', 'Is there any access restriction?'],
  laborRecommendations: [{ description: 'Site review and standard labor allowance', hours: 2, rate: 95 }],
  materialRecommendations: [{ description: 'Materials to be confirmed by admin', quantity: 1, confidence: 45 }],
  assumptions: ['Admin can edit all AI-generated content before sending.'],
  exclusions: ['Permits, hidden damage, and unknown code corrections unless listed.'],
  confidence: { overall: 55, labor: 55, material: 45, scope: 55, informationCompleteness: 50 },
  adminNotes: 'AI unavailable or low-confidence fallback. Admin may continue manually.',
});

const callOpenAI = async (payload) => {
  if (!process.env.OPENAI_API_KEY) return fallbackDraft(payload);
  const response = await Promise.race([
    fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [{ role: 'system', content: 'You draft contractor estimates as structured JSON. Mini splits are handled under HVAC. AI never blocks an admin. Questions are optional.' }, { role: 'user', content: JSON.stringify(payload) }],
        text: { format: { type: 'json_object' } },
      }),
    }),
    timeout(Number(process.env.OPENAI_QUOTE_TIMEOUT_MS || 12000)),
  ]);
  if (!response.ok) return fallbackDraft(payload);
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap((o) => o.content || []).map((c) => c.text).join('\n') || '';
  try { return JSON.parse(text); } catch { return { ...fallbackDraft(payload), raw: text }; }
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  try { return json(200, { ok: true, result: await callOpenAI(body), manualOverride: true }); }
  catch (error) { console.error('ai-quote failed', error); return json(200, { ok: true, result: fallbackDraft(body), manualOverride: true, warning: 'AI failed; admin may continue manually.' }); }
};
