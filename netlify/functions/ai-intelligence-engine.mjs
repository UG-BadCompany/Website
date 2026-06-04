import { clean } from './auth-utils.mjs';

export const AI_QUOTE_PROMPT_VERSION = 'phase59-ai-quote-2-component-pricing-v1';
export const AI_TROUBLESHOOTING_PROMPT_VERSION = 'phase60-ai-troubleshooting-research-cache-v1';

export const REQUIRED_QUOTE_FIELDS = [
  'jobClassification',
  'tradeCategory',
  'confidenceScore',
  'confidenceScores',
  'confidenceReasons',
  'recommendedAction',
  'quoteReady',
  'siteVisitRecommended',
  'missingInfoQuestions',
  'laborPhases',
  'laborHoursLow',
  'laborHoursHigh',
  'laborRateUsed',
  'materialBreakdown',
  'toolsNeeded',
  'consumables',
  'inventoryMatchHints',
  'supplierPricingRecommendations',
  'riskFlags',
  'exclusions',
  'changeOrderTriggers',
  'customerReadySummary',
  'adminReviewChecklist',
  'totalLowCents',
  'totalHighCents',
  'fixedPriceRecommendationCents',
  'pricingConfidenceLevel',
  'pricingConfidenceReason',
  'rangeSpreadReason',
  'fixedPricePreferred',
  'needsSiteVisitToTightenPrice',
  'missingMeasurementsNeeded',
  'assumptionsUsedForTightPrice',
  'photoNeeded',
  'photoTypesNeeded',
  'measurementNeeded',
  'modelPlateNeeded',
  'photoConfidenceImpact',
  'jobSummary',
  'detailedScope',
  'equipmentBreakdown',
  'permitBreakdown',
  'recommendedUpsells',
  'maintenanceOpportunities',
  'safetyNotes',
  'warrantyNotes',
  'aiAnalysis',
  'pricingEngine',
  'confidenceExplanation',
  'photoAnalysis',
];

export const REQUIRED_TROUBLESHOOTING_FIELDS = [
  'firstThingToCheck',
  'safetyWarnings',
  'diagnosticSteps',
  'expectedReadings',
  'toolsMetersNeeded',
  'likelyCauses',
  'partsLikelyNeeded',
  'stopAndEscalateIf',
  'customerExplanation',
  'workOrderNotes',
  'repairEstimateRecommendation',
  'technicianMode',
  'diagnosticTests',
  'requiredTools',
  'replacementRecommendation',
  'nextDiagnosticSteps',
  'confidenceScore',
  'confidenceExplanation',
  'equipmentIdentification',
  'photoAnalysis',
  'officialErrorMeaning',
  'detectedFault',
  'researchSourcesUsed',
  'confidenceBreakdown',
];

const HIGH_RISK_PATTERN = /electrical|outlet|switch|light|ceiling fan|panel|breaker|hvac|mini\s*split|heat\s*pump|water\s*source|gas|refrigerant|roof|structural|water\s*heater|plumbing/i;
const VAGUE_PATTERN = /\b(fix|repair|broken|not working|issue|problem|help|thing|stuff)\b/i;

const toArray = (value) => Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).map((item) => typeof item === 'string' ? clean(item, 1200) : item).filter(Boolean) : [];
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const normalizeLookupText = (value = '') => clean(String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), 240);
const normalizeErrorCode = (value = '') => clean(String(value || '').toUpperCase().replace(/[^A-Z0-9-]+/g, ''), 80);

const SEEDED_ERROR_DATABASE = [
  {
    manufacturer: 'Daikin',
    modelFamily: 'RXC / CTX ductless mini split',
    modelPattern: /\b(RXC|CTX)\d{2}AXVJU\b/i,
    equipmentType: 'Mini Split Heat Pump',
    errorCode: 'E3',
    meaning: 'High Pressure Protection',
    confidence: 0.94,
    sources: [{ title: 'Seeded Daikin RXC/CTX field error database', url: 'internal://seeded-error-database/daikin-rxc-e3', snippet: 'Daikin RXC/CTX AXVJU E3 fault is high pressure protection; verify against the current Daikin service manual for the exact matched indoor/outdoor pair.' }],
    diagnosticFlow: [
      'Confirm the displayed fault is E3 and record indoor and outdoor model numbers before resetting power.',
      'Verify outdoor fan operation and condenser coil airflow; high head pressure is commonly caused by airflow restriction or fan failure.',
      'Check for blocked/dirty outdoor coil, recirculating discharge air, incorrect clearances, or outdoor ambient/load conditions outside the operating envelope.',
      'Verify service valves are fully open and the refrigerant circuit is not restricted/kinked.',
      'If airflow and valves are correct, connect approved gauges/temperature probes and compare high-side pressure, saturation temperature, superheat/subcooling, and discharge temperature to Daikin service data.',
      'Evaluate overcharge, non-condensables, restriction, high-pressure switch/pressure sensor wiring, and outdoor PCB logic only after airflow/installation causes are eliminated.',
    ],
    repairFlow: [
      'Clean condenser coil and correct airflow/clearance/recirculation issues.',
      'Repair or replace failed outdoor fan motor, fan capacitor/module, blade, or outdoor fan wiring after confirmed readings.',
      'Correct refrigerant charge/restriction/non-condensables using EPA-compliant recovery/evacuation/charging practices when measurements support sealed-system work.',
      'Replace pressure switch/sensor harness or outdoor PCB only after confirming the pressure condition and wiring/sensor signal.'
    ],
    commonParts: ['Outdoor fan motor or fan module', 'Outdoor fan blade', 'Pressure switch/sensor or harness', 'Outdoor PCB', 'Filter drier/refrigerant circuit repair materials if restriction is confirmed'],
    safetyNotes: ['High-pressure faults can involve hot discharge lines and high refrigerant pressure. Use EPA-compliant refrigerant procedures and do not vent refrigerant.', 'Use lockout/tagout before opening panels; perform live measurements only by qualified technicians with proper PPE and meters.'],
  },
];

const buildResearchQueries = (payload = {}) => {
  const manufacturer = clean(payload.manufacturer || payload.make, 120);
  const model = clean(payload.model || payload.modelNumber, 120);
  const errorCode = normalizeErrorCode(payload.errorCode || payload.errorCodes);
  const equipment = clean(payload.component || payload.equipment || payload.equipmentType, 120);
  const symptoms = clean(payload.issue || payload.symptoms || payload.customerComplaint, 240);
  const queries = [];
  if (manufacturer && model && errorCode) queries.push({ priority: 1, query: `${manufacturer} ${model} ${errorCode}` });
  if (manufacturer && model) queries.push({ priority: 2, query: `${manufacturer} ${model} service manual fault code` });
  if (manufacturer && equipment && errorCode) queries.push({ priority: 3, query: `${manufacturer} ${equipment} ${errorCode} error code` });
  if (equipment && symptoms) queries.push({ priority: 4, query: `${equipment} ${symptoms} troubleshooting` });
  return queries.filter((item, index, all) => all.findIndex((other) => other.query.toLowerCase() === item.query.toLowerCase()) === index).slice(0, 4);
};

const lookupSeededError = (payload = {}) => {
  const manufacturer = normalizeLookupText(payload.manufacturer || payload.make);
  const model = clean(payload.model || payload.modelNumber, 160);
  const errorCode = normalizeErrorCode(payload.errorCode || payload.errorCodes);
  return SEEDED_ERROR_DATABASE.find((entry) => normalizeLookupText(entry.manufacturer) === manufacturer && entry.errorCode === errorCode && (!model || entry.modelPattern.test(model))) || null;
};

const stripHtml = (value = '') => clean(String(value).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim(), 500);

const fetchSearchResults = async ({ query, fetchImpl = fetch, timeoutMs = 7000 }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 TroubleshootingResearchBot/1.0', accept: 'text/html' },
    });
    const html = await response.text();
    if (!response.ok) return [];
    const blocks = html.split(/<div class="result[\s\S]*?>/i).slice(1, 5);
    return blocks.map((block) => {
      const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
      if (!linkMatch) return null;
      const url = stripHtml(decodeURIComponent(linkMatch[1].replace(/^\/l\/\?kh=-1&uddg=/, '')), 800);
      return { title: stripHtml(linkMatch[2]), url, snippet: stripHtml(snippetMatch?.[1] || snippetMatch?.[2] || '') };
    }).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
};


