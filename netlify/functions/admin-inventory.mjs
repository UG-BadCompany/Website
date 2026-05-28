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

export const INVENTORY_CATEGORIES = [
  'HVAC', 'Electrical', 'Plumbing', 'Drywall', 'Painting', 'Carpentry', 'Doors/Hardware',
  'Fixtures', 'Fasteners', 'Adhesives/Sealants', 'Safety/PPE', 'Tools', 'Equipment',
  'Vehicle Stock', 'General Consumables',
];

export const INVENTORY_LOCATIONS = [
  { key: 'main_warehouse', name: 'Main warehouse / shop', type: 'warehouse' },
  { key: 'truck_1', name: 'Truck 1', type: 'truck' },
  { key: 'truck_2', name: 'Truck 2', type: 'truck' },
  { key: 'worker_assigned', name: 'Worker assigned', type: 'worker' },
  { key: 'job_site', name: 'Job site', type: 'job' },
  { key: 'supplier_ordered', name: 'Supplier ordered', type: 'supplier' },
  { key: 'returned_damaged', name: 'Returned / damaged', type: 'holding' },
  { key: 'archived', name: 'Archived', type: 'archive' },
];

export const INVENTORY_MOVEMENT_TYPES = [
  'stock_added', 'stock_removed', 'reserved_for_job', 'assigned_to_worker', 'assigned_to_truck',
  'consumed_on_job', 'returned_from_job', 'returned_from_worker', 'adjusted_after_count',
  'damaged_lost', 'purchase_received',
];

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAdjustmentType = (value) => {
  const normalized = clean(value, 40).toLowerCase();
  if (!normalized) return 'manual';
  if (['manual', 'manual_adjustment'].includes(normalized)) return 'manual';
  if (['received', 'restock', 'purchase_received'].includes(normalized)) return 'received';
  if (['used', 'usage', 'consumed_on_job'].includes(normalized)) return 'used';
  if (['correction', 'adjusted_after_count'].includes(normalized)) return 'correction';
  return 'manual';
};

