import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';
import { runAiFirstQuote } from './ai-intelligence-engine.mjs';

const JOB_PLAYBOOKS = [
  {
    key: 'mini split installation',
    match: ['mini', 'split'],
    laborHours: 11,
    materials: [
      { label: 'Mini-split condenser + air handler kit', unitCostCents: 159900, quantity: 1, aliases: ['mini split', 'air handler', 'condenser'] },
      { label: 'Line set kit', unitCostCents: 18900, quantity: 1, aliases: ['line set', 'refrigerant line'] },
      { label: 'Home-run copper wire (THHN/THWN set)', unitCostCents: 32500, quantity: 1, aliases: ['home run', 'wire run', 'electrical run'] },
      { label: 'Communication/control wire spool', unitCostCents: 12900, quantity: 1, aliases: ['control wire', 'thermostat wire'] },
      { label: 'Disconnect box', unitCostCents: 3900, quantity: 1, aliases: ['disconnect'] },
      { label: '2-pole breaker + panel hardware', unitCostCents: 6800, quantity: 1, aliases: ['breaker', 'panel'] },
      { label: 'Disconnect fuses (pair)', unitCostCents: 2600, quantity: 1, aliases: ['fuse', 'disconnect fuse'] },
      { label: 'EMT conduit sticks', unitCostCents: 5200, quantity: 2, aliases: ['conduit', 'emt'] },
      { label: 'Conduit 90° elbows', unitCostCents: 1800, quantity: 2, aliases: ['90', 'elbow', 'conduit elbow'] },
      { label: 'Conduit couplings/unions', unitCostCents: 1400, quantity: 3, aliases: ['union', 'coupling'] },
      { label: 'Conduit straps/clamps', unitCostCents: 900, quantity: 1, aliases: ['strap', 'clamp'] },
      { label: 'Condensate drain materials', unitCostCents: 2500, quantity: 1, aliases: ['drain', 'condensate'] },
      { label: 'Condenser pad / wall bracket kit', unitCostCents: 6400, quantity: 1, aliases: ['mount', 'pad', 'bracket', 'condenser pad'] },
    ],
  },
  {
    key: 'kitchen faucet replacement',
    match: ['kitchen', 'faucet', 'replace'],
    laborHours: 3,
    materials: [
      { label: 'Kitchen faucet', unitCostCents: 15900, quantity: 1, aliases: ['faucet'] },
      { label: 'Supply line set', unitCostCents: 2600, quantity: 2, aliases: ['supply line', 'line'] },
      { label: 'Shutoff valve', unitCostCents: 1700, quantity: 2, aliases: ['valve', 'shutoff'] },
      { label: 'Plumber putty / sealant', unitCostCents: 900, quantity: 1, aliases: ['caulk', 'sealant', 'putty'] },
      { label: 'P-trap kit (if needed)', unitCostCents: 2200, quantity: 1, aliases: ['p-trap', 'trap'] },
      { label: 'Escutcheon plates / trim', unitCostCents: 1200, quantity: 1, aliases: ['escutcheon', 'trim plate'] },
      { label: 'Thread seal tape', unitCostCents: 300, quantity: 1, aliases: ['teflon', 'thread tape'] },
    ],
  },
  {
    key: 'toilet replacement',
    match: ['toilet', 'replace'],
    laborHours: 4,
    materials: [
      { label: 'Toilet fixture', unitCostCents: 21900, quantity: 1, aliases: ['toilet'] },
      { label: 'Wax ring', unitCostCents: 900, quantity: 1, aliases: ['wax'] },
      { label: 'Closet bolt kit', unitCostCents: 800, quantity: 1, aliases: ['bolt'] },
      { label: 'Supply line set', unitCostCents: 2600, quantity: 1, aliases: ['line'] },
    ],
  },
  {
    key: 'water heater install or replacement',
    match: ['water', 'heater'],
    laborHours: 6,
    materials: [
      { label: 'Water heater unit', unitCostCents: 89900, quantity: 1, aliases: ['water heater'] },
      { label: 'Expansion tank', unitCostCents: 5900, quantity: 1, aliases: ['expansion tank'] },
      { label: 'Shutoff valve', unitCostCents: 1900, quantity: 1, aliases: ['valve'] },
      { label: 'Gas flex connector / electrical whip', unitCostCents: 3200, quantity: 1, aliases: ['connector', 'whip'] },
      { label: 'Water connectors + fittings', unitCostCents: 4800, quantity: 1, aliases: ['connector', 'fitting'] },
      { label: 'Drain pan + drain line materials', unitCostCents: 4200, quantity: 1, aliases: ['pan', 'drain'] },
    ],
  },
  {
    key: 'ceiling fan install or replacement',
    match: ['ceiling', 'fan'],
    laborHours: 3,
    materials: [
      { label: 'Ceiling fan fixture', unitCostCents: 12900, quantity: 1, aliases: ['ceiling fan', 'fan'] },
      { label: 'Fan-rated electrical box', unitCostCents: 1800, quantity: 1, aliases: ['fan box', 'electrical box'] },
      { label: 'Mounting hardware + wire nuts', unitCostCents: 1200, quantity: 1, aliases: ['mount', 'hardware'] },
      { label: 'Home-run wire kit (if new install)', unitCostCents: 14500, quantity: 1, aliases: ['wire', 'home run'] },
    ],
  },
  {
    key: 'exhaust fan install or replacement',
    match: ['exhaust', 'fan'],
    laborHours: 4,
    materials: [
      { label: 'Exhaust fan unit', unitCostCents: 13900, quantity: 1, aliases: ['exhaust fan', 'bath fan'] },
      { label: 'Ducting + vent cap materials', unitCostCents: 5900, quantity: 1, aliases: ['duct', 'vent'] },
      { label: 'Fan-rated box / mounting materials', unitCostCents: 1800, quantity: 1, aliases: ['box', 'mount'] },
      { label: 'Home-run wire kit (if new install)', unitCostCents: 14500, quantity: 1, aliases: ['wire', 'home run'] },
    ],
  },
  {
    key: 'microwave install or replacement',
    match: ['microwave'],
    laborHours: 2,
    materials: [
      { label: 'Microwave unit', unitCostCents: 28900, quantity: 1, aliases: ['microwave'] },
      { label: 'Mounting bracket/hardware kit', unitCostCents: 2900, quantity: 1, aliases: ['mount', 'bracket'] },
      { label: 'Vent transition kit (if needed)', unitCostCents: 3500, quantity: 1, aliases: ['vent', 'transition'] },
    ],
  },
  {
    key: 'water softener install or replacement',
    match: ['water', 'softener'],
    laborHours: 5,
    materials: [
      { label: 'Water softener unit', unitCostCents: 89900, quantity: 1, aliases: ['softener'] },
      { label: 'Bypass valve + connector kit', unitCostCents: 9800, quantity: 1, aliases: ['bypass', 'connector'] },
      { label: 'Drain line tubing/fittings', unitCostCents: 4200, quantity: 1, aliases: ['drain line', 'tubing'] },
      { label: 'Shutoff valves / plumbing fittings', unitCostCents: 4400, quantity: 1, aliases: ['valve', 'fitting'] },
    ],
  },
  {
    key: 'garbage disposal install or replacement',
    match: ['garbage', 'disposal'],
    laborHours: 3,
    materials: [
      { label: 'Garbage disposal unit', unitCostCents: 16900, quantity: 1, aliases: ['disposal'] },
      { label: 'Disposal flange / plumber putty', unitCostCents: 2200, quantity: 1, aliases: ['flange', 'putty'] },
      { label: 'Discharge tube / trap fittings', unitCostCents: 2600, quantity: 1, aliases: ['tube', 'trap'] },
      { label: 'Electrical whip/cord kit', unitCostCents: 1900, quantity: 1, aliases: ['cord', 'whip'] },
    ],
  },
  {
    key: 'hvac troubleshooting and repair',
    match: ['hvac', 'troubleshoot'],
    laborHours: 3,
    materials: [
      { label: 'Capacitor/contactors/common repair parts allowance', unitCostCents: 14900, quantity: 1, aliases: ['capacitor', 'contactor'] },
      { label: 'Fuse/relay/electrical consumables', unitCostCents: 3900, quantity: 1, aliases: ['fuse', 'relay'] },
      { label: 'Refrigerant top-off allowance', unitCostCents: 12900, quantity: 1, aliases: ['refrigerant'] },
    ],
  },
  {
    key: 'water heater troubleshooting and repair',
    match: ['water', 'heater', 'troubleshoot'],
    laborHours: 3,
    materials: [
      { label: 'Thermocouple/element/thermostat repair kit', unitCostCents: 9900, quantity: 1, aliases: ['thermocouple', 'element', 'thermostat'] },
      { label: 'Valve/fitting repair allowance', unitCostCents: 3900, quantity: 1, aliases: ['valve', 'fitting'] },
    ],
  },
  {
    key: 'plumbing troubleshooting and leak repair',
    match: ['plumbing', 'leak'],
    laborHours: 3,
    materials: [
      { label: 'Leak repair fittings/couplings set', unitCostCents: 6400, quantity: 1, aliases: ['coupling', 'fitting'] },
      { label: 'Shutoff valve(s)', unitCostCents: 2400, quantity: 1, aliases: ['valve'] },
      { label: 'Sealant/tape/consumables', unitCostCents: 1200, quantity: 1, aliases: ['sealant', 'tape'] },
    ],
  },
  {
    key: 'outlet or switch install/replacement',
    match: ['outlet'],
    laborHours: 2,
    materials: [
      { label: 'Outlet/switch device', unitCostCents: 800, quantity: 1, aliases: ['outlet', 'switch'] },
      { label: 'Wall plate + wire nuts', unitCostCents: 500, quantity: 1, aliases: ['plate', 'wire nut'] },
      { label: 'Wire pigtail material', unitCostCents: 700, quantity: 1, aliases: ['wire'] },
    ],
  },
];

