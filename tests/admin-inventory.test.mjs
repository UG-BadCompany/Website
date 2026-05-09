import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminInventoryHandler } from '../netlify/functions/admin-inventory.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('admin inventory endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createAdminInventoryHandler({ getDatabase: async () => { openedDatabase = true; return createMockDb(); } });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory')));
  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('admin inventory endpoint rejects users without inventory permission', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client' }],
    [],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
});

test('admin inventory endpoint lists active items and low-stock summary', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [
      { id: 'item-1', name: 'Drywall screws', sku: 'DW-1', category: 'Fasteners', unit: 'box', quantity_on_hand: 2, reorder_point: 5, supplier: 'Supply Co', storage_location: 'Shelf A', notes: '', is_active: true, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' },
      { id: 'item-2', name: 'Paint roller', sku: 'PR-1', category: 'Paint', unit: 'each', quantity_on_hand: 12, reorder_point: 4, supplier: '', storage_location: 'Shelf B', notes: '', is_active: true, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' },
    ],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 2);
  assert.equal(response.body.items[0].stockStatus, 'low');
  assert.equal(response.body.summary.lowStock, 1);
  assert.match(db.queries[4].text, /from inventory_items/);
});

test('admin inventory endpoint creates an item and writes audit event', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'item-1', name: 'Caulk', sku: 'CA-1', category: 'Sealants', unit: 'tube', quantity_on_hand: 10, reorder_point: 3, supplier: 'Supply Co', storage_location: 'Van', notes: 'White', is_active: true, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' }],
    [],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Caulk', sku: 'CA-1', category: 'Sealants', unit: 'tube', quantityOnHand: 10, reorderPoint: 3, supplier: 'Supply Co', storageLocation: 'Van', notes: 'White' }),
  })));
  assert.equal(response.status, 201);
  assert.equal(response.body.item.name, 'Caulk');
  assert.match(db.queries[4].text, /insert into inventory_items/);
  assert.equal(db.queries[5].values[1], 'inventory.created');
});

test('admin inventory endpoint records quantity adjustments', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'item-1', name: 'Drywall screws', sku: 'DW-1', category: 'Fasteners', unit: 'box', quantity_on_hand: 7, reorder_point: 5, supplier: '', storage_location: 'Shelf A', notes: '', is_active: true, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' }],
    [{ id: 'adjustment-1', inventory_item_id: 'item-1', adjustment_type: 'received', quantity_delta: 5, note: 'Restocked', created_at: '2026-05-09T00:00:00.000Z' }],
    [],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ itemId: 'item-1', quantityDelta: 5, adjustmentType: 'received', adjustmentNote: 'Restocked' }),
  })));
  assert.equal(response.status, 200);
  assert.equal(response.body.item.quantityOnHand, 7);
  assert.equal(response.body.adjustment.quantityDelta, 5);
  assert.match(db.queries[4].text, /update inventory_items/);
  assert.equal(db.queries[6].values[1], 'inventory.adjusted');
});

test('admin inventory endpoint updates item details and writes audit event', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'item-1', name: 'Updated screws', sku: 'DW-2', category: 'Fasteners', unit: 'box', quantity_on_hand: 7, reorder_point: 8, supplier: 'Supply Co', storage_location: 'Shelf C', notes: 'Coarse thread', is_active: true, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' }],
    [],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'update', itemId: 'item-1', name: 'Updated screws', sku: 'DW-2', category: 'Fasteners', unit: 'box', reorderPoint: 8, supplier: 'Supply Co', storageLocation: 'Shelf C', notes: 'Coarse thread' }),
  })));
  assert.equal(response.status, 200);
  assert.equal(response.body.item.name, 'Updated screws');
  assert.equal(response.body.item.reorderPoint, 8);
  assert.match(db.queries[4].text, /update inventory_items/);
  assert.match(db.queries[4].text, /reorder_point/);
  assert.equal(db.queries[5].values[1], 'inventory.updated');
});

test('admin inventory endpoint archives items and writes audit event', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'admin-1', email: 'admin@example.com', full_name: 'Admin' }],
    [],
    [{ key: 'admin' }],
    [],
    [{ id: 'item-1', name: 'Old roller', sku: 'OR-1', category: 'Paint', unit: 'each', quantity_on_hand: 1, reorder_point: 0, supplier: '', storage_location: 'Shelf D', notes: '', is_active: false, created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' }],
    [],
  ]);
  const handler = createAdminInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/admin/inventory', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'archive', itemId: 'item-1' }),
  })));
  assert.equal(response.status, 200);
  assert.equal(response.body.item.isActive, false);
  assert.match(db.queries[4].text, /set is_active = false/);
  assert.equal(db.queries[5].values[1], 'inventory.archived');
});
