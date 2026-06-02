const clean = (value, max = 5000) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const commonPreferenceFields = [
  'Preferred Brand', 'Preferred Manufacturer', 'Preferred Model', 'Preferred Product',
  'Preferred Features', 'Budget Range', 'Upgrade Preferences', 'Energy Efficiency Goal',
  'Cheapest Acceptable Option', 'Premium Option Interest', 'Customer Supplied Materials',
  'Additional Notes',
];

const tradeDefinitions = [
  ['hvac', 'HVAC', ['hvac', 'air conditioner', 'ac ', 'furnace', 'heat pump', 'air handler'], ['Equipment make/model', 'Tonnage or BTU size', 'Thermostat type', 'Duct access', 'Refrigerant type', 'Electrical panel distance', 'Filter size', 'Existing failure symptoms']],
  ['mini_splits', 'Mini Splits', ['mini split', 'mini-split', 'ductless'], ['Brand Preference', 'Desired BTU', 'Voltage', 'Indoor/Outdoor Distance', 'Line Set Length', 'Wall penetration location', 'Condensate route', 'Outdoor pad/bracket preference']],
  ['commercial_hvac', 'Commercial HVAC', ['rtu', 'commercial hvac', 'roof top unit', 'package unit'], ['RTU model', 'Tonnage', 'Roof access', 'Crane/lift requirement', 'Curb adapter need', 'Economizer requirement', 'Business hours access', 'Permit contact']],
  ['water_heaters', 'Water Heaters', ['water heater', 'tankless', 'gallon'], ['Gas or Electric', 'Tank or Tankless', 'Gallon Size', 'Existing Location', 'Vent type', 'Expansion tank', 'Pan/drain availability', 'Desired brand']],
  ['plumbing', 'Plumbing', ['plumbing', 'leak', 'faucet', 'toilet', 'sink', 'shower', 'drain'], ['Fixture type', 'Pipe material', 'Leak location', 'Shutoff access', 'Wall/floor access', 'Fixture brand preference', 'Water damage visible', 'Photos of connections']],
  ['commercial_plumbing', 'Commercial Plumbing', ['commercial plumbing', 'backflow', 'grease trap', 'flush valve'], ['Fixture count', 'Business hours access', 'Backflow device model', 'Grease interceptor size', 'Floor drain locations', 'Permit requirement', 'Inspection deadline', 'Tenant coordination']],
  ['electrical', 'Electrical', ['electrical', 'outlet', 'breaker', 'panel', 'switch', 'gfci', 'ev charger', 'light'], ['Voltage', 'Breaker Size', 'Panel brand', 'Panel capacity', 'Circuit distance', 'Device count', 'Access path', 'Permit requirement']],
  ['commercial_electrical', 'Commercial Electrical', ['commercial electrical', 'three phase', '3 phase', 'tenant panel'], ['Voltage/phase', 'Load requirement', 'Panel schedule', 'Conduit route', 'After-hours access', 'Lift requirement', 'Permit/inspection need', 'Shutdown window']],
  ['roofing', 'Roofing', ['roof', 'shingle', 'tile roof', 'flat roof'], ['Roof type', 'Leak location', 'Approximate square footage', 'Number of stories', 'Pitch/access', 'Underlayment condition', 'HOA requirement', 'Photos of damage']],
  ['drywall', 'Drywall', ['drywall', 'sheetrock', 'texture', 'wall patch'], ['Damage size', 'Texture type', 'Paint match need', 'Ceiling or wall', 'Moisture source', 'Stud access', 'Number of patches', 'Photos of area']],
  ['painting', 'Painting', ['paint', 'painting', 'stain'], ['Interior or exterior', 'Room count', 'Paint brand preference', 'Color count', 'Surface condition', 'Prep level', 'Ceiling/trim included', 'Occupied access']],
  ['flooring', 'Flooring', ['floor', 'flooring', 'tile', 'vinyl plank', 'carpet', 'laminate'], ['Material preference', 'Square footage', 'Subfloor condition', 'Removal required', 'Baseboards included', 'Transition count', 'Stair count', 'Moisture concerns']],
  ['doors', 'Doors', ['door', 'hinge', 'lockset', 'deadbolt'], ['Door size', 'Interior/exterior', 'Slab or prehung', 'Hardware preference', 'Frame condition', 'Swing direction', 'Fire rating need', 'Paint/stain included']],
  ['windows', 'Windows', ['window', 'glass', 'slider'], ['Window size', 'Frame type', 'Glass type', 'Quantity', 'Tempered requirement', 'Exterior access', 'Stucco/trim condition', 'Energy efficiency preference']],
  ['appliances', 'Appliances', ['appliance', 'dishwasher', 'range', 'microwave', 'washer', 'dryer'], ['Appliance make/model', 'New unit on site', 'Connection type', 'Haul-away need', 'Cabinet modification', 'Water/electric/gas access', 'Warranty constraints', 'Install kit available']],
  ['handyman', 'Handyman', ['handyman', 'repair', 'install', 'mount', 'assemble'], ['Task list', 'Photos of each item', 'Material ownership', 'Wall type', 'Height/access', 'Preferred finish', 'Urgency', 'Budget range']],
  ['general_contracting', 'General Contracting', ['remodel', 'renovation', 'general contracting', 'build out'], ['Scope drawings', 'Budget range', 'Finish level', 'Permit status', 'Timeline', 'Material selections', 'Occupied property', 'Subcontractor needs']],
  ['facilities_maintenance', 'Facilities Maintenance', ['facility', 'facilities', 'maintenance contract'], ['Site count', 'Priority level', 'NTE amount', 'Access protocol', 'Recurring schedule', 'Asset list', 'Vendor rules', 'Reporting requirements']],
  ['property_maintenance', 'Property Maintenance', ['property maintenance', 'tenant', 'rental', 'turnover'], ['Property type', 'Tenant access', 'Move-in deadline', 'Punch list', 'Owner approvals', 'Material standard', 'Photos', 'Budget range']],
  ['tenant_improvements', 'Tenant Improvements', ['tenant improvement', 'ti ', 'suite build', 'office build'], ['Plans/specs', 'Permit status', 'Suite size', 'Business type', 'Finish schedule', 'Inspection milestones', 'After-hours work', 'Landlord requirements']],
];