const slug = (value = '') => String(value).trim().toLowerCase();
const toMoney = (cents = 0) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const asRows = (result) => (Array.isArray(result) ? result : (Array.isArray(result?.rows) ? result.rows : []));
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'need', 'needs', 'want', 'replace', 'repair', 'install', 'fix', 'service', 'project', 'details']);
const extractElectricalFootage = (text = '') => {
  const match = String(text).toLowerCase().match(/(\d{1,4})\s*(?:ft|feet|foot)\b/);
  const feet = match ? Number(match[1]) : 0;
  return Number.isFinite(feet) ? feet : 0;
};
const isExistingFixtureRequest = (text = '') => /\b(existing|replace|replacement|swap|remove old)\b/i.test(String(text || ''));
const isNewInstallRequest = (text = '') => /\b(new|new install|install new|fresh install)\b/i.test(String(text || ''));
const extractProjectDetailKeywords = (projectDetails = '') => {
  const words = slug(projectDetails).replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const filtered = words.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  const counts = new Map();
  filtered.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
};
const phoenixLaborRateByTime = (submittedAt = new Date()) => {
  const date = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  const day = date.getUTCDay(); // server UTC; kept deterministic
  const hour = date.getUTCHours();
  const weekend = day === 0 || day === 6;
  const evening = hour < 6 || hour >= 18;
  let rate = 8500; // lower-end reasonable Phoenix baseline
  if (weekend) rate += 1200;
  if (evening) rate += 800;
  return Math.min(11500, Math.max(8200, rate));
};
const parseUsdToCents = (value = '') => {
  const match = String(value).replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  return Math.round(Number(match[1]) * 100);
};
const normalizeProductLink = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const blocked = ['google.com/imgres', 'gstatic.com', 'encrypted-tbn0.gstatic.com'];
    if (blocked.some((token) => url.href.includes(token))) return '';
    return url.toString();
  } catch {
    return '';
  }
};
const domainFromUrl = (value = '') => {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const ALLOWED_PRICE_SOURCES = [
  'grainger',
  'ferguson',
  'supplyhouse',
  'homedepot',
  'home depot',
  'lowes',
  "lowe's",
  'platt',
  'graybar',
  'fastenal',
];
const PREMIUM_BRAND_HINTS = [
  'mitsubishi',
  'daikin',
  'fujitsu',
  'lg',
  'tosot',
  'carrier',
  'trane',
  'mr cool',
];
const SERP_TIMEOUT_MS = Number(process.env.QUOTE_DRAFT_SERP_TIMEOUT_MS || 1500);
const MAX_WEB_PRICE_LOOKUPS = Number(process.env.QUOTE_DRAFT_MAX_WEB_LOOKUPS || 3);
const QUOTE_DRAFT_SOFT_TIMEOUT_MS = Number(process.env.QUOTE_DRAFT_SOFT_TIMEOUT_MS || 8500);

const OPENAI_MODEL = clean(process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', 80);
const OPENAI_TIMEOUT_MS = Number(process.env.QUOTE_DRAFT_OPENAI_TIMEOUT_MS || 3500);
const OPENAI_STRICT_ONLY = true;
const withTimeout = (promise, ms, fallback) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);


const deriveMissingInfoQuestions = ({ jobRequest, descriptionText, materials = [] }) => {
  const text = slug(descriptionText);
  const questions = [];
  if (!clean(jobRequest.work_scope, 80)) questions.push('What is the work scope (Troubleshooting/Repair, Replace Existing, or New Install)?');
  if (!clean(jobRequest.work_category, 80) && !clean(jobRequest.service_type, 80)) questions.push('What type of work is this (HVAC, Electrical, Plumbing, etc.)?');
  if (!/(volt|amp|btu|ton|gallon|inch|size|model)/.test(text)) questions.push('Do you have equipment specs (size/model/BTU/voltage) for exact part matching?');
  if (!/(indoor|outdoor|attic|garage|panel|roof|bathroom|kitchen)/.test(text)) questions.push('Where is the work area located on site (indoor/outdoor/room/location)?');
  if (!/(replace|new|existing|repair|troubleshoot|install)/.test(text)) questions.push('Is this a new install, replacement, or repair/troubleshooting?');
  if (materials.length < 2) questions.push('Can you share photos or a model number so AI can build a fuller parts list?');
  return questions.slice(0, 5);
};

const buildScopeSummary = (jobRequest = {}) => {
  const scope = clean(jobRequest.work_scope, 120) || 'Not provided';
  const type = clean(jobRequest.work_category || jobRequest.service_type, 160) || 'Not provided';
  const details = clean(jobRequest.description, 2400) || 'Not provided';
  return { scope, type, details };
};

const fetchLearningExamples = async (db, jobRequest, limit = 8) => {
  try {
    const rows = asRows(await db.sql`
      select q.title, q.summary, q.amount_cents, jr.service_type, jr.city
      from quotes q
      left join job_requests jr on jr.id = q.job_request_id
      where q.amount_cents is not null
        and q.status in ('accepted', 'sent', 'viewed')
        and (${clean(jobRequest.service_type, 160)} = '' or jr.service_type ilike ${`%${clean(jobRequest.service_type, 160)}%`})
      order by coalesce(q.accepted_at, q.sent_at, q.created_at) desc
      limit ${Math.max(3, Math.min(20, Number(limit) || 8))}
    `);
    return rows.map((r) => ({
      title: clean(r.title, 180),
      serviceType: clean(r.service_type, 160),
      city: clean(r.city, 120),
      amountCents: Number(r.amount_cents || 0),
      summary: clean(r.summary, 600),
    }));
  } catch {
    return [];
  }
};



const buildAiCoverageRequirements = (jobRequest = {}, descriptionText = '') => {
  const text = slug(`${jobRequest.work_scope || ''} ${jobRequest.work_category || ''} ${jobRequest.service_type || ''} ${descriptionText || ''}`);
  const isMiniSplit = /mini[-\s]?split|ductless/.test(text);
  const isRepair = /repair|troubleshoot|maintenance|service/.test(text);
  const isReplace = /replace|replacement/.test(text);
  const isInstall = /new install|install|new/.test(text);
  const checklist = [
    'Include core equipment/components first, then rough-in, then consumables/finishing items.',
    'Include safety/protection items, connectors/fittings, supports/hardware, and commissioning/startup necessities.',
    'Avoid duplicate line items; prefer package/system-level equipment when appropriate.',
  ];
  if (isMiniSplit) {
    checklist.push('For mini-split jobs include full system package + electrical path (disconnect, breaker, whip/conduit/fittings, control wire, mounting hardware) + refrigerant/condensate path.');
  }
  if (isRepair) checklist.push('For maintenance/repair include likely diagnosis replacements, consumables, and common failure parts.');
  if (isReplace) checklist.push('For replacement include removal/disposal accessories and transition/adaptation fittings as needed.');
  if (isInstall) checklist.push('For new install include permitting/inspection-adjacent materials and complete install accessories.');
  return checklist;
};

const maybeGenerateAiMaterials = async ({ jobRequest, descriptionText, inventory, learningExamples }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey) return [];
  try {
    const payload = {
      model: OPENAI_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: 'You are a construction estimator assistant. Return strict JSON only.' },
        { role: 'user', content: JSON.stringify({
          task: 'Generate a complete professional contractor bill of materials for this job. Include all required equipment, electrical, mechanical, controls, fittings, mounting, safety, startup/commissioning, and likely incidentals.',
          request: {
            workScope: clean(jobRequest.work_scope, 120),
            typeOfWork: clean(jobRequest.work_category || jobRequest.service_type, 160),
            serviceType: clean(jobRequest.service_type, 160),
            projectDetails: clean(jobRequest.description, 2400),
            description: clean(descriptionText, 2400),
            city: clean(jobRequest.city, 120),
          },
          inventory: (inventory || []).slice(0, 80).map((i) => ({ name: clean(i.name, 120), unit: clean(i.unit, 40), quantityOnHand: Number(i.quantity_on_hand || 0) })),
          learningExamples,
          coverageRequirements: buildAiCoverageRequirements(jobRequest, descriptionText),
          outputSchema: {
            materials: [{ name: 'string', neededQty: 'integer >=1', category: 'equipment|electrical|mechanical|plumbing|controls|hardware|consumable|safety', preferredBrands: 'array of strings', reason: 'short string' }],
          },
        }) },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 900,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return [];
    const data = await response.json();
    const raw = clean(data?.output_text || '', 28000);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const mats = Array.isArray(parsed?.materials) ? parsed.materials : [];
    return mats.map((m) => {
      const name = clean(m?.name, 140);
      const neededQty = Math.max(1, Math.min(50, Math.trunc(Number(m?.neededQty || 1))));
      const inventoryMatch = (inventory || []).find((item) => slug(item.name).includes(slug(name)) || slug(name).includes(slug(item.name)));
      const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
      const buyQty = Math.max(0, neededQty - inStock);
      return {
        name,
        estimatedUnitCostCents: 0,
        neededQty,
        inStockQty: inStock,
        buyQty,
        estimatedBuyCostCents: 0,
        source: 'openai_materials',
      };
    }).filter((m) => m.name);
  } catch {
    return [];
  }
};


const buildMiniSplitComprehensiveBundle = ({ jobRequest, inventory, descriptionText }) => {
  const feet = Math.max(25, extractElectricalFootage(descriptionText) || 30);
  const lineSetQty = Math.max(1, Math.ceil(feet / 25));
  const conduitSticks = Math.max(3, Math.ceil(feet / 10));
  const fittingsPacks = Math.max(2, Math.ceil(feet / 25));
  const base = [
    { name: 'Mini-split complete system package (outdoor condenser + indoor air handler)', neededQty: 1 },
    { name: 'Insulated copper line set kit (25ft)', neededQty: lineSetQty },
    { name: 'Line-hide / lineset cover kit', neededQty: lineSetQty },
    { name: 'Communication/control wire spool', neededQty: 1 },
    { name: 'Electrical disconnect box (fusible/non-fusible as required)', neededQty: 1 },
    { name: '2-pole breaker matched to equipment MCA/MOCP', neededQty: 1 },
    { name: 'Outdoor-rated electrical whip', neededQty: 1 },
    { name: 'EMT/PVC conduit sticks (10ft)', neededQty: conduitSticks },
    { name: 'Conduit fittings assortment (connectors/couplings/90 elbows/straps)', neededQty: fittingsPacks },
    { name: 'Condenser mounting pad or wall bracket kit', neededQty: 1 },
    { name: 'Condensate drain kit (tubing, fittings, trap)', neededQty: 1 },
    { name: 'Condensate pump (if gravity drain is not viable)', neededQty: 1 },
    { name: 'Line-set insulation sealing tape and UV protection wrap', neededQty: 1 },
    { name: 'Refrigerant flare nuts, seals, and commissioning consumables', neededQty: 1 },
    { name: 'Equipment surge protector (HVAC)', neededQty: 1 },
  ];
  return base.map((m) => {
    const inv = (inventory || []).find((item) => slug(item.name).includes(slug(m.name)) || slug(m.name).includes(slug(item.name)));
    const inStock = Number(inv?.quantity_on_hand || 0);
    const buyQty = Math.max(0, Number(m.neededQty || 1) - inStock);
    return { name: m.name, estimatedUnitCostCents: 0, neededQty: Number(m.neededQty || 1), inStockQty: inStock, buyQty, estimatedBuyCostCents: 0, source: 'openai_mini_split_bundle' };
  });
};