const buildKnownErrorTroubleshootingPatch = ({ payload = {}, definition = {}, researchContext = {} }) => {
  if (!definition?.meaning) return {};
  const manufacturer = clean(payload.manufacturer || payload.make || definition.manufacturer, 120) || 'Unknown';
  const model = clean(payload.model || payload.modelNumber || definition.modelFamily, 160) || 'Unknown';
  const code = normalizeErrorCode(payload.errorCode || definition.errorCode);
  const causes = [
    { cause: 'Outdoor condenser airflow restriction, dirty coil, blocked discharge, or poor clearance causing high head pressure.', probability: 32, probabilityPercent: 32 },
    { cause: 'Outdoor fan motor/module/capacitor/blade failure or intermittent fan operation.', probability: 24, probabilityPercent: 24 },
    { cause: 'Refrigerant overcharge, non-condensables, restriction/kink, or closed service valve causing elevated pressure.', probability: 22, probabilityPercent: 22 },
    { cause: 'High-pressure switch/pressure sensor wiring, sensor, or outdoor PCB fault after true high pressure is ruled out.', probability: 14, probabilityPercent: 14 },
    { cause: 'Operating conditions outside manufacturer envelope or indoor/outdoor mismatch/installation issue.', probability: 8, probabilityPercent: 8 },
  ];
  return {
    firstThingToCheck: `${manufacturer} ${model} ${code}: ${definition.meaning}. Start by proving whether the unit is actually entering high pressure protection: confirm outdoor coil airflow, outdoor fan operation, clearances, service valves, and site conditions before condemning controls.`,
    officialErrorMeaning: definition.meaning,
    detectedFault: `${code} — ${definition.meaning}`,
    researchSourcesUsed: researchContext.sources || definition.sources || [],
    likelyCauses: causes,
    diagnosticSteps: definition.diagnosticFlow || [],
    expectedReadings: [
      'Outdoor supply voltage should match the nameplate while running; low/incorrect voltage can raise motor/compressor amperage.',
      'Outdoor fan should run at commanded speed with unobstructed airflow through a clean condenser coil.',
      'High-side pressure/saturation temperature should be appropriate for outdoor ambient and load when compared with Daikin service data; abnormal high head supports an actual pressure problem.',
      'Temperature split, liquid-line/subcooling, suction/superheat, and discharge temperature must be evaluated together before adjusting charge.',
      'Pressure switch/sensor circuit should match Daikin service-manual logic; verify wiring continuity and connector condition with power isolated before PCB replacement.',
    ],
    diagnosticTests: [
      { test: 'Confirm model pair and E3 display/fault history', expectedReading: 'Fault code and model numbers match documented Daikin E3 high pressure protection workflow', tool: 'Nameplate/service manual' },
      { test: 'Outdoor fan and condenser airflow inspection', expectedReading: 'Fan runs smoothly at commanded speed; coil clean; discharge air not recirculating; clearances meet installation manual', tool: 'Visual inspection, tachometer/anemometer if available' },
      { test: 'Supply voltage and outdoor fan amperage', expectedReading: 'Voltage within nameplate tolerance; fan amperage below FLA/rating', tool: 'CAT-rated multimeter/clamp meter' },
      { test: 'Refrigerant pressure/temperature evaluation by qualified tech', expectedReading: 'High-side pressure and saturation temperature align with Daikin pressure-temperature/service data for ambient/load', tool: 'Approved gauges/probes/thermometers' },
      { test: 'Pressure switch/sensor and harness verification after pressure condition is ruled out', expectedReading: 'Circuit/signal matches service manual; no loose, corroded, open, or shorted wiring', tool: 'Multimeter, service data' },
    ],
    toolsMetersNeeded: ['Daikin service manual/fault chart', 'CAT-rated multimeter', 'Clamp meter', 'Manifold/digital gauges and temperature clamps for qualified refrigerant tech', 'Coil-cleaning tools', 'PPE and lockout/tagout kit'],
    requiredTools: ['Daikin service manual/fault chart', 'CAT-rated multimeter', 'Clamp meter', 'Digital gauges/temperature clamps', 'PPE and lockout/tagout kit'],
    partsLikelyNeeded: definition.commonParts || [],
    repairEstimateRecommendation: (definition.repairFlow || []).join(' ') || 'Quote repair only after confirming whether high pressure is caused by airflow, fan failure, refrigerant circuit condition, pressure sensor/harness, or PCB logic.',
    replacementRecommendation: 'Do not recommend full equipment replacement for a single E3 fault until coil/fan/airflow and refrigerant diagnostics are complete; consider replacement only for major sealed-system failure, unavailable parts, repeated compressor/PCB failures, or poor overall equipment condition.',
    safetyWarnings: definition.safetyNotes || [],
    stopAndEscalateIf: ['Escalate if refrigerant recovery/charging, sealed-system repair, high-voltage live testing, or PCB-level diagnosis is outside licensing/company policy.', 'Stop if pressure readings are unsafe, fan wiring is overheated, compressor amperage is above nameplate limits, or the unit cannot be tested without bypassing safeties.'],
    nextDiagnosticSteps: definition.diagnosticFlow || [],
    technicianMode: {
      quickFix: ['Confirm E3 code, clean obvious outdoor coil debris, remove airflow obstructions, verify outdoor fan spins freely with power off, and reset only after documenting conditions.'],
      advancedDiagnosis: ['Measure supply voltage/fan amperage, verify fan command and operation, inspect service valves and line-set restrictions, then compare pressures/temperatures to service data.'],
      expertMode: ['Use Daikin service manual logic to isolate true high pressure versus pressure sensor/harness/PCB fault; evaluate pressure-temperature relationship, subcooling/superheat, discharge temperature, non-condensables, overcharge, restrictions, and control-board inputs.'],
    },
    customerExplanation: `${manufacturer} ${model} code ${code} points to ${definition.meaning}. The diagnostic should focus on why pressure is getting too high, especially outdoor airflow/fan, coil condition, service valves, refrigerant condition, and pressure-sensing controls.`,
    workOrderNotes: `Research-backed diagnostic: ${manufacturer} ${model} code ${code} = ${definition.meaning}. Prioritize high-pressure workflow, not generic communication-failure troubleshooting.`,
    confidenceScore: Math.max(0.72, Number(definition.confidence || 0.8)),
    confidenceExplanation: { label: 'High', explanation: `Manufacturer/model/error-code match found for ${manufacturer} ${model} ${code}; verify against current manufacturer service literature before repair authorization.` },
    confidenceBreakdown: { modelMatch: 0.9, manufacturerMatch: 1, errorCodeMatch: 1, researchCoverage: researchContext.sources?.length ? 0.8 : 0.65, symptomMatch: payload.issue ? 0.72 : 0.5, photoMatch: payload.photos?.length ? 0.75 : 0.35, dataCompleteness: payload.readings ? 0.75 : 0.55, researchConfidence: definition.confidence || 0.85, equipmentConfidence: 0.9, repairConfidence: 0.72, overallConfidence: Math.max(0.72, Number(definition.confidence || 0.8)) },
    equipmentIdentification: { manufacturer, model, serial: payload.serial || 'Unknown', equipmentType: definition.equipmentType || payload.component || 'Unknown', age: payload.age || 'Unknown', modelFamily: definition.modelFamily || '' },
    photoAnalysis: { quality: payload.photos?.length ? 'Photos referenced' : 'No photos supplied', confidenceImpact: payload.photos?.length ? 'Photos may confirm coil condition, clearance, fan condition, and nameplate.' : 'Missing photos reduce confidence in airflow/installation findings.' },
  };
};

export const loadCachedErrorDefinition = async ({ db, payload }) => {
  const manufacturer = normalizeLookupText(payload.manufacturer || payload.make);
  const model = normalizeLookupText(payload.model || payload.modelNumber);
  const errorCode = normalizeErrorCode(payload.errorCode || payload.errorCodes);
  if (!manufacturer || !errorCode) return null;
  const rows = await safeSql(db, (sql) => sql`
    select manufacturer, model_family, error_code, equipment_type, meaning, diagnostic_flow, repair_flow, common_parts, safety_notes, research_sources, confidence, updated_at
    from ai_error_code_cache
    where lower(manufacturer) = ${manufacturer}
      and upper(error_code) = ${errorCode}
    order by case when ${model || ''} <> '' and (lower(model_family) = ${model} or ${model} like concat('%', lower(model_family), '%') or lower(model_family) like concat('%', ${model}, '%')) then 0 else 1 end,
      confidence desc,
      updated_at desc
    limit 1
  `);
  return rows?.[0] ? {
    source: 'database_cache', manufacturer: rows[0].manufacturer, modelFamily: rows[0].model_family, errorCode: rows[0].error_code,
    equipmentType: rows[0].equipment_type, meaning: rows[0].meaning, diagnosticFlow: rows[0].diagnostic_flow || [], repairFlow: rows[0].repair_flow || [], commonParts: rows[0].common_parts || [], safetyNotes: rows[0].safety_notes || [], sources: rows[0].research_sources || [], confidence: Number(rows[0].confidence || 0.75), cachedAt: rows[0].updated_at,
  } : null;
};

