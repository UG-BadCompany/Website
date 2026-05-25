import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const COST_CATALOG = [
  { key: 'drywall', label: 'Drywall panel (4x8)', unitCostCents: 1800 },
  { key: 'paint', label: 'Interior paint (gallon)', unitCostCents: 4200 },
  { key: 'primer', label: 'Primer (gallon)', unitCostCents: 3000 },
  { key: 'ceiling fan', label: 'Ceiling fan', unitCostCents: 12900 },
  { key: 'outlet', label: 'Electrical outlet', unitCostCents: 600 },
  { key: 'switch', label: 'Switch', unitCostCents: 500 },
  { key: 'pvc', label: 'PVC fitting/pipe set', unitCostCents: 2400 },
  { key: 'valve', label: 'Shutoff valve', unitCostCents: 1700 },
  { key: 'caulk', label: 'Sealant/caulk tube', unitCostCents: 700 },
  { key: 'lumber', label: 'Framing lumber bundle', unitCostCents: 5500 },
  { key: 'hinge', label: 'Door hinge set', unitCostCents: 1200 },
  { key: 'screw', label: 'Fastener pack', unitCostCents: 900 },
];
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
      { label: 'Conduit and fittings', unitCostCents: 7200, quantity: 1, aliases: ['conduit', 'fitting'] },
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
const ALLOWED_PRICE_SOURCES = [
  'home depot',
  'lowes',
  "lowe's",
  'ace hardware',
  'amazon',
  'tractor supply',
  'harbor freight',
  'grainger',
  'fastenal',
  'floor and decor',
  'ferguson',
];
const isAllowedPriceSource = (source = '', title = '') => {
  const haystack = `${source} ${title}`.toLowerCase();
  return ALLOWED_PRICE_SOURCES.some((vendor) => haystack.includes(vendor));
};
const fetchSerpApiPrices = async ({ partLabel, location = 'Phoenix, Arizona' }) => {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  try {
    const query = encodeURIComponent(`${partLabel} price ${location} Home Depot Lowes Ace Hardware Amazon Phoenix`);
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data.shopping_results) ? data.shopping_results : [];
    return items
      .map((item) => ({
        title: item.title || partLabel,
        source: item.source || item.store || 'web',
        cents: parseUsdToCents(item.price || item.extracted_price),
      }))
      .filter((item) => isAllowedPriceSource(item.source, item.title))
      .filter((item) => Number.isInteger(item.cents) && item.cents > 0)
      .slice(0, 5);
  } catch (error) {
    console.warn('SerpApi lookup failed, falling back to local pricing.', { partLabel, message: error?.message || String(error) });
    return [];
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

const chooseCatalogMatches = (descriptionText) => {
  const text = slug(descriptionText);
  return COST_CATALOG.filter((item) => text.includes(item.key)).slice(0, 6);
};
const choosePlaybook = (descriptionText) => {
  const text = slug(descriptionText);
  return JOB_PLAYBOOKS.find((playbook) => playbook.match.every((token) => text.includes(token))) || null;
};


const detectJobTypeKey = (descriptionText) => {
  const text = slug(descriptionText);
  if (text.includes('sink') && (text.includes('new install') || text.includes('install'))) return 'sink_new_install';
  return null;
};

const loadDbCatalogMaterials = async (db, { jobTypeKey, descriptionText, inventory, location }) => {
  if (!jobTypeKey) return [];
  const rows = asRows(await db.sql`
    select item_key, item_name, default_unit_cost_cents, default_quantity, aliases
    from quote_catalog_items
    where job_type_key = ${jobTypeKey} and is_active = true
    order by id asc
  `);
  const materials = [];
  for (const row of rows) {
    const aliases = String(row.aliases || '').toLowerCase().split(',').map((v) => v.trim()).filter(Boolean);
    const inventoryMatch = inventory.find((item) => aliases.some((alias) => slug(item.name).includes(alias)));
    const [recentPrice] = asRows(await db.sql`
      select unit_cost_cents
      from supplier_prices
      where item_key = ${row.item_key}
      order by fetched_at desc
      limit 1
    `);
    const livePrices = recentPrice ? [{ title: row.item_name, source: 'supplier_cache', cents: Number(recentPrice.unit_cost_cents || 0) }] : await fetchSerpApiPrices({ partLabel: row.item_name, location });
    const effectiveUnit = recentPrice?.unit_cost_cents || (livePrices[0]?.cents) || Number(row.default_unit_cost_cents || 0);
    const neededQty = Math.max(1, Number(row.default_quantity || 1));
    const inStock = Number(inventoryMatch?.quantity_on_hand || 0);
    const buyQty = Math.max(0, neededQty - inStock);
    materials.push({
      name: row.item_name,
      estimatedUnitCostCents: effectiveUnit,
      neededQty,
      inStockQty: inStock,
      buyQty,
      estimatedBuyCostCents: buyQty * effectiveUnit,
      source: 'db_catalog',
      livePriceEvidence: livePrices,
      pricingSource: recentPrice ? 'supplier_cache' : (livePrices.length ? 'live_web' : 'db_default'),
    });
  }
  return materials;
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
      if (playbook?.key === 'mini split installation' && part.label === 'Conduit and fittings' && electricalFeet > 0) {
        neededQty = Math.max(1, Math.ceil(electricalFeet / 40));
      }
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
    const candidates = chooseCatalogMatches(descriptionText);
    const materialsFromCatalog = candidates.map((candidate) => {
      const inventoryMatch = inventory.find((item) => slug(item.name).includes(candidate.key));
      const neededQty = 1;
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
    const jobTypeKey = detectJobTypeKey(descriptionText);
    let materialsFromDbCatalog = [];
    try {
      materialsFromDbCatalog = await loadDbCatalogMaterials(db, { jobTypeKey, descriptionText, inventory, location });
    } catch (catalogError) {
      console.warn('DB catalog lookup unavailable; falling back to playbook/AI.', catalogError?.message || catalogError);
    }
    const aiGeneralMaterials = (!materialsFromPlaybook.length && !materialsFromDbCatalog.length)
      ? await buildGeneralMaterialsFromProjectDetails({ projectDetails: jobRequest.description || descriptionText, inventory, location })
      : [];
    const baseMaterials = materialsFromDbCatalog.length
      ? materialsFromDbCatalog
      : (materialsFromPlaybook.length ? materialsFromPlaybook : (aiGeneralMaterials.length ? aiGeneralMaterials : materialsFromCatalog));
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

    const materialSubtotal = materials.reduce((sum, part) => sum + part.estimatedBuyCostCents, 0);
    let laborHours = playbook?.laborHours || Math.max(2, Math.min(24, Math.ceil((descriptionText.length || 40) / 55)));
    if (playbook?.key === 'mini split installation' && electricalFeet > 0) {
      laborHours += Math.ceil(electricalFeet / 35);
    }
    const laborRateCents = phoenixLaborRateByTime(jobRequest.created_at || new Date());
    const laborSubtotal = laborHours * laborRateCents;
    const overheadCents = Math.round((materialSubtotal + laborSubtotal) * 0.15);
    const totalCents = materialSubtotal + laborSubtotal + overheadCents;

    const summaryLines = [
      `AI-assisted quote draft for ${jobRequest.service_type || 'requested service'} (${jobRequest.city || 'service area'}).`,
      playbook ? `Detected job type: ${playbook.key}.` : 'Detected job type: general service request from project details using AI keyword extraction.',
      '',
      'Estimated materials:',
      ...(materials.length
        ? materials.map((m) => `- ${m.name}: need ${m.neededQty}, in stock ${m.inStockQty}, buy ${m.buyQty} (${toMoney(m.estimatedBuyCostCents)}) [${m.pricingSource}]`)
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
        materials,
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