const ruleTypes = ['Materials', 'Labor Rules', 'Permit Requirements', 'Inspection Requirements', 'Equipment Requirements', 'Safety Requirements'];

export const TRADE_INTELLIGENCE_LIBRARY = Object.fromEntries(tradeDefinitions.map(([key, label, keywords, helpful]) => {
  const questions = [...helpful, ...commonPreferenceFields].map((field) => ({
    label: field,
    prompt: `${field}? Share it if you know it. Skip if unsure.`,
    optional: true,
  }));
  const rules = ruleTypes.flatMap((type) => helpful.map((field) => ({ type, label: `${label} ${type}: ${field}`, optional: true })));
  return [key, { key, label, keywords, helpfulInformation: helpful, preferenceFields: commonPreferenceFields, questions, rules }];
}));

const detectTrade = (request = {}) => {
  const haystack = slug(`${request.workScope} ${request.service} ${request.subcategory} ${request.description} ${request.tradeType} ${request.workCategory}`);
  const match = Object.values(TRADE_INTELLIGENCE_LIBRARY).find((trade) => trade.keywords.some((keyword) => haystack.includes(slug(keyword))));
  return match || TRADE_INTELLIGENCE_LIBRARY.handyman;
};

const preferenceText = (request = {}) => clean([
  request.preferredBrand,
  request.preferredManufacturer,
  request.preferredModel,
  request.preferredProduct,
  request.preferredFeatures,
  request.budgetRange,
  request.upgradePreferences,
  request.additionalNotes,
  request.description,
].filter(Boolean).join(' '), 3000);

const extractPreferences = (request = {}) => {
  const text = preferenceText(request);
  const lower = text.toLowerCase();
  return {
    preferredBrand: clean(request.preferredBrand || (lower.match(/\b(mitsubishi|rheem|trane|carrier|lennox|goodman|kohler|delta|moen)\b/i)?.[0] || ''), 120),
    preferredManufacturer: clean(request.preferredManufacturer, 120),
    preferredModel: clean(request.preferredModel, 160),
    preferredProduct: clean(request.preferredProduct, 160),
    preferredFeatures: clean(request.preferredFeatures || (/(energy efficient|efficient|quiet|smart|cheapest|budget|premium)/i.test(text) ? text : ''), 800),
    budgetRange: clean(request.budgetRange || (text.match(/\$\s?[0-9][0-9,]*(?:\s?-\s?\$?\s?[0-9][0-9,]*)?/i)?.[0] || ''), 120),
    upgradePreferences: clean(request.upgradePreferences || (/(upgrade|best|most energy efficient|cheapest|lowest cost)/i.test(text) ? text : ''), 800),
    additionalNotes: clean(request.additionalNotes, 1000),
  };
};

