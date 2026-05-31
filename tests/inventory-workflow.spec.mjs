import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, assertScriptsParse, getButtons, assertButtonHasPurpose } from './browser-qa-utils.mjs';

test('inventory workspace loads all panes and forms with purposeful buttons', async () => {
  const html = await assertHtmlPage('public/inventory/index.html', ['Inventory control', 'data-inventory-workspace', 'data-admin-inventory-form']);
  await assertScriptsParse(html, 'public/inventory/index.html');
  for (const pane of ['overview', 'items', 'low-stock', 'locations', 'workers-trucks', 'reservations', 'tools', 'suppliers', 'purchasing', 'cycle-count', 'movements']) {
    assert.match(html, new RegExp(`data-inventory-pane="${pane}"`), `inventory pane ${pane} should exist`);
  }
  for (const hook of ['data-inventory-transfer-form', 'data-inventory-reservation-form', 'data-inventory-count-form', 'data-inventory-movement-list', 'data-inventory-scan-input']) {
    assert.ok(html.includes(hook), `${hook} should be present`);
  }
  getButtons(html).forEach((button) => assertButtonHasPurpose(button, 'public/inventory/index.html'));
});

test('inventory buttons call real APIs or show real status', async () => {
  const html = await assertHtmlPage('public/inventory/index.html');
  assert.match(html, /postInventoryAction\('\/api\/admin\/inventory\/reserve'/, 'reservation form should call reserve API');
  assert.match(html, /postInventoryAction\('\/api\/admin\/inventory\/transfer'/, 'transfer form should call transfer API');
  assert.match(html, /postInventoryAction\('\/api\/admin\/inventory\/count'/, 'cycle count form should call count API');
  assert.match(html, /postInventoryAction\('\/api\/admin\/inventory\/reorder'/, 'reorder buttons should call reorder API');
  assert.match(html, /data-inventory-print-label[\s\S]*Label ready/, 'label preview button should show visible status');
});
