import {
  clean,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
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
];

const slug = (value = '') => String(value).trim().toLowerCase();
const toMoney = (cents = 0) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'need', 'needs', 'want', 'replace', 'repair', 'install', 'fix', 'service', 'project', 'details']);
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
const fetchSerpApiPrices = async ({ partLabel, location = 'Phoenix, Arizona' }) => {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  try {
    const query = encodeURIComponent(`${partLabel} price ${location}`);
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
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  return session || null;
};

const loadRoleKeys = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
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

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });

  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in required.' });

  const body = await request.json().catch(() => null);
  const jobRequestId = clean(body?.jobRequestId, 80);
  if (!jobRequestId) return json(422, { ok: false, message: 'Job request is required.' });

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });

    const roles = await loadRoleKeys(db, session.user_id);
    if (!roles.includes('admin')) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin role required.' });

    const [jobRequest] = await db.sql`
      select id, service_type, description, city, created_at
      from job_requests
      where id = ${jobRequestId}
      limit 1
    `;
    if (!jobRequest) return json(404, { ok: false, message: 'Job request not found.' });

    const inventory = await db.sql`
      select id, name, unit, quantity_on_hand
      from inventory_items
      where archived_at is null
      order by name asc
    `;

    const descriptionText = `${jobRequest.service_type || ''} ${jobRequest.description || ''}`;
    const playbook = choosePlaybook(descriptionText);
    const materialsFromPlaybook = (playbook?.materials || []).map((part) => {
      const inventoryMatch = inventory.find((item) => part.aliases.some((alias) => slug(item.name).includes(alias)));
      const neededQty = part.quantity;
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
    const aiGeneralMaterials = !materialsFromPlaybook.length
      ? await buildGeneralMaterialsFromProjectDetails({ projectDetails: jobRequest.description || descriptionText, inventory, location })
      : [];
    const baseMaterials = materialsFromPlaybook.length ? materialsFromPlaybook : (aiGeneralMaterials.length ? aiGeneralMaterials : materialsFromCatalog);
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
    const laborHours = playbook?.laborHours || Math.max(2, Math.min(24, Math.ceil((descriptionText.length || 40) / 55)));
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
    return json(500, { ok: false, message: 'We could not generate an AI quote draft right now.' });
  }
};

export const config = {
  path: '/api/admin/quote-draft',
};