const maybeGenerateAiFallbackMaterials = async ({ jobRequest, descriptionText, inventory }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey) return [];
  try {
    const payload = {
      model: OPENAI_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: JSON.stringify({
          task: 'Return a complete contractor-grade materials list for this job with no omissions.',
          request: {
            workScope: clean(jobRequest.work_scope, 120),
            typeOfWork: clean(jobRequest.work_category || jobRequest.service_type, 160),
            projectDetails: clean(jobRequest.description, 2000),
            city: clean(jobRequest.city, 120),
          },
          coverageRequirements: buildAiCoverageRequirements(jobRequest, descriptionText),
          outputSchema: { materials: [{ name: 'string', neededQty: 'integer >=1', category: 'string' }] },
        }) },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 500,
    };
    let parsed = null;
    for (const maxTokens of [500, 900, 1300]) {
      payload.max_output_tokens = maxTokens;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS + 1200);
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) continue;
      const data = await response.json();
      const raw = clean(data?.output_text || '', 24000);
      if (!raw) continue;
      try {
        parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.materials) && parsed.materials.length) break;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) return [];
    const mats = Array.isArray(parsed?.materials) ? parsed.materials : [];
    return mats.slice(0, 12).map((m) => {
      const name = clean(m?.name, 140);
      const neededQty = Math.max(1, Math.min(50, Math.trunc(Number(m?.neededQty || 1))));
      const inventoryMatch = (inventory || []).find((item) => slug(item.name).includes(slug(name)) || slug(name).includes(slug(item.name)));
      const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
      const buyQty = Math.max(0, neededQty - inStock);
      return { name, estimatedUnitCostCents: 0, neededQty, inStockQty: inStock, buyQty, estimatedBuyCostCents: 0, source: 'openai_fallback_materials' };
    }).filter((m) => m.name);
  } catch {
    return [];
  }
};

const maybeApplyAiLearningAdjustments = async ({ jobRequest, descriptionText, materials, laborHours, laborRateCents, learningExamples }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey || !Array.isArray(materials) || !materials.length) return null;
  try {
    const payload = {
      model: OPENAI_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: 'You are a construction estimator assistant. Return strict JSON only.' },
        { role: 'user', content: JSON.stringify({
          task: 'Improve quote draft with realistic parts and calibrated labor using historical examples.',
          request: {
            workScope: clean(jobRequest.work_scope, 120),
            typeOfWork: clean(jobRequest.work_category || jobRequest.service_type, 160),
            serviceType: clean(jobRequest.service_type, 160),
            projectDetails: clean(jobRequest.description, 2400),
            description: clean(descriptionText, 2400),
            city: clean(jobRequest.city, 120),
          },
          currentEstimate: {
            laborHours,
            laborRateCents,
            materials: materials.map((m) => ({ name: m.name, neededQty: m.neededQty, estimatedUnitCostCents: m.estimatedUnitCostCents })),
          },
          learningExamples,
          outputSchema: {
            laborHoursDelta: 'integer between -4 and 8',
            materialAdjustments: [{ name: 'string', qtyDelta: 'integer', unitCostMultiplier: 'number 0.9-1.35' }],
            confidence: 'number 0..1',
            rationale: 'short string',
          },
        }) },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 700,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const rawText = clean(data?.output_text || '', 20000);
    const altText = clean((Array.isArray(data?.output) ? data.output.map((o) => o?.content?.map?.((c) => c?.text || '').join(' ') || '').join(' ') : ''), 20000);
    const raw = rawText || altText;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const confidence = Number(parsed.confidence);
    if (Number.isFinite(confidence) && confidence < 0.35) return null;
    return parsed;
  } catch {
    return null;
  }
};
let webLookupCount = 0;
let webLookupCache = new Map();
const isAllowedPriceSource = (source = '', title = '') => {
  const haystack = `${source} ${title}`.toLowerCase();
  return ALLOWED_PRICE_SOURCES.some((vendor) => haystack.includes(vendor));
};
const fetchSerpApiPrices = async ({ partLabel, location = 'Phoenix, Arizona' }) => {
  const cacheKey = `${slug(partLabel)}|${slug(location)}`;
  if (webLookupCache.has(cacheKey)) return webLookupCache.get(cacheKey);
  if (webLookupCount >= MAX_WEB_PRICE_LOOKUPS) return [];
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  try {
    webLookupCount += 1;
    const miniSplitPackageQuery = /mini[-\s]?split|condenser|air handler/i.test(partLabel)
      ? `${partLabel} complete system outdoor condenser + indoor air handler kit price ${location}`
      : `${partLabel} price ${location} Home Depot Lowes Ace Hardware Amazon Phoenix`;
    const query = encodeURIComponent(miniSplitPackageQuery);
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${encodeURIComponent(key)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERP_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data.shopping_results) ? data.shopping_results : [];
    const priced = items
      .map((item) => ({
        title: item.title || partLabel,
        source: item.source || item.store || 'web',
        cents: parseUsdToCents(item.price || item.extracted_price),
        link: normalizeProductLink(item.product_link || item.link || ''),
      }))
      .filter((item) => isAllowedPriceSource(item.source, item.title))
      .filter((item) => {
        if (!/mini[-\s]?split|condenser|air handler/i.test(partLabel)) return true;
        const t = slug(item.title || '');
        const hasPackage = (t.includes('condenser') && t.includes('air handler')) || t.includes('system') || t.includes('kit');
        const hasGoodBrand = PREMIUM_BRAND_HINTS.some((brand) => t.includes(brand));
        const splitOnly = t.includes('air handler') && !t.includes('condenser');
        return hasPackage && hasGoodBrand && !splitOnly;
      })
      .filter((item) => Number.isInteger(item.cents) && item.cents > 0)
      .filter((item) => Boolean(item.link))
      .slice(0, 5);
    webLookupCache.set(cacheKey, priced);
    return priced;
  } catch (error) {
    console.warn('SerpApi lookup failed, falling back to local pricing.', { partLabel, message: error?.message || String(error) });
    webLookupCache.set(cacheKey, []);
    return [];
  }
};

const parseOpenAiJsonText = (data = {}) => {
  const candidates = [
    data.output_text,
    data?.choices?.[0]?.message?.content,
    ...(Array.isArray(data.output) ? data.output.flatMap((item) => Array.isArray(item.content) ? item.content.map((content) => content.text) : []) : []),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    try { return JSON.parse(raw); } catch {}
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
  }
  return null;
};

const normalizeOpenAiPriceResult = (item = {}, partLabel = '') => {
  const cents = Number.isFinite(Number(item.cents)) ? Math.round(Number(item.cents)) : parseUsdToCents(item.price || item.averagePrice || item.recommendedPrice || item.extracted_price);
  const link = normalizeProductLink(item.link || item.url || item.sourceUrl || '');
  if (!Number.isInteger(cents) || cents <= 0 || !link) return null;
  return {
    title: clean(item.title || item.name || partLabel, 180),
    source: clean(item.source || item.sourceName || domainFromUrl(link) || 'OpenAI live search', 120),
    cents,
    link,
    dateChecked: clean(item.dateChecked || new Date().toISOString().slice(0, 10), 40),
    confidence: Math.max(0, Math.min(1, Number(item.confidence || 0.72))),
    lowCents: Number.isFinite(Number(item.lowCents)) ? Math.round(Number(item.lowCents)) : null,
    averageCents: Number.isFinite(Number(item.averageCents)) ? Math.round(Number(item.averageCents)) : cents,
    highCents: Number.isFinite(Number(item.highCents)) ? Math.round(Number(item.highCents)) : null,
    searchProvider: 'openai_live_search',
  };
};

