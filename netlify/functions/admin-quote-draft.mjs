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

const slug = (value = '') => String(value).trim().toLowerCase();
const toMoney = (cents = 0) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

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
      select id, service_type, description, city
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
    const candidates = chooseCatalogMatches(descriptionText);

    const materials = candidates.map((candidate) => {
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
      };
    });

    const materialSubtotal = materials.reduce((sum, part) => sum + part.estimatedBuyCostCents, 0);
    const laborHours = Math.max(2, Math.min(24, Math.ceil((descriptionText.length || 40) / 55)));
    const laborRateCents = 9500;
    const laborSubtotal = laborHours * laborRateCents;
    const overheadCents = Math.round((materialSubtotal + laborSubtotal) * 0.15);
    const totalCents = materialSubtotal + laborSubtotal + overheadCents;

    const summaryLines = [
      `AI-assisted quote draft for ${jobRequest.service_type || 'requested service'} (${jobRequest.city || 'service area'}).`,
      '',
      'Estimated materials:',
      ...(materials.length
        ? materials.map((m) => `- ${m.name}: need ${m.neededQty}, in stock ${m.inStockQty}, buy ${m.buyQty} (${toMoney(m.estimatedBuyCostCents)})`)
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
