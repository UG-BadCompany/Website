import { clean, json, parseJsonBody } from './auth-utils.mjs';

const OPENAI_MODEL = process.env.OPENAI_TROUBLESHOOTING_MODEL || process.env.OPENAI_MODEL || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_TROUBLESHOOTING_TIMEOUT_MS || 12000);

const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
const normalize = (body = {}) => ({
  trade: clean(body.trade || body.systemType || body.equipmentType, 120),
  equipment: clean(body.equipment || body.component || body.equipmentType, 180),
  modelNumber: clean(body.modelNumber || body.model || body.serial, 160),
  symptoms: clean(body.symptoms || body.issue || body.customerDescription, 4000),
  photosMetadata: clean(body.photosMetadata || body.photoMetadata, 3000),
  customerDescription: clean(body.customerDescription || body.notes || body.description, 3000),
  errorCodes: clean(body.errorCodes || body.errorCode, 600),
  readings: clean(body.readings, 2000),
});

const manualTroubleshootingError = (payload, message) => ({
  message,
  safety_warning: 'Use PPE, isolate hazards, and stop for electrical, gas, refrigerant, structural, or active water hazards outside company policy.',
  customer_summary: payload.customerDescription || payload.symptoms || 'Customer reported troubleshooting issue.',
  technician_notes: 'AI troubleshooting did not run. Continue with manual diagnostic process and document findings.',
});

const parseOpenAiJson = (data = {}) => {
  const raw = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text).filter(Boolean).join('\n') || data.choices?.[0]?.message?.content || '';
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
};

const confidenceLabel = (score = 70) => score >= 90 ? 'Very High' : score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';
const confidenceExplanation = (score = 70, payload = {}) => `${confidenceLabel(score)} confidence based on symptom detail, trade/equipment certainty, model/error-code context, readings, photos, and data completeness.`;

const normalizePlan = (plan = {}, payload = {}) => {
  const score = Math.max(0, Math.min(100, Math.round(Number(plan.confidence_score || plan.confidenceScore || 70))));
  return ({
  safety_warning: clean(plan.safety_warning || plan.safetyWarning || toArray(plan.safetyWarnings).join('\n'), 2000),
  likely_causes: toArray(plan.likely_causes || plan.likelyCauses),
  first_checks: toArray(plan.first_checks || plan.firstChecks || plan.firstThingToCheck),
  step_by_step_diagnostics: toArray(plan.step_by_step_diagnostics || plan.diagnosticSteps || plan.troubleshootingSteps),
  required_tools: toArray(plan.required_tools || plan.toolsNeeded || plan.toolsMetersNeeded),
  likely_parts: toArray(plan.likely_parts || plan.partsLikelyNeeded),
  repair_recommendations: toArray(plan.repair_recommendations || plan.repairRecommendations || plan.recommendations),
  next_troubleshooting_steps: toArray(plan.next_troubleshooting_steps || plan.nextSteps || plan.followUpSteps),
  estimated_labor: clean(plan.estimated_labor || plan.estimatedLabor || plan.repairEstimateRecommendation, 600),
  escalation_conditions: toArray(plan.escalation_conditions || plan.stopAndEscalateIf || plan.whenToEscalate),
  customer_summary: clean(plan.customer_summary || plan.customerExplanation || payload.customerDescription || payload.symptoms, 1600),
  technician_notes: clean(plan.technician_notes || plan.workOrderNotes, 2400),
  confidence_score: score,
  confidence_level: confidenceLabel(score),
  confidence_explanation: clean(plan.confidence_explanation || plan.confidenceExplanation || confidenceExplanation(score, payload), 1000),
  admin_approval_required: true,
});
};

const callOpenAI = async (payload) => {
  if (!process.env.OPENAI_API_KEY) return { ok: false, status: 503, message: 'OPENAI_API_KEY is not configured. AI troubleshooting is unavailable; continue manually.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: 'system', content: 'You are a server-side field troubleshooting assistant for contractors. Return JSON only. Be safety-first and do not approve repairs.' },
          { role: 'user', content: JSON.stringify({
            task: 'Return manufacturer-aware diagnostic guidance. Use model/error-code context when present and recommend what documents/specs to verify.',
            required_json_keys: ['safety_warning','likely_causes','first_checks','step_by_step_diagnostics','required_tools','likely_parts','repair_recommendations','next_troubleshooting_steps','estimated_labor','escalation_conditions','customer_summary','technician_notes','confidence_score','confidence_level','confidence_explanation'],
            inputs: payload,
            research_targets: ['manufacturer documentation', 'service manuals', 'known failures', 'error codes', 'technical bulletins', 'historical company repairs'],
          }) },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: 502, message: data?.error?.message || 'AI troubleshooting failed; continue manually.' };
    const parsed = parseOpenAiJson(data);
    if (!parsed) return { ok: false, status: 502, message: 'AI troubleshooting returned invalid JSON; continue manually.' };
    return { ok: true, plan: normalizePlan(parsed, payload) };
  } catch (error) {
    return { ok: false, status: 502, message: `AI troubleshooting failed; continue manually. ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const payload = normalize(body);
  if (!payload.trade && !payload.equipment && !payload.symptoms) return json(422, { ok: false, message: 'Trade/equipment and symptoms are required.' });
  const ai = await callOpenAI(payload);
  if (!ai.ok) return json(ai.status || 502, { ok: false, message: ai.message, manualTroubleshooting: manualTroubleshootingError(payload, ai.message) });
  return json(200, { ok: true, result: ai.plan, adminApprovalRequired: true });
};
