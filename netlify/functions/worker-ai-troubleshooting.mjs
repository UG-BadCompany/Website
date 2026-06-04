import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  parseJsonBody,
} from './auth-utils.mjs';
import { runAiFirstTroubleshooting } from './ai-intelligence-engine.mjs';

const OPENAI_MODEL = process.env.OPENAI_TROUBLESHOOTING_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_TROUBLESHOOTING_TIMEOUT_MS || 9000);

const toArray = (value) => Array.isArray(value) ? value.map((item) => clean(String(item), 180)).filter(Boolean) : [];
const normalizePayload = (body = {}) => ({
  action: clean(body.action, 40),
  systemType: clean(body.systemType || body.trade, 80),
  component: clean(body.component || body.equipmentType, 120),
  manufacturer: clean(body.manufacturer || body.make, 120),
  make: clean(body.make || body.manufacturer, 120),
  model: clean(body.model, 120),
  serial: clean(body.serial || body.serialNumber, 120),
  age: clean(body.age, 80),
  customerComplaint: clean(body.customerComplaint || body.issue, 4000),
  issue: clean(body.issue || body.customerComplaint || body.symptoms, 4000),
  symptoms: clean(body.symptoms || body.issue, 3000),
  errorCode: clean(body.errorCode || body.errorCodes, 120),
  readings: clean(body.readings, 3000),
  checkedAlready: clean(body.checkedAlready, 3000),
  photos: toArray(body.photos),
  videoUpload: clean(body.videoUpload || body.videoUrl, 500),
  technicianModeRequested: clean(body.technicianModeRequested || body.technicianMode || 'expert', 40),
  safetyFlags: toArray(body.safetyFlags),
  urgency: clean(body.urgency, 80) || 'normal',
  workOrderId: clean(body.workOrderId, 100),
  troubleshootingPlan: body.troubleshootingPlan && typeof body.troubleshootingPlan === 'object' ? body.troubleshootingPlan : null,
});

