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

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadSession = async (db, request) => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return null;
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;
  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};

const loadWorkerAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load worker inventory permissions; using role defaults',
  });
  return { roleKeys, permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys) };
};

const mapWorkerItem = (item) => ({
  id: item.id,
  name: item.name,
  sku: item.sku,
  category: item.category,
  itemType: item.item_type || 'material',
  unit: item.unit,
  quantityOnHand: Number(item.quantity_on_hand || 0),
  quantityReserved: Number(item.quantity_reserved || 0),
  quantityAvailable: Number(item.quantity_on_hand || 0) - Number(item.quantity_reserved || 0),
  locationType: item.location_type || 'worker_assigned',
  truckAssignment: item.truck_assignment,
  barcodeValue: item.barcode_value,
  qrValue: item.qr_value,
  notes: item.notes,
});

const listWorkerInventory = async (db, session) => {
  const assigned = await db.sql`
    select id, name, sku, category, item_type, unit, quantity_on_hand, quantity_reserved, location_type, truck_assignment, barcode_value, qr_value, notes
    from inventory_items
    where is_active = true
      and (worker_assignment = ${session.user_id} or location_type in ('truck_1', 'truck_2', 'worker_assigned'))
    order by location_type, category nulls last, name
    limit 200
  `;
  const reservations = await db.sql`
    select inventory_reservations.id, inventory_reservations.inventory_item_id, inventory_reservations.job_request_id,
           inventory_reservations.reserved_quantity, inventory_reservations.used_quantity, inventory_reservations.status,
           inventory_items.name as item_name, inventory_items.sku as item_sku, inventory_items.unit as item_unit
    from inventory_reservations
    join inventory_items on inventory_items.id = inventory_reservations.inventory_item_id
    left join worker_assignments on worker_assignments.job_request_id = inventory_reservations.job_request_id
    where inventory_reservations.status in ('reserved', 'partially_used')
      and (worker_assignments.worker_user_id = ${session.user_id} or inventory_items.worker_assignment = ${session.user_id})
    order by inventory_reservations.created_at desc
    limit 100
  `;
  return {
    items: assigned.map(mapWorkerItem),
    reservations: reservations.map((row) => ({
      id: row.id,
      itemId: row.inventory_item_id,
      itemName: row.item_name,
      itemSku: row.item_sku,
      unit: row.item_unit,
      jobRequestId: row.job_request_id,
      reservedQuantity: Number(row.reserved_quantity || 0),
      usedQuantity: Number(row.used_quantity || 0),
      status: row.status,
    })),
  };
};

const normalizePayload = (body = {}) => ({
  action: clean(body.action, 40),
  itemId: clean(body.itemId, 80),
  jobRequestId: clean(body.jobRequestId, 80),
  quantity: normalizeNumber(body.quantity ?? body.quantityDelta, 0),
  note: clean(body.note || body.notes, 500),
});

const recordWorkerMovement = async ({ db, session, payload, movementType, quantity, fromLocation, toLocation }) => {
  await db.sql`
    insert into inventory_movements (inventory_item_id, movement_type, quantity, from_location, to_location, job_request_id, worker_user_id, notes, actor_user_id)
    values (${payload.itemId}, ${movementType}, ${Math.abs(quantity)}, ${fromLocation || null}, ${toLocation || null}, ${payload.jobRequestId || null}, ${session.user_id}, ${payload.note || null}, ${session.user_id})
  `;
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${`worker.inventory.${movementType}`}, ${'inventory_item'}, ${payload.itemId}, ${JSON.stringify({ quantity: Math.abs(quantity), jobRequestId: payload.jobRequestId || null, note: payload.note || '' })}::jsonb)
  `;
};

const useInventory = async ({ db, session, payload }) => {
  if (!payload.itemId || !payload.quantity) return json(400, { ok: false, message: 'Item and quantity are required to mark material used.' });
  const [item] = await db.sql`
    update inventory_items
    set quantity_on_hand = quantity_on_hand - ${Math.abs(payload.quantity)},
        quantity_reserved = greatest(quantity_reserved - ${Math.abs(payload.quantity)}, 0),
        updated_at = now()
    where id = ${payload.itemId}
      and is_active = true
      and quantity_on_hand >= ${Math.abs(payload.quantity)}
      and (worker_assignment = ${session.user_id} or location_type in ('truck_1', 'truck_2', 'worker_assigned', 'job_site'))
    returning id, name, sku, quantity_on_hand, quantity_reserved
  `;
  if (!item) return json(422, { ok: false, message: 'Item not available or not enough worker/truck stock.' });
  await recordWorkerMovement({ db, session, payload, movementType: 'consumed_on_job', quantity: payload.quantity, fromLocation: 'worker_or_truck', toLocation: 'job_site' });
  return json(200, { ok: true, item });
};

const returnInventory = async ({ db, session, payload }) => {
  if (!payload.itemId || !payload.quantity) return json(400, { ok: false, message: 'Item and quantity are required to return material.' });
  const [item] = await db.sql`
    update inventory_items
    set quantity_on_hand = quantity_on_hand + ${Math.abs(payload.quantity)}, location_type = 'main_warehouse', worker_assignment = null, updated_at = now()
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, quantity_on_hand, quantity_reserved
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  await recordWorkerMovement({ db, session, payload, movementType: 'returned_from_worker', quantity: payload.quantity, fromLocation: 'worker_assigned', toLocation: 'main_warehouse' });
  return json(200, { ok: true, item });
};

const requestInventory = async ({ db, session, payload }) => {
  if (!payload.itemId && !payload.note) return json(400, { ok: false, message: 'Choose an item or describe what stock is needed.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'worker.inventory.requested'}, ${'inventory_request'}, ${payload.itemId || session.user_id}, ${JSON.stringify({ itemId: payload.itemId || null, quantity: payload.quantity || 0, note: payload.note })}::jsonb)
  `;
  return json(202, { ok: true, requested: true, message: 'Stock request sent to admin operations.' });
};

const reportDamaged = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Item is required to report damage or loss.' });
  await recordWorkerMovement({ db, session, payload, movementType: 'damaged_lost', quantity: payload.quantity || 1, fromLocation: 'worker_or_truck', toLocation: 'returned_damaged' });
  return json(202, { ok: true, reported: true, message: 'Damage/loss report recorded.' });
};

export const createWorkerInventoryHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await getDatabase();
    const session = await loadSession(db, request);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Sign in with a worker account to view inventory.' });
    const { roleKeys, permissionKeys } = await loadWorkerAccess(db, session.user_id);
    const canUseWorkerInventory = permissionKeys.includes('worker.jobs.manage') || permissionKeys.includes('admin.inventory.manage');
    if (!canUseWorkerInventory) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Worker inventory access required.' });
    if (request.method === 'GET') return json(200, { ok: true, authenticated: true, authorized: true, user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys }, ...(await listWorkerInventory(db, session)) });

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const payload = normalizePayload(body);
    const path = new URL(request.url).pathname;
    if (path.endsWith('/use') || payload.action === 'use') return await useInventory({ db, session, payload });
    if (path.endsWith('/return') || payload.action === 'return') return await returnInventory({ db, session, payload });
    if (path.endsWith('/damage') || payload.action === 'damage') return await reportDamaged({ db, session, payload });
    return await requestInventory({ db, session, payload });
  } catch (error) {
    console.error('Failed to manage worker inventory', error);
    return json(500, { ok: false, message: 'Worker inventory is not available right now.' });
  }
};

export default createWorkerInventoryHandler();

export const config = { path: '/api/worker/inventory' };