const fetchOpenAiLivePrices = async ({ partLabel, location = 'Phoenix, Arizona' }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey) return [];
  const cacheKey = `openai|${slug(partLabel)}|${slug(location)}`;
  if (webLookupCache.has(cacheKey)) return webLookupCache.get(cacheKey);
  if (webLookupCount >= MAX_WEB_PRICE_LOOKUPS) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERP_TIMEOUT_MS + 2500);
  try {
    webLookupCount += 1;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL || 'gpt-5-mini',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: 'Use live web/product research for current contractor material pricing. Return strict JSON only. Do not use memory alone for prices.' },
          { role: 'user', content: JSON.stringify({ task: 'Find current product/material prices for this quote line item. Prefer supplier/retail product pages and include source URL, source name, date checked, low/average/high price when available, recommended price, and confidence.', partLabel, location, outputSchema: { results: [{ title: 'string', sourceName: 'string', sourceUrl: 'https://...', recommendedPrice: 'number dollars', lowPrice: 'number dollars', averagePrice: 'number dollars', highPrice: 'number dollars', dateChecked: 'YYYY-MM-DD', confidence: 'number 0..1' }] } }) },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 1300,
      }),
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return [];
    const parsed = parseOpenAiJsonText(data);
    const results = Array.isArray(parsed?.results) ? parsed.results : Array.isArray(parsed?.pricingSources) ? parsed.pricingSources : [];
    const prices = results
      .map((item) => normalizeOpenAiPriceResult({
        ...item,
        url: item.sourceUrl || item.url || item.link,
        sourceName: item.sourceName || item.source,
        price: item.recommendedPrice ?? item.averagePrice ?? item.price,
        lowCents: parseUsdToCents(item.lowPrice),
        averageCents: parseUsdToCents(item.averagePrice),
        highCents: parseUsdToCents(item.highPrice),
      }, partLabel))
      .filter(Boolean)
      .filter((item) => isAllowedPriceSource(item.source, item.title) || item.link)
      .slice(0, 5);
    webLookupCache.set(cacheKey, prices);
    return prices;
  } catch (error) {
    console.warn('OpenAI live price lookup failed, falling back to SERP/supplier pricing.', { partLabel, message: error?.message || String(error) });
    webLookupCache.set(cacheKey, []);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const fetchLiveMaterialPrices = async ({ partLabel, location = 'Phoenix, Arizona' }) => {
  const openAiPrices = await fetchOpenAiLivePrices({ partLabel, location });
  if (openAiPrices.length) return openAiPrices;
  const serpPrices = await fetchSerpApiPrices({ partLabel, location });
  return serpPrices.map((item) => ({ ...item, searchProvider: 'serpapi_fallback' }));
};

const normalizeKey = (value = '') => slug(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
const confidenceFromEvidence = (evidence = []) => {
  const count = Array.isArray(evidence) ? evidence.length : 0;
  if (count >= 4) return 0.9;
  if (count === 3) return 0.82;
  if (count === 2) return 0.72;
  if (count === 1) return 0.58;
  return 0.25;
};
const withPartsSurcharge = (part, { requestText = '' } = {}) => {
  const text = slug(requestText);
  const installHeavy = /\b(new|install|installation|replace|replacement|upgrade)\b/.test(text);
  const smallPart = /\b(fitting|union|coupling|elbow|strap|clamp|screw|anchor|nut|bolt|wire nut|connector|tape|sealant|caulk|fastener)\b/i.test(part.name || '');
  const baseCost = Number(part.estimatedBuyCostCents || 0);
  if (!Number.isFinite(baseCost) || baseCost <= 0) return part;
  // Standard contractor-style parts markup to cover incidentals, logistics, and margin.
  const surchargeRate = smallPart ? 0.32 : (installHeavy ? 0.27 : 0.22);
  const surchargeCents = Math.round(baseCost * surchargeRate);
  const sellCostCents = baseCost + surchargeCents;
  return {
    ...part,
    partsBaseCostCents: baseCost,
    partsSurchargeRate: surchargeRate,
    partsSurchargeCents: surchargeCents,
    estimatedBuyCostCents: sellCostCents,
  };
};
const persistLivePriceEvidence = async ({ db, jobRequest, materials, descriptionText }) => {
  for (const part of materials.slice(0, 6)) {
    const evidence = Array.isArray(part.livePriceEvidence) ? part.livePriceEvidence : [];
    if (!evidence.length) continue;
    const itemKey = normalizeKey(part.name || 'unknown_item');
    const confidence = confidenceFromEvidence(evidence);
    const candidateUnitCostCents = Number(part.estimatedUnitCostCents || 0);

    for (const price of evidence.slice(0, 3)) {
      await db.sql`
        insert into supplier_prices (item_key, supplier_name, unit_cost_cents, source_url, fetched_at, low_price_cents, average_price_cents, high_price_cents, pricing_confidence, search_provider, source_payload)
        values (
          ${itemKey},
          ${clean(price.source, 160) || 'web'},
          ${Number(price.cents || 0)},
          ${clean(price.link || '', 600) || null},
          now(),
          ${Number.isFinite(Number(price.lowCents)) ? Number(price.lowCents) : null},
          ${Number.isFinite(Number(price.averageCents)) ? Number(price.averageCents) : Number(price.cents || 0)},
          ${Number.isFinite(Number(price.highCents)) ? Number(price.highCents) : null},
          ${Number.isFinite(Number(price.confidence)) ? Number(price.confidence) : confidence},
          ${clean(price.searchProvider || 'supplier_database', 80)},
          ${JSON.stringify(price)}::jsonb
        )
      `;
    }

    await db.sql`
      insert into quote_research_queue (
        job_request_id,
        city,
        source_text,
        candidate_name,
        candidate_unit_cost_cents,
        evidence,
        status,
        confidence_score,
        normalized_key
      )
      values (
        ${jobRequest.id},
        ${clean(jobRequest.city, 120) || null},
        ${clean(descriptionText, 2000) || 'AI quote draft evidence'},
        ${clean(part.name, 180) || 'Unknown part'},
        ${candidateUnitCostCents || null},
        ${JSON.stringify(evidence)}::jsonb,
        ${'new'},
        ${confidence},
        ${itemKey}
      )
    `;
  }
};
const buildGeneralMaterialsFromProjectDetails = async ({ projectDetails, inventory, location }) => {
  const keywords = extractProjectDetailKeywords(projectDetails);
  const candidates = [];
  for (const keyword of keywords.slice(0, 6)) {
    if (['mini', 'split', 'air', 'conditioner', 'unit'].includes(keyword)) continue;
    const label = keyword.split('-').map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(' ');
    const livePrices = await fetchLiveMaterialPrices({ partLabel: `${label} part`, location });
    if (!livePrices.length) continue;
    const medianLivePriceCents = livePrices.map((item) => item.cents).sort((a, b) => a - b)[Math.floor(livePrices.length / 2)];
    const inventoryMatch = inventory.find((item) => slug(item.name).includes(keyword));
    const neededQty = 1;
    const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
    const buyQty = Math.max(0, neededQty - inStock);
    candidates.push({
      name: label,
      estimatedUnitCostCents: medianLivePriceCents,
      neededQty,
      inStockQty: inStock,
      buyQty,
      estimatedBuyCostCents: buyQty * medianLivePriceCents,
      source: 'project_details_ai',
      livePriceEvidence: livePrices,
      pricingSource: 'live_web',
    });
  }
  return candidates;
};


const generateStructuredAiQuote = async ({ jobRequest, descriptionText, pricedMaterials, laborHours, laborRateCents, totalCents, missingInfoQuestions }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey) return null;
  const materialLow = Math.round(pricedMaterials.reduce((sum, p) => sum + Number(p.estimatedBuyCostCents || 0), 0) * 0.92);
  const materialHigh = Math.round(pricedMaterials.reduce((sum, p) => sum + Number(p.estimatedBuyCostCents || 0), 0) * 1.15);
  const laborLowHours = Math.max(1, Math.round(laborHours * 0.9 * 10) / 10);
  const laborHighHours = Math.max(laborLowHours, Math.round(laborHours * 1.25 * 10) / 10);
  try {
    const payload = {
      model: OPENAI_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: 'You are a senior handyman estimator. Return strict JSON only and follow output schema exactly.' },
        { role: 'user', content: JSON.stringify({
          task: 'Create complete structured estimate JSON including scope, risks, labor phases, materials, permit/license flags, customer quote, internal notes, checklist, and change order triggers.',
          context: {
            work_scope: clean(jobRequest.work_scope, 120),
            type_of_work: clean(jobRequest.work_category || jobRequest.service_type, 160),
            service_type: clean(jobRequest.service_type, 160),
            project_details: clean(jobRequest.description, 2600),
            city: clean(jobRequest.city, 120),
            merged_description: clean(descriptionText, 2600),
          },
          inputs: {
            missing_required_info: missingInfoQuestions,
            material_candidates: pricedMaterials.map((m) => ({ name: m.name, quantity: m.neededQty, est_cost: Number(m.estimatedBuyCostCents || 0) / 100 })),
            labor_seed_hours: laborHours,
            labor_rate: laborRateCents / 100,
          },
          rules: {
            quote_readiness_rule: 'if key info missing then is_quote_ready=false',
            labor_phases_required: ['Travel/setup','Inspection/diagnosis','Protect work area','Shut off utilities','Remove old item','Prep area','Modify opening/surface if needed','Install/repair','Fasten/support','Connect utilities','Seal/caulk','Patch/paint/finish','Test','Cleanup','Haul away','Customer walkthrough'],
          },
          output_schema: {
            job_summary: 'string', category: 'string', subcategory: 'string', work_scope: 'string', confidence: 'number', is_quote_ready: 'boolean',
            missing_required_info: ['string'], questions_to_customer: ['string'], assumptions: ['string'],
            labor_items: [{ name: 'string', description: 'string', low_hours: 'number', high_hours: 'number', skill_level: 'string', notes: 'string' }],
            materials: [{ name: 'string', quantity: 'number', required: 'boolean', customer_supplied: 'boolean', estimated_cost_low: 'number', estimated_cost_high: 'number', notes: 'string' }],
            difficulty_factors: ['string'], risk_flags: ['string'], licensed_trade_flags: ['string'], permit_flags: ['string'], exclusions: ['string'], customer_responsibilities: ['string'],
            estimate: { labor_hours_low: 'number', labor_hours_high: 'number', labor_cost_low: 'number', labor_cost_high: 'number', material_cost_low: 'number', material_cost_high: 'number', trip_charge: 'number', disposal_fee: 'number', permit_allowance: 'number', contingency: 'number', total_low: 'number', total_high: 'number' },
            customer_facing_quote: 'string', internal_technician_notes: 'string', technician_checklist: ['string'], shopping_list: ['string'], change_order_triggers: ['string']
          }
        }) }
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 2600,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS + 2500);
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    const raw = clean(data?.output_text || '', 50000);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.estimate || typeof parsed.estimate !== 'object') {
      parsed.estimate = {
        labor_hours_low: laborLowHours, labor_hours_high: laborHighHours,
        labor_cost_low: Math.round(laborLowHours * laborRateCents) / 100,
        labor_cost_high: Math.round(laborHighHours * laborRateCents) / 100,
        material_cost_low: materialLow / 100, material_cost_high: materialHigh / 100,
        trip_charge: 0, disposal_fee: 0, permit_allowance: 0, contingency: Math.round(totalCents * 0.08) / 100,
        total_low: Math.round(totalCents * 0.9) / 100, total_high: Math.round(totalCents * 1.2) / 100,
      };
    }
    return parsed;
  } catch { return null; }
};

const loadSession = async (db, sessionToken) => {
  const rows = asRows(await db.sql`
    select auth_sessions.id, app_users.id as user_id
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `);
  const [session] = rows;
  return session || null;
};