const loadSession = async (db, request) => {
  const token = getSessionToken(request);
  if (!token) return null;
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(token)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  const roleRows = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${session.user_id}
  `;
  const roleKeys = roleRows.map((role) => role.key);
  const assignedPermissions = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load AI troubleshooting permissions' });
  const permissionKeys = getPermissionKeysForRoles(roleKeys, assignedPermissions);
  return { ...session, roleKeys, permissionKeys };
};

const isHighRisk = (payload) => /electrical|hvac|mini split|heat pump|gas|refrigerant/i.test(`${payload.systemType} ${payload.component} ${payload.issue} ${payload.errorCode}`);

const fallbackPlan = (payload) => {
  const system = payload.systemType || 'system';
  const component = payload.component || 'component';
  const issue = payload.issue || 'reported problem';
  const highRisk = isHighRisk(payload);
  return {
    summary: `${system} / ${component}: field troubleshooting plan for ${issue}${payload.errorCode ? ` (code ${payload.errorCode})` : ''}.`,
    likelyCauses: [
      { cause: `Incorrect power, control signal, setting, or safety/interlock condition affecting the ${component}.`, probability: 35, probabilityPercent: 35 },
      { cause: `Component wear/failure, blocked flow/airflow, loose connection, or sensor fault related to the reported symptoms.`, probability: 30, probabilityPercent: 30 },
      { cause: payload.errorCode ? `Manufacturer-specific fault code ${payload.errorCode}; verify against the service manual before replacing parts.` : 'No fault code supplied; start with observable symptoms and baseline readings.', probability: 20, probabilityPercent: 20 },
      { cause: 'Control board, compressor/motor, sealed-system, or concealed wiring fault after simpler checks are eliminated.', probability: 15, probabilityPercent: 15 },
    ],
    safetyWarnings: [
      'Stop immediately if there is smoke, burning smell, gas smell, active water damage near electrical equipment, exposed live wiring, or unsafe access.',
      'Use lockout/tagout. Verify power is off before opening equipment or touching wiring. Do not bypass safeties or leave jumpers in place.',
      highRisk ? 'For HVAC/electrical/gas/refrigerant work, stay within licensing/company policy and escalate to supervisor/licensed pro when required. Do not vent refrigerant or perform unsafe live testing.' : 'Use PPE, isolate hazards, and escalate when the condition is outside normal handyman/maintenance scope.',
    ],
    diagnosticSteps: [
      'Confirm the customer complaint and reproduce the symptom without creating a hazard.',
      'Record nameplate data, model/serial, error/blink code, and exact operating state when the issue appears.',
      'Check simple causes first: thermostat/control setting, power source, breaker/GFCI, shutoff valves, filters/screens, blocked drain/air/water flow, and visible damage.',
      'With equipment safely isolated, inspect connections, terminals, capacitors/consumables, leaks, corrosion, loose fasteners, and signs of overheating or water intrusion.',
      'Take readings with the correct meter/gauge for the trade and compare to manufacturer expected values before condemning parts.',
      'After each correction, retest operation, document readings, and confirm the symptom is resolved or unchanged.',
    ],
    expectedReadings: [
      'Voltage should match equipment nameplate/control requirements within normal tolerance; incorrect voltage means stop and correct supply/control issue first.',
      'Amp draw should be below rated/nameplate values; high draw can indicate binding, shorted component, low voltage, or failing motor/compressor.',
      'Temperature/pressure/water/electrical readings should be compared against manufacturer data and current site conditions, not guessed.',
      'Continuity/resistance readings should match the service manual; open/short readings should be verified with power off and leads isolated.',
    ],
    toolsMetersNeeded: ['Multimeter with appropriate category rating', 'Clamp meter if motor/load amperage is needed', 'Manufacturer manual or fault-code chart', 'Basic hand tools', 'PPE and lockout/tagout kit'],
    partsLikelyNeeded: ['Do not order parts until readings confirm failure.', 'Common possibilities: sensor, capacitor, switch/control, valve, filter/screen, pump/motor, wiring repair, or manufacturer-specific board/module.'],
    stopAndEscalateIf: [
      'Emergency/unsafe condition, active gas smell, smoke, exposed live conductors, arc marks, refrigerant handling requirement, or code/licensing concern.',
      'Readings conflict with expected values and the next step would require live internal testing or bypassing a safety.',
      'The repair requires specialty tools, sealed-system/refrigerant work, panel/service electrical work, or manufacturer authorization.',
    ],
    customerExplanation: `We are diagnosing the ${system.toLowerCase()} issue in a safe order: confirm the symptom, check simple causes, take readings, and only recommend parts or repairs once the measurements support it.`,
    workOrderNotes: `AI troubleshooting notes: ${system} / ${component}. Issue: ${issue}. Code: ${payload.errorCode || 'none'}. Readings: ${payload.readings || 'not supplied'}. Checked: ${payload.checkedAlready || 'not supplied'}. Safety flags: ${payload.safetyFlags.join(', ') || 'none selected'}.`,
    estimateRecommendation: 'If diagnostics confirm a failed part or unsafe condition, create a repair estimate with documented readings, photos, part model compatibility, labor scope, and any supervisor/licensed-trade requirements.',
    technicianMode: {
      quickFix: ['Confirm customer complaint, settings, power/reset state, filters/screens, water/gas shutoffs, and obvious blockage without opening unsafe compartments.'],
      advancedDiagnosis: ['Use meter/gauges/tools appropriate to the trade, record readings, and test suspected components in probability order.'],
      expertMode: ['Use manufacturer service data for model-specific fault trees, expected readings, parts supersession, and final repair/replace decision.'],
    },
    diagnosticTests: [
      { test: 'Verify supply/control voltage or operating input', expectedReading: 'Matches nameplate/control specification within normal tolerance', tool: 'Multimeter' },
      { test: 'Check load/amp draw or flow/temperature/pressure as applicable', expectedReading: 'Within manufacturer operating range for site conditions', tool: 'Clamp meter/gauge/thermometer' },
      { test: 'Inspect visible condition/access/photos', expectedReading: 'No unsafe access, overheating, leak, corrosion, blockage, or damaged conductor before continuing', tool: 'Camera/PPE' },
    ],
    requiredTools: ['Multimeter with appropriate CAT rating', 'Clamp meter if motor/load amperage is needed', 'Manufacturer service manual or fault-code chart', 'Basic hand tools', 'PPE and lockout/tagout kit'],
    replacementRecommendation: 'Repair confirmed isolated failures when parts are available and equipment age/condition support repair; recommend replacement for unsafe, obsolete, repeated major, sealed-system, or high-cost failures.',
    nextDiagnosticSteps: ['Capture manufacturer/model/serial plate and clear photos.', 'Run diagnostic tests in probability order.', 'Document readings before replacing parts.', 'Escalate if licensing/code/safety conditions apply.'],
    confidenceScore: payload.make || payload.model ? 0.72 : 0.58,
    confidenceExplanation: { label: payload.make || payload.model ? 'High' : 'Medium', explanation: payload.make || payload.model ? 'Manufacturer/model data improves equipment-specific guidance; verify against service manual.' : 'No model plate supplied, so guidance is trade-specific but less equipment-specific.' },
    equipmentIdentification: { manufacturer: payload.make || payload.manufacturer || 'Unknown', model: payload.model || 'Unknown', serial: payload.serial || 'Unknown', equipmentType: component, age: payload.age || 'Unknown' },
    photoAnalysis: { quality: payload.photos?.length ? 'Photos referenced' : 'No photos supplied', confidenceImpact: payload.photos?.length ? 'Photo context can improve access/condition confidence if clear.' : 'Missing photos reduce access, damage, and equipment identification certainty.' },
  };
};

const parseOpenAiJson = (result) => {
  const text = result?.output_text || result?.output?.flatMap((item) => item.content || []).map((part) => part.text || '').join('\n') || '';
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
};

const generateAiPlan = async (payload) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 240);
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: 'system', content: 'You are a safety-first field-service troubleshooting assistant for a handyman/maintenance company. Return only valid JSON with keys: summary, likelyCauses, safetyWarnings, diagnosticSteps, expectedReadings, toolsMetersNeeded, partsLikelyNeeded, stopAndEscalateIf, customerExplanation, workOrderNotes, estimateRecommendation. Never instruct unsafe live electrical work, permanent bypassing safeties, ignoring code, venting refrigerant, gas leak work, or work outside licensing/company policy. Always include lockout/tagout and escalation language for electrical/HVAC/gas/refrigerant.' },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return parseOpenAiJson(result);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const normalizePlan = (plan, fallback) => {
  const source = plan && typeof plan === 'object' ? plan : fallback;
  const arr = (value, fallbackValue = []) => Array.isArray(value) ? value.map((item) => typeof item === 'string' ? clean(item, 900) : item).filter(Boolean).slice(0, 12) : fallbackValue;
  return {
    summary: clean(source.summary || source.firstThingToCheck, 1200) || fallback.summary,
    officialErrorMeaning: clean(source.officialErrorMeaning, 500) || '',
    detectedFault: clean(source.detectedFault, 700) || '',
    researchSourcesUsed: arr(source.researchSourcesUsed || source.researchContext?.sources, []),
    researchStatus: arr(source.researchStatus || source.researchContext?.status, []),
    confidenceBreakdown: source.confidenceBreakdown || {},
    likelyCauses: arr(source.likelyCauses, fallback.likelyCauses).map((item) => typeof item === 'string' ? { cause: item, probability: 'unknown' } : item),
    safetyWarnings: arr(source.safetyWarnings, fallback.safetyWarnings),
    diagnosticSteps: arr(source.diagnosticSteps, fallback.diagnosticSteps),
    expectedReadings: arr(source.expectedReadings, fallback.expectedReadings),
    toolsMetersNeeded: arr(source.toolsMetersNeeded, fallback.toolsMetersNeeded),
    partsLikelyNeeded: arr(source.partsLikelyNeeded, fallback.partsLikelyNeeded),
    stopAndEscalateIf: arr(source.stopAndEscalateIf, fallback.stopAndEscalateIf),
    customerExplanation: clean(source.customerExplanation, 1600) || fallback.customerExplanation,
    workOrderNotes: clean(source.workOrderNotes, 2400) || fallback.workOrderNotes,
    estimateRecommendation: clean(source.estimateRecommendation || source.repairEstimateRecommendation, 1600) || fallback.estimateRecommendation,
    technicianMode: source.technicianMode || fallback.technicianMode || {},
    diagnosticTests: arr(source.diagnosticTests, fallback.diagnosticTests),
    requiredTools: arr(source.requiredTools || source.toolsMetersNeeded, fallback.requiredTools || fallback.toolsMetersNeeded),
    replacementRecommendation: clean(source.replacementRecommendation, 1600) || fallback.replacementRecommendation || '',
    nextDiagnosticSteps: arr(source.nextDiagnosticSteps, fallback.nextDiagnosticSteps),
    confidenceScore: Number(source.confidenceScore || fallback.confidenceScore || 0),
    confidenceExplanation: source.confidenceExplanation || fallback.confidenceExplanation || {},
    equipmentIdentification: source.equipmentIdentification || fallback.equipmentIdentification || {},
    photoAnalysis: source.photoAnalysis || fallback.photoAnalysis || {},
  };
};

const saveNotesToJob = async ({ db, session, payload }) => {
  if (!payload.workOrderId) return json(422, { ok: false, message: 'Add a work order ID before saving notes to a job.' });
  const fallback = fallbackPlan(payload);
  const plan = normalizePlan(payload.troubleshootingPlan, fallback);
  const note = `AI troubleshooting plan saved by ${session.full_name || session.email}:\n\n${plan.workOrderNotes}\n\nNext steps:\n${plan.diagnosticSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`.slice(0, 5000);
  const isAdmin = session.roleKeys.includes('admin');
  const rows = isAdmin ? await db.sql`
    update job_requests
    set admin_notes = concat(coalesce(admin_notes, ''), case when coalesce(admin_notes, '') = '' then '' else E'\n\n' end, ${note}), updated_at = now()
    where id = ${payload.workOrderId}
    returning id
  ` : await db.sql`
    update job_requests
    set admin_notes = concat(coalesce(admin_notes, ''), case when coalesce(admin_notes, '') = '' then '' else E'\n\n' end, ${note}), updated_at = now()
    where id = ${payload.workOrderId}
      and exists (select 1 from worker_assignments where worker_assignments.job_request_id = job_requests.id and worker_assignments.worker_id = ${session.user_id})
    returning id
  `;
  if (!rows[0]) return json(404, { ok: false, message: 'Work order was not found for this account.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'worker.ai_troubleshooting.notes_saved'}, ${'job_request'}, ${payload.workOrderId}, ${JSON.stringify({ systemType: payload.systemType, component: payload.component, urgency: payload.urgency })}::jsonb)
  `;
  return json(200, { ok: true, saved: true, message: 'Troubleshooting notes saved to the work order.' });
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const session = await loadSession(db, request);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Sign in with a worker or admin account.' });
    const allowed = session.roleKeys.includes('admin') || session.permissionKeys.includes('worker.jobs.manage') || session.permissionKeys.includes('admin.tools');
    if (!allowed) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Worker or admin access required.' });
    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const payload = normalizePayload(body);
    if (payload.action === 'save_notes') return await saveNotesToJob({ db, session, payload });
    if (!payload.systemType || !payload.component || !payload.issue) return json(422, { ok: false, message: 'System/trade, equipment/component, and issue/complaint are required.' });
    const fallback = fallbackPlan(payload);
    const aiPlan = await runAiFirstTroubleshooting({
      db,
      payload,
      fallbackBuilder: async ({ historicalContext }) => ({
        ...fallback,
        fallbackSource: historicalContext?.length ? 'company_troubleshooting_history' : 'static_emergency_rules',
      }),
    });
    const troubleshootingPlan = normalizePlan(aiPlan, fallback);
    return json(200, {
      ok: true,
      troubleshootingPlan,
      aiEnhanced: Boolean(aiPlan?.aiEnhanced),
      fallbackUsed: Boolean(aiPlan?.fallbackUsed),
      fallbackReason: aiPlan?.fallbackReason || null,
      fallbackSource: aiPlan?.fallbackSource || null,
      warning: aiPlan?.warning || null,
      model: aiPlan?.model || null,
      researchStatus: aiPlan?.researchStatus || aiPlan?.researchContext?.status || [],
      researchContext: aiPlan?.researchContext || null,
      promptVersion: aiPlan?.promptVersion || null,
      historicalMatchUsed: Boolean(aiPlan?.historicalMatchUsed),
    });
  } catch (error) {
    console.error('AI troubleshooting failed', error);
    return json(500, { ok: false, message: 'Troubleshooting assistant is unavailable right now.' });
  }
};

export const config = { path: '/api/worker/ai-troubleshooting' };
