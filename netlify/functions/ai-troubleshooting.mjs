import { json, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_TROUBLESHOOTING_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const fallback = (body) => ({
  equipmentType: body.equipmentType || 'General maintenance',
  likelyCauses: ['Insufficient field data; inspect safely and document readings.'],
  troubleshootingSteps: ['Confirm power/water/gas safety as applicable.', 'Document symptoms, error codes, and readings.', 'Escalate licensed hazards immediately.'],
  safetyWarnings: ['Do not bypass safety controls.', 'De-energize equipment when required.'],
  toolsNeeded: ['PPE', 'camera', 'meter or gauges as trade-appropriate'],
  partsLikelyNeeded: ['To be confirmed after diagnosis'],
  whenToEscalate: ['Electrical hazards', 'gas leaks', 'active flooding', 'structural or code concerns'],
  quoteWorkOrderSuggestions: ['Create notes and photos; request admin quote review if parts or extra labor are needed.'],
});

const callOpenAI = async (payload) => {
  if (!process.env.OPENAI_API_KEY) return fallback(payload);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, input: [{ role: 'system', content: 'Return JSON troubleshooting guidance for contractor field workers. Include safety warnings and escalation triggers.' }, { role: 'user', content: JSON.stringify(payload) }], text: { format: { type: 'json_object' } } }),
  });
  if (!response.ok) return fallback(payload);
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap((o) => o.content || []).map((c) => c.text).join('\n') || '';
  try { return JSON.parse(text); } catch { return { ...fallback(payload), raw: text }; }
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  try { return json(200, { ok: true, result: await callOpenAI(body) }); }
  catch (error) { console.error('ai-troubleshooting failed', error); return json(200, { ok: true, result: fallback(body), warning: 'AI failed; continue safely with manual troubleshooting.' }); }
};