const normalizeMovementType = (value) => {
  const normalized = clean(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return INVENTORY_MOVEMENT_TYPES.includes(normalized) ? normalized : 'stock_added';
};

const normalizeInventoryPayload = (body = {}) => ({
  action: clean(body.action, 60) || 'adjust',
  itemId: clean(body.itemId || body.id, 80),
  name: clean(body.name, 180),
  sku: clean(body.sku, 80),
  category: clean(body.category, 120),
  tradeType: clean(body.tradeType || body.trade, 120),
  itemType: clean(body.itemType || body.type, 60) || 'material',
  unit: clean(body.unit, 40) || 'each',
  quantityOnHand: normalizeNumber(body.quantityOnHand ?? body.quantity, 0),
  quantityReserved: normalizeNumber(body.quantityReserved, 0),
  reorderPoint: normalizeNumber(body.reorderPoint, 0),
  reorderQuantity: normalizeNumber(body.reorderQuantity, 0),
  unitCost: normalizeNumber(body.unitCost, 0),
  markupPercent: normalizeNumber(body.markupPercent, 0),
  chargePrice: normalizeNumber(body.chargePrice, 0),
  supplier: clean(body.supplier, 180),
  supplierPartNumber: clean(body.supplierPartNumber, 120),
  storageLocation: clean(body.storageLocation || body.location, 180),
  locationType: clean(body.locationType, 80) || 'main_warehouse',
  truckAssignment: clean(body.truckAssignment || body.vehicleAssignment, 120),
  workerAssignment: clean(body.workerAssignment || body.workerUserId, 80),
  barcodeValue: clean(body.barcodeValue, 160),
  qrValue: clean(body.qrValue, 220),
  aiQuoteCatalogKey: clean(body.aiQuoteCatalogKey, 160),
  notes: clean(body.notes, 1000),
  adjustmentType: normalizeAdjustmentType(body.adjustmentType),
  movementType: normalizeMovementType(body.movementType || body.type),
  quantityDelta: normalizeNumber(body.quantityDelta, 0),
  quantity: normalizeNumber(body.quantity, 0),
  adjustmentNote: clean(body.adjustmentNote || body.note || body.notes, 500),
  fromLocation: clean(body.fromLocation, 120),
  toLocation: clean(body.toLocation, 120),
  jobRequestId: clean(body.jobRequestId, 80),
  workerUserId: clean(body.workerUserId || body.workerAssignment, 80),
  reservationId: clean(body.reservationId, 80),
  countReason: clean(body.countReason || body.adjustmentReason, 500),
  countedQuantity: normalizeNumber(body.countedQuantity, 0),
  supplierName: clean(body.supplierName || body.supplier, 180),
  orderStatus: clean(body.orderStatus || body.status, 60),
});

const quantityAvailable = (item) => Number(item.quantity_on_hand || 0) - Number(item.quantity_reserved || 0);

const mapInventoryItem = (item) => {
  const quantityOnHand = Number(item.quantity_on_hand || 0);
  const quantityReserved = Number(item.quantity_reserved || 0);
  const available = quantityOnHand - quantityReserved;
  const unitCost = Number(item.unit_cost || 0);
  const chargePrice = Number(item.charge_price || (unitCost ? unitCost * (1 + Number(item.markup_percent || 0) / 100) : 0));
  const reorderPoint = Number(item.reorder_point || 0);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    tradeType: item.trade_type,
    itemType: item.item_type || 'material',
    unit: item.unit,
    quantityOnHand,
    quantityReserved,
    quantityAvailable: available,
    reorderPoint,
    reorderQuantity: Number(item.reorder_quantity || 0),
    unitCost,
    markupPercent: Number(item.markup_percent || 0),
    chargePrice,
    inventoryValue: quantityOnHand * unitCost,
    supplier: item.supplier,
    supplierPartNumber: item.supplier_part_number,
    storageLocation: item.storage_location,
    locationType: item.location_type || 'main_warehouse',
    truckAssignment: item.truck_assignment,
    workerAssignment: item.worker_assignment,
    barcodeValue: item.barcode_value,
    qrValue: item.qr_value,
    aiQuoteCatalogKey: item.ai_quote_catalog_key,
    reorderStatus: item.reorder_status || 'ok',
    notes: item.notes,
    isActive: item.is_active !== false,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    stockStatus: available <= 0 ? 'out' : (available <= reorderPoint ? 'low' : 'ok'),
  };
};

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
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
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
  return { roleKeys, permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys) };
};

const inventorySelectSql = `
  id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved,
  reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier,
  supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment,
  barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
`;