const loadRoleKeys = async (db, userId) => {
  const roles = asRows(await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `);
  return roles.map((role) => role.key);
};

const chooseDbCatalogMatches = async (db, descriptionText) => {
  const text = slug(descriptionText);
  const rows = asRows(await db.sql`
    select item_name, item_key, default_unit_cost_cents, default_quantity, aliases
    from quote_catalog_items
    where is_active = true
    order by updated_at desc
    limit 250
  `);
  return rows
    .filter((item) => {
      const keys = [item.item_key, item.item_name, ...(String(item.aliases || '').split(',').map((part) => part.trim()).filter(Boolean))]
        .map((part) => slug(part));
      return keys.some((part) => part && text.includes(part));
    })
    .slice(0, 8)
    .map((item) => ({
      label: item.item_name,
      unitCostCents: Number(item.default_unit_cost_cents || 0),
      quantity: Math.max(1, Number(item.default_quantity || 1)),
      key: item.item_key,
    }))
    .filter((item) => item.unitCostCents > 0);
};
const buildInternetFallbackMaterials = async ({ descriptionText, inventory, location }) => {
  const queryBase = clean(descriptionText, 220) || 'general home repair';
  const searchSeeds = [
    `${queryBase} required materials list`,
    `${queryBase} install kit`,
    `${queryBase} parts`,
  ];
  const candidates = [];
  for (const seed of searchSeeds) {
    const livePrices = await fetchLiveMaterialPrices({ partLabel: seed, location });
    livePrices.forEach((item) => {
      const name = clean(item.title, 120) || seed;
      if (!name) return;
      const firstToken = slug(name).split(' ')[0] || '';
      const inventoryMatch = inventory.find((stock) => firstToken && slug(stock.name).includes(firstToken));
      const neededQty = 1;
      const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
      const buyQty = Math.max(0, neededQty - inStock);
      candidates.push({
        name,
        estimatedUnitCostCents: item.cents,
        neededQty,
        inStockQty: inStock,
        buyQty,
        estimatedBuyCostCents: buyQty * item.cents,
        source: 'internet_search',
        livePriceEvidence: [item],
        pricingSource: 'live_web',
      });
    });
    if (candidates.length >= 6) break;
  }
  const unique = [];
  const seen = new Set();
  for (const part of candidates) {
    const key = slug(part.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
    if (unique.length >= 6) break;
  }
  return unique;
};


const cents = (value, assumeCents = false) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return assumeCents || (Number.isInteger(value) && Math.abs(value) >= 10000) ? Math.round(value) : Math.round(value * 100);
  const match = String(value).replace(/[$,]/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const amount = Number(match[0]);
  return Number.isFinite(amount) ? (assumeCents ? Math.round(amount) : Math.round(amount * 100)) : 0;
};
const dollars = (centsValue) => Math.round(Number(centsValue || 0)) / 100;
const lineTotal = (line = {}) => Number(line.total_cents ?? line.totalCents ?? 0) || Math.round((Number(line.quantity ?? line.hours ?? 1) || 1) * (Number(line.unit_cost_cents ?? line.unitCostCents ?? line.rate_cents ?? line.rateCents ?? 0) || 0) * (1 + (Number(line.markup_percent ?? line.markupPct ?? 0) || 0) / 100));
const sumLines = (lines = []) => lines.reduce((sum, line) => sum + lineTotal(line), 0);
const structuredPricingSummary = ({ laborLineItems = [], materialLineItems = [], otherPricing = {} }) => {
  const laborTotalCents = sumLines(laborLineItems);
  const materialTotalCents = sumLines(materialLineItems);
  const otherTotalCents = Number(otherPricing.trip_charge_cents || 0) + Number(otherPricing.permit_cents || 0) + Number(otherPricing.disposal_cents || 0) + Number(otherPricing.rental_cents || 0) + Number(otherPricing.markup_cents || 0);
  const subtotalCents = laborTotalCents + materialTotalCents + otherTotalCents;
  const taxCents = Number(otherPricing.tax_cents || 0);
  const discountCents = Number(otherPricing.discount_cents || 0);
  const grandTotalCents = subtotalCents + taxCents - discountCents;
  return { labor_total: dollars(laborTotalCents), labor_total_cents: laborTotalCents, material_total: dollars(materialTotalCents), material_total_cents: materialTotalCents, other_total: dollars(otherTotalCents), other_total_cents: otherTotalCents, subtotal: dollars(subtotalCents), subtotal_cents: subtotalCents, tax: dollars(taxCents), tax_cents: taxCents, discount: dollars(discountCents), discount_cents: discountCents, grand_total: dollars(grandTotalCents), grand_total_cents: grandTotalCents };
};
const ensureStructuredQuoteLines = ({ quote = {}, laborLineItems = [], materialLineItems = [], otherPricing = {}, targetGrandCents = 0 }) => {
  const warnings = [];
  let labor = laborLineItems.filter((line) => lineTotal(line) > 0);
  let materials = materialLineItems.filter((line) => lineTotal(line) > 0);
  const other = { trip_charge: 0, trip_charge_cents: 0, permit: 0, permit_cents: 0, disposal: 0, disposal_cents: 0, rental: 0, rental_cents: 0, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, markup: 0, markup_cents: 0, ...otherPricing };
  const desiredGrand = Number(targetGrandCents || quote.fixedPriceRecommendationCents || quote.fixed_price_recommendation_cents || quote.totalHighCents || quote.total_high_cents || 0) || 0;
  let summary = structuredPricingSummary({ laborLineItems: labor, materialLineItems: materials, otherPricing: other });
  if (desiredGrand > 0 && !labor.length && !materials.length) {
    const allocatable = Math.max(0, desiredGrand - Number(other.trip_charge_cents || 0) - Number(other.tax_cents || 0) + Number(other.discount_cents || 0));
    const laborCents = Math.round(allocatable * 0.55);
    const materialCents = allocatable - laborCents;
    const backfillRateCents = phoenixLaborRateByTime(new Date());
    const laborHours = Math.max(1, Math.round((laborCents / backfillRateCents) * 100) / 100);
    labor = [{ name: 'Service labor / site prep / installation', description: 'Created from legacy AI pricing. Review before sending.', hours: laborHours, quantity: laborHours, unit: 'hours', rate: dollars(backfillRateCents), rate_cents: backfillRateCents, unitCostCents: backfillRateCents, unit_cost_cents: backfillRateCents, total: dollars(laborCents), totalCents: laborCents, total_cents: laborCents, confidence: 'low', source: 'legacy AI pricing backfill', backfilled: true }];
    materials = [{ name: 'Materials, fasteners, and consumables allowance', description: 'Created from legacy AI pricing. Review quantities and supplier costs before sending.', quantity: 1, unit: 'allowance', unit_cost: dollars(materialCents), unitCostCents: materialCents, unit_cost_cents: materialCents, markup_percent: 0, markupPct: 0, total: dollars(materialCents), totalCents: materialCents, total_cents: materialCents, source: 'legacy AI pricing backfill', source_url: '', last_checked: new Date().toISOString().slice(0, 10), confidence: 'low', backfilled: true }];
    warnings.push('Line items were backfilled from legacy AI total. Review before sending.');
  }
  summary = structuredPricingSummary({ laborLineItems: labor, materialLineItems: materials, otherPricing: other });
  if (desiredGrand > 0 && Math.abs(summary.grand_total_cents - desiredGrand) > 1 && desiredGrand > summary.grand_total_cents) {
    const delta = desiredGrand - summary.grand_total_cents;
    materials.push({ name: 'Pricing allowance adjustment', description: 'Created from legacy AI pricing. Review before sending.', quantity: 1, unit: 'allowance', unit_cost: dollars(delta), unitCostCents: delta, unit_cost_cents: delta, markup_percent: 0, markupPct: 0, total: dollars(delta), totalCents: delta, total_cents: delta, source: 'legacy AI pricing backfill', backfilled: true, source_url: '', last_checked: new Date().toISOString().slice(0, 10), confidence: 'low' });
    warnings.push('AI total did not match editable line totals. A pricing allowance adjustment was created for review.');
  }
  summary = structuredPricingSummary({ laborLineItems: labor, materialLineItems: materials, otherPricing: other });
  return { laborLineItems: labor, materialLineItems: materials, otherPricing: other, pricingSummary: summary, warnings };
};

const choosePlaybook = (descriptionText) => {
  const text = slug(descriptionText);
  return JOB_PLAYBOOKS.find((playbook) => playbook.match.every((token) => text.includes(token))) || null;
};

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in required.' });

  const body = await parseJsonBody(request);
  const jobRequestId = clean(body?.jobRequestId, 80);
  const requestContext = body?.requestContext && typeof body.requestContext === 'object' ? body.requestContext : null;
  if (!jobRequestId) return json(422, { ok: false, message: 'Job request is required.' });

  try {
    webLookupCount = 0;
    webLookupCache = new Map();
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });

    const roles = await loadRoleKeys(db, session.user_id);
    if (!roles.some((role) => ['owner', 'admin', 'manager'].includes(role))) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Owner, admin, or manager role required.' });

    let [jobRequest] = asRows(await db.sql`
      select id, service_type, work_scope, work_category, description, city, created_at
      from job_requests
      where id = ${jobRequestId}
      limit 1
    `);
    if (!jobRequest && requestContext?.description) {
      jobRequest = {
        id: jobRequestId,
        service_type: clean(requestContext.serviceType || requestContext.typeOfWork, 160) || 'Service request',
        work_scope: clean(requestContext.workScope, 120) || '',
        work_category: clean(requestContext.typeOfWork || requestContext.serviceType, 120) || '',
        description: clean(requestContext.description || requestContext.projectDetails, 4000) || '',
        city: clean(requestContext.city, 120) || 'Phoenix',
        created_at: requestContext.createdAt || new Date().toISOString(),
      };
    }
    if (!jobRequest) return json(404, { ok: false, message: 'Job request not found.' });

    if (!process.env.OPENAI_API_KEY) {
      return json(200, {
        ok: false,
        message: 'OPENAI_API_KEY is not configured. AI estimate generation failed. Continue manually?',
        manualOverride: true,
        manualDraft: {
          title: `${jobRequest.service_type || 'Service'} manual draft`,
          customer_summary: clean(requestContext?.customerSummary || requestContext?.name || requestContext?.email || '', 1000),
          property_summary: [clean(requestContext?.streetAddress || requestContext?.address || '', 240), clean(jobRequest.city, 120)].filter(Boolean).join(', ') || 'Property details from original request',
          description: clean(jobRequest.description, 4000),
          service_category: /mini[-\s]?split|ductless/i.test(`${jobRequest.service_type || ''} ${jobRequest.description || ''}`) ? 'HVAC' : (clean(jobRequest.service_type || jobRequest.work_category, 160) || 'General Contracting'),
          trade: /mini[-\s]?split|ductless/i.test(`${jobRequest.service_type || ''} ${jobRequest.description || ''}`) ? 'HVAC' : (clean(jobRequest.work_category || jobRequest.service_type, 160) || 'General Contracting'),
        },
      });
    }

    let inventory = [];
    try {
      inventory = asRows(await db.sql`
        select id, name, unit, quantity_on_hand
        from inventory_items
        where archived_at is null
        order by name asc
      `);
    } catch (inventoryError) {
      console.warn('AI quote draft inventory lookup unavailable; continuing with empty stock context.', inventoryError?.message || inventoryError);
      inventory = [];
    }

    const descriptionText = `${jobRequest.work_scope || ''} ${jobRequest.work_category || ''} ${jobRequest.service_type || ''} ${jobRequest.description || ''}`;

    const startedAt = Date.now();
    const aiFirstQuote = await withTimeout(runAiFirstQuote({
      db,
      jobRequest,
      inventory,
      companyRules: ['Admin approval required before sending.', 'Fallback is allowed when OpenAI or live research is slow, unavailable, or invalid.'],
    }), QUOTE_DRAFT_SOFT_TIMEOUT_MS, { fallbackUsed: true, aiEnhanced: false, fallbackReason: 'AI quote draft soft timeout; fast local estimate returned and live research queued.', warning: 'Live AI/research timed out. Draft uses estimated allowances for admin review.' });
    if (aiFirstQuote && aiFirstQuote.fallbackUsed) {
      console.warn('OpenAI primary quote unavailable; continuing with resilient local quote draft fallback.', aiFirstQuote.fallbackReason || aiFirstQuote.warning || 'fallback used');
    }

    if (aiFirstQuote && aiFirstQuote.aiEnhanced && !aiFirstQuote.fallbackUsed) {
      const aiMaterials = Array.isArray(aiFirstQuote.materialBreakdown) ? aiFirstQuote.materialBreakdown : [];
      const laborRateCents = Math.round(Number(aiFirstQuote.laborRateUsed || process.env.AI_LABOR_RATE || 125) * 100);
      const normalizedLaborLines = (Array.isArray(aiFirstQuote.laborPhases) ? aiFirstQuote.laborPhases : []).map((item, index) => { const hours = Number(item.hours || item.high_hours || item.highHours || item.low_hours || item.lowHours || 1) || 1; const totalCents = Number(item.totalCents || item.total_cents || 0) || Math.round(hours * laborRateCents); return { name: item.name || item.phase || `Labor ${index + 1}`, description: item.description || item.name || item.phase || 'Labor', hours, quantity: hours, unit: 'hours', rate: laborRateCents / 100, rate_cents: laborRateCents, unitCostCents: laborRateCents, unit_cost_cents: laborRateCents, total: totalCents / 100, totalCents, total_cents: totalCents, confidence: item.confidence || 'medium' }; });
      const normalizedMaterialLines = aiMaterials.map((item, index) => { const quantity = Number(item.quantity ?? item.estimatedQuantity ?? 1) || 1; const unitCostCents = Number(item.unitCostCents ?? item.estimatedUnitCostCents ?? item.estimatedBuyCostCents ?? 0) || Math.round((Number(item.estimatedUnitCost || item.price || 35) || 35) * 100); const markupPercent = Number(item.markupPercent ?? item.markup_percent ?? process.env.AI_MATERIAL_MARKUP_PERCENT ?? 25) || 25; const totalCents = Number(item.totalCostCents ?? item.totalCents ?? item.total_cents ?? 0) || Math.round(quantity * unitCostCents * (1 + markupPercent / 100)); return { name: item.name || item.item || `Material ${index + 1}`, description: item.description || item.name || item.item || 'Material', quantity, unit: item.unit || 'each', unit_cost: unitCostCents / 100, unitCostCents, unit_cost_cents: unitCostCents, markup_percent: markupPercent, markupPct: markupPercent, total: totalCents / 100, totalCents, total_cents: totalCents, source: item.source || item.pricingSource || 'openai_primary', source_url: item.sourceUrl || item.source_url || '', last_checked: item.lastChecked || item.last_checked || new Date().toISOString().slice(0,10), confidence: item.confidence || 'medium' }; });
      const lineBackfill = ensureStructuredQuoteLines({ quote: aiFirstQuote, laborLineItems: normalizedLaborLines, materialLineItems: normalizedMaterialLines, otherPricing: { trip_charge: 0, trip_charge_cents: 0, permit: 0, permit_cents: 0, disposal: 0, disposal_cents: 0, rental: 0, rental_cents: 0, tax: 0, tax_cents: 0, discount: 0, discount_cents: 0, markup: 0, markup_cents: 0 }, targetGrandCents: aiFirstQuote.fixedPriceRecommendationCents });
      normalizedLaborLines.splice(0, normalizedLaborLines.length, ...lineBackfill.laborLineItems);
      normalizedMaterialLines.splice(0, normalizedMaterialLines.length, ...lineBackfill.materialLineItems);
      const otherPricing = lineBackfill.otherPricing;
      const pricingSummary = lineBackfill.pricingSummary;
      const laborTotalCents = pricingSummary.labor_total_cents;
      const materialTotalCents = pricingSummary.material_total_cents;
      const customerQuote = {
        summary: clean(aiFirstQuote.jobSummary || aiFirstQuote.customerReadySummary || jobRequest.description || 'Customer quote draft', 800),
        scope_of_work: clean(aiFirstQuote.customerReadySummary || aiFirstQuote.jobSummary || jobRequest.description || 'Complete the requested service scope after admin review.', 4000),
        customer_notes: clean(aiFirstQuote.customerReadySummary || '', 1600),
        assumptions: aiFirstQuote.assumptionsUsedForTightPrice || [],
        exclusions: aiFirstQuote.exclusions || [],
        warranty_notes: aiFirstQuote.warrantyNotes || '',
      };
      const adminReview = {
        internal_admin_notes: (aiFirstQuote.adminReviewChecklist || []).join('\n'),
        accuracy_review: aiFirstQuote.adminReviewChecklist || [],
        risk_flags: aiFirstQuote.riskFlags || aiFirstQuote.safetyNotes || [],
        questions_needed: aiFirstQuote.missingInfoQuestions || [],
        supplier_pricing_review: aiFirstQuote.supplierPricingRecommendations || [],
        troubleshooting_review: aiFirstQuote.safetyNotes || [],
        admin_next_steps: [aiFirstQuote.recommendedAction || 'Review editable line items before sending.', ...lineBackfill.warnings],
      };
      return json(200, {
        ok: true,
        draft: {
          title: `${aiFirstQuote.jobClassification || jobRequest.service_type || 'Service'} quote draft`,
          summary: aiFirstQuote.customerReadySummary,
          amountCents: pricingSummary.grand_total_cents,
          laborHours: aiFirstQuote.laborHoursHigh,
          laborRateCents,
          materials: aiMaterials.map((item) => ({
            name: item.name || item.item || 'Material',
            neededQty: Number(item.quantity ?? item.estimatedQuantity ?? 1) || 1,
            unit: item.unit || 'each',
            estimatedUnitCostCents: Number(item.unitCostCents ?? item.estimatedUnitCostCents ?? 0) || 0,
            estimatedBuyCostCents: Number(item.totalCostCents ?? item.estimatedBuyCostCents ?? 0) || 0,
            inStockQty: Number(item.quantityInStock ?? item.inStockQty ?? 0) || 0,
            buyQty: Number(item.quantityToBuy ?? item.buyQty ?? item.quantity ?? 1) || 0,
            source: 'openai_primary',
            inventoryMatchHint: item.inventoryMatchHint || item.name || '',
          })),
          materialBreakdown: normalizedMaterialLines,
          adminSourcingNotes: [
            'AI PRIMARY ESTIMATE (OPENAI)',
            `Model: ${aiFirstQuote.model}`,
            `Prompt version: ${aiFirstQuote.promptVersion}`,
            `Historical match used: ${aiFirstQuote.historicalMatchUsed ? 'yes' : 'no'}`,
            `Recommended fixed price: $${(Number(aiFirstQuote.fixedPriceRecommendationCents || 0) / 100).toFixed(2)}`,
            `Tight range: $${(Number(aiFirstQuote.totalLowCents || 0) / 100).toFixed(2)} - $${(Number(aiFirstQuote.totalHighCents || 0) / 100).toFixed(2)}`,
            `Confidence: ${(aiFirstQuote.pricingConfidenceLevel || 'unknown').toUpperCase()} - ${aiFirstQuote.pricingConfidenceReason || 'No reason provided.'}`,
            `Site visit needed to tighten price: ${aiFirstQuote.needsSiteVisitToTightenPrice || aiFirstQuote.siteVisitRecommended ? 'yes' : 'no'}`,
            aiFirstQuote.rangeSpreadReason ? `Range spread reason: ${aiFirstQuote.rangeSpreadReason}` : '',
            '',
            'Information that would tighten price:',
            ...(Array.isArray(aiFirstQuote.missingMeasurementsNeeded) && aiFirstQuote.missingMeasurementsNeeded.length ? aiFirstQuote.missingMeasurementsNeeded.map((item) => `- ${item}`) : ['- None listed; verify assumptions before sending.']),
            '',
            'Tight-price assumptions:',
            ...(Array.isArray(aiFirstQuote.assumptionsUsedForTightPrice) && aiFirstQuote.assumptionsUsedForTightPrice.length ? aiFirstQuote.assumptionsUsedForTightPrice.map((item) => `- ${item}`) : ['- AI did not provide assumptions; admin review required.']),
            '',
            'Admin review checklist:',
            ...(Array.isArray(aiFirstQuote.adminReviewChecklist) ? aiFirstQuote.adminReviewChecklist.map((item) => `- ${item}`) : []),
          ].join('\n'),
          adminSourcingLinks: [],
          assumptions: [
            ...(Array.isArray(aiFirstQuote.inventoryMatchHints) ? aiFirstQuote.inventoryMatchHints : []),
            ...(Array.isArray(aiFirstQuote.supplierPricingRecommendations) ? aiFirstQuote.supplierPricingRecommendations : []),
          ],
          missingInfoQuestions: aiFirstQuote.missingInfoQuestions || [],
          intakeContext: buildScopeSummary(jobRequest),
          aiStructuredQuote: aiFirstQuote,
          structuredEstimate: {
            service_category: /mini[-\s]?split|ductless/i.test(`${jobRequest.service_type || ''} ${jobRequest.description || ''}`) ? 'HVAC' : (jobRequest.service_type || aiFirstQuote.tradeCategory || 'General Contracting'),
            trade: aiFirstQuote.tradeCategory || (/mini[-\s]?split|ductless/i.test(`${jobRequest.service_type || ''} ${jobRequest.description || ''}`) ? 'HVAC' : (jobRequest.work_category || jobRequest.service_type || 'General Contracting')),
            customer_summary: clean(requestContext?.customerSummary || requestContext?.name || requestContext?.email || 'Original customer request', 1000),
            property_summary: [clean(requestContext?.streetAddress || requestContext?.address || '', 240), clean(jobRequest.city, 120)].filter(Boolean).join(', ') || 'Original property request',
            job_summary: aiFirstQuote.jobSummary || aiFirstQuote.customerReadySummary || jobRequest.description || '',
            scope_of_work: customerQuote.scope_of_work,
            detailed_scope: aiFirstQuote.detailedScope || [],
            labor_line_items: normalizedLaborLines,
            material_line_items: normalizedMaterialLines,
            equipment_breakdown: aiFirstQuote.equipmentBreakdown || [],
            permit_breakdown: aiFirstQuote.permitBreakdown || [],
            recommended_upsells: aiFirstQuote.recommendedUpsells || [],
            maintenance_opportunities: aiFirstQuote.maintenanceOpportunities || [],
            safety_notes: aiFirstQuote.safetyNotes || aiFirstQuote.riskFlags || [],
            warranty_notes: aiFirstQuote.warrantyNotes || '',
            ai_analysis: aiFirstQuote.aiAnalysis || {},
            pricing_engine: aiFirstQuote.pricingEngine || {},
            confidence_explanation: aiFirstQuote.confidenceExplanation || {},
            photo_analysis: aiFirstQuote.photoAnalysis || {},
            other_pricing: otherPricing,
            pricing_summary: { ...pricingSummary, total_low_cents: aiFirstQuote.totalLowCents, total_high_cents: aiFirstQuote.totalHighCents, fixed_price_recommendation_cents: pricingSummary.grand_total_cents, low_range_cents: aiFirstQuote.pricingEngine?.lowRangeCents, recommended_range_cents: aiFirstQuote.pricingEngine?.recommendedRangeCents, premium_range_cents: aiFirstQuote.pricingEngine?.premiumRangeCents, why: aiFirstQuote.pricingEngine?.why || [] },
            assumptions: aiFirstQuote.assumptionsUsedForTightPrice || [],
            exclusions: aiFirstQuote.exclusions || [],
            warranty_notes: aiFirstQuote.warrantyNotes || '',
            customer_notes: customerQuote.customer_notes,
            internal_admin_notes: adminReview.internal_admin_notes,
            recommended_questions: adminReview.questions_needed,
            confidence_scores: { overall: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScore || 0))), ...(aiFirstQuote.confidenceScores || {}), labor: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScores?.labor ?? aiFirstQuote.confidenceScore ?? 0))), materials: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScores?.materials ?? (aiMaterials.length ? 0.74 : 0.35)))), pricing: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScores?.pricing ?? (aiFirstQuote.pricingConfidenceLevel === 'high' ? 0.85 : aiFirstQuote.pricingConfidenceLevel === 'medium' ? 0.67 : 0.45)))), scope: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScores?.scope ?? (aiFirstQuote.quoteReady ? 0.82 : 0.58)))), information_completeness: Math.max(0, Math.min(1, Number(aiFirstQuote.confidenceScores?.information_completeness ?? ((aiFirstQuote.missingInfoQuestions || []).length ? 0.58 : 0.78)))), research: aiFirstQuote.historicalMatchUsed ? 0.76 : 0.52 },
            confidence_reasons: [aiFirstQuote.pricingConfidenceReason || 'Pricing confidence is based on OpenAI-first AI review, material evidence, and available request details.', ...(aiFirstQuote.missingInfoQuestions || []).slice(0, 2)],
            admin_review: adminReview,
            customer_quote: customerQuote,
            pricing_warnings: lineBackfill.warnings,
            client_quote_detail_mode: 'summary',
            research_metadata: { research_mode: 'openai_first', openai_live_search_used: true, fallback_search_used: false, internal_catalog_used: true, historical_quotes_used: Boolean(aiFirstQuote.historicalMatchUsed), serpapi_used: false, sources: normalizedMaterialLines.map((item) => ({ title: item.name, source: item.source, url: item.source_url })), pricing_confidence_reason: aiFirstQuote.pricingConfidenceReason || 'OpenAI-first pricing with internal catalog/admin review fallback.' },
            recommended_action: aiFirstQuote.pricingConfidenceLevel === 'high' ? 'Ready for admin review.' : aiFirstQuote.pricingConfidenceLevel === 'medium' ? 'Review assumptions before sending.' : 'Request more information or continue manually.',
          },
          pricingConfidenceLevel: aiFirstQuote.pricingConfidenceLevel,
          pricingConfidenceReason: aiFirstQuote.pricingConfidenceReason,
          rangeSpreadReason: aiFirstQuote.rangeSpreadReason,
          fixedPricePreferred: aiFirstQuote.fixedPricePreferred,
          needsSiteVisitToTightenPrice: aiFirstQuote.needsSiteVisitToTightenPrice,
          missingMeasurementsNeeded: aiFirstQuote.missingMeasurementsNeeded || [],
          assumptionsUsedForTightPrice: aiFirstQuote.assumptionsUsedForTightPrice || [],
          totalLowCents: aiFirstQuote.totalLowCents,
          totalHighCents: aiFirstQuote.totalHighCents,
          fixedPriceRecommendationCents: pricingSummary.grand_total_cents,
          aiEnhanced: true,
          fallbackUsed: false,
          meta: {
            model: aiFirstQuote.model,
            promptVersion: aiFirstQuote.promptVersion,
            retryCount: aiFirstQuote.retryCount,
            historicalMatchUsed: aiFirstQuote.historicalMatchUsed,
            confidenceScore: aiFirstQuote.confidenceScore,
            pricingConfidenceLevel: aiFirstQuote.pricingConfidenceLevel,
            pricingConfidenceReason: aiFirstQuote.pricingConfidenceReason,
            rangeSpreadReason: aiFirstQuote.rangeSpreadReason,
            quoteReady: aiFirstQuote.quoteReady,
            siteVisitRecommended: aiFirstQuote.siteVisitRecommended,
          },
        },
      });
    }

    const playbook = choosePlaybook(descriptionText);
    const electricalFeet = extractElectricalFootage(descriptionText);
    const materialsFromPlaybook = (playbook?.materials || []).map((part) => {
      const inventoryMatch = inventory.find((item) => part.aliases.some((alias) => slug(item.name).includes(alias)));
      let neededQty = part.quantity;
      if (playbook?.key === 'mini split installation' && part.label === 'Communication/control wire spool' && electricalFeet > 0) {
        neededQty = Math.max(1, Math.ceil(electricalFeet / 50));
      }
      if (playbook?.key === 'mini split installation' && /EMT conduit sticks/i.test(part.label) && electricalFeet > 0) neededQty = Math.max(2, Math.ceil(electricalFeet / 10));
      if (playbook?.key === 'mini split installation' && /90° elbows/i.test(part.label) && electricalFeet > 0) neededQty = Math.max(2, Math.ceil(electricalFeet / 30));
      if (playbook?.key === 'mini split installation' && /couplings\/unions/i.test(part.label) && electricalFeet > 0) neededQty = Math.max(3, Math.ceil(electricalFeet / 20));
      if (playbook?.key === 'ceiling fan install or replacement' && part.label === 'Home-run wire kit (if new install)') {
        neededQty = isExistingFixtureRequest(descriptionText) && !isNewInstallRequest(descriptionText) ? 0 : 1;
      }
      if (playbook?.key === 'exhaust fan install or replacement' && part.label === 'Home-run wire kit (if new install)') {
        neededQty = isExistingFixtureRequest(descriptionText) && !isNewInstallRequest(descriptionText) ? 0 : 1;
      }
      if (electricalFeet > 0 && /wire|conduit/i.test(part.label)) {
        neededQty = Math.max(neededQty, Math.ceil(electricalFeet / 50));
      }
      const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
      const toBuy = Math.max(0, neededQty - inStock);
      const buyCostCents = toBuy * part.unitCostCents;
      return {
        name: part.label,
        estimatedUnitCostCents: part.unitCostCents,
        neededQty,
        inStockQty: inStock,
        buyQty: toBuy,
        estimatedBuyCostCents: buyCostCents,
        source: 'playbook',
      };
    });
    const location = `${jobRequest.city || 'Phoenix'}, Arizona`;
    const learningExamples = await fetchLearningExamples(db, jobRequest, 8);
    const aiPrimaryMaterials = await maybeGenerateAiMaterials({ jobRequest, descriptionText, inventory, learningExamples });
    const aiRecoveryMaterials = aiPrimaryMaterials.length ? [] : await maybeGenerateAiFallbackMaterials({ jobRequest, descriptionText, inventory });
    const baseMaterials = aiPrimaryMaterials.length ? aiPrimaryMaterials : aiRecoveryMaterials;
    const strictRecoveryUsed = Boolean(!aiPrimaryMaterials.length && aiRecoveryMaterials.length);
    if (!baseMaterials.length) {
      baseMaterials.push({ name: `${jobRequest.service_type || jobRequest.work_category || 'Service'} materials allowance`, estimatedUnitCostCents: 25000, neededQty: 1, inStockQty: 0, buyQty: 1, estimatedBuyCostCents: 25000, source: 'estimated_allowance', pricingSource: 'fallback_allowance' });
    }

    const materials = [];
    for (const part of baseMaterials) {
      const livePrices = part.livePriceEvidence || (Date.now() - startedAt > QUOTE_DRAFT_SOFT_TIMEOUT_MS ? [] : await withTimeout(fetchLiveMaterialPrices({ partLabel: part.name, location }), SERP_TIMEOUT_MS + 500, []));
      const medianLivePriceCents = livePrices.length
        ? livePrices.map((item) => item.cents).sort((a, b) => a - b)[Math.floor(livePrices.length / 2)]
        : null;
      const effectiveUnitCostCents = medianLivePriceCents || part.estimatedUnitCostCents;
      const buyCostCents = part.buyQty * effectiveUnitCostCents;
      materials.push({
        ...part,
        estimatedUnitCostCents: effectiveUnitCostCents,
        estimatedBuyCostCents: buyCostCents,
        livePriceEvidence: livePrices,
        pricingSource: medianLivePriceCents ? (livePrices.some((item) => item.searchProvider === 'openai_live_search') ? 'openai_live_search' : 'serpapi_or_supplier_fallback') : 'local_catalog',
      });
    }
    let pricedMaterials = materials.map((part) => withPartsSurcharge(part, { requestText: descriptionText }));
    let laborHours = playbook?.laborHours || Math.max(2, Math.min(24, Math.ceil((descriptionText.length || 40) / 55)));
    const aiAdjustments = await maybeApplyAiLearningAdjustments({
      jobRequest,
      descriptionText,
      materials: pricedMaterials,
      laborHours,
      laborRateCents: phoenixLaborRateByTime(jobRequest.created_at || new Date()),
      learningExamples,
    });
    if (aiAdjustments && Array.isArray(aiAdjustments.materialAdjustments)) {
      const adjustmentsByName = new Map(aiAdjustments.materialAdjustments
        .map((item) => [slug(item?.name), item])
        .filter(([k]) => Boolean(k)));
      pricedMaterials = pricedMaterials.map((part) => {
        const adj = adjustmentsByName.get(slug(part.name));
        if (!adj) return part;
        const qtyDelta = Number.isFinite(Number(adj.qtyDelta)) ? Number(adj.qtyDelta) : 0;
        const unitMultRaw = Number(adj.unitCostMultiplier || 1);
        const unitMultiplier = Number.isFinite(unitMultRaw) ? Math.min(1.35, Math.max(0.9, unitMultRaw)) : 1;
        const neededQty = Math.max(0, Number(part.neededQty || 0) + Math.trunc(qtyDelta));
        const buyQty = Math.max(0, neededQty - Number(part.inStockQty || 0));
        const unit = Math.max(1, Math.round(Number(part.estimatedUnitCostCents || 0) * unitMultiplier));
        return withPartsSurcharge({ ...part, neededQty, buyQty, estimatedUnitCostCents: unit, estimatedBuyCostCents: buyQty * unit }, { requestText: descriptionText });
      });
    }
    if (aiAdjustments && Number.isFinite(Number(aiAdjustments.laborHoursDelta))) {
      laborHours = Math.max(1, Math.min(36, laborHours + Math.trunc(Number(aiAdjustments.laborHoursDelta))));
    }
    try {
      await persistLivePriceEvidence({ db, jobRequest, materials: pricedMaterials, descriptionText });
    } catch (persistError) {
      console.warn('Quote evidence persistence skipped due to timeout/safety guard.', persistError?.message || persistError);
    }

    const materialSubtotal = pricedMaterials.reduce((sum, part) => sum + part.estimatedBuyCostCents, 0);
    if (playbook?.key === 'mini split installation' && electricalFeet > 0) {
      laborHours += Math.ceil(electricalFeet / 35);
    }
    const laborRateCents = phoenixLaborRateByTime(jobRequest.created_at || new Date());
    const laborSubtotal = laborHours * laborRateCents;
    const overheadCents = Math.round((materialSubtotal + laborSubtotal) * 0.15);
    const totalCents = materialSubtotal + laborSubtotal + overheadCents;

    const sourcingLinks = [];
    const sourcingLines = [
      'AI SOURCING NOTES (INTERNAL)',
      `Generated: ${new Date().toISOString()}`,
      `Service: ${clean(jobRequest.service_type, 160) || 'Service request'}`,
      `City: ${clean(jobRequest.city, 120) || 'N/A'}`,
      '',
      'How to use:',
      '- Verify part compatibility/spec before purchase.',
      '- Prioritize first listed source unless lead time/pricing requires alternatives.',
      '- Save approved items into catalog when recurring.',
      '',
    ];
    pricedMaterials.forEach((m, materialIndex) => {
      const links = [];
      const seenLinks = new Set();
      (m.livePriceEvidence || []).forEach((e) => {
        const url = clean(e.link || '', 500);
        if (!url || seenLinks.has(url) || links.length >= 3) return;
        seenLinks.add(url);
        links.push({
          url,
          source: clean(e.source || '', 80) || domainFromUrl(url) || 'supplier',
          price: Number.isFinite(Number(e.cents)) ? toMoney(Number(e.cents)) : 'n/a',
          domain: domainFromUrl(url),
          title: clean(e.title || '', 120) || m.name,
        });
      });
      const sources = (m.livePriceEvidence || [])
        .map((e) => clean(e.source || '', 80))
        .filter(Boolean)
        .slice(0, 3);
      const unitCost = toMoney(m.estimatedUnitCostCents || 0);
      const totalCost = toMoney(m.estimatedBuyCostCents || 0);
      const surchargePct = Math.round(Number(m.partsSurchargeRate || 0) * 100);
      sourcingLines.push(`${materialIndex + 1}. ${m.name}`);
      sourcingLines.push(`   Qty: ${m.neededQty} | Unit est: ${unitCost} | Line est: ${totalCost} | Surcharge: ${surchargePct}%`);
      if (sources.length) sourcingLines.push(`   Supplier shortlist: ${sources.join(' | ')}`);
      if (links.length) {
        links.forEach((link, idx) => {
          sourcingLinks.push({
            part: m.name,
            label: `${m.name} — Option ${idx + 1} (${link.source}${link.domain ? ` / ${link.domain}` : ''})`,
            url: link.url,
          });
          sourcingLines.push(`   Option ${idx + 1}: ${link.source}${link.domain ? ` (${link.domain})` : ''} | ${link.price}`);
          sourcingLines.push(`   Product: ${link.title}`);
          sourcingLines.push(`   Open from "Quick product links" panel: Option ${idx + 1}`);
        });
      } else {
        sourcingLines.push('   No validated product links found from approved suppliers for this part.');
      }
      sourcingLines.push('');
    });

    const scopeSummary = buildScopeSummary(jobRequest);
    const missingInfoQuestions = deriveMissingInfoQuestions({ jobRequest, descriptionText, materials: pricedMaterials });
    const structuredAiQuote = Date.now() - startedAt > QUOTE_DRAFT_SOFT_TIMEOUT_MS ? {} : await withTimeout(generateStructuredAiQuote({
      jobRequest, descriptionText, pricedMaterials, laborHours, laborRateCents, totalCents, missingInfoQuestions,
    }), 1500, {});
    const assumptions = [
      scopeSummary.scope === 'Not provided' ? 'Work Scope inferred from project details.' : `Work Scope used: ${scopeSummary.scope}.`,
      scopeSummary.type === 'Not provided' ? 'Type of Work inferred from service + keywords.' : `Type of Work used: ${scopeSummary.type}.`,
      'Pricing uses OpenAI live search evidence first when available, then SERPAPI/supplier fallback, and model-adjusted estimate only when live pricing is not verified.',
    ];

    const summaryLines = [
      `AI-assisted quote draft for ${jobRequest.service_type || 'requested service'} (${jobRequest.city || 'service area'}).`,
      playbook ? `Detected job type: ${playbook.key}.` : 'Detected job type: general service request from project details using AI keyword extraction.',
      '',
      'Estimated materials:',
      ...(pricedMaterials.length
        ? pricedMaterials.map((m) => {
          return `- ${m.name}: Qty ${m.neededQty} — ${toMoney(m.estimatedBuyCostCents)}`;
        })
        : ['- No direct material match found. Manual material review required.']),
      '',
      `Labor estimate: ${laborHours} hour(s) × ${toMoney(laborRateCents)}/hr = ${toMoney(laborSubtotal)}`,
      `Overhead/contingency (15%): ${toMoney(overheadCents)}`,
      `Estimated total: ${toMoney(totalCents)}`,
      '',
      'Review before sending: confirm exact part quantities, tax/shipping, and final labor scope.',
    ];

    return json(200, {
      ok: true,
      draft: {
        title: `${jobRequest.service_type || 'Service'} quote draft`,
        summary: summaryLines.join('\n'),
        amountCents: totalCents,
        laborHours,
        laborRateCents,
        materials: pricedMaterials,
    materialBreakdown: pricedMaterials.map((item) => ({ name: item.name, category: item.category || item.trade || item.workCategory || '', estimatedQuantity: Number(item.estimatedQuantity ?? item.quantity ?? item.neededQty ?? 1) || 1, unit: item.unit || 'each', notes: item.notes || '', inventoryMatchHint: item.inventoryMatchHint || item.sku || item.supplierPartNumber || item.aiQuoteCatalogKey || item.name })),
        adminSourcingNotes: sourcingLines.join('\n'),
        adminSourcingLinks: sourcingLinks,
        assumptions,
        missingInfoQuestions,
        intakeContext: scopeSummary,
        aiStructuredQuote: structuredAiQuote,
        meta: {
          webLookupsUsed: webLookupCount,
          cachedLookups: webLookupCache.size,
          evidencePartsCaptured: pricedMaterials.filter((part) => Array.isArray(part.livePriceEvidence) && part.livePriceEvidence.length).length,
          learningExamplesUsed: learningExamples.length,
          aiLearningApplied: Boolean(aiAdjustments),
          aiLearningRationale: clean(aiAdjustments?.rationale || '', 240),
          openAiStrictOnly: OPENAI_STRICT_ONLY,
          researchQueued: pricedMaterials.some((part) => part.pricingSource === 'queued_research_allowance'),
          timedOutFastPath: Date.now() - startedAt > QUOTE_DRAFT_SOFT_TIMEOUT_MS,
          strictRecoveryUsed,
          aiEnhanced: false,
          fallbackUsed: true,
          fallbackReason: aiFirstQuote?.fallbackReason || 'OpenAI primary quote unavailable; emergency estimating pipeline used.',
          fallbackSource: aiFirstQuote?.fallbackSource || 'company_knowledge_then_playbooks',
          warning: aiFirstQuote?.warning || 'OpenAI primary quote unavailable. Admin review required.',
        },
      },
    });
  } catch (error) {
    console.error('Failed to generate AI quote draft', error);
    const fallbackTitle = clean(requestContext?.serviceType, 160) || 'Service request quote draft';
    const fallbackDescription = clean(requestContext?.projectDetails || requestContext?.description, 4000) || 'Review project details and confirm exact scope.';
    const fallbackSummary = [
      `Manual draft shell for ${fallbackTitle}.`,
      '',
      'Project details received:',
      fallbackDescription,
      '',
      'Suggested next steps:',
      '- Confirm materials required from project details.',
      '- Check inventory on hand and adjust buy list.',
      '- Apply Phoenix labor rate and finalize quote total.',
      '',
      `System note: live AI draft generation failed (${error?.message || 'unknown error'}).`,
    ].join('\n');
    return json(200, {
      ok: false,
      degraded: true,
      message: 'AI estimate generation failed. Continue manually?',
      manualOverride: true,
      manualDraft: {
        title: fallbackTitle,
        summary: fallbackSummary,
        amountCents: 0,
        laborHours: 2,
        laborRateCents: phoenixLaborRateByTime(new Date()),
        materials: [],
        assumptions: ['Manual mode used because AI generation failed.'],
        missingInfoQuestions: ['Please provide Work Scope, Type of Work, and detailed project notes/photos.'],
        aiEnhanced: false,
        fallbackUsed: true,
        fallbackReason: error?.message || 'OpenAI primary quote failed and emergency fallback catch path was used.',
        fallbackSource: 'static_emergency_rules',
        warning: 'Manual draft shell returned. Admin must enter and verify labor, materials, risks, exclusions, and price before sending.',
        intakeContext: {
          scope: clean(requestContext?.workScope, 120) || 'Not provided',
          type: clean(requestContext?.typeOfWork || requestContext?.serviceType, 160) || 'Not provided',
          details: fallbackDescription,
        },
      },
    });
  }
};

export const config = {
  path: '/api/admin/quote-draft',
};
