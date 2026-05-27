import {
  createMagicLinkUrl,
  createToken,
  hashToken,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  sendMagicLinkEmail,
} from './auth-utils.mjs';
import { verifyRecaptchaToken } from './recaptcha-utils.mjs';

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'city', 'streetAddress', 'service', 'description'];
const MAX_FIELD_LENGTHS = {
  name: 140,
  phone: 60,
  email: 254,
  city: 140,
  streetAddress: 240,
  workScope: 120,
  service: 120,
  subcategory: 160,
  timeframe: 80,
  description: 5000,
  recaptchaToken: 4000,
};

const OPENAI_MODEL = process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.AI_REQUEST_ESTIMATE_TIMEOUT_MS || 11000);
const DEFAULT_LABOR_RATE_CENTS = Number(process.env.AI_LABOR_RATE_CENTS || (Number(process.env.AI_LABOR_RATE || 95) * 100));
const TRIP_CHARGE_CENTS = Number(process.env.AI_TRIP_CHARGE_CENTS || (Number(process.env.AI_TRIP_CHARGE || 75) * 100));
const MATERIAL_MARKUP = Number(process.env.AI_MATERIAL_MARKUP_PERCENT || 25) / 100;
const CONTINGENCY = Number(process.env.AI_CONTINGENCY_PERCENT || 10) / 100;
const MINIMUM_CHARGE_CENTS = Number(process.env.AI_MINIMUM_CHARGE_CENTS || (Number(process.env.AI_MINIMUM_CHARGE || 175) * 100));

const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const clampMoney = (value) => Math.max(0, Math.round(Number(value || 0)));
const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const dollars = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export const normalizePayload = (payload) => {
  const normalized = {};

  for (const [field, maxLength] of Object.entries(MAX_FIELD_LENGTHS)) {
    normalized[field] = clean(payload[field]).slice(0, maxLength);
  }

  normalized.email = normalized.email.toLowerCase();
  normalized.botField = clean(payload['bot-field']);
  normalized.workCategory = normalized.service;
  normalized.customerSupplied = clean(payload.customerSupplied || payload.customer_supplied || '').slice(0, 800);
  normalized.photoNames = Array.isArray(payload.photoNames) ? payload.photoNames.map((name) => clean(name).slice(0, 160)).filter(Boolean) : [];
  normalized.photosProvided = Boolean(payload.photosProvided || payload.hasUpload || normalized.photoNames.length);

  return normalized;
};

export const validatePayload = (payload) => {
  const missingFields = REQUIRED_FIELDS.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    return `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`;
  }

  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) {
    return 'Enter a valid email address.';
  }

  return null;
};

const loadDatabase = async () => {
  const { getDatabase } = await import('@netlify/database');

  return getDatabase();
};

const findOrCreateProperty = async (db, clientId, payload) => {
  const [existingProperty] = await db.sql`
    select id
    from properties
    where client_id = ${clientId}
      and lower(street) = lower(${payload.streetAddress})
      and lower(city) = lower(${payload.city})
      and state = 'AZ'
    limit 1
  `;

  if (existingProperty) return existingProperty;

  const [property] = await db.sql`
    insert into properties (client_id, label, street, city, state)
    values (${clientId}, 'Request property', ${payload.streetAddress}, ${payload.city}, 'AZ')
    returning id
  `;

  return property;
};

const detectJobType = (payload) => {
  const text = slug(`${payload.workScope} ${payload.service} ${payload.subcategory} ${payload.description}`);

  const is = (terms) => terms.some((term) => text.includes(term));
  const electricalKeywords = ['outlet', 'switch', 'gfci', 'breaker', 'panel', 'light fixture', 'ceiling fan', 'dimmer', 'electrical'];
  const plumbingKeywords = ['faucet', 'toilet', 'sink', 'garbage disposal', 'shutoff', 'angle stop', 'leak', 'drain', 'plumbing'];
  const hvacKeywords = ['mini split', 'mini-split', 'minisplit', 'ductless', 'thermostat', 'hvac', 'ac', 'condenser'];
  const drywallKeywords = ['drywall', 'hole', 'patch', 'texture', 'paint', 'wall damage'];
  const carpentryKeywords = ['door', 'trim', 'baseboard', 'cabinet', 'shelf', 'wood', 'gate', 'fence'];
  const applianceKeywords = ['dishwasher', 'microwave', 'range', 'oven', 'washer', 'dryer', 'appliance'];

  let trade = 'general';
  if (is(hvacKeywords)) trade = 'hvac';
  else if (is(plumbingKeywords)) trade = 'plumbing';
  else if (is(electricalKeywords)) trade = 'electrical';
  else if (is(drywallKeywords)) trade = 'drywall_paint';
  else if (is(carpentryKeywords)) trade = 'carpentry';
  else if (is(applianceKeywords)) trade = 'appliance';

  let scope = 'service';
  if (/troubleshoot|diagnose|not working|issue|problem|leak|clog|trip|tripping|repair|fix/.test(text)) scope = 'troubleshooting_repair';
  if (/replace|replacement|swap/.test(text)) scope = 'replace_existing';
  if (/new install|install|installation|mount|add new/.test(text)) scope = 'new_install';
  if (/maintenance|service|tune|inspect/.test(text)) scope = 'maintenance';

  return { trade, scope, text };
};