const detectPhotoIntelligence = (request = {}, trade) => {
  const names = Array.isArray(request.photoNames) ? request.photoNames : [];
  const hasPhotos = Boolean(request.photosProvided || request.hasUpload || names.length);
  if (!hasPhotos) return { photosProvided: false, findings: [], reducedQuestions: [] };
  const findings = [
    `${trade.label} photos uploaded for estimator review.`,
    'AI should inspect equipment labels, access constraints, visible condition, safety concerns, and material needs before asking the customer more questions.',
  ];
  if (names.length) findings.push(`Uploaded files: ${names.slice(0, 8).join(', ')}`);
  return {
    photosProvided: true,
    findings,
    equipmentType: trade.label,
    make: 'Review photo label if visible',
    model: 'Review photo label if visible',
    condition: 'Photo review pending',
    accessIssues: 'Review uploaded photos for access issues',
    installationComplexity: 'Photo review pending',
    safetyConcerns: 'Review photos for electrical, gas, water, roof, ladder, asbestos/lead, or structural concerns',
    materialRequirements: 'Use photo details to reduce customer questions and refine materials',
    reducedQuestions: ['Photos provided; do not ask for make/model/condition if visible in uploaded images.'],
  };
};

const scoreInfo = (request = {}, trade, photoIntel) => {
  const text = slug(`${request.description} ${preferenceText(request)}`);
  const checks = [
    Boolean(request.name || request.email || request.phone),
    Boolean(request.service || request.workScope || request.workCategory),
    Boolean(request.description && request.description.length >= 30),
    Boolean(request.streetAddress || request.city),
    Boolean(request.timeframe || request.preferredTimeframe),
    photoIntel.photosProvided,
    trade.helpfulInformation.some((item) => text.includes(slug(item).split(' ')[0])),
    Boolean(request.budgetRange || /cheapest|budget|premium|efficient|\$/.test(text)),
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const overall = Math.max(25, Math.min(95, completeness));
  return {
    overall,
    completeness,
    labor: Math.max(20, Math.min(95, overall + (request.workScope ? 8 : -8))),
    material: Math.max(20, Math.min(95, overall + (photoIntel.photosProvided ? 12 : -10))),
    scope: Math.max(20, Math.min(95, overall + (request.description?.length > 80 ? 10 : -12))),
  };
};

export const analyzeEstimateIntake = (input = {}) => {
  const request = { ...input };
  const trade = detectTrade(request);
  const photoIntelligence = detectPhotoIntelligence(request, trade);
  const confidenceScores = scoreInfo(request, trade, photoIntelligence);
  const text = slug(`${request.description} ${preferenceText(request)}`);
  const missingInformation = [];
  if (!request.description || request.description.length < 30) missingInformation.push('A short description of the requested work would improve scope confidence.');
  if (!request.streetAddress && !request.city) missingInformation.push('Property location helps estimate travel, access, permitting, and material availability.');
  if (!photoIntelligence.photosProvided) missingInformation.push('Photos of the work area or equipment would improve material and scope confidence.');
  trade.helpfulInformation.forEach((item) => {
    const token = slug(item).split(' ')[0];
    if (token && !text.includes(token) && missingInformation.length < 10) missingInformation.push(`${item} is helpful but optional.`);
  });
  const optionalQuestions = trade.questions
    .filter((question) => !photoIntelligence.reducedQuestions.length || !/make|model|condition/i.test(question.label))
    .slice(0, 10);
  const lowConfidence = confidenceScores.overall < 55;
  return {
    trade: { key: trade.key, label: trade.label },
    informationCompletenessScore: confidenceScores.completeness,
    confidenceScores,
    quoteCreationBlocked: false,
    adminOverrideAlwaysAvailable: true,
    manualEstimateModeAvailable: true,
    missingInformation,
    helpfulInformation: trade.helpfulInformation,
    recommendedClarifications: optionalQuestions.map((question) => question.prompt),
    optionalQuestions,
    customerPreferences: extractPreferences(request),
    photoIntelligence,
    aiRecommendations: [
      'Save the request immediately and keep it visible to admin.',
      'Use optional questions only to improve estimate accuracy; never require customer completion.',
      lowConfidence ? 'Low confidence: show a warning, then allow Request Information, Generate AI Draft, Create Manual Draft, or Continue Anyway.' : 'Information is sufficient for an admin-reviewed draft.',
      'Admin can always create, edit, override, save, and send quotes regardless of confidence.',
    ],
    status: lowConfidence ? 'additional_information_recommended' : 'ready_for_admin_review',
    optionalCollectionMessage: 'Additional information may improve estimate accuracy. Answer any questions you know. Skip anything you are unsure about.',
    optionalCollectionButtons: ['Continue', 'Skip For Now', 'Submit Additional Information'],
  };
};
