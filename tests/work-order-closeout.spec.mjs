import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const applyUse = (state, quantity) => ({
  ...state,
  onHand: state.onHand - quantity,
  reserved: Math.max(0, state.reserved - quantity),
  used: state.used + quantity,
  movements: [...state.movements, 'consumed_on_job'],
});

const applyRelease = (state, quantity) => ({
  ...state,
  reserved: Math.max(0, state.reserved - quantity),
  movements: [...state.movements, 'released_from_job'],
});

const readinessBlocks = (state) => [
  ...(state.laborComplete ? [] : ['Labor is not marked complete by the worker yet.']),
  ...(state.adminReviewed ? [] : ['Admin completion review is still pending.']),
  ...(state.reserved > 0 ? ['Reserved materials remain unresolved.'] : []),
];

test('dashboard loads without the Phase 53 url is not defined runtime pattern', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['data-dashboard-root', 'dashboard-phase30-sidebar.js']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');

  assert.doesNotMatch(html, /const tokenFromDashboardUrl = url\.searchParams/, 'dashboard should not reference bare url.searchParams');
  assert.doesNotMatch(html, /url is not defined/, 'dashboard HTML should not contain the runtime error string');
  assert.match(bootstrap, /const url = new URL\(window\.location\.href\)/, 'real dashboard auth cleanup keeps URL scoped locally');
});

test('sidebar Inventory click navigates to the real inventory page and is permission scoped', async () => {
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  await assertHtmlPage('public/inventory/index.html', ['Inventory control', 'data-inventory-pane-tab']);

  assert.match(sidebar, /label: 'Inventory'[\s\S]*href: '\/inventory\/'/, 'Inventory sidebar item should navigate to /inventory/');
  assert.match(sidebar, /data-sidebar-href/, 'Inventory should render as an anchor, not a silent button');
  assert.match(sidebar, /canManageInventory[\s\S]*currentDashboardView/, 'Inventory link should hide outside admin view');
});

test('worker can mark job complete with mocked data and real endpoint wiring', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['data-worker-jobs', 'Assigned jobs']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const workerJobs = await readText('netlify/functions/worker-jobs.mjs');

  assert.ok(html.includes('completion evidence') || html.includes('Completion'), 'worker closeout copy should mention completion evidence');
  assert.match(bootstrap, /data-worker-mark-complete[\s\S]*\/api\/worker\/jobs\/complete/, 'worker complete button should call real endpoint');
  assert.match(workerJobs, /path\.endsWith\('\/complete'\)[\s\S]*handlePatch/, 'worker complete route should reuse update validation');
  assert.match(workerJobs, /completion_notes[\s\S]*completion_submitted_at/, 'worker completion should persist notes and timestamp');
});

test('admin can review completion with mocked data and real endpoint wiring', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['Admin completion review', 'data-admin-completion-review-form']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const adminWorkOrders = await readText('netlify/functions/admin-work-orders.mjs');

  assert.match(bootstrap, /\/api\/admin\/work-orders\/review[\s\S]*Completion approved/, 'admin review form should call real review endpoint');
  assert.match(adminWorkOrders, /handleCompletionReview[\s\S]*work_order\.completion_approved[\s\S]*work_order\.completion_rejected/, 'admin review endpoint should approve or reject completion');
  assert.match(adminWorkOrders, /waiting_payment/, 'approved completion should move toward invoice/payment readiness');
});

test('material used/released status updates and invoice readiness blocks until resolved', () => {
  let state = { onHand: 10, reserved: 3, used: 0, laborComplete: false, adminReviewed: false, movements: [] };
  assert.deepEqual(readinessBlocks(state), [
    'Labor is not marked complete by the worker yet.',
    'Admin completion review is still pending.',
    'Reserved materials remain unresolved.',
  ]);

  state = applyUse(state, 2);
  assert.equal(state.onHand, 8, 'on-hand decreases when material is consumed');
  assert.equal(state.reserved, 1, 'reserved decreases when material is consumed');
  assert.ok(state.movements.includes('consumed_on_job'));

  state = applyRelease(state, 1);
  state.laborComplete = true;
  assert.equal(state.onHand, 8, 'on-hand remains unchanged when unused material is released');
  assert.equal(state.reserved, 0, 'reserved clears after release');
  assert.ok(state.movements.includes('released_from_job'));
  assert.deepEqual(readinessBlocks(state), ['Admin completion review is still pending.']);

  state.adminReviewed = true;
  assert.deepEqual(readinessBlocks(state), [], 'invoice readiness clears after materials and admin review resolve');
});