const addItem = (items, item) => {
  items.push({
    name: item.name,
    quantity: Number(item.quantity || 1),
    unit: item.unit || 'allowance',
    lowCents: clampMoney(item.lowCents),
    highCents: Math.max(clampMoney(item.lowCents), clampMoney(item.highCents)),
    required: item.required !== false,
    notes: item.notes || '',
  });
};

const buildMaterialItems = (payload, job) => {
  const items = [];
  const text = job.text;

  if (job.trade === 'hvac' && /mini split|mini-split|minisplit|ductless/.test(text)) {
    addItem(items, { name: 'Mini split equipment package', quantity: 1, lowCents: 70000, highCents: 240000, notes: 'Remove if customer supplies correct equipment. Verify BTU, voltage, MCA/MOCP, line-set length, and warranty requirements.' });
    addItem(items, { name: 'Insulated copper line set kit', quantity: 1, lowCents: 12000, highCents: 36000, notes: 'Size and length must match equipment. Longer/vertical runs increase cost.' });
    addItem(items, { name: 'Line hide cover and fittings', quantity: 1, lowCents: 9000, highCents: 33000, notes: 'Include elbows, couplers, wall cap, end caps, screws, anchors.' });
    addItem(items, { name: 'Communication/control wire', quantity: 1, lowCents: 4500, highCents: 16000, notes: 'Usually 14/4 or manufacturer-specified cable. Verify spec.' });
    addItem(items, { name: 'Outdoor disconnect, whip, fittings', quantity: 1, lowCents: 5500, highCents: 18000, notes: 'Disconnect, liquid-tight whip, connectors, bushings.' });
    addItem(items, { name: 'Breaker, conduit, wire, straps, LB/fittings allowance', quantity: 1, lowCents: 9000, highCents: 60000, notes: 'Depends on panel brand, run length, attic access, and whether a new circuit is needed.' });
    addItem(items, { name: 'Condenser pad or wall bracket', quantity: 1, lowCents: 4500, highCents: 24000, notes: 'Verify clearance, anchoring, roof/wall restrictions, and HOA requirements.' });
    addItem(items, { name: 'Condensate drain materials', quantity: 1, lowCents: 2500, highCents: 12000, notes: 'Tubing/PVC, clips, termination point, pump if gravity drain is not possible.' });
    addItem(items, { name: 'Sealants, wall sleeve, anchors, consumables', quantity: 1, lowCents: 3500, highCents: 12000, notes: 'Foam, silicone, sleeve, masonry/stucco anchors, touch-up consumables.' });
    return items;
  }

  if (job.trade === 'plumbing' && /faucet/.test(text)) {
    addItem(items, { name: 'Faucet allowance', lowCents: 6000, highCents: 32000, notes: 'Remove if customer-supplied; verify hole count and finish.' });
    addItem(items, { name: 'Hot/cold faucet supply lines', lowCents: 1800, highCents: 5000, notes: 'Often replaced during faucet work.' });
    addItem(items, { name: 'Pop-up/drain or disposal connection allowance', lowCents: 1500, highCents: 8000, notes: 'Only if disturbed or incompatible.' });
    addItem(items, { name: 'Angle stop/shutoff valve allowance', quantity: 2, lowCents: 900, highCents: 3500, notes: 'Use if old valves leak/fail or are corroded.' });
    addItem(items, { name: 'Putty/silicone/cleaners/consumables', lowCents: 800, highCents: 2500, notes: 'Sealant and finish cleanup.' });
    return items;
  }

  if (job.trade === 'plumbing' && /toilet/.test(text)) {
    addItem(items, { name: 'Toilet allowance', lowCents: 14000, highCents: 50000, notes: 'Remove if customer-supplied; verify rough-in and bowl shape.' });
    addItem(items, { name: 'Wax ring or wax-free seal', lowCents: 800, highCents: 2500, notes: 'Extra-thick if flange height requires.' });
    addItem(items, { name: 'Closet bolts, caps, shims', lowCents: 800, highCents: 2200, notes: 'Needed for stable set and finish.' });
    addItem(items, { name: 'Toilet supply line', lowCents: 900, highCents: 2500, notes: 'Usually replaced.' });
    addItem(items, { name: 'Angle stop/shutoff allowance', lowCents: 900, highCents: 3500, notes: 'Only if existing shutoff leaks or fails.' });
    addItem(items, { name: 'Caulk/cleanup/disposal allowance', lowCents: 1200, highCents: 5500, notes: 'Includes haul-off allowance if included.' });
    return items;
  }

  if (job.trade === 'electrical') {
    addItem(items, { name: 'Device/fixture/fan allowance', lowCents: 800, highCents: 25000, notes: 'Remove if customer-supplied. Verify ratings, box support, and location.' });
    addItem(items, { name: 'Cover plate/trim hardware', lowCents: 300, highCents: 1800, notes: 'Match color/style when possible.' });
    addItem(items, { name: 'Wire nuts, pigtails, screws, grounding parts', lowCents: 700, highCents: 3500, notes: 'Electrical consumables.' });
    addItem(items, { name: 'Box extender or old-work box allowance', lowCents: 600, highCents: 4500, notes: 'Needed if box is loose, recessed, damaged, or unsupported.' });
    addItem(items, { name: 'Circuit testing/safety consumables', lowCents: 500, highCents: 2500, notes: 'Labeling, tape, small parts.' });
    return items;
  }

  if (job.trade === 'drywall_paint') {
    addItem(items, { name: 'Drywall patch/backer/materials', lowCents: 1200, highCents: 7000, notes: 'Depends on size and backing needed.' });
    addItem(items, { name: 'Joint compound and tape', lowCents: 1200, highCents: 4500, notes: 'Multiple coats may require return trip.' });
    addItem(items, { name: 'Texture match materials', lowCents: 1500, highCents: 6500, notes: 'Orange peel/knockdown matching is approximate.' });
    addItem(items, { name: 'Primer/paint touch-up allowance', lowCents: 2500, highCents: 14000, notes: 'Exact paint match may require customer paint or color match.' });
    addItem(items, { name: 'Masking/plastic/sanding consumables', lowCents: 1200, highCents: 4500, notes: 'Dust control and finish prep.' });
    return items;
  }

  if (job.trade === 'carpentry') {
    addItem(items, { name: 'Wood/trim/hardware allowance', lowCents: 2500, highCents: 18000, notes: 'Depends on item, dimensions, finish grade.' });
    addItem(items, { name: 'Fasteners, anchors, adhesive, shims', lowCents: 1200, highCents: 5500, notes: 'Install consumables.' });
    addItem(items, { name: 'Caulk/filler/touch-up allowance', lowCents: 1200, highCents: 7500, notes: 'Finish work allowance.' });
    return items;
  }

  if (job.trade === 'appliance') {
    addItem(items, { name: 'Install kit/connection parts allowance', lowCents: 2500, highCents: 16000, notes: 'May include water line, cord, vent, brackets, fittings.' });
    addItem(items, { name: 'Fasteners, sealant, leveling parts', lowCents: 1000, highCents: 5500, notes: 'Small install materials.' });
    addItem(items, { name: 'Haul-away/disposal allowance', lowCents: 2500, highCents: 9000, notes: 'Only if included and site access allows.' });
    return items;
  }

  addItem(items, { name: `${payload.service || 'General'} materials allowance`, lowCents: 3500, highCents: 35000, notes: 'Admin should verify exact parts, model numbers, measurements, and customer-supplied materials.' });
  addItem(items, { name: 'Fasteners, anchors, caulk, sealant, consumables', lowCents: 1500, highCents: 9000, notes: 'General install/repair consumables.' });
  return items;
};