export const saveCachedErrorDefinition = async ({ db, payload, definition }) => {
  if (!definition?.meaning) return;
  const manufacturer = clean(definition.manufacturer || payload.manufacturer || payload.make, 120);
  const modelFamily = clean(definition.modelFamily || payload.model || payload.modelNumber || payload.component, 160);
  const errorCode = normalizeErrorCode(definition.errorCode || payload.errorCode || payload.errorCodes);
  if (!manufacturer || !modelFamily || !errorCode) return;
  await safeSql(db, (sql) => sql`
    insert into ai_error_code_cache (manufacturer, model_family, equipment_type, error_code, meaning, diagnostic_flow, repair_flow, common_parts, safety_notes, research_sources, confidence, source_payload)
    values (${manufacturer}, ${modelFamily}, ${clean(definition.equipmentType || payload.component, 120)}, ${errorCode}, ${clean(definition.meaning, 500)}, ${JSON.stringify(definition.diagnosticFlow || [])}::jsonb, ${JSON.stringify(definition.repairFlow || [])}::jsonb, ${JSON.stringify(definition.commonParts || [])}::jsonb, ${JSON.stringify(definition.safetyNotes || [])}::jsonb, ${JSON.stringify(definition.sources || [])}::jsonb, ${Number(definition.confidence || 0.7)}, ${JSON.stringify(definition)}::jsonb)
    on conflict (manufacturer, model_family, error_code) do update set
      equipment_type = excluded.equipment_type,
      meaning = excluded.meaning,
      diagnostic_flow = excluded.diagnostic_flow,
      repair_flow = excluded.repair_flow,
      common_parts = excluded.common_parts,
      safety_notes = excluded.safety_notes,
      research_sources = excluded.research_sources,
      confidence = greatest(ai_error_code_cache.confidence, excluded.confidence),
      successful_lookup_count = ai_error_code_cache.successful_lookup_count + 1,
      source_payload = excluded.source_payload,
      updated_at = now()
  `);
};

export const researchEquipmentFault = async ({ db, payload = {}, fetchImpl = fetch }) => {
  const queries = buildResearchQueries(payload);
  const seeded = lookupSeededError(payload);
  const cached = await loadCachedErrorDefinition({ db, payload });
  const status = [
    { label: 'Searching Manufacturer Data...', state: queries.length ? 'queued' : 'skipped' },
    { label: 'Searching Model Database...', state: (payload.model || payload.modelNumber) ? 'queued' : 'skipped' },
    { label: 'Searching Error Code Database...', state: (payload.errorCode || payload.errorCodes) ? 'queued' : 'skipped' },
  ];
  const onlineResults = [];
  for (const item of queries) {
    const results = await fetchSearchResults({ query: item.query, fetchImpl });
    onlineResults.push({ ...item, results });
  }
  const definition = cached || seeded;
  if (seeded && !cached) await saveCachedErrorDefinition({ db, payload, definition: seeded });
  const sources = [
    ...(definition?.sources || []),
    ...onlineResults.flatMap((item) => item.results.map((result) => ({ ...result, query: item.query, priority: item.priority }))),
  ].filter(Boolean).slice(0, 12);
  return {
    required: queries.length > 0,
    completed: queries.length > 0,
    usedCache: Boolean(cached),
    usedSeededDatabase: Boolean(seeded),
    exactKnownDefinition: definition || null,
    queries,
    onlineResults,
    sources,
    status: [
      ...status.map((item) => ({ ...item, state: item.state === 'queued' ? 'complete' : item.state })),
      { label: 'Analyzing Results...', state: 'complete' },
      { label: 'Building Diagnostic Workflow...', state: 'complete' },
    ],
    confidence: definition?.confidence || (sources.length ? 0.58 : 0.25),
  };
};

