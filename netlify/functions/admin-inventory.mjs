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

const normalizeAdjustmentType = (value) => {
  const normalized = clean(value, 40).toLowerCase();
  if (!normalized) return 'manual';
  if (['manual', 'manual_adjustment'].includes(normalized)) return 'manual';
  if (['received', 'restock'].includes(normalized)) return 'received';
  if (['used', 'usage'].includes(normalized)) return 'used';
  if (normalized === 'correction') return 'correction';
  return 'manual';
};

const normalizeInventoryPayload = (body = {}) => ({
  action: clean(body.action, 40) || 'adjust',
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
  adjustmentType: normalizeAdjustmentType(body.adjustmentType),
  quantityDelta: normalizeNumber(body.quantityDelta, 0),
  adjustmentNote: clean(body.adjustmentNote || body.note, 500),
  jobRequestId: clean(body.jobRequestId, 80),
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


const mapInventoryUsage = (usage) => ({
  id: usage.id,
  itemId: usage.inventory_item_id,
  jobRequestId: usage.job_request_id,
  adjustmentType: usage.adjustment_type,
  quantityDelta: Number(usage.quantity_delta || 0),
  note: usage.note,
  createdAt: usage.created_at,
  item: {
    name: usage.item_name,
    sku: usage.item_sku,
    category: usage.item_category,
    unit: usage.item_unit,
  },
  createdBy: usage.created_by ? {
    id: usage.created_by,
    fullName: usage.created_by_full_name,
    email: usage.created_by_email,
  } : null,
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

  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load inventory permissions; using role defaults',
  });

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
  };
};

const listInventory = async (db, { jobRequestId = '' } = {}) => {
  const items = await db.sql`
    select id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
    from inventory_items
    where is_active = true
    order by category nulls last, name
    limit 200
  `;
  const mappedItems = items.map(mapInventoryItem);
  const usage = jobRequestId ? await db.sql`
    select
      inventory_adjustments.id,
      inventory_adjustments.inventory_item_id,
      inventory_adjustments.job_request_id,
      inventory_adjustments.adjustment_type,
      inventory_adjustments.quantity_delta,
      inventory_adjustments.note,
      inventory_adjustments.created_by,
      inventory_adjustments.created_at,
      inventory_items.name as item_name,
      inventory_items.sku as item_sku,
      inventory_items.category as item_category,
      inventory_items.unit as item_unit,
      app_users.full_name as created_by_full_name,
      app_users.email as created_by_email
    from inventory_adjustments
    join inventory_items on inventory_items.id = inventory_adjustments.inventory_item_id
    left join app_users on app_users.id = inventory_adjustments.created_by
    where inventory_adjustments.job_request_id = ${jobRequestId}
    order by inventory_adjustments.created_at desc
    limit 50
  ` : [];

  return {
    items: mappedItems,
    usage: usage.map(mapInventoryUsage),
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


const updateInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) {
    return json(400, { ok: false, message: 'Inventory item ID is required.' });
  }

  if (!payload.name) {
    return json(400, { ok: false, message: 'Inventory item name is required.' });
  }

  const [item] = await db.sql`
    update inventory_items
    set name = ${payload.name},
        sku = ${payload.sku || null},
        category = ${payload.category || null},
        unit = ${payload.unit},
        reorder_point = ${payload.reorderPoint},
        supplier = ${payload.supplier || null},
        storage_location = ${payload.storageLocation || null},
        notes = ${payload.notes || null},
        updated_at = now()
    where id = ${payload.itemId}
      and is_active = true
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  if (!item) {
    return json(404, { ok: false, message: 'Inventory item not found.' });
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.updated'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, reorderPoint: item.reorder_point })}::jsonb)
  `;

  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const archiveInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) {
    return json(400, { ok: false, message: 'Inventory item ID is required.' });
  }

  const [item] = await db.sql`
    update inventory_items
    set is_active = false,
        updated_at = now()
    where id = ${payload.itemId}
      and is_active = true
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  if (!item) {
    return json(404, { ok: false, message: 'Inventory item not found.' });
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.archived'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name })}::jsonb)
  `;

  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const deleteInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) {
    return json(400, { ok: false, message: 'Inventory item ID is required.' });
  }

  const [hasUsage] = await db.sql`
    select id
    from inventory_adjustments
    where inventory_item_id = ${payload.itemId}
    limit 1
  `;
  if (hasUsage) {
    return json(409, { ok: false, message: 'This item has usage history. Archive it instead of deleting.' });
  }

  const [item] = await db.sql`
    delete from inventory_items
    where id = ${payload.itemId}
      and is_active = true
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  if (!item) {
    return json(404, { ok: false, message: 'Inventory item not found.' });
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.deleted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name })}::jsonb)
  `;

  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const loadWorkOrderForInventoryUsage = async (db, jobRequestId) => {
  if (!jobRequestId) return null;

  const [jobRequest] = await db.sql`
    select id, service_type, status
    from job_requests
    where id = ${jobRequestId}
    limit 1
  `;

  return jobRequest || null;
};

const adjustInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) {
    return json(400, { ok: false, message: 'Inventory item ID is required.' });
  }

  if (!payload.quantityDelta) {
    return json(400, { ok: false, message: 'Quantity adjustment cannot be zero.' });
  }

  const linkedWorkOrder = payload.jobRequestId ? await loadWorkOrderForInventoryUsage(db, payload.jobRequestId) : null;

  if (payload.jobRequestId && !linkedWorkOrder) {
    return json(404, { ok: false, message: 'Linked work order not found.' });
  }

  if (payload.jobRequestId && payload.quantityDelta > 0) {
    return json(400, { ok: false, message: 'Work order usage must subtract inventory stock.' });
  }

  const [currentItem] = await db.sql`
    select id, name, quantity_on_hand
    from inventory_items
    where id = ${payload.itemId}
      and is_active = true
    limit 1
  `;
  if (!currentItem) {
    return json(404, { ok: false, message: 'Inventory item not found.' });
  }

  const nextQuantity = Number(currentItem.quantity_on_hand || 0) + Number(payload.quantityDelta || 0);
  if (nextQuantity < 0) {
    return json(422, { ok: false, message: `Not enough stock. ${currentItem.name} has ${Number(currentItem.quantity_on_hand || 0)} on hand.` });
  }

  const [item] = await db.sql`
    update inventory_items
    set quantity_on_hand = ${nextQuantity},
        updated_at = now()
    where id = ${payload.itemId}
      and is_active = true
    returning id, name, sku, category, unit, quantity_on_hand, reorder_point, supplier, storage_location, notes, is_active, created_at, updated_at
  `;

  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });

  const [adjustment] = await db.sql`
    insert into inventory_adjustments (inventory_item_id, adjustment_type, quantity_delta, note, job_request_id, created_by)
    values (${payload.itemId}, ${payload.adjustmentType}, ${payload.quantityDelta}, ${payload.adjustmentNote || null}, ${payload.jobRequestId || null}, ${session.user_id})
    returning id, inventory_item_id, adjustment_type, quantity_delta, note, job_request_id, created_at
  `;

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${payload.jobRequestId ? 'inventory.used' : 'inventory.adjusted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, quantityDelta: payload.quantityDelta, adjustmentType: payload.adjustmentType, jobRequestId: payload.jobRequestId || null, workOrderService: linkedWorkOrder?.service_type || null, workOrderStatus: linkedWorkOrder?.status || null })}::jsonb)
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
      jobRequestId: adjustment.job_request_id,
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
      const jobRequestId = clean(new URL(request.url).searchParams.get('jobRequestId'), 80);
      return json(200, { ok: true, authenticated: true, authorized: true, user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys }, ...(await listInventory(db, { jobRequestId })) });
    }

    const body = await parseJsonBody(request);

    if (!body) {
      return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    }

    const payload = normalizeInventoryPayload(body);

    if (request.method === 'POST') {
      return await createInventoryItem({ db, session, payload });
    }

    if (payload.action === 'update') {
      return await updateInventoryItem({ db, session, payload });
    }

    if (payload.action === 'archive') {
      return await archiveInventoryItem({ db, session, payload });
    }
    if (payload.action === 'delete') {
      return await deleteInventoryItem({ db, session, payload });
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