const laborPhase = (name, lowHours, highHours, notes, skill = 'handyman') => ({
  name,
  lowHours: Number(lowHours),
  highHours: Math.max(Number(lowHours), Number(highHours)),
  notes,
  skill,
});

const buildLaborItems = (payload, job) => {
  const phases = [];
  const text = job.text;

  phases.push(laborPhase('Intake, site verification, and protection', 0.25, 0.75, 'Confirm scope, access, photos, shutoffs/power, and protect work area.'));

  if (job.trade === 'hvac' && /mini split|mini-split|minisplit|ductless/.test(text)) {
    phases.push(laborPhase('Layout indoor/outdoor locations and line-set path', 0.75, 1.5, 'Confirm clearances, drain path, wall penetration, exterior route, and service access.', 'advanced'));
    phases.push(laborPhase('Mount indoor head and make wall penetration', 1.25, 2.75, 'Mount plate, drill/sleeve, slope drain/lines, seal penetration.', 'advanced'));
    phases.push(laborPhase('Set condenser and route line set/drain/control wire', 2.5, 6.5, 'Depends heavily on distance, attic/stucco/block access, height, and line-hide route.', 'advanced'));
    phases.push(laborPhase('Install line hide and exterior finish details', 1, 3.5, 'Line hide, elbows, couplers, straps, sealant, anchors, finish detail.'));
    phases.push(laborPhase('Electrical coordination or install allowance', 1.5, 7, 'New circuit/disconnect/conduit/panel work may require licensed electrician and permit.', 'licensed review'));
    phases.push(laborPhase('Startup, test, cleanup, customer walkthrough', 1, 2.5, 'Vacuum/startup/refrigerant handling may require licensed HVAC. Drain and operation testing required.', 'HVAC review'));
    return phases;
  }

  if (job.scope === 'troubleshooting_repair') {
    phases.push(laborPhase('Diagnosis and access', 0.75, 2, 'Determine failure cause, open access, test/inspect, identify parts.'));
    phases.push(laborPhase('Repair attempt or temporary stabilization', 0.75, 3.5, 'Actual repair depends on diagnosis and available parts.'));
  } else if (job.scope === 'replace_existing') {
    phases.push(laborPhase('Disconnect/remove existing item', 0.25, 1.5, 'Corrosion, stuck fasteners, old plumbing/electrical, or poor prior install can increase time.'));
    phases.push(laborPhase('Prep and install replacement', 0.75, 3.5, 'Fit, connect, secure, seal, level, and adjust.'));
  } else if (job.scope === 'new_install') {
    phases.push(laborPhase('Layout and mounting/prep', 0.5, 1.5, 'Locate studs/support/utilities and confirm placement.'));
    phases.push(laborPhase('Install new item/system', 1, 4.5, 'Mount, connect, secure, seal, and finish. Utility availability affects price.'));
  } else {
    phases.push(laborPhase('Main service work', 1, 4, 'Perform approved repair/install/maintenance work.'));
  }

  if (job.trade === 'drywall_paint') {
    phases.push(laborPhase('Dry time/return trip allowance', 0.5, 2, 'Drywall compound/texture/paint may need multiple visits.'));
  }

  phases.push(laborPhase('Test, cleanup, and admin documentation', 0.25, 0.75, 'Verify operation/finish, cleanup, document change orders and next steps.'));
  return phases;
};

