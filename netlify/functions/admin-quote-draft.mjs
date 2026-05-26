import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

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
const SERP_TIMEOUT_MS = 3500;
const MAX_WEB_PRICE_LOOKUPS = 8;

const OPENAI_MODEL = clean(process.env.OPENAI_QUOTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', 80);
const OPENAI_TIMEOUT_MS = 4500;

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


const maybeGenerateAiMaterials = async ({ jobRequest, descriptionText, inventory, learningExamples }) => {
  const apiKey = clean(process.env.OPENAI_API_KEY, 200);
  if (!apiKey) return [];
  try {
    const payload = {
      model: OPENAI_MODEL || 'gpt-5-mini',
      input: [
        { role: 'system', content: 'You are a construction estimator assistant. Return strict JSON only.' },
        { role: 'user', content: JSON.stringify({
          task: 'Generate a practical materials list for this job. Prefer premium/pro-grade products. Include package-level equipment where applicable.',
          request: {
            serviceType: clean(jobRequest.service_type, 160),
            description: clean(descriptionText, 2400),
            city: clean(jobRequest.city, 120),
          },
          inventory: (inventory || []).slice(0, 80).map((i) => ({ name: clean(i.name, 120), unit: clean(i.unit, 40), quantityOnHand: Number(i.quantity_on_hand || 0) })),
          learningExamples,
          outputSchema: {
            materials: [{ name: 'string', neededQty: 'integer >=1', preferredBrands: 'array of strings' }],
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
            serviceType: clean(jobRequest.service_type, 160),
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
        insert into supplier_prices (item_key, supplier_name, unit_cost_cents, source_url, fetched_at)
        values (
          ${itemKey},
          ${clean(price.source, 160) || 'web'},
          ${Number(price.cents || 0)},
          ${clean(price.link || '', 600) || null},
          now()
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
    const livePrices = await fetchSerpApiPrices({ partLabel: `${label} part`, location });
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
    const livePrices = await fetchSerpApiPrices({ partLabel: seed, location });
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
    if (!roles.includes('admin')) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required.' });

    let [jobRequest] = asRows(await db.sql`
      select id, service_type, description, city, created_at
      from job_requests
      where id = ${jobRequestId}
      limit 1
    `);
    if (!jobRequest && requestContext?.description) {
      jobRequest = {
        id: jobRequestId,
        service_type: clean(requestContext.serviceType, 160) || 'Service request',
        description: clean(requestContext.description, 4000) || '',
        city: clean(requestContext.city, 120) || 'Phoenix',
        created_at: requestContext.createdAt || new Date().toISOString(),
      };
    }
    if (!jobRequest) return json(404, { ok: false, message: 'Job request not found.' });

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

    const descriptionText = `${jobRequest.service_type || ''} ${jobRequest.description || ''}`;
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
    const dbCatalogCandidates = await chooseDbCatalogMatches(db, descriptionText);
    const materialsFromCatalog = dbCatalogCandidates.map((candidate) => {
      const inventoryMatch = inventory.find((item) => slug(item.name).includes(candidate.key));
      const neededQty = Number(candidate.quantity || 1);
      const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
      const toBuy = Math.max(0, neededQty - inStock);
      const buyCostCents = toBuy * candidate.unitCostCents;
      return {
        name: candidate.label,
        estimatedUnitCostCents: candidate.unitCostCents,
        neededQty,
        inStockQty: inStock,
        buyQty: toBuy,
        estimatedBuyCostCents: buyCostCents,
        source: 'catalog',
      };
    });
    const location = `${jobRequest.city || 'Phoenix'}, Arizona`;
    const learningExamples = await fetchLearningExamples(db, jobRequest, 8);
    const aiPrimaryMaterials = await maybeGenerateAiMaterials({ jobRequest, descriptionText, inventory, learningExamples });
    const aiGeneralMaterials = !aiPrimaryMaterials.length
      ? await buildGeneralMaterialsFromProjectDetails({ projectDetails: jobRequest.description || descriptionText, inventory, location })
      : [];
    const internetFallbackMaterials = (!materialsFromPlaybook.length && !aiPrimaryMaterials.length && !aiGeneralMaterials.length && !materialsFromCatalog.length)
      ? await buildInternetFallbackMaterials({ descriptionText, inventory, location })
      : [];
    const baseMaterials = aiPrimaryMaterials.length
      ? aiPrimaryMaterials
      : (materialsFromCatalog.length ? materialsFromCatalog : (materialsFromPlaybook.length ? materialsFromPlaybook : (aiGeneralMaterials.length ? aiGeneralMaterials : internetFallbackMaterials)));
    const materials = [];
    for (const part of baseMaterials) {
      const livePrices = part.livePriceEvidence || await fetchSerpApiPrices({ partLabel: part.name, location });
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
        pricingSource: medianLivePriceCents ? 'live_web' : 'local_catalog',
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
        adminSourcingNotes: sourcingLines.join('\n'),
        adminSourcingLinks: sourcingLinks,
        meta: {
          webLookupsUsed: webLookupCount,
          cachedLookups: webLookupCache.size,
          evidencePartsCaptured: pricedMaterials.filter((part) => Array.isArray(part.livePriceEvidence) && part.livePriceEvidence.length).length,
          learningExamplesUsed: learningExamples.length,
          aiLearningApplied: Boolean(aiAdjustments),
          aiLearningRationale: clean(aiAdjustments?.rationale || '', 240),
        },
      },
    });
  } catch (error) {
    console.error('Failed to generate AI quote draft', error);
    const fallbackTitle = clean(requestContext?.serviceType, 160) || 'Service request quote draft';
    const fallbackDescription = clean(requestContext?.description, 4000) || 'Review project details and confirm exact scope.';
    const fallbackSummary = [
      `AI draft fallback for ${fallbackTitle}.`,
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
      ok: true,
      degraded: true,
      message: 'AI draft generated in fallback mode. Please review before sending.',
      draft: {
        title: fallbackTitle,
        summary: fallbackSummary,
        amountCents: 0,
        laborHours: 2,
        laborRateCents: phoenixLaborRateByTime(new Date()),
        materials: [],
      },
    });
  }
};

export const config = {
  path: '/api/admin/quote-draft',
};