const TRADE_ESTIMATING_RULES = {
  hvac: { rate: 145, markup: 0.22, overhead: 0.12, travelCents: 8500, permitCents: 6500, disposalCents: 3500, phases: ['Protect work area and verify equipment data', 'Diagnose/install HVAC scope', 'Start-up, readings, and commissioning'], materials: ['Electrical whip/disconnect or controls allowance', 'Condensate/drain materials', 'Fasteners, sealants, and consumables'] },
  electrical: { rate: 145, markup: 0.20, overhead: 0.12, travelCents: 7500, permitCents: 6500, disposalCents: 2000, phases: ['Lockout/tagout and verify circuit', 'Install/repair listed electrical components', 'Test polarity, load, GFCI/AFCI, and labeling'], materials: ['Device/fixture allowance', 'Box, connectors, wire nuts, pigtails', 'Breaker/wire/conduit allowance when needed'] },
  plumbing: { rate: 135, markup: 0.22, overhead: 0.12, travelCents: 7500, permitCents: 4500, disposalCents: 3500, phases: ['Isolate water and protect finishes', 'Repair/replace plumbing assembly', 'Pressure/leak test and cleanup'], materials: ['Fixture/valve/fitting allowance', 'Supply/drain connectors', 'Sealants, tape, and consumables'] },
  handyman: { rate: 105, markup: 0.18, overhead: 0.10, travelCents: 6500, permitCents: 0, disposalCents: 2000, phases: ['Site protection and layout', 'Complete repair/install', 'Final adjustment and cleanup'], materials: ['Standard hardware allowance', 'Fasteners/adhesives/consumables'] },
  appliance: { rate: 120, markup: 0.20, overhead: 0.10, travelCents: 7500, permitCents: 0, disposalCents: 2500, phases: ['Identify appliance and fault', 'Replace confirmed failed component', 'Cycle test and verify no leaks/overheating'], materials: ['Model-specific part allowance', 'Connectors and consumables'] },
  roofing: { rate: 125, markup: 0.24, overhead: 0.14, travelCents: 9500, permitCents: 7500, disposalCents: 9500, phases: ['Access/roof safety setup', 'Remove damaged material', 'Install roofing repair and water test'], materials: ['Shingles/membrane/flashing allowance', 'Underlayment, sealant, and fasteners'] },
  drywall: { rate: 95, markup: 0.18, overhead: 0.10, travelCents: 6500, permitCents: 0, disposalCents: 3500, phases: ['Mask and protect area', 'Patch/hang/tape/mud', 'Sand texture-ready finish'], materials: ['Drywall sheet/patch allowance', 'Tape, compound, corner bead, texture'] },
  painting: { rate: 85, markup: 0.18, overhead: 0.10, travelCents: 6500, permitCents: 0, disposalCents: 1500, phases: ['Prep/mask/sand', 'Prime and paint coats', 'Touch-up and cleanup'], materials: ['Primer/paint allowance', 'Tape, plastic, rollers, brushes'] },
  flooring: { rate: 105, markup: 0.22, overhead: 0.12, travelCents: 7500, permitCents: 0, disposalCents: 7500, phases: ['Remove/prepare floor', 'Install flooring and transitions', 'Clean and inspect'], materials: ['Flooring quantity allowance', 'Underlayment/adhesive/transitions'] },
  doors: { rate: 105, markup: 0.20, overhead: 0.10, travelCents: 6500, permitCents: 0, disposalCents: 3500, phases: ['Measure and remove old door/hardware', 'Fit, hang, shim, and fasten', 'Install hardware and adjust reveal'], materials: ['Door slab/pre-hung allowance', 'Hinges, lockset, shims, trim'] },
  windows: { rate: 115, markup: 0.22, overhead: 0.12, travelCents: 8500, permitCents: 6500, disposalCents: 5500, phases: ['Measure/protect opening', 'Remove and install window', 'Flash, seal, trim, and water-check'], materials: ['Window unit allowance', 'Flashing, sealant, foam, trim'] },
  'water heater': { rate: 145, markup: 0.24, overhead: 0.12, travelCents: 8500, permitCents: 9500, disposalCents: 8500, phases: ['Drain/disconnect and remove existing unit', 'Install water heater and code upgrades', 'Fill, fire/cycle, and leak/CO checks'], materials: ['Water heater allowance', 'Expansion tank, pan, valves, connectors'] },
  'mini split': { rate: 155, markup: 0.24, overhead: 0.14, travelCents: 9500, permitCents: 12500, disposalCents: 5500, rentalCents: 4500, phases: ['Layout, wall penetration, and mounting', 'Line set/electrical/drain installation', 'Evacuation/start-up and commissioning'], materials: ['Mini split equipment allowance', 'Line set, disconnect, whip, pad/bracket', 'Drain/control wire/line hide materials'] },
  'heat pump': { rate: 155, markup: 0.24, overhead: 0.14, travelCents: 9500, permitCents: 12500, disposalCents: 7500, rentalCents: 6500, phases: ['Recover/isolate per policy and remove equipment', 'Install heat pump equipment and accessories', 'Commission airflow/refrigerant/electrical readings'], materials: ['Heat pump equipment allowance', 'Electrical/refrigerant/drain accessories'] },
  commercial: { rate: 135, markup: 0.20, overhead: 0.14, travelCents: 9500, permitCents: 6500, disposalCents: 4500, phases: ['Coordinate access and safety plan', 'Complete maintenance/repair scope', 'Document readings and closeout'], materials: ['Commercial maintenance material allowance', 'Filters/belts/consumables as applicable'] },
  property: { rate: 105, markup: 0.18, overhead: 0.10, travelCents: 6500, permitCents: 0, disposalCents: 3500, phases: ['Tenant/property coordination', 'Complete maintenance items', 'Photo closeout and notes'], materials: ['Standard property maintenance allowance', 'Hardware/consumables'] },
};
const TRADE_ALIASES = [
  ['mini split', /mini\s*split|ductless/i], ['water heater', /water\s*heater|tankless/i], ['heat pump', /heat\s*pump/i], ['commercial', /commercial|facility/i], ['property', /property maintenance|turnover|tenant/i], ['hvac', /hvac|furnace|air\s*condition|condenser|air handler|thermostat/i], ['electrical', /electrical|outlet|switch|breaker|panel|light|ceiling fan/i], ['plumbing', /plumbing|faucet|toilet|leak|drain|pipe|valve/i], ['appliance', /appliance|dishwasher|washer|dryer|oven|range|refrigerator|microwave/i], ['roofing', /roof|shingle|flashing|gutter/i], ['drywall', /drywall|sheetrock|wall patch|ceiling patch/i], ['painting', /paint|stain|primer/i], ['flooring', /floor|tile|vinyl|laminate|carpet/i], ['doors', /door|lock|hinge|threshold/i], ['windows', /window|glass|sash/i], ['handyman', /handyman|repair|install|mount|assembly/i],
];
const detectTradeKey = (text = '') => (TRADE_ALIASES.find(([, pattern]) => pattern.test(text)) || ['handyman'])[0];
const estimateComplexity = (text = '', photos = []) => Math.max(1, Math.min(10, 3 + (/permit|panel|roof|gas|refrigerant|structural|commercial|multi|replace|install/i.test(text) ? 2 : 0) + (/unsafe|leak|water damage|mold|no access|crawl|attic/i.test(text) ? 2 : 0) + (photos.length ? -1 : 0)));
const confidenceLabelFromScore = (score = 0) => score >= 0.88 ? 'Very High' : score >= 0.74 ? 'High' : score >= 0.55 ? 'Medium' : 'Low';
const currencyCents = (amount = 0) => Math.max(0, Math.round(Number(amount || 0) * 100));
const buildComponentPricingEngine = ({ quote = {}, context = {}, photoContext = [] }) => {
  const text = `${context.serviceType || ''} ${context.workCategory || ''} ${context.description || ''} ${quote.tradeCategory || ''} ${quote.jobClassification || ''}`;
  const tradeKey = detectTradeKey(text);
  const rule = TRADE_ESTIMATING_RULES[tradeKey] || TRADE_ESTIMATING_RULES.handyman;
  const lowHours = Math.max(1, toNumber(quote.laborHoursLow, estimateComplexity(text, photoContext)));
  const highHours = Math.max(lowHours, toNumber(quote.laborHoursHigh, lowHours + 2));
  const recommendedHours = Math.round(((lowHours + highHours) / 2) * 2) / 2;
  const rate = toNumber(quote.laborRateUsed, rule.rate);
  const materials = toArray(quote.materialBreakdown).map((item, index) => {
    const quantity = Math.max(1, toNumber(item.quantity ?? item.estimatedQuantity ?? item.neededQty, 1));
    const unitCostCents = Math.max(0, Math.round(toNumber(item.unitCostCents ?? item.estimatedUnitCostCents ?? item.unit_cost_cents, index === 0 ? 12500 : 3500)));
    return { name: clean(item.name || item.label || rule.materials[index] || 'Material allowance', 180), quantity, unit: clean(item.unit || 'each', 40), unitCostCents, totalCostCents: Math.round(quantity * unitCostCents), pricingSource: clean(item.pricingSource || item.source || 'ai_allowance', 80), notes: clean(item.notes || 'Verify exact SKU/quantity before purchasing.', 500) };
  });
  const materialCostCents = materials.reduce((sum, item) => sum + item.totalCostCents, 0);
  const laborCents = currencyCents(recommendedHours * rate);
  const equipmentCents = Math.max(0, Math.round(toNumber(quote.equipmentCostCents ?? quote.equipmentBreakdown?.totalCostCents, 0)));
  const permitCents = Math.max(0, Math.round(toNumber(quote.permitCostCents ?? quote.permitBreakdown?.totalCostCents, rule.permitCents || 0)));
  const travelCents = Math.max(0, Math.round(toNumber(quote.travelCents, rule.travelCents || 0)));
  const disposalCents = Math.max(0, Math.round(toNumber(quote.disposalCents, rule.disposalCents || 0)));
  const rentalCents = Math.max(0, Math.round(toNumber(quote.rentalEquipmentCents, rule.rentalCents || 0)));
  const overheadRate = Math.max(0, toNumber(quote.overheadRate, rule.overhead));
  const markupRate = Math.max(0, toNumber(quote.markupRate, rule.markup));
  const subtotalBeforeMarkupCents = laborCents + materialCostCents + equipmentCents + permitCents + travelCents + disposalCents + rentalCents;
  const overheadCents = Math.round(subtotalBeforeMarkupCents * overheadRate);
  const markupCents = Math.round((materialCostCents + equipmentCents + rentalCents + overheadCents) * markupRate);
  const recommendedTotalCents = subtotalBeforeMarkupCents + overheadCents + markupCents;
  return {
    tradeKey, laborHours: recommendedHours, laborRate: rate, laborCents, materials, materialCostCents,
    equipmentCents, permitCents, travelCents, disposalCents, rentalCents, overheadRate, overheadCents, markupRate, markupCents,
    lowRangeCents: Math.round(recommendedTotalCents * 0.9), recommendedRangeCents: recommendedTotalCents, premiumRangeCents: Math.round(recommendedTotalCents * 1.18),
    totalFormula: `Labor ${recommendedHours} hrs × $${rate}/hr + materials + equipment + permit + travel + disposal/rental + overhead ${(overheadRate*100).toFixed(0)}% + markup ${(markupRate*100).toFixed(0)}%`,
    why: [`Trade rule: ${tradeKey}`, `Labor built from ${lowHours}-${highHours} estimated hours at $${rate}/hr.`, `Materials are quantity × unit-cost allowances, not a flat random total.`, `Permit/travel/disposal/rental/overhead/markup are explicit components.`],
  };
};
const buildQuoteConfidenceExplanation = ({ quote = {}, context = {}, photoContext = [] }) => {
  const scores = quote.confidenceScores || {};
  const text = `${context.serviceType || ''} ${context.workCategory || ''} ${context.description || ''}`;
  const base = Math.max(0, Math.min(1, toNumber(quote.confidenceScore, 0.55)));
  const factors = {
    tradeCertainty: Math.max(toNumber(scores.trade_certainty, 0), detectTradeKey(text) !== 'handyman' ? 0.82 : 0.55),
    scopeCertainty: toNumber(scores.scope ?? scores.scope_certainty, String(context.description || '').length > 80 ? 0.72 : 0.45),
    photoQuality: photoContext.length ? 0.76 : 0.42,
    equipmentIdentification: /model|serial|manufacturer|make|equipment/i.test(text) ? 0.72 : 0.45,
    pricingCertainty: toNumber(scores.pricing, quote.pricingConfidenceLevel === 'high' ? 0.82 : quote.pricingConfidenceLevel === 'medium' ? 0.64 : 0.45),
    measurementCertainty: quote.measurementNeeded ? 0.38 : 0.68,
    materialCertainty: toArray(quote.materialBreakdown).length ? 0.72 : 0.40,
    regionalDataAvailability: context.city ? 0.66 : 0.48,
    codeRequirementCertainty: /permit|electrical|hvac|water heater|roof|gas/i.test(text) ? 0.58 : 0.72,
    customerDescriptionQuality: String(context.description || '').length > 120 ? 0.78 : 0.48,
  };
  const blended = Object.values(factors).reduce((sum, value) => sum + value, 0) / Object.values(factors).length;
  const score = Math.max(0.1, Math.min(0.98, (base * 0.45) + (blended * 0.55)));
  return { score, label: confidenceLabelFromScore(score), factors, explanation: `Confidence is ${confidenceLabelFromScore(score)} because trade, scope, photos, equipment ID, pricing, measurements, materials, regional data, code certainty, and customer description quality were scored separately.` };
};

