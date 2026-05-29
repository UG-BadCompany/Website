import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkerInventoryHandler } from '../netlify/functions/worker-inventory.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('worker inventory endpoint requires a signed-in worker session', async () => {
  let openedDatabase = false;
  const handler = createWorkerInventoryHandler({ getDatabase: async () => { openedDatabase = true; return createMockDb(); } });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/inventory')));
  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, true);
});

test('worker inventory endpoint lists assigned truck and worker stock', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker' }],
    [],
    [{ id: 'item-1', name: 'Impact driver', sku: 'TOOL-1', category: 'Tools', item_type: 'tool', unit: 'each', quantity_on_hand: 1, quantity_reserved: 0, location_type: 'worker_assigned', truck_assignment: '', barcode_value: 'TOOL-1', qr_value: 'TOOL-1', notes: 'Assigned kit' }],
    [],
  ]);
  const handler = createWorkerInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/inventory', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].name, 'Impact driver');
  assert.match(db.queries[4].text, /from inventory_items/);
});

test('worker inventory endpoint records material use', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker' }],
    [],
    [{ id: 'item-1', name: 'Caulk', sku: 'CA-1', quantity_on_hand: 4, quantity_reserved: 0 }],
    [],
    [],
  ]);
  const handler = createWorkerInventoryHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/worker/inventory/use', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ itemId: 'item-1', quantity: 2, jobRequestId: 'job-1', note: 'Used on sink repair' }),
  })));
  assert.equal(response.status, 200);
  assert.match(db.queries[4].text, /update inventory_items/);
  assert.match(db.queries[5].text, /insert into inventory_movements/);
  assert.equal(db.queries[5].values[1], 'consumed_on_job');
});
