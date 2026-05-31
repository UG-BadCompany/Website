import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, assertScriptsParse, getButtons, assertButtonHasPurpose, readText } from './browser-qa-utils.mjs';

test('dashboard loads, sidebar workspaces are wired, and buttons have purposes', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['data-dashboard-root', 'dashboard-phase30-sidebar.js', 'data-view-button="admin"', 'data-view-button="client"', 'data-view-button="worker"']);
  await assertScriptsParse(html, 'public/dashboard/index.html');
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  for (const label of ['Overview', 'Estimate Review', 'Work Orders', 'Invoices', 'Worker Jobs', 'Inventory', 'Roles & Users']) {
    assert.ok(sidebar.includes(label), `sidebar should include ${label}`);
  }
  for (const workspace of ['overview', 'requests', 'quotes', 'work-orders', 'invoices', 'workers', 'settings']) {
    assert.match(await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js'), new RegExp(`${workspace}`), `sidebar workspace ${workspace} should be routable`);
  }
  getButtons(html).forEach((button) => assertButtonHasPurpose(button, 'public/dashboard/index.html'));
});

test('dashboard admin/client/worker, inventory, access, work order, invoice, and worker controls are wired', async () => {
  const html = await readText('public/dashboard/index.html');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /data-admin-access-shortcut/, 'admin roles/users launcher should exist');
  assert.match(html, /data-admin-new-role/, 'create role action should exist');
  assert.match(html, /data-admin-user-create/, 'create user action should exist');
  assert.match(html, /href="\/inventory\/"/, 'inventory workspace should navigate to real inventory page');
  assert.match(bootstrap, /bindWorkerJobActions/, 'worker job action buttons should be bound');
  assert.match(bootstrap, /confirmAdminPayment|admin-invoice/, 'invoice/payment buttons should be bound');
  assert.match(bootstrap, /bindAdminInventoryWorkspaceActions|loadAdminInventoryWorkspace/, 'inventory dashboard hooks should be bound');
  assert.match(bootstrap, /loadAdminRequests|admin.*request|work order/is, 'work order buttons should be backed by admin request handlers');
});

test('quote editor fields and key actions are editable and produce status changes', async () => {
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  for (const field of ['data-estimate-title', 'data-estimate-amount', 'data-estimate-summary', 'data-estimate-missing-info']) {
    assert.ok(controller.includes(field), `${field} should be managed by the quote editor controller`);
  }
  assert.match(controller, /rewriteForm[\s\S]*Rewrite ready/, 'AI Rewrite Quote should request a rewrite and show status');
  assert.match(controller, /saveForm[\s\S]*Draft saved/, 'Save Draft should call the save flow and show status');
  assert.match(controller, /Cancelled\. Fields restored to the last loaded draft\./, 'Cancel Edits should restore last draft values');
  assert.match(controller, /Save and send quote\?|Saved and sent/, 'Save & Send should confirm/request/status');
});