export const parseOpenAiJson = (result = {}) => {
  const candidates = [
    result.output_text,
    result.text,
    result.content,
    result?.choices?.[0]?.message?.content,
    ...(Array.isArray(result.output) ? result.output.flatMap((item) => Array.isArray(item.content) ? item.content.map((content) => content.text) : []) : []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const raw = String(candidate).trim();
    if (!raw) continue;
    try { return JSON.parse(raw); } catch {}
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
  }
  return null;
};

export const normalizeQuoteAiOutput = (quote = {}) => {
  const laborPhases = toArray(quote.laborPhases).map((phase) => typeof phase === 'string' ? { name: phase } : phase);
  const materialBreakdown = toArray(quote.materialBreakdown).map((item) => typeof item === 'string' ? { name: item, quantity: 1, unit: 'each' } : item);
  return {
    ...quote,
    jobClassification: clean(quote.jobClassification, 160),
    tradeCategory: clean(quote.tradeCategory, 120),
    confidenceScore: Math.max(0, Math.min(1, toNumber(quote.confidenceScore, 0))),
    confidenceScores: quote.confidenceScores || quote.confidence_scores || {},
    confidenceReasons: toArray(quote.confidenceReasons || quote.confidence_reasons).map((item) => clean(String(item), 500)),
    recommendedAction: clean(quote.recommendedAction || quote.recommended_action, 500),
    quoteReady: Boolean(quote.quoteReady),
    siteVisitRecommended: Boolean(quote.siteVisitRecommended),
    missingInfoQuestions: toArray(quote.missingInfoQuestions).map((q) => clean(String(q), 400)),
    laborPhases,
    laborHoursLow: toNumber(quote.laborHoursLow, 0),
    laborHoursHigh: toNumber(quote.laborHoursHigh, 0),
    laborRateUsed: toNumber(quote.laborRateUsed, 0),
    materialBreakdown,
    toolsNeeded: toArray(quote.toolsNeeded),
    consumables: toArray(quote.consumables),
    inventoryMatchHints: toArray(quote.inventoryMatchHints),
    supplierPricingRecommendations: toArray(quote.supplierPricingRecommendations),
    riskFlags: toArray(quote.riskFlags).map((risk) => clean(String(risk), 600)),
    exclusions: toArray(quote.exclusions).map((item) => clean(String(item), 600)),
    changeOrderTriggers: toArray(quote.changeOrderTriggers).map((item) => clean(String(item), 600)),
    customerReadySummary: clean(quote.customerReadySummary, 8000),
    adminReviewChecklist: toArray(quote.adminReviewChecklist).map((item) => clean(String(item), 600)),
    totalLowCents: Math.max(0, Math.round(toNumber(quote.totalLowCents, 0))),
    totalHighCents: Math.max(0, Math.round(toNumber(quote.totalHighCents, 0))),
    fixedPriceRecommendationCents: Math.max(0, Math.round(toNumber(quote.fixedPriceRecommendationCents, 0))),
    pricingConfidenceLevel: ['high', 'medium', 'low'].includes(clean(quote.pricingConfidenceLevel, 20).toLowerCase()) ? clean(quote.pricingConfidenceLevel, 20).toLowerCase() : '',
    pricingConfidenceReason: clean(quote.pricingConfidenceReason, 1200),
    rangeSpreadReason: clean(quote.rangeSpreadReason, 1200),
    fixedPricePreferred: Boolean(quote.fixedPricePreferred),
    needsSiteVisitToTightenPrice: Boolean(quote.needsSiteVisitToTightenPrice),
    missingMeasurementsNeeded: toArray(quote.missingMeasurementsNeeded).map((item) => clean(String(item), 400)),
    assumptionsUsedForTightPrice: toArray(quote.assumptionsUsedForTightPrice).map((item) => clean(String(item), 600)),
    photoNeeded: Boolean(quote.photoNeeded),
    photoTypesNeeded: toArray(quote.photoTypesNeeded).map((item) => clean(String(item), 120)),
    measurementNeeded: Boolean(quote.measurementNeeded),
    modelPlateNeeded: Boolean(quote.modelPlateNeeded),
    photoConfidenceImpact: clean(quote.photoConfidenceImpact, 1200),
    jobSummary: clean(quote.jobSummary || quote.customerReadySummary, 3000),
    detailedScope: toArray(quote.detailedScope || quote.scopeOfWork).map((item) => clean(String(item), 800)),
    equipmentBreakdown: toArray(quote.equipmentBreakdown).map((item) => typeof item === 'string' ? { name: clean(item, 240), quantity: 1, costCents: 0 } : item),
    permitBreakdown: toArray(quote.permitBreakdown).map((item) => typeof item === 'string' ? { name: clean(item, 240), costCents: 0 } : item),
    recommendedUpsells: toArray(quote.recommendedUpsells).map((item) => clean(String(item), 500)),
    maintenanceOpportunities: toArray(quote.maintenanceOpportunities).map((item) => clean(String(item), 500)),
    safetyNotes: toArray(quote.safetyNotes).map((item) => clean(String(item), 700)),
    warrantyNotes: clean(quote.warrantyNotes, 1600),
    aiAnalysis: quote.aiAnalysis && typeof quote.aiAnalysis === 'object' ? quote.aiAnalysis : {},
    pricingEngine: quote.pricingEngine && typeof quote.pricingEngine === 'object' ? quote.pricingEngine : {},
    confidenceExplanation: quote.confidenceExplanation && typeof quote.confidenceExplanation === 'object' ? quote.confidenceExplanation : {},
    photoAnalysis: quote.photoAnalysis && typeof quote.photoAnalysis === 'object' ? quote.photoAnalysis : {},
  };
};

export const validateQuoteAiOutput = (quote = {}, context = {}) => {
  const errors = [];
  for (const field of REQUIRED_QUOTE_FIELDS) {
    if (!(field in quote)) errors.push(`Missing required field: ${field}`);
  }
  const normalized = normalizeQuoteAiOutput(quote);
  if (normalized.confidenceScore <= 0 || normalized.confidenceScore > 1) errors.push('confidenceScore must be between 0 and 1.');
  if (normalized.laborHoursLow <= 0 || normalized.laborHoursHigh <= 0) errors.push('Labor hours must be greater than zero.');
  if (normalized.laborHoursHigh < normalized.laborHoursLow) errors.push('laborHoursHigh must be greater than or equal to laborHoursLow.');
  if (normalized.laborHoursHigh > 160) errors.push('Labor hours are unreasonably high.');
  if (!normalized.siteVisitRecommended && !normalized.materialBreakdown.length) errors.push('materialBreakdown cannot be empty unless siteVisitRecommended is true.');
  const requestText = `${context.serviceType || ''} ${context.workCategory || ''} ${context.description || ''} ${normalized.tradeCategory}`;
  if (HIGH_RISK_PATTERN.test(requestText)) {
    const riskText = `${normalized.riskFlags.join(' ')} ${normalized.adminReviewChecklist.join(' ')} ${normalized.changeOrderTriggers.join(' ')}`;
    if (!normalized.riskFlags.length) errors.push('High-risk trade requires riskFlags.');
    if (!/stop|escalate|licensed|supervisor|permit|code|safety/i.test(riskText)) errors.push('High-risk trade requires stop/escalate guidance.');
  }
  if (VAGUE_PATTERN.test(context.description || '') && String(context.description || '').trim().length < 80 && !normalized.missingInfoQuestions.length) {
    errors.push('Vague requests must include missingInfoQuestions.');
  }
  if (!normalized.customerReadySummary) errors.push('customerReadySummary is required.');
  if (!normalized.adminReviewChecklist.length) errors.push('adminReviewChecklist is required.');
  if (!normalized.jobSummary) errors.push('jobSummary is required.');
  if (!normalized.detailedScope.length) errors.push('detailedScope is required.');
  if (!normalized.pricingEngine || !Object.keys(normalized.pricingEngine).length) errors.push('pricingEngine is required with component pricing.');
  if (!normalized.aiAnalysis || !Object.keys(normalized.aiAnalysis).length) errors.push('aiAnalysis is required.');
  if (!normalized.confidenceExplanation || !Object.keys(normalized.confidenceExplanation).length) errors.push('confidenceExplanation is required.');
  if (!normalized.pricingConfidenceLevel) errors.push('pricingConfidenceLevel must be high, medium, or low.');
  if (!normalized.pricingConfidenceReason) errors.push('pricingConfidenceReason is required.');
  if (!normalized.assumptionsUsedForTightPrice.length) errors.push('assumptionsUsedForTightPrice is required to support tight pricing.');
  if (normalized.photoNeeded && !normalized.photoTypesNeeded.length) errors.push('photoTypesNeeded is required when photoNeeded is true.');
  if ((normalized.photoNeeded || normalized.measurementNeeded || normalized.modelPlateNeeded) && !normalized.photoConfidenceImpact) errors.push('photoConfidenceImpact is required when photos, measurements, or model plate evidence are needed.');
  if (normalized.totalHighCents < normalized.totalLowCents) errors.push('totalHighCents must be >= totalLowCents.');

  const rangeSpreadCents = Math.max(0, normalized.totalHighCents - normalized.totalLowCents);
  const rangeSpreadRatio = normalized.totalLowCents > 0 ? rangeSpreadCents / normalized.totalLowCents : 0;
  const quoteReadyWithoutVisit = normalized.quoteReady && !normalized.siteVisitRecommended && !normalized.needsSiteVisitToTightenPrice;
  if (normalized.pricingConfidenceLevel === 'low' && normalized.quoteReady) {
    errors.push('Low-confidence output cannot be quoteReady; ask missing questions or recommend a site visit.');
  }
  if (normalized.fixedPriceRecommendationCents && normalized.totalLowCents && normalized.totalHighCents && (normalized.fixedPriceRecommendationCents < normalized.totalLowCents || normalized.fixedPriceRecommendationCents > normalized.totalHighCents)) {
    errors.push('fixedPriceRecommendationCents must fall within totalLowCents and totalHighCents.');
  }
  if (quoteReadyWithoutVisit) {
    const confidenceMaxRatio = normalized.pricingConfidenceLevel === 'high' ? 0.15 : normalized.pricingConfidenceLevel === 'medium' ? 0.25 : 0.2;
    if (normalized.totalLowCents < 100000 && rangeSpreadCents > 25000) {
      errors.push('Quote-ready small jobs under $1,000 must keep the range within $250 unless a site visit/missing info is required.');
    }
    if (normalized.totalLowCents >= 100000 && normalized.totalLowCents <= 500000 && rangeSpreadRatio > 0.25) {
      errors.push('Quote-ready medium jobs must keep totalHighCents within 25% of totalLowCents.');
    }
    if (normalized.totalLowCents > 500000 && rangeSpreadRatio > 0.30) {
      errors.push('Quote-ready larger jobs must keep totalHighCents within 30% of totalLowCents.');
    }
    if (rangeSpreadRatio > confidenceMaxRatio) {
      errors.push(`${normalized.pricingConfidenceLevel || 'unknown'} pricing confidence allows a maximum ${(confidenceMaxRatio * 100).toFixed(0)}% range spread for quote-ready work.`);
    }
    if (rangeSpreadRatio > 0.20 && !normalized.rangeSpreadReason) {
      errors.push('rangeSpreadReason is required whenever a quote-ready range exceeds 20%.');
    }
  } else if (rangeSpreadRatio > 0.30 && !normalized.rangeSpreadReason) {
    errors.push('Site-visit or not-ready quotes may use a wider range only with rangeSpreadReason.');
  }
  return { ok: errors.length === 0, errors, normalized };
};

export const normalizeTroubleshootingAiOutput = (plan = {}) => ({
  officialErrorMeaning: clean(plan.officialErrorMeaning, 500),
  detectedFault: clean(plan.detectedFault, 700),
  researchSourcesUsed: toArray(plan.researchSourcesUsed).map((item) => typeof item === 'string' ? { title: clean(item, 300) } : item).slice(0, 12),
  confidenceBreakdown: plan.confidenceBreakdown && typeof plan.confidenceBreakdown === 'object' ? plan.confidenceBreakdown : {},
  firstThingToCheck: clean(plan.firstThingToCheck || plan.summary, 1200),
  safetyWarnings: toArray(plan.safetyWarnings).map((item) => clean(String(item), 800)),
  diagnosticSteps: toArray(plan.diagnosticSteps).map((item) => clean(String(item), 1000)),
  expectedReadings: toArray(plan.expectedReadings).map((item) => clean(String(item), 800)),
  toolsMetersNeeded: toArray(plan.toolsMetersNeeded || plan.requiredTools).map((item) => clean(String(item), 300)),
  likelyCauses: toArray(plan.likelyCauses).map((item) => typeof item === 'string' ? { cause: clean(item, 500), probability: 'unknown', probabilityPercent: null } : { ...item, cause: clean(item.cause || item.name || '', 500), probability: item.probability ?? item.probabilityPercent ?? 'unknown' }),
  partsLikelyNeeded: toArray(plan.partsLikelyNeeded).map((item) => clean(typeof item === 'string' ? item : item?.name || JSON.stringify(item), 400)),
  stopAndEscalateIf: toArray(plan.stopAndEscalateIf).map((item) => clean(String(item), 800)),
  customerExplanation: clean(plan.customerExplanation, 2000),
  workOrderNotes: clean(plan.workOrderNotes, 3000),
  repairEstimateRecommendation: clean(plan.repairEstimateRecommendation || plan.estimateRecommendation, 1600),
  technicianMode: plan.technicianMode && typeof plan.technicianMode === 'object' ? plan.technicianMode : {},
  diagnosticTests: toArray(plan.diagnosticTests).map((item) => typeof item === 'string' ? { test: clean(item, 500) } : item),
  requiredTools: toArray(plan.requiredTools || plan.toolsMetersNeeded).map((item) => clean(String(item), 300)),
  replacementRecommendation: clean(plan.replacementRecommendation, 1200),
  nextDiagnosticSteps: toArray(plan.nextDiagnosticSteps).map((item) => clean(String(item), 800)),
  confidenceScore: Math.max(0, Math.min(1, toNumber(plan.confidenceScore, 0))),
  confidenceExplanation: plan.confidenceExplanation && typeof plan.confidenceExplanation === 'object' ? plan.confidenceExplanation : {},
  equipmentIdentification: plan.equipmentIdentification && typeof plan.equipmentIdentification === 'object' ? plan.equipmentIdentification : {},
  photoAnalysis: plan.photoAnalysis && typeof plan.photoAnalysis === 'object' ? plan.photoAnalysis : {},
});

export const validateTroubleshootingAiOutput = (plan = {}, context = {}) => {
  const errors = [];
  for (const field of REQUIRED_TROUBLESHOOTING_FIELDS) {
    if (!(field in plan)) errors.push(`Missing required field: ${field}`);
  }
  const normalized = normalizeTroubleshootingAiOutput(plan);
  if (!normalized.firstThingToCheck) errors.push('firstThingToCheck is required.');
  if (!normalized.safetyWarnings.length) errors.push('safetyWarnings are required.');
  if (!normalized.diagnosticSteps.length) errors.push('diagnosticSteps are required.');
  if (!normalized.stopAndEscalateIf.length) errors.push('stopAndEscalateIf is required.');
  if (!normalized.likelyCauses.length || !normalized.likelyCauses.every((item) => item && item.cause && item.probability !== undefined)) errors.push('likelyCauses must include ranked causes with probability.');
  if (!normalized.diagnosticTests.length) errors.push('diagnosticTests are required.');
  if (!normalized.technicianMode || !normalized.technicianMode.quickFix || !normalized.technicianMode.advancedDiagnosis || !normalized.technicianMode.expertMode) errors.push('technicianMode must include quickFix, advancedDiagnosis, and expertMode.');
  if (!normalized.confidenceScore) errors.push('confidenceScore is required.');
  if (!normalized.confidenceExplanation || !Object.keys(normalized.confidenceExplanation).length) errors.push('confidenceExplanation is required.');
  if ((context.manufacturer || context.make || context.model || context.errorCode) && !normalized.researchSourcesUsed.length) errors.push('researchSourcesUsed is required when manufacturer, model, or error code is supplied.');
  if ((context.errorCode || context.errorCodes) && !normalized.officialErrorMeaning) errors.push('officialErrorMeaning is required when an error code is supplied; use uncertainty wording if not positively identified.');
  if (HIGH_RISK_PATTERN.test(`${context.systemType || ''} ${context.component || ''} ${context.issue || ''}`)) {
    const safetyText = `${normalized.safetyWarnings.join(' ')} ${normalized.stopAndEscalateIf.join(' ')}`;
    if (!/stop|escalate|lockout|tagout|licensed|supervisor|gas|refrigerant|electrical/i.test(safetyText)) {
      errors.push('High-risk troubleshooting requires explicit safety stop/escalate language.');
    }
  }
  return { ok: errors.length === 0, errors, normalized };
};

export const callOpenAiJson = async ({ apiKey, model, timeoutMs = 12000, system, user, fetchImpl = fetch }) => {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || `OpenAI request failed with ${response.status}`);
    const parsed = parseOpenAiJson(result);
    if (!parsed) throw new Error('OpenAI did not return valid JSON.');
    return parsed;
  } finally {
    clearTimeout(timer);
  }
};