const buildQuestions = (payload, job) => {
  const text = job.text;
  const questions = [];

  if (!payload.workScope) questions.push('Is this troubleshooting/repair, replacing existing, new install, maintenance, or removal?');
  if (!payload.subcategory) questions.push('What specific item/system is involved?');
  if (!payload.photosProvided) questions.push('Upload clear photos of the work area, existing item, shutoffs/panel/model tags, and access path.');
  if (!/(\b\d+\s*(ft|feet|foot|in|inch|sqft|sq ft|gallon|gal|ton|amp|amps|v|volt|volts)\b)|model|brand|size|measurement/.test(text)) {
    questions.push('Provide brand/model/size/voltage/measurements or approximate quantities if known.');
  }

  if (job.trade === 'hvac' && /mini split|mini-split|minisplit|ductless/.test(text)) {
    questions.push('Who is supplying the mini split equipment, and what are the BTU, voltage, MCA/MOCP, and line-set size requirements?');
    questions.push('Approximate distance from panel to outdoor disconnect and from condenser to indoor head?');
    questions.push('Is there attic access, stucco/block wall, HOA restriction, roof/wall mount, or condensate pump needed?');
  }

  if (job.trade === 'electrical') {
    questions.push('Is there existing power/box at the location, and is the box fan-rated if installing a fan?');
  }

  if (job.trade === 'plumbing') {
    questions.push('Do the shutoff valves work, and are there signs of corrosion/leaking under the fixture?');
  }

  return [...new Set(questions)].slice(0, 9);
};