const listInventory = async (db, { jobRequestId = '' } = {}) => {
  const items = await db.sql`
    select id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved,
           reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier,
           supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment,
           barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
    from inventory_items
    where is_active = true
    order by category nulls last, name
    limit 500
  `;
  const mappedItems = items.map(mapInventoryItem);
  const usage = jobRequestId ? await db.sql`
    select inventory_adjustments.id, inventory_adjustments.inventory_item_id, inventory_adjustments.job_request_id,
           inventory_adjustments.adjustment_type, inventory_adjustments.quantity_delta, inventory_adjustments.note,
           inventory_adjustments.created_by, inventory_adjustments.created_at, inventory_items.name as item_name,
           inventory_items.sku as item_sku, inventory_items.category as item_category, inventory_items.unit as item_unit,
           app_users.full_name as created_by_full_name, app_users.email as created_by_email
    from inventory_adjustments
    join inventory_items on inventory_items.id = inventory_adjustments.inventory_item_id
    left join app_users on app_users.id = inventory_adjustments.created_by
    where inventory_adjustments.job_request_id = ${jobRequestId}
    order by inventory_adjustments.created_at desc
    limit 50
  ` : [];

  const movementRows = await db.sql`
    select inventory_movements.id, inventory_movements.inventory_item_id, inventory_movements.movement_type,
           inventory_movements.quantity, inventory_movements.from_location, inventory_movements.to_location,
           inventory_movements.job_request_id, inventory_movements.worker_user_id, inventory_movements.notes,
           inventory_movements.created_at, inventory_items.name as item_name, inventory_items.sku as item_sku
    from inventory_movements
    join inventory_items on inventory_items.id = inventory_movements.inventory_item_id
    order by inventory_movements.created_at desc
    limit 30
  `;

  const reservations = await db.sql`
    select inventory_reservations.id, inventory_reservations.inventory_item_id, inventory_reservations.job_request_id,
           inventory_reservations.reserved_quantity, inventory_reservations.used_quantity, inventory_reservations.status,
           inventory_reservations.notes, inventory_reservations.created_at, inventory_items.name as item_name,
           inventory_items.sku as item_sku
    from inventory_reservations
    join inventory_items on inventory_items.id = inventory_reservations.inventory_item_id
    where inventory_reservations.status in ('reserved', 'partially_used')
    order by inventory_reservations.created_at desc
    limit 50
  `;

  const suppliers = await db.sql`
    select id, name, contact_name, phone, email, website, default_markup_percent, lead_time_days, preferred, notes, is_active
    from inventory_suppliers
    where is_active = true
    order by preferred desc, name
    limit 100
  `;

  const totalValue = mappedItems.reduce((sum, item) => sum + item.inventoryValue, 0);
  const lowStockItems = mappedItems.filter((item) => item.stockStatus === 'low');
  const outOfStockItems = mappedItems.filter((item) => item.stockStatus === 'out');
  return {
    items: mappedItems,
    usage: usage.map(mapInventoryUsage),
    movements: movementRows.map((row) => ({
      id: row.id,
      itemId: row.inventory_item_id,
      itemName: row.item_name,
      itemSku: row.item_sku,
      movementType: row.movement_type,
      quantity: Number(row.quantity || 0),
      fromLocation: row.from_location,
      toLocation: row.to_location,
      jobRequestId: row.job_request_id,
      workerUserId: row.worker_user_id,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    reservations: reservations.map((row) => ({
      id: row.id,
      itemId: row.inventory_item_id,
      itemName: row.item_name,
      itemSku: row.item_sku,
      jobRequestId: row.job_request_id,
      reservedQuantity: Number(row.reserved_quantity || 0),
      usedQuantity: Number(row.used_quantity || 0),
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    suppliers: suppliers.map((row) => ({
      id: row.id,
      name: row.name,
      contactName: row.contact_name,
      phone: row.phone,
      email: row.email,
      website: row.website,
      defaultMarkupPercent: Number(row.default_markup_percent || 0),
      leadTimeDays: Number(row.lead_time_days || 0),
      preferred: Boolean(row.preferred),
      notes: row.notes,
    })),
    categories: INVENTORY_CATEGORIES,
    locations: INVENTORY_LOCATIONS,
    movementTypes: INVENTORY_MOVEMENT_TYPES,
    summary: {
      total: mappedItems.length,
      totalValue,
      lowStock: lowStockItems.length,
      outOfStock: outOfStockItems.length,
      categories: new Set(mappedItems.map((item) => item.category).filter(Boolean)).size,
      assignedToJobs: mappedItems.filter((item) => item.quantityReserved > 0 || item.locationType === 'job_site').length,
      assignedToWorkers: mappedItems.filter((item) => item.workerAssignment || item.locationType === 'worker_assigned').length,
      inTrucks: mappedItems.filter((item) => item.locationType === 'truck' || /^truck_/i.test(item.locationType || '') || item.truckAssignment).length,
      inWarehouse: mappedItems.filter((item) => !item.locationType || item.locationType === 'main_warehouse' || item.locationType === 'warehouse').length,
      pendingRestock: lowStockItems.length + outOfStockItems.length,
    },
  };
};

const insertMovement = async ({ db, session, payload, itemId, movementType, quantity, fromLocation = '', toLocation = '', notes = '' }) => {
  await db.sql`
    insert into inventory_movements (inventory_item_id, movement_type, quantity, from_location, to_location, job_request_id, worker_user_id, notes, actor_user_id)
    values (${itemId}, ${movementType}, ${quantity}, ${fromLocation || null}, ${toLocation || null}, ${payload.jobRequestId || null}, ${payload.workerUserId || payload.workerAssignment || null}, ${notes || payload.adjustmentNote || null}, ${session.user_id})
  `;
};

const createInventoryItem = async ({ db, session, payload }) => {
  if (!payload.name) return json(400, { ok: false, message: 'Inventory item name is required.' });
  const [item] = await db.sql`
    insert into inventory_items (name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved,
      reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number,
      storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, notes, created_by)
    values (${payload.name}, ${payload.sku || null}, ${payload.category || null}, ${payload.tradeType || null}, ${payload.itemType}, ${payload.unit}, ${payload.quantityOnHand}, ${payload.quantityReserved},
      ${payload.reorderPoint}, ${payload.reorderQuantity}, ${payload.unitCost}, ${payload.markupPercent}, ${payload.chargePrice}, ${payload.supplier || null}, ${payload.supplierPartNumber || null},
      ${payload.storageLocation || null}, ${payload.locationType}, ${payload.truckAssignment || null}, ${payload.workerAssignment || null}, ${payload.barcodeValue || null}, ${payload.qrValue || null}, ${payload.aiQuoteCatalogKey || null}, ${payload.notes || null}, ${session.user_id})
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.created'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, quantityOnHand: item.quantity_on_hand, sku: item.sku })}::jsonb)
  `;
  if (Number(item.quantity_on_hand || 0) > 0) {
    await insertMovement({ db, session, payload, itemId: item.id, movementType: 'stock_added', quantity: Number(item.quantity_on_hand || 0), toLocation: item.location_type || item.storage_location || 'main_warehouse', notes: 'Initial stock on hand' });
  }
  return json(201, { ok: true, item: mapInventoryItem(item) });
};

const updateInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Inventory item ID is required.' });
  if (!payload.name) return json(400, { ok: false, message: 'Inventory item name is required.' });
  const [item] = await db.sql`
    update inventory_items
    set name = ${payload.name}, sku = ${payload.sku || null}, category = ${payload.category || null}, trade_type = ${payload.tradeType || null},
        item_type = ${payload.itemType}, unit = ${payload.unit}, reorder_point = ${payload.reorderPoint}, reorder_quantity = ${payload.reorderQuantity},
        unit_cost = ${payload.unitCost}, markup_percent = ${payload.markupPercent}, charge_price = ${payload.chargePrice}, supplier = ${payload.supplier || null},
        supplier_part_number = ${payload.supplierPartNumber || null}, storage_location = ${payload.storageLocation || null}, location_type = ${payload.locationType},
        truck_assignment = ${payload.truckAssignment || null}, worker_assignment = ${payload.workerAssignment || null}, barcode_value = ${payload.barcodeValue || null},
        qr_value = ${payload.qrValue || null}, ai_quote_catalog_key = ${payload.aiQuoteCatalogKey || null}, notes = ${payload.notes || null}, updated_at = now()
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.updated'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, reorderPoint: item.reorder_point, locationType: item.location_type })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const archiveInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Inventory item ID is required.' });
  const [item] = await db.sql`
    update inventory_items set is_active = false, location_type = 'archived', updated_at = now()
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.archived'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const deleteInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Inventory item ID is required.' });
  const [hasUsage] = await db.sql`select id from inventory_adjustments where inventory_item_id = ${payload.itemId} limit 1`;
  if (hasUsage) return json(409, { ok: false, message: 'This item has usage history. Archive it instead of deleting.' });
  const [item] = await db.sql`
    delete from inventory_items
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.deleted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const loadWorkOrderForInventoryUsage = async (db, jobRequestId) => {
  if (!jobRequestId) return null;
  const [jobRequest] = await db.sql`select id, service_type, status from job_requests where id = ${jobRequestId} limit 1`;
  return jobRequest || null;
};

const adjustInventoryItem = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Inventory item ID is required.' });
  if (!payload.quantityDelta) return json(400, { ok: false, message: 'Quantity adjustment cannot be zero.' });
  const linkedWorkOrder = payload.jobRequestId ? await loadWorkOrderForInventoryUsage(db, payload.jobRequestId) : null;
  if (payload.jobRequestId && !linkedWorkOrder) return json(404, { ok: false, message: 'Linked work order not found.' });
  if (payload.jobRequestId && payload.quantityDelta > 0) return json(400, { ok: false, message: 'Work order usage must subtract inventory stock.' });

  const [item] = await db.sql`
    update inventory_items
    set quantity_on_hand = quantity_on_hand + ${payload.quantityDelta}, updated_at = now()
    where id = ${payload.itemId} and is_active = true and quantity_on_hand + ${payload.quantityDelta} >= 0
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(422, { ok: false, message: 'Inventory item not found or not enough stock for this adjustment.' });

  const [adjustment] = await db.sql`
    insert into inventory_adjustments (inventory_item_id, adjustment_type, quantity_delta, note, job_request_id, created_by)
    values (${payload.itemId}, ${payload.adjustmentType}, ${payload.quantityDelta}, ${payload.adjustmentNote || null}, ${payload.jobRequestId || null}, ${session.user_id})
    returning id, inventory_item_id, adjustment_type, quantity_delta, note, job_request_id, created_at
  `;
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${payload.jobRequestId ? 'inventory.used' : 'inventory.adjusted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, quantityDelta: payload.quantityDelta, adjustmentType: payload.adjustmentType, jobRequestId: payload.jobRequestId || null, workOrderService: linkedWorkOrder?.service_type || null, workOrderStatus: linkedWorkOrder?.status || null })}::jsonb)
  `;
  await insertMovement({ db, session, payload, itemId: item.id, movementType: payload.jobRequestId ? 'consumed_on_job' : (payload.quantityDelta > 0 ? 'stock_added' : 'stock_removed'), quantity: Math.abs(payload.quantityDelta), fromLocation: item.location_type || item.storage_location || '', toLocation: payload.quantityDelta > 0 ? (item.location_type || item.storage_location || '') : '', notes: payload.adjustmentNote });

  return json(200, {
    ok: true,
    item: mapInventoryItem(item),
    adjustment: {
      id: adjustment?.id || null,
      itemId: adjustment?.inventory_item_id || payload.itemId,
      adjustmentType: adjustment?.adjustment_type || payload.adjustmentType,
      quantityDelta: Number(adjustment?.quantity_delta ?? payload.quantityDelta ?? 0),
      note: adjustment?.note ?? payload.adjustmentNote ?? null,
      jobRequestId: adjustment?.job_request_id ?? payload.jobRequestId ?? null,
      createdAt: adjustment?.created_at || null,
    },
  });
};

const reserveInventoryForJob = async ({ db, session, payload }) => {
  if (!payload.itemId || !payload.jobRequestId || !payload.quantity) return json(400, { ok: false, message: 'Item, job, and quantity are required to reserve materials.' });
  const linkedWorkOrder = await loadWorkOrderForInventoryUsage(db, payload.jobRequestId);
  if (!linkedWorkOrder) return json(404, { ok: false, message: 'Linked work order not found.' });
  const [item] = await db.sql`
    update inventory_items
    set quantity_reserved = quantity_reserved + ${payload.quantity}, updated_at = now()
    where id = ${payload.itemId} and is_active = true and (quantity_on_hand - quantity_reserved) >= ${payload.quantity}
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(422, { ok: false, message: 'Not enough available stock to reserve for this job.' });
  const [reservation] = await db.sql`
    insert into inventory_reservations (inventory_item_id, job_request_id, reserved_quantity, notes, created_by)
    values (${payload.itemId}, ${payload.jobRequestId}, ${payload.quantity}, ${payload.adjustmentNote || null}, ${session.user_id})
    returning id, inventory_item_id, job_request_id, reserved_quantity, used_quantity, status, notes, created_at
  `;
  await insertMovement({ db, session, payload, itemId: item.id, movementType: 'reserved_for_job', quantity: payload.quantity, fromLocation: item.location_type || item.storage_location || 'main_warehouse', toLocation: 'job_site', notes: payload.adjustmentNote });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.reserved_for_job'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, jobRequestId: payload.jobRequestId, quantity: payload.quantity })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item), reservation });
};

const transferInventory = async ({ db, session, payload }) => {
  if (!payload.itemId || !payload.quantity || !payload.toLocation) return json(400, { ok: false, message: 'Item, quantity, and destination are required for transfer.' });
  const [item] = await db.sql`
    update inventory_items
    set location_type = ${payload.toLocation}, storage_location = ${payload.toLocation}, truck_assignment = ${payload.truckAssignment || null}, worker_assignment = ${payload.workerUserId || null}, updated_at = now()
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  const movementType = payload.workerUserId ? 'assigned_to_worker' : (/truck/i.test(payload.toLocation) ? 'assigned_to_truck' : 'stock_added');
  await insertMovement({ db, session, payload, itemId: item.id, movementType, quantity: payload.quantity, fromLocation: payload.fromLocation, toLocation: payload.toLocation, notes: payload.adjustmentNote });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.transferred'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, fromLocation: payload.fromLocation, toLocation: payload.toLocation, quantity: payload.quantity })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const recordCycleCount = async ({ db, session, payload }) => {
  if (!payload.itemId || !payload.countReason) return json(400, { ok: false, message: 'Item and adjustment reason are required for cycle count.' });
  const [before] = await db.sql`select id, quantity_on_hand from inventory_items where id = ${payload.itemId} and is_active = true limit 1`;
  if (!before) return json(404, { ok: false, message: 'Inventory item not found.' });
  const systemQuantity = Number(before.quantity_on_hand || 0);
  const variance = payload.countedQuantity - systemQuantity;
  const [count] = await db.sql`
    insert into inventory_counts (location_key, status, adjustment_reason, created_by, completed_by, completed_at)
    values (${payload.toLocation || payload.locationType || null}, 'completed', ${payload.countReason}, ${session.user_id}, ${session.user_id}, now())
    returning id, location_key, status, adjustment_reason, created_at, completed_at
  `;
  await db.sql`
    insert into inventory_count_items (inventory_count_id, inventory_item_id, system_quantity, counted_quantity, variance_quantity, notes)
    values (${count.id}, ${payload.itemId}, ${systemQuantity}, ${payload.countedQuantity}, ${variance}, ${payload.adjustmentNote || null})
  `;
  const [item] = await db.sql`
    update inventory_items set quantity_on_hand = ${payload.countedQuantity}, updated_at = now()
    where id = ${payload.itemId}
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  await insertMovement({ db, session, payload, itemId: item.id, movementType: 'adjusted_after_count', quantity: Math.abs(variance), fromLocation: payload.locationType, toLocation: payload.locationType, notes: payload.countReason });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.cycle_count_adjusted'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, systemQuantity, countedQuantity: payload.countedQuantity, variance, reason: payload.countReason })}::jsonb)
  `;
  return json(200, { ok: true, item: mapInventoryItem(item), count: { ...count, variance } });
};

const markReorderStatus = async ({ db, session, payload }) => {
  if (!payload.itemId) return json(400, { ok: false, message: 'Inventory item ID is required for reorder status.' });
  const status = ['order_needed', 'ordered', 'received', 'ok'].includes(payload.orderStatus) ? payload.orderStatus : 'order_needed';
  const [item] = await db.sql`
    update inventory_items
    set reorder_status = ${status}, updated_at = now()
    where id = ${payload.itemId} and is_active = true
    returning id, name, sku, category, trade_type, item_type, unit, quantity_on_hand, quantity_reserved, reorder_point, reorder_quantity, unit_cost, markup_percent, charge_price, supplier, supplier_part_number, storage_location, location_type, truck_assignment, worker_assignment, barcode_value, qr_value, ai_quote_catalog_key, reorder_status, notes, is_active, created_at, updated_at
  `;
  if (!item) return json(404, { ok: false, message: 'Inventory item not found.' });
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.reorder_status'}, ${'inventory_item'}, ${item.id}, ${JSON.stringify({ name: item.name, status })}::jsonb)
  `;
  if (status === 'received' && payload.quantity > 0) {
    await insertMovement({ db, session, payload, itemId: item.id, movementType: 'purchase_received', quantity: payload.quantity, toLocation: item.location_type || 'main_warehouse', notes: payload.adjustmentNote || 'Purchase received' });
  }
  return json(200, { ok: true, item: mapInventoryItem(item) });
};

const createSupplier = async ({ db, session, payload }) => {
  if (!payload.supplierName) return json(400, { ok: false, message: 'Supplier name is required.' });
  const [supplier] = await db.sql`
    insert into inventory_suppliers (name, contact_name, phone, email, website, default_markup_percent, lead_time_days, preferred, notes)
    values (${payload.supplierName}, ${clean(payload.contactName, 120) || null}, ${clean(payload.phone, 40) || null}, ${clean(payload.email, 180) || null}, ${clean(payload.website, 240) || null}, ${payload.markupPercent}, ${Math.max(0, Math.round(normalizeNumber(payload.leadTimeDays, 0)))}, ${Boolean(payload.preferred)}, ${payload.notes || null})
    on conflict (name) do update set contact_name = excluded.contact_name, phone = excluded.phone, email = excluded.email, website = excluded.website, default_markup_percent = excluded.default_markup_percent, lead_time_days = excluded.lead_time_days, preferred = excluded.preferred, notes = excluded.notes, updated_at = now()
    returning id, name, contact_name, phone, email, website, default_markup_percent, lead_time_days, preferred, notes
  `;
  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, ${'inventory.supplier_saved'}, ${'inventory_supplier'}, ${supplier.id}, ${JSON.stringify({ name: supplier.name })}::jsonb)
  `;
  return json(200, { ok: true, supplier });
};

const routeActionFromUrl = (request, payload) => {
  const path = new URL(request.url).pathname;
  if (path.endsWith('/items') && request.method === 'POST') return 'create';
  if (path.endsWith('/items') && request.method === 'PATCH') return 'update';
  if (path.endsWith('/movements')) return 'movement';
  if (path.endsWith('/reserve')) return 'reserve';
  if (path.endsWith('/consume')) return 'consume';
  if (path.endsWith('/transfer')) return 'transfer';
  if (path.endsWith('/count')) return 'count';
  if (path.endsWith('/suppliers')) return 'supplier';
  if (path.endsWith('/purchasing') || path.endsWith('/reorder')) return 'reorder';
  if (path.endsWith('/inventory') && request.method === 'POST' && (!payload.action || payload.action === 'adjust')) return 'create';
  return payload.action;
};

export const createAdminInventoryHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account to manage inventory.' });
  try {
    const db = await getDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    const { roleKeys, permissionKeys } = await loadPermissions(db, session.user_id);
    if (!permissionKeys.includes('admin.inventory.manage')) return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin inventory permission required.' });

    if (request.method === 'GET') {
      const jobRequestId = clean(new URL(request.url).searchParams.get('jobRequestId'), 80);
      return json(200, { ok: true, authenticated: true, authorized: true, user: { id: session.user_id, email: session.email, fullName: session.full_name, roles: roleKeys }, ...(await listInventory(db, { jobRequestId })) });
    }

    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    const payload = normalizeInventoryPayload(body);
    const action = routeActionFromUrl(request, payload);

    if (request.method === 'POST' && ['create', 'items'].includes(action)) return await createInventoryItem({ db, session, payload });
    if (action === 'update') return await updateInventoryItem({ db, session, payload });
    if (action === 'archive') return await archiveInventoryItem({ db, session, payload });
    if (action === 'delete') return await deleteInventoryItem({ db, session, payload });
    if (action === 'reserve') return await reserveInventoryForJob({ db, session, payload });
    if (action === 'consume') return await adjustInventoryItem({ db, session, payload: { ...payload, quantityDelta: -Math.abs(payload.quantity || payload.quantityDelta), adjustmentType: 'used' } });
    if (action === 'transfer') return await transferInventory({ db, session, payload });
    if (action === 'count') return await recordCycleCount({ db, session, payload });
    if (action === 'reorder') return await markReorderStatus({ db, session, payload });
    if (action === 'supplier') return await createSupplier({ db, session, payload });
    if (action === 'movement') {
      await insertMovement({ db, session, payload, itemId: payload.itemId, movementType: payload.movementType, quantity: payload.quantity, fromLocation: payload.fromLocation, toLocation: payload.toLocation, notes: payload.adjustmentNote });
      return json(200, { ok: true, movementRecorded: true });
    }
    return await adjustInventoryItem({ db, session, payload });
  } catch (error) {
    console.error('Failed to manage admin inventory', error);
    return json(500, { ok: false, message: 'We could not manage inventory right now.' });
  }
};

export default createAdminInventoryHandler();

export const config = { path: '/api/admin/inventory' };