export const runOpenAiWithValidation = async ({ kind, apiKey, model, timeoutMs, system, user, correctionSystem, validate, context, fetchImpl }) => {
  const attempts = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = attempt === 0 ? user : {
        originalRequest: user,
        previousValidationErrors: attempts.at(-1)?.validationErrors || attempts.at(-1)?.error || [],
        instruction: 'Return corrected strict JSON only. Include every required field and satisfy validation rules.',
      };
      const parsed = await callOpenAiJson({ apiKey, model, timeoutMs, system: attempt === 0 ? system : (correctionSystem || system), user: payload, fetchImpl });
      const validation = validate(parsed, context);
      attempts.push({ attempt: attempt + 1, parsed, validationErrors: validation.errors });
      if (validation.ok) return { ok: true, output: validation.normalized, attempts, retryCount: attempt, model };
    } catch (error) {
      attempts.push({ attempt: attempt + 1, error: error?.message || 'OpenAI call failed' });
    }
  }
  return { ok: false, attempts, retryCount: Math.max(0, attempts.length - 1), model, error: attempts.at(-1)?.error || 'OpenAI output failed validation after retry.' };
};

export const buildQuotePrompt = ({ jobRequest = {}, inventory = [], supplierPricing = [], historicalContext = [], companyRules = [], photoContext = [] }) => ({
  promptVersion: AI_QUOTE_PROMPT_VERSION,
  task: 'Create a contractor-grade AI-first estimate. OpenAI is the decision maker; company playbooks/history are context only.',
  requiredFields: REQUIRED_QUOTE_FIELDS,
  validationRules: [
    'Return strict JSON only.',
    'Classify job and trade.',
    'Return confidenceScores with overall, trade_certainty, scope, photo_quality, equipment_identification, pricing, measurements, materials, regional_data, code_requirements, customer_description_quality, labor, information_completeness, and research on a 0..1 scale plus confidenceReasons and recommendedAction.',
    'Decide quoteReady and siteVisitRecommended.',
    'Provide labor phases, hours low/high, and labor rate.',
    'Generate jobSummary, detailedScope, laborBreakdown, materialBreakdown with quantities/unit costs, equipmentBreakdown, permitBreakdown, recommendedUpsells, maintenanceOpportunities, safetyNotes, warrantyNotes, risks, exclusions, customer summary, admin checklist, and low/high/fixed cents.',
    'Build pricingEngine from components: labor hours × rate, material quantities × unit costs, equipment costs, permit costs, markup, overhead, travel, disposal, rental equipment, low/recommended/premium ranges, and why. Never invent one unexplained flat number.',
    'Include aiAnalysis with tradeDetection, scopeDetection, complexityScore, riskScore, confidenceScore and confidenceExplanation with label Very High/High/Medium/Low plus factor explanations.',
    'Prefer a confident fixed price whenever enough information exists; do not hide uncertainty behind a huge low/high range.',
    'Return a tight low/high range plus one recommended fixed price. High confidence range max 10-15%; medium confidence max 20-25%; low confidence must set quoteReady false unless admin overrides later.',
    'Use company history, inventory, labor knowledge, material knowledge, supplier pricing, and photos/context to tighten pricing.',
    'If uncertain, ask missing questions or recommend a site visit and explain exactly what information would tighten price.',
    'Use photoContext when available: identify equipment, condition, access difficulty, visible damage, safety issues, likely materials, and missing information; strong clear photos increase confidence and unclear/missing photos decrease confidence.',
    'If visual evidence is missing for visual-dependent work, set photoNeeded/photoTypesNeeded/measurementNeeded/modelPlateNeeded and reduce pricingConfidenceLevel or mark needsSiteVisitToTightenPrice.',
    'High-risk trades require risk flags and stop/escalate guidance.',
    'Vague requests require missingInfoQuestions.',
  ],
  customerRequest: jobRequest,
  inventoryContext: inventory,
  supplierPricingContext: supplierPricing,
  historicalCompanyContext: historicalContext,
  companyRules,
  photoContext,
});