const buildRiskFlags = (payload, job) => {
  const text = job.text;
  const risks = [];

  if (/panel|breaker|new circuit|dedicated circuit|disconnect|meter|service upgrade/.test(text)) risks.push('Electrical panel/new circuit/disconnect work may require licensed electrician review and permit verification.');
  if (/gas|propane|natural gas/.test(text)) risks.push('Gas work requires licensed trade review.');
  if (/mini split|hvac|refrigerant|condenser|line set/.test(text)) risks.push('HVAC/refrigerant/startup scope may require licensed HVAC review, startup procedure, and permit verification.');
  if (/roof|truss|rafter|structural|load bearing/.test(text)) risks.push('Roofing/structural work is excluded or requires specialty contractor review.');
  if (/mold|asbestos|lead|sewage/.test(text)) risks.push('Hazardous condition may stop work until properly remediated.');
  if (/leak|water damage|rot|rust|corrosion|termite/.test(text)) risks.push('Hidden damage, corrosion, or rot may require change order after inspection.');
  if (!payload.photosProvided) risks.push('Estimate confidence is lower without photos.');
  if (!/brand|model|size|measurement|ft|feet|inch|amp|volt|btu/.test(text)) risks.push('Exact parts/labor may change without model numbers, measurements, or specs.');

  return [...new Set(risks)];
};

const buildExclusions = (job) => {
  const exclusions = [
    'Permit fees, engineering, specialty trade work, and code corrections are excluded unless specifically added.',
    'Hidden damage, inaccessible utilities, unsafe existing conditions, wrong customer-supplied materials, and scope changes require approval before extra work.',
    'Paint/texture matching is best effort unless exact paint/materials are supplied.',
  ];

  if (job.trade === 'hvac') {
    exclusions.push('Refrigerant handling/startup, electrical circuit work, and permit inspections may require licensed trade involvement.');
  }

  return exclusions;
};

const calculateEstimate = ({ laborItems, materials }) => {
  const laborHoursLow = laborItems.reduce((sum, item) => sum + Number(item.lowHours || 0), 0);
  const laborHoursHigh = laborItems.reduce((sum, item) => sum + Number(item.highHours || item.lowHours || 0), 0);
  const laborLowCents = Math.round(laborHoursLow * DEFAULT_LABOR_RATE_CENTS);
  const laborHighCents = Math.round(laborHoursHigh * DEFAULT_LABOR_RATE_CENTS);

  const materialLowCents = materials.reduce((sum, item) => sum + clampMoney(item.lowCents) * Number(item.quantity || 1), 0);
  const materialHighCents = materials.reduce((sum, item) => sum + clampMoney(item.highCents) * Number(item.quantity || 1), 0);
  const markupLowCents = Math.round(materialLowCents * MATERIAL_MARKUP);
  const markupHighCents = Math.round(materialHighCents * MATERIAL_MARKUP);

  const subtotalLow = laborLowCents + materialLowCents + markupLowCents + TRIP_CHARGE_CENTS;
  const subtotalHigh = laborHighCents + materialHighCents + markupHighCents + TRIP_CHARGE_CENTS;
  const contingencyLowCents = Math.round(subtotalLow * CONTINGENCY);
  const contingencyHighCents = Math.round(subtotalHigh * CONTINGENCY);

  return {
    laborHoursLow,
    laborHoursHigh,
    laborLowCents,
    laborHighCents,
    materialLowCents,
    materialHighCents,
    markupLowCents,
    markupHighCents,
    tripChargeCents: TRIP_CHARGE_CENTS,
    contingencyLowCents,
    contingencyHighCents,
    totalLowCents: Math.max(MINIMUM_CHARGE_CENTS, subtotalLow + contingencyLowCents),
    totalHighCents: Math.max(MINIMUM_CHARGE_CENTS, subtotalHigh + contingencyHighCents),
  };
};

