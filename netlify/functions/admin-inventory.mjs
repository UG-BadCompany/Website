import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeInventoryPayload = (body = {}) => ({
  itemId: clean(body.itemId || body.id, 80),
  name: clean(body.name, 180),
  sku: clean(body.sku, 80),
  category: clean(body.category, 120),
  unit: clean(body.unit, 40) || 'each',
  quantityOnHand: normalizeNumber(body.quantityOnHand ?? body.quantity, 0),
  reorderPoint: normalizeNumber(body.reorderPoint, 0),
  supplier: clean(body.supplier, 180),
  storageLocation: clean(body.storageLocation || body.location, 180),
  notes: clean(body.notes, 1000),
  adjustmentType: clean(body.adjustmentType, 40) || 'manual',
  quantityDelta: normalizeNumber(body.quantityDelta, 0),
  adjustmentNote: clean(body.adjustmentNote || body.note, 500),
});

const mapInventoryItem = (item) => ({
  id: item.id,
  name: item.name,
  sku: item.sku,
  category: item.category,
  unit: item.unit,
  quantityOnHand: Number(item.quantity_on_hand || 0),
  reorderPoint: Number(item.reorder_point || 0),
  supplier: item.supplier,
  storageLocation: item.storage_location,
  notes: item.notes,
  isActive: item.is_active !== false,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  stockStatus: Number(item.quantity_on_hand || 0) <= Number(item.reorder_point || 0) ? 'low' : 'ok',
});

const loadSession = async (db, sessionToken) => {
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

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  return session;
};

const loadPermissions = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);

  const rolePermissions = await db.sql`
    select distinct role_permissions.permission_key
    from user_roles
    join roles on roles.id = user_roles.role_id
    join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
    where user_roles.user_id = ${userId}
    order by role_permissions.permission_key
  `;

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, rolePermissions.map((permission) => permission.permission_key)),
  };
};

const listInventory = async (db) => {
  const items = await db.sql`
    select id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
    from inventory_items
    where is_active = true
    order by category nulls last, name
    limit 200
  `;
  const mappedItems = items.map(mapInventoryItem);

  return {
    items: mappedItems,
    summary: {
      total: mappedItems.length,
      lowStock: mappedItems.filter((item) => item.stockStatus === 'low').length,
      categories: new Set(mappedItems.map((item) => item.category).filter(Boolean)).size,
    },
  };
};

const createInventoryItem = async ({ db, session, payload }) => {
  if (!payload.name) {
    return json(400, { ok: false, message: 'Inventory item name is required.' });
  }

  const [item] = await db.sql`
    insert into inventory_items (name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, created_by)
    values (${payload.name}, ${payload.sku || null}, ${payload.category || null}, ${payload.unit}, ${payload.quantityOnHand}, ${payload.reorderPoint}, ${payload.supplier || null}, ${payload.storageLocation || null}, ${payload.notes || null}, ${session.user_id})
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.created'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, quantityOnHand: item.quantity_on_hand })}::jsonb)
  `;

  return json(201, { ok: true, item: mapInventoryItem(item) });
};

const adjustInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) {
    return json(400, { ok: false, message: 'Inventory item ID is required.' });
  }

  if (!payload.quantityDelta) {
    return json(400, { ok: false, message: 'Quantity adjustment cannot be zero.' });
  }

  const [item] = await db.sql`
    update inventory_items
    set quantity_on_hand = quantity_on_hand + ${payload.quantityDelta},
        updated_at = now()
    where id = ${payload.itemId}
      and is_active = true
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  if (!item) {
    return json(404, { ok: false, message: 'Inventory item not found.' });
  }

  const [adjustment] = await db.sql`
    insert into inventory_adjustments (inventory_item_id, adjustment_type, quantity_delta, note, created_by)
    values (${payload.itemId}, ${payload.adjustmentType}, ${payload.quantityDelta}, ${payload.adjustmentNote || null}, ${session.user_id})
    returning id, inventory_item_id, adjustment_type, quantity_delta, note, created_at
  `;

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.adjusted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, quantityDelta: payload.quantityDelta, adjustmentType: payload.adjustmentType })}::jsonb)
  `;

  return json(200, {
    ok: true,
    item: mapInventoryItem(item),
    adjustment: {
      id: adjustment.id,
      itemId: adjustment.inventory_item_id,
      adjustmentType: adjustment.adjustment_type,
      quantityDelta: Number(adjustment.quantity_delta || 0),
      note: adjustment.note,
      createdAt: adjustment.created_at,
    },
  });
};

export const createAdminInventoryHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to manage inventory.' });
  }

  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);

    if (!session) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const { roleKeys, permissionKeys } = await loadPermissions(db, session.user_id);

    if (!permissionKeys.includes('admin.inventory.manage')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin inventory permission required.' });
    }

    if (request.method === 'GET') {
      return json(200, { ok: true, authenticated: true, authorized: true, user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys }, ...(await listInventory(db)) });
    }

    const body = await parseJsonBody(request);

    if (!body) {
      return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    }

    const payload = normalizeInventoryPayload(body);

    if (request.method === 'POST') {
      return await createInventoryItem({ db, session, payload });
    }

    return await adjustInventoryItem({ db, session, payload });
  } catch (error) {
    console.error('Failed to manage admin inventory', error);
    return json(500, { ok: false, message: 'We could not manage inventory right now.' });
  }
};

export default createAdminInventoryHandler();

export const config = {
  path: '/api/admin/inventory',
};