export const buildTroubleshootingPrompt = ({ payload = {}, historicalContext = [], companyRules = [], photoContext = [], researchContext = {} }) => ({
  promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION,
  task: 'Create a model-specific, technician-grade diagnostic workflow. Research is the factual engine; OpenAI is the reasoning engine. Never invent manufacturer error meanings.',
  requiredFields: REQUIRED_TROUBLESHOOTING_FIELDS,
  supportedTrades: ['HVAC', 'mini splits', 'heat pumps', 'water source heat pumps', 'plumbing', 'drains', 'water heaters', 'electrical', 'outlets', 'switches', 'lights', 'ceiling fans', 'exhaust fans', 'appliances', 'roofing', 'drywall', 'painting', 'flooring', 'doors', 'windows', 'commercial maintenance', 'property maintenance', 'general handyman work'],
  manufacturerSpecificInstruction: 'If make/manufacturer, model, or error code is supplied, base the workflow on cached/researched findings. If the exact model/error combination is not positively identified, say: I could not positively identify this exact model/error combination. Then provide most-likely causes without claiming an official definition. Do not output generic communication-failure advice unless research supports it.',
  validationRules: ['Return strict JSON only.', 'Include officialErrorMeaning, detectedFault, researchSourcesUsed, safety warnings, expected readings, tools/meters, likely causes ranked by probability %, diagnosticTests with expected readings, quickFix/advancedDiagnosis/expertMode technicianMode, likely repair, replacement recommendation, likely parts, next steps, stop/escalate conditions, customer explanation, work-order notes, confidenceBreakdown, and confidence explanation.', 'For no-cooling HVAC examples, separate airflow/high-pressure, fan, coil, refrigerant/overcharge, restriction, sensors/switches, control board, low-voltage/control, and compressor probabilities when relevant.', 'Confidence must include modelMatch, manufacturerMatch, errorCodeMatch, researchCoverage, symptomMatch, photoMatch, dataCompleteness, researchConfidence, equipmentConfidence, repairConfidence, and overallConfidence on a 0..1 scale.'],
  fieldInput: payload,
  researchContext,
  cachedKnownErrorDefinition: researchContext.exactKnownDefinition || null,
  researchQueries: researchContext.queries || [],
  researchSources: researchContext.sources || [],
  historicalCompanyContext: historicalContext,
  companyRules,
  photoContext,
});

const safeSql = async (db, operation) => {
  try {
    if (!db?.sql) return [];
    const sql = typeof db.sql.bind === 'function' ? db.sql.bind(db) : db.sql;
    return await operation(sql);
  } catch (error) {
    console.warn('AI knowledge/audit persistence skipped.', error?.message || error);
    return [];
  }
};

export const saveAiRun = async ({ db, kind, entityId = null, model, promptVersion, inputSummary, output, validation, fallbackUsed = false, fallbackReason = '', fallbackSource = '', retryCount = 0 }) => {
  await safeSql(db, (sql) => sql`
    insert into ai_quote_runs (
      run_type, entity_id, model, prompt_version, input_summary, output_json,
      validation_result, validation_errors, fallback_used, fallback_reason,
      fallback_source, retry_count, ai_enhanced, service_type, work_category,
      trade, city, labor_hours_low, labor_hours_high, material_list,
      confidence_score, risk_flags, exclusions
    ) values (
      ${kind}, ${entityId}, ${model}, ${promptVersion}, ${JSON.stringify(inputSummary || {})}::jsonb,
      ${JSON.stringify(output || {})}::jsonb, ${validation?.ok ? 'valid' : 'invalid'},
      ${JSON.stringify(validation?.errors || [])}::jsonb, ${fallbackUsed}, ${fallbackReason || null},
      ${fallbackSource || null}, ${retryCount}, ${!fallbackUsed},
      ${clean(inputSummary?.customerRequest?.service_type || inputSummary?.fieldInput?.systemType, 120)},
      ${clean(inputSummary?.customerRequest?.work_category || inputSummary?.fieldInput?.component, 120)},
      ${clean(output?.tradeCategory || inputSummary?.fieldInput?.systemType, 120)},
      ${clean(inputSummary?.customerRequest?.city, 120)},
      ${Number.isFinite(Number(output?.laborHoursLow)) ? Number(output.laborHoursLow) : null},
      ${Number.isFinite(Number(output?.laborHoursHigh)) ? Number(output.laborHoursHigh) : null},
      ${JSON.stringify(output?.materialBreakdown || output?.partsLikelyNeeded || [])}::jsonb,
      ${Number.isFinite(Number(output?.confidenceScore)) ? Number(output.confidenceScore) : null},
      ${JSON.stringify(output?.riskFlags || output?.safetyWarnings || [])}::jsonb,
      ${JSON.stringify(output?.exclusions || [])}::jsonb
    )
  `);
};