const estimateFromPayload = (payload) => {
  const job = detectJobType(payload);
  const materials = buildMaterialItems(payload, job);
  const laborItems = buildLaborItems(payload, job);
  const questions = buildQuestions(payload, job);
  const riskFlags = buildRiskFlags(payload, job);
  const exclusions = buildExclusions(job);
  const totals = calculateEstimate({ laborItems, materials });
  const confidence = Math.max(35, Math.min(90, 82 - (questions.length * 5) - (riskFlags.length * 3) + (payload.photosProvided ? 8 : 0)));

  const title = `${payload.service || 'Service'} ${job.scope.replaceAll('_', ' ')} estimate draft`;
  const summary = [
    `ADMIN REVIEW DRAFT — Do not send without review.`,
    '',
    `Customer: ${payload.name} | ${payload.phone} | ${payload.email}`,
    `Property: ${payload.streetAddress}, ${payload.city}, AZ`,
    `Scope: ${payload.workScope || job.scope} | Trade: ${job.trade} | Service: ${payload.service}`,
    `Request details: ${payload.description}`,
    '',
    `Recommended estimate range: ${dollars(totals.totalLowCents)} – ${dollars(totals.totalHighCents)}`,
    `Confidence: ${confidence}/100`,
    '',
    `Labor range: ${totals.laborHoursLow.toFixed(2)} – ${totals.laborHoursHigh.toFixed(2)} hours @ ${dollars(DEFAULT_LABOR_RATE_CENTS)}/hr`,
    ...laborItems.map((item) => `- ${item.name}: ${item.lowHours}-${item.highHours} hrs | ${item.notes}`),
    '',
    `Materials/allowances before markup: ${dollars(totals.materialLowCents)} – ${dollars(totals.materialHighCents)}`,
    ...materials.map((item) => `- ${item.name}: qty ${item.quantity} ${item.unit || ''} | ${dollars(item.lowCents)} – ${dollars(item.highCents)} | ${item.notes}`),
    '',
    `Trip charge: ${dollars(totals.tripChargeCents)}`,
    `Material markup: ${Math.round(MATERIAL_MARKUP * 100)}%`,
    `Contingency/risk buffer: ${Math.round(CONTINGENCY * 100)}%`,
    '',
    questions.length ? 'Missing info / questions:' : 'Missing info / questions: none obvious from current request.',
    ...questions.map((question) => `- ${question}`),
    '',
    riskFlags.length ? 'Risk / licensed trade flags:' : 'Risk / licensed trade flags: none obvious, still verify site conditions.',
    ...riskFlags.map((flag) => `- ${flag}`),
    '',
    'Exclusions / change-order triggers:',
    ...exclusions.map((item) => `- ${item}`),
    '',
    'Admin next steps:',
    '- Verify photos/specs/model numbers.',
    '- Confirm customer-supplied vs company-supplied materials.',
    '- Confirm whether permit/licensed trade involvement is required.',
    '- Adjust final price before sending quote.',
  ].join('\n');

  return {
    title,
    summary,
    amountCents: totals.totalHighCents,
    lowAmountCents: totals.totalLowCents,
    laborHours: totals.laborHoursHigh,
    laborRateCents: DEFAULT_LABOR_RATE_CENTS,
    materials,
    laborItems,
    missingInfoQuestions: questions,
    riskFlags,
    exclusions,
    job,
    totals,
    confidence,
    quoteReady: questions.length <= 2 && riskFlags.length <= 3,
  };
};

