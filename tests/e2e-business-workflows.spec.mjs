import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const applyReserve = (state, quantity) => ({
  ...state,
  reserved: state.reserved + quantity,
  available: state.onHand - (state.reserved + quantity),
  movements: [...state.movements, 'reserved_for_job'],
});

const applyConsume = (state, quantity) => ({
  ...state,
  onHand: state.onHand - quantity,
  reserved: Math.max(0, state.reserved - quantity),
  used: state.used + quantity,
  available: (state.onHand - quantity) - Math.max(0, state.reserved - quantity),
  movements: [...state.movements, 'consumed_on_job'],
});

const applyRelease = (state, quantity) => ({
  ...state,
  reserved: Math.max(0, state.reserved - quantity),
  available: state.onHand - Math.max(0, state.reserved - quantity),
  movements: [...state.movements, 'released_from_job'],
});

test('estimate quote flow is wired through edit, AI rewrite, save draft, and save-send status updates', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['Estimate Review', 'data-admin-request-detail']);
  const phase2 = await readText('public/assets/dashboard-phase2-upgrade.js');
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  const estimateReview = await readText('netlify/functions/admin-estimate-review.mjs');

  assert.match(phase2, /data-estimate-title[\s\S]*data-estimate-amount[\s\S]*data-estimate-summary[\s\S]*data-estimate-missing-info/, 'quote editor fields render');
  assert.match(controller, /\/api\/admin\/estimate-rewrite[\s\S]*Rewrite ready/, 'AI Rewrite Quote calls endpoint and shows status');
  assert.match(controller, /\/api\/admin\/estimate-review[\s\S]*Draft saved/, 'Save Draft calls estimate review endpoint and shows status');
  assert.ok(controller.includes('Save and send quote?') && controller.includes('Saved and sent.'), 'Save & Send confirms and updates status');
  assert.match(estimateReview, /set status = 'quote_sent'/, 'sent quote updates request status');
  assert.ok(html.includes('data-admin-quote-ai-draft'), 'admin work-order quote draft action exists');
});

test('quote approval can become a work order with assignment, status, customer, scope, and quote link context', async () => {
  const adminWorkOrders = await readText('netlify/functions/admin-work-orders.mjs');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const dashboard = await readText('public/dashboard/index.html');

  assert.match(adminWorkOrders, /quote_id[\s\S]*quote_status[\s\S]*quote_title[\s\S]*quote_amount_cents/, 'work orders include quote linkage');
  assert.match(adminWorkOrders, /requester_name[\s\S]*service_type[\s\S]*work_scope/, 'work orders include customer and scope fields');
  assert.match(bootstrap, /data-phase52-admin-assignment-form|data-admin-assignment-form[\s\S]*\/api\/admin\/job-requests/, 'admin assignment form posts to real work-order endpoint');
  assert.ok(dashboard.includes('data-admin-assignment-worker'), 'worker assignment control exists in work order modal');
});

test('inventory reservation keeps on-hand stable, lowers available, and creates reservation movement', async () => {
  const adminInventory = await readText('netlify/functions/admin-inventory.mjs');
  const phase2 = await readText('public/assets/dashboard-phase2-upgrade.js');
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  let state = { onHand: 10, reserved: 0, available: 10, used: 0, movements: [] };
  state = applyReserve(state, 3);

  assert.equal(state.onHand, 10, 'reserve must not reduce on-hand quantity');
  assert.equal(state.reserved, 3, 'reserved quantity increases');
  assert.equal(state.available, 7, 'available quantity decreases');
  assert.deepEqual(state.movements, ['reserved_for_job']);
  assert.match(adminInventory, /quantity_reserved = quantity_reserved \+/, 'admin reserve increases reserved quantity');
  assert.match(adminInventory, /movementType: 'reserved_for_job'/, 'admin reserve writes movement record');
  assert.match(phase2, /Inventory Match & Reservation[\s\S]*data-estimate-reserve-inventory/, 'quote editor renders reservation section and reserve button');
  assert.match(controller, /`\/api\/admin\/inventory\/\$\{action\}`[\s\S]*action: reserveButton \? 'reserve' : 'release'/, 'quote editor reserve button calls real reserve endpoint');
});

test('worker material use consumes stock, reduces reservation, and appears in admin material history', async () => {
  const workerInventory = await readText('netlify/functions/worker-inventory.mjs');
  const adminInventory = await readText('netlify/functions/admin-inventory.mjs');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  let state = applyReserve({ onHand: 10, reserved: 0, available: 10, used: 0, movements: [] }, 4);
  state = applyConsume(state, 2);

  assert.equal(state.onHand, 8, 'used material decreases on-hand');
  assert.equal(state.reserved, 2, 'used material decreases reserved quantity');
  assert.equal(state.available, 6, 'available remains on-hand minus reserved');
  assert.deepEqual(state.movements, ['reserved_for_job', 'consumed_on_job']);
  assert.match(workerInventory, /quantity_on_hand = quantity_on_hand -[\s\S]*quantity_reserved = greatest\(quantity_reserved -/, 'worker use updates on-hand and reserved quantities');
  assert.match(adminInventory, /used_quantity = least\(reserved_quantity, used_quantity \+/, 'admin consume syncs reservation used quantity');
  assert.match(bootstrap, /renderAdminWorkOrderInventoryUsage[\s\S]*data-admin-work-order-inventory-usage/, 'admin work order renders material usage history');
});

test('unused material release restores availability without changing on-hand and records movement', async () => {
  const adminInventory = await readText('netlify/functions/admin-inventory.mjs');
  const workerInventory = await readText('netlify/functions/worker-inventory.mjs');
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  let state = applyReserve({ onHand: 10, reserved: 0, available: 10, used: 0, movements: [] }, 4);
  state = applyConsume(state, 2);
  state = applyRelease(state, 2);

  assert.equal(state.onHand, 8, 'release does not change on-hand after consumption');
  assert.equal(state.reserved, 0, 'release clears unused reserved quantity');
  assert.equal(state.available, 8, 'release increases available quantity to current on-hand');
  assert.deepEqual(state.movements, ['reserved_for_job', 'consumed_on_job', 'released_from_job']);
  assert.match(adminInventory, /releaseInventoryReservation[\s\S]*released_from_job/, 'admin release endpoint records release movement');
  assert.match(workerInventory, /releaseReservedInventory[\s\S]*released_from_job/, 'worker release endpoint records release movement');
  assert.match(controller, /\/api\/admin\/inventory\/\$\{action\}/, 'quote editor release uses real inventory action endpoint');
});

test('job completion exposes evidence, admin review, job materials, and invoice payment readiness', async () => {
  const dashboard = await readText('public/dashboard/index.html');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const workerJobs = await readText('netlify/functions/worker-jobs.mjs');
  const adminInvoices = await readText('netlify/functions/admin-invoices.mjs');

  assert.match(dashboard, /data-admin-work-order-material-list[\s\S]*data-admin-work-order-invoice-readiness/, 'work order modal has Job Materials and invoice readiness sections');
  assert.match(bootstrap, /Mark ready for invoice|waiting_payment|invoice\/payment readiness/i, 'admin completion flow exposes invoice readiness');
  assert.match(bootstrap, /data-worker-files|completionNotes|pending_review/, 'worker job cards support completion evidence and notes');
  assert.match(workerJobs, /pending_review|completion_submitted_at|completion_notes/, 'worker completion endpoint moves jobs into review with evidence notes');
  assert.match(adminInvoices, /waiting_payment|completed|invoice/i, 'invoice endpoint supports payment readiness/closeout states');
});