export const saveKnowledgeFromQuote = async ({ db, quote, sourceRunId = null, jobRequest = {} }) => {
  const materials = toArray(quote.materialBreakdown);
  const labor = toArray(quote.laborPhases);
  for (const item of materials.slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_material_knowledge (source_run_id, name, trade, quantity_assumption, unit, source_payload, review_status)
      values (${sourceRunId}, ${clean(item.name, 200)}, ${clean(quote.tradeCategory || jobRequest.work_category, 120)}, ${toNumber(item.quantity ?? item.estimatedQuantity ?? 1, 1)}, ${clean(item.unit || 'each', 40)}, ${JSON.stringify(item)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
  for (const phase of labor.slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_labor_knowledge (source_run_id, phase_name, trade, hours_low, hours_high, source_payload, review_status)
      values (${sourceRunId}, ${clean(phase.name || phase.phase, 200)}, ${clean(quote.tradeCategory || jobRequest.work_category, 120)}, ${toNumber(phase.lowHours ?? phase.low_hours ?? quote.laborHoursLow, 0)}, ${toNumber(phase.highHours ?? phase.high_hours ?? quote.laborHoursHigh, 0)}, ${JSON.stringify(phase)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
};

export const saveKnowledgeFromTroubleshooting = async ({ db, plan, sourceRunId = null, payload = {} }) => {
  for (const step of toArray(plan.diagnosticSteps).slice(0, 40)) {
    await safeSql(db, (sql) => sql`
      insert into ai_troubleshooting_knowledge (source_run_id, trade, component, symptom, knowledge_type, content, source_payload, review_status)
      values (${sourceRunId}, ${clean(payload.systemType, 120)}, ${clean(payload.component, 120)}, ${clean(payload.issue, 240)}, ${'diagnostic_step'}, ${clean(String(step), 1200)}, ${JSON.stringify(plan)}::jsonb, ${'pending_review'})
      on conflict do nothing
    `);
  }
};

export const saveAdminAiCorrection = async ({ db, quoteId, jobRequestId = null, originalAiResult = {}, adminChanges = {}, finalQuote = {}, actorUserId = null }) => {
  await safeSql(db, (sql) => sql`
    insert into ai_admin_corrections (quote_id, job_request_id, actor_user_id, original_ai_result, admin_changes, final_approved_quote, recommended_hours, approved_hours, price_adjustment_cents, exclusions_added, customer_wording_changes)
    values (
      ${quoteId}, ${jobRequestId}, ${actorUserId}, ${JSON.stringify(originalAiResult || {})}::jsonb,
      ${JSON.stringify(adminChanges || {})}::jsonb, ${JSON.stringify(finalQuote || {})}::jsonb,
      ${Number.isFinite(Number(originalAiResult?.laborHoursHigh)) ? Number(originalAiResult.laborHoursHigh) : null},
      ${Number.isFinite(Number(adminChanges?.laborHours ?? finalQuote?.laborHours)) ? Number(adminChanges?.laborHours ?? finalQuote?.laborHours) : null},
      ${Number.isFinite(Number(adminChanges?.priceAdjustmentCents)) ? Number(adminChanges.priceAdjustmentCents) : null},
      ${JSON.stringify(adminChanges?.exclusionsAdded || [])}::jsonb,
      ${clean(adminChanges?.customerWordingChanges, 4000)}
    )
  `);
};

export const loadHistoricalAiContext = async ({ db, serviceType = '', workCategory = '', city = '', limit = 6 }) => {
  const like = `%${clean(serviceType || workCategory, 80)}%`;
  const rows = await safeSql(db, (sql) => sql`
    select run_type, input_summary, output_json, created_at
    from ai_quote_runs
    where coalesce(input_summary::text, '') ilike ${like}
    order by created_at desc
    limit ${limit}
  `);
  return Array.isArray(rows) ? rows.map((row) => ({ type: row.run_type, input: row.input_summary, output: row.output_json, createdAt: row.created_at, city })) : [];
};

export const loadPhotoContext = async ({ db, jobRequestId = '', workOrderId = '', quoteId = '', limit = 12 }) => {
  const rows = await safeSql(db, (sql) => sql`
    select id, owner_id, job_request_id, path, file_name, mime_type, caption, notes, photo_type, source_context, quote_id, work_order_id, metadata, created_at
    from files
    where (${jobRequestId || ''} = '' or job_request_id = ${jobRequestId || ''})
      and (${workOrderId || ''} = '' or coalesce(work_order_id, job_request_id::text) = ${workOrderId || ''})
      and (${quoteId || ''} = '' or quote_id = ${quoteId || ''})
      and (mime_type ilike 'image/%' or lower(file_name) ~ '\.(jpg|jpeg|png|webp|heic|heif)$')
    order by created_at desc
    limit ${limit}
  `);
  return Array.isArray(rows) ? rows.map((file) => ({
    id: file.id,
    jobRequestId: file.job_request_id,
    workOrderId: file.work_order_id || '',
    quoteId: file.quote_id || '',
    fileName: file.file_name,
    mimeType: file.mime_type,
    url: file.path,
    path: file.path,
    caption: clean(file.caption, 500),
    notes: clean(file.notes, 1200),
    photoType: clean(file.photo_type, 80) || 'issue',
    sourceContext: clean(file.source_context, 80) || 'job_request',
    createdAt: file.created_at,
    metadata: file.metadata || {},
  })) : [];
};

export const runAiFirstQuote = async ({ db, jobRequest, inventory = [], supplierPricing = [], companyRules = [], photoContext = [], apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', timeoutMs = Number(process.env.AI_QUOTE_TIMEOUT_MS || 14000), fetchImpl = fetch, fallbackBuilder = null }) => {
  const historicalContext = await loadHistoricalAiContext({ db, serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, city: jobRequest.city });
  const resolvedPhotoContext = photoContext.length ? photoContext : await loadPhotoContext({ db, jobRequestId: jobRequest.id });
  const prompt = buildQuotePrompt({ jobRequest, inventory, supplierPricing, historicalContext, companyRules, photoContext: resolvedPhotoContext });
  const system = 'You are the AI-first estimating engine for the contractor. Use company history, inventory, supplier pricing, photos, and request details. Return strict JSON only with the required fields. Do not omit high-risk safety/stop guidance.';
  const result = await runOpenAiWithValidation({ kind: 'quote', apiKey, model, timeoutMs, system, user: prompt, validate: validateQuoteAiOutput, context: { serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, description: jobRequest.description }, fetchImpl });
  if (result.ok) {
    const pricingEngine = result.output.pricingEngine && Object.keys(result.output.pricingEngine).length ? result.output.pricingEngine : buildComponentPricingEngine({ quote: result.output, context: { serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, description: jobRequest.description, city: jobRequest.city }, photoContext: resolvedPhotoContext });
    const confidenceExplanation = result.output.confidenceExplanation && Object.keys(result.output.confidenceExplanation).length ? result.output.confidenceExplanation : buildQuoteConfidenceExplanation({ quote: result.output, context: { serviceType: jobRequest.service_type, workCategory: jobRequest.work_category, description: jobRequest.description, city: jobRequest.city }, photoContext: resolvedPhotoContext });
    const enrichedOutput = { ...result.output, pricingEngine, confidenceExplanation, totalLowCents: result.output.totalLowCents || pricingEngine.lowRangeCents, totalHighCents: result.output.totalHighCents || pricingEngine.premiumRangeCents, fixedPriceRecommendationCents: result.output.fixedPriceRecommendationCents || pricingEngine.recommendedRangeCents };
    await saveAiRun({ db, kind: 'quote', entityId: jobRequest.id, model, promptVersion: AI_QUOTE_PROMPT_VERSION, inputSummary: prompt, output: enrichedOutput, validation: { ok: true, errors: [] }, retryCount: result.retryCount });
    await saveKnowledgeFromQuote({ db, quote: enrichedOutput, jobRequest });
    return { ...enrichedOutput, aiEnhanced: true, fallbackUsed: false, historicalMatchUsed: historicalContext.length > 0, model, promptVersion: AI_QUOTE_PROMPT_VERSION, retryCount: result.retryCount };
  }
  const fallback = fallbackBuilder ? await fallbackBuilder({ reason: result.error, attempts: result.attempts, historicalContext }) : null;
  const fallbackPayload = {
    ...(fallback || {}),
    aiEnhanced: false,
    fallbackUsed: true,
    fallbackReason: result.error || 'OpenAI failed validation after retry.',
    fallbackSource: fallback?.fallbackSource || (historicalContext.length ? 'company_history' : 'static_emergency_rules'),
    warning: 'OpenAI quote generation failed or returned invalid JSON after retry. Emergency fallback used; admin review required.',
    openAiAttempts: result.attempts,
  };
  await saveAiRun({ db, kind: 'quote', entityId: jobRequest.id, model, promptVersion: AI_QUOTE_PROMPT_VERSION, inputSummary: prompt, output: fallbackPayload, validation: { ok: false, errors: result.attempts.flatMap((a) => a.validationErrors || a.error || []) }, fallbackUsed: true, fallbackReason: fallbackPayload.fallbackReason, retryCount: result.retryCount });
  return fallbackPayload;
};

export const runAiFirstTroubleshooting = async ({ db, payload, companyRules = [], photoContext = [], apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_TROUBLESHOOTING_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', timeoutMs = Number(process.env.AI_TROUBLESHOOTING_TIMEOUT_MS || 12000), fetchImpl = fetch, fallbackBuilder = null }) => {
  const historicalContext = await loadHistoricalAiContext({ db, serviceType: payload.systemType, workCategory: payload.component, city: '', limit: 6 });
  const resolvedPhotoContext = photoContext.length ? photoContext : await loadPhotoContext({ db, jobRequestId: payload.workOrderId, workOrderId: payload.workOrderId });
  const researchContext = await researchEquipmentFault({ db, payload, fetchImpl });
  const prompt = buildTroubleshootingPrompt({ payload, historicalContext, companyRules, photoContext: resolvedPhotoContext, researchContext });
  const system = 'You are the AI-first field troubleshooting engine for the contractor. Return strict JSON only. Be safety-first, trade-specific, and model-specific. Use researchContext as factual evidence. Never invent manufacturer error-code meanings; if exact evidence is missing, explicitly state that the exact model/error combination could not be positively identified.';
  const result = await runOpenAiWithValidation({ kind: 'troubleshooting', apiKey, model, timeoutMs, system, user: prompt, validate: validateTroubleshootingAiOutput, context: payload, fetchImpl });
  if (result.ok) {
    const enrichedOutput = { ...result.output, researchContext, researchStatus: researchContext.status };
    await saveAiRun({ db, kind: 'troubleshooting', entityId: payload.workOrderId || null, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, inputSummary: prompt, output: enrichedOutput, validation: { ok: true, errors: [] }, retryCount: result.retryCount });
    await saveKnowledgeFromTroubleshooting({ db, plan: enrichedOutput, payload });
    if (researchContext.exactKnownDefinition) await saveCachedErrorDefinition({ db, payload, definition: researchContext.exactKnownDefinition });
    return { ...enrichedOutput, aiEnhanced: true, fallbackUsed: false, historicalMatchUsed: historicalContext.length > 0, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, retryCount: result.retryCount };
  }
  const fallback = fallbackBuilder ? await fallbackBuilder({ reason: result.error, attempts: result.attempts, historicalContext, researchContext }) : null;
  const knownErrorPatch = buildKnownErrorTroubleshootingPatch({ payload, definition: researchContext.exactKnownDefinition, researchContext });
  const fallbackPayload = {
    ...(fallback || {}),
    ...knownErrorPatch,
    aiEnhanced: false,
    fallbackUsed: true,
    fallbackReason: result.error || 'OpenAI troubleshooting failed validation after retry.',
    fallbackSource: fallback?.fallbackSource || (historicalContext.length ? 'company_troubleshooting_history' : 'static_emergency_rules'),
    warning: 'OpenAI troubleshooting failed or returned invalid JSON after retry. Research-backed emergency fallback used when available; verify before dispatch.',
    researchContext,
    researchStatus: researchContext.status,
    openAiAttempts: result.attempts,
  };
  await saveAiRun({ db, kind: 'troubleshooting', entityId: payload.workOrderId || null, model, promptVersion: AI_TROUBLESHOOTING_PROMPT_VERSION, inputSummary: prompt, output: fallbackPayload, validation: { ok: false, errors: result.attempts.flatMap((a) => a.validationErrors || a.error || []) }, fallbackUsed: true, fallbackReason: fallbackPayload.fallbackReason, fallbackSource: fallbackPayload.fallbackSource, retryCount: result.retryCount });
  return fallbackPayload;
};