const tryImproveDraftWithOpenAi = async (payload, draft) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return draft;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [
              'You are a senior handyman estimator for T&A Contracting in Arizona.',
              'Your job is to make estimates realistic, itemized, and admin-review ready.',
              'Return strict JSON only.',
              'Never tell the customer this is final.',
              'Do not be vague. Break down labor phases and hidden materials.',
              'Flag licensed trade, permit, safety, inaccessible work, and hidden-condition issues.',
              'Keep the final high amount realistic and defendable.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'Improve this Request Estimate draft. Keep the same JSON structure. Improve labor phases, material allowances, missing questions, risk flags, exclusions, and summary. Return JSON with title, summary, amountCents, lowAmountCents, laborItems, materials, missingInfoQuestions, riskFlags, exclusions, confidence, quoteReady, totals.',
              request: payload,
              currentDraft: draft,
              pricingRules: {
                laborRateCents: DEFAULT_LABOR_RATE_CENTS,
                tripChargeCents: TRIP_CHARGE_CENTS,
                materialMarkupPercent: Math.round(MATERIAL_MARKUP * 100),
                contingencyPercent: Math.round(CONTINGENCY * 100),
                minimumChargeCents: MINIMUM_CHARGE_CENTS,
              },
            }),
          },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 4200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) return draft;

    const data = await response.json();
    const raw = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    if (!raw) return draft;

    const parsed = JSON.parse(raw);
    return {
      ...draft,
      ...parsed,
      amountCents: Number.isInteger(Number(parsed.amountCents)) && Number(parsed.amountCents) > 0 ? Number(parsed.amountCents) : draft.amountCents,
      lowAmountCents: Number.isInteger(Number(parsed.lowAmountCents)) && Number(parsed.lowAmountCents) > 0 ? Number(parsed.lowAmountCents) : draft.lowAmountCents,
      summary: clean(parsed.summary).slice(0, 9000) || draft.summary,
      title: clean(parsed.title).slice(0, 180) || draft.title,
      confidence: Number.isFinite(Number(parsed.confidence)) ? Number(parsed.confidence) : draft.confidence,
      aiEnhanced: true,
    };
  } catch {
    clearTimeout(timer);
    return draft;
  }
};

const createAutomaticEstimateDraft = async ({ db, jobRequest, client, payload }) => {
  let draft = estimateFromPayload(payload);
  draft = await tryImproveDraftWithOpenAi(payload, draft);

  const [quote] = await db.sql`
    insert into quotes (job_request_id, client_id, status, title, summary, amount_cents, created_by)
    values (${jobRequest.id}, ${client.id}, 'draft', ${draft.title}, ${draft.summary || null}, ${draft.amountCents || 0}, null)
    returning id, job_request_id, client_id, status, title, summary, amount_cents, created_at, updated_at
  `;

  await db.sql`
    update job_requests
    set status = 'quote_in_progress', updated_at = now()
    where id = ${jobRequest.id}
      and status in ('new', 'needs_review', 'quote_in_progress')
  `;

  await db.sql`
    insert into audit_events (event_type, entity_type, entity_id, metadata)
    values (
      ${'estimate_draft.created'},
      ${'quote'},
      ${quote.id},
      ${JSON.stringify({
        source: 'public_request_estimate_ai_v2',
        jobRequestId: jobRequest.id,
        clientId: client.id,
        amountCents: draft.amountCents || 0,
        lowAmountCents: draft.lowAmountCents || 0,
        workScope: payload.workScope,
        service: payload.service,
        job: draft.job || null,
        confidence: draft.confidence || null,
        quoteReady: Boolean(draft.quoteReady),
        aiEnhanced: Boolean(draft.aiEnhanced),
        laborItems: draft.laborItems || [],
        materials: draft.materials || [],
        missingInfoQuestions: draft.missingInfoQuestions || [],
        riskFlags: draft.riskFlags || [],
        exclusions: draft.exclusions || [],
        totals: draft.totals || {},
      })}::jsonb
    )
  `;

  return { quote, draft };
};

export const createJobRequestHandler = ({ getDatabase = loadDatabase, makeToken = createToken, sendEmail = sendMagicLinkEmail } = {}) => async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  let payload;
  try {
    payload = normalizePayload(await request.json());
  } catch {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  if (payload.botField) return json(200, { ok: true, message: 'Request received.' });

  const recaptchaCheck = await verifyRecaptchaToken({ token: payload.recaptchaToken, request, action: 'request_work' });
  if (!recaptchaCheck.ok) return json(403, { ok: false, message: `reCAPTCHA verification failed. Please try again. (${recaptchaCheck.reason})` });

  const validationError = validatePayload(payload);
  if (validationError) return json(422, { ok: false, message: validationError });

  try {
    const db = await getDatabase();

    const [client] = await db.sql`
      insert into app_users (auth_provider, auth_subject, email, full_name, phone)
      values ('magic_link', ${payload.email}, ${payload.email}, ${payload.name}, ${payload.phone})
      on conflict (email) do update set
        full_name = coalesce(nullif(app_users.full_name, ''), excluded.full_name),
        phone = coalesce(nullif(app_users.phone, ''), excluded.phone),
        is_active = true,
        updated_at = now()
      returning id, email
    `;

    await db.sql`
      insert into user_roles (user_id, role_id)
      select ${client.id}, roles.id
      from roles
      where roles.key = 'client'
      on conflict do nothing
    `;

    const property = await findOrCreateProperty(db, client.id, payload);

    const [jobRequest] = await db.sql`
      insert into job_requests (
        client_id,
        property_id,
        requester_name,
        requester_email,
        requester_phone,
        city,
        street_address,
        work_scope,
        work_category,
        service_type,
        preferred_timeframe,
        description
      ) values (
        ${client.id},
        ${property.id},
        ${payload.name},
        ${payload.email},
        ${payload.phone},
        ${payload.city},
        ${payload.streetAddress},
        ${payload.workScope || null},
        ${payload.workCategory || payload.service || null},
        ${payload.service},
        ${payload.timeframe || null},
        ${payload.description}
      )
      returning id, created_at
    `;

    await db.sql`
      insert into audit_events (event_type, entity_type, entity_id, metadata)
      values (
        ${'job_request.created'},
        ${'job_request'},
        ${jobRequest.id},
        ${JSON.stringify({
          source: 'public_request_estimate_form',
          clientId: client.id,
          propertyId: property.id,
          city: payload.city,
          streetAddress: payload.streetAddress,
          workScope: payload.workScope,
          service: payload.service,
          subcategory: payload.subcategory,
        })}::jsonb
      )
    `;

    let estimateDraftResult = null;
    try {
      estimateDraftResult = await createAutomaticEstimateDraft({ db, jobRequest, client, payload });
    } catch (draftError) {
      console.error('Automatic estimate draft failed', draftError);
      await db.sql`
        insert into audit_events (event_type, entity_type, entity_id, metadata)
        values (
          ${'estimate_draft.failed'},
          ${'job_request'},
          ${jobRequest.id},
          ${JSON.stringify({ source: 'public_request_estimate_form', error: draftError?.message || 'unknown' })}::jsonb
        )
      `;
    }

    const token = makeToken();
    const magicLinkUrl = createMagicLinkUrl(request, token);

    await db.sql`
      insert into auth_magic_links (email, token_hash, purpose, client_name, client_phone, expires_at)
      values (${payload.email}, ${hashToken(token)}, 'client_account', ${payload.name}, ${payload.phone}, ${minutesFromNow(MAGIC_LINK_TTL_MINUTES)}::timestamptz)
    `;

    let emailResult = { sent: false, reason: 'Email delivery is not configured.' };
    try {
      emailResult = await sendEmail({ to: payload.email, magicLinkUrl, purpose: 'client_account' });
    } catch (emailError) {
      console.error('Request confirmation email delivery failed', emailError);
      emailResult = { sent: false, reason: 'Email delivery failed.' };
    }

    return json(201, {
      ok: true,
      id: jobRequest.id,
      clientId: client.id,
      propertyId: property.id,
      createdAt: jobRequest.created_at,
      estimateDraftCreated: Boolean(estimateDraftResult?.quote?.id),
      estimateDraft: estimateDraftResult ? {
        id: estimateDraftResult.quote.id,
        status: estimateDraftResult.quote.status,
        title: estimateDraftResult.quote.title,
        summary: estimateDraftResult.quote.summary,
        amountCents: estimateDraftResult.quote.amount_cents,
        lowAmountCents: estimateDraftResult.draft.lowAmountCents || null,
        confidence: estimateDraftResult.draft.confidence || null,
        quoteReady: Boolean(estimateDraftResult.draft.quoteReady),
        missingInfoQuestions: estimateDraftResult.draft.missingInfoQuestions || [],
        riskFlags: estimateDraftResult.draft.riskFlags || [],
        materials: estimateDraftResult.draft.materials || [],
        laborItems: estimateDraftResult.draft.laborItems || [],
        totals: estimateDraftResult.draft.totals || {},
      } : null,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Estimate request saved. We are preparing your estimate, and a secure client portal link was sent to your email.'
        : 'Estimate request saved. We are preparing your estimate. Your request is in the portal, but confirmation email delivery needs configuration.',
    });
  } catch (error) {
    console.error('Failed to create job request', error);
    return json(500, { ok: false, message: 'We could not save the request right now. Please try again or use the standard form fallback.' });
  }
};

export default createJobRequestHandler();

export const config = {
  path: '/api/job-requests',
};
