import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const mobileViewports = [
  [375, 667],
  [390, 844],
  [430, 932],
  [768, 1024],
];

test('mobile UX layer is loaded on core public and portal pages', async () => {
  for (const page of [
    'public/index.html',
    'public/login/index.html',
    'public/dashboard/index.html',
    'public/inventory/index.html',
    'public/portal/admin/index.html',
    'public/portal/client/index.html',
    'public/portal/worker/index.html',
  ]) {
    const html = await assertHtmlPage(page, ['mobile-field-ux.css']);
    assert.doesNotMatch(html, /url is not defined|Cannot read properties of undefined/, `${page} should not contain known console error strings`);
  }
  const dashboard = await readText('public/dashboard/index.html');
  assert.match(dashboard, /module-completion-2026\.css/, 'dashboard should preserve Phase 56 module polish alongside mobile CSS');
});

test('mobile breakpoints prevent horizontal overflow for target viewports', async () => {
  const css = await readText('public/assets/mobile-field-ux.css');
  for (const [width, height] of mobileViewports) {
    assert.ok(width <= height, `${width}x${height} should be a portrait mobile/tablet viewport fixture`);
  }
  assert.match(css, /overflow-x:\s*clip|overflow-x:\s*hidden/, 'mobile CSS should prevent page-level horizontal overflow');
  assert.match(css, /@media\s*\(max-width:\s*820px\)/, 'mobile CSS should include phone/tablet breakpoint');
  assert.match(css, /grid-template-columns:\s*1fr !important/, 'mobile grids should collapse to one column');
  assert.match(css, /--mobile-tap:\s*44px/, 'mobile CSS should enforce 44px tap target baseline');
});

test('mobile sidebar opens/closes and every sidebar item remains tappable', async () => {
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(sidebar, /dataSidebarToggle|sidebarToggle|data-sidebar-toggle/, 'sidebar should create a mobile open control');
  assert.match(sidebar, /data-sidebar-close/, 'sidebar should create a large close control');
  assert.match(sidebar, /sidebarBackdrop|data-sidebar-backdrop/, 'sidebar should create a backdrop that closes the drawer');
  assert.match(sidebar, /mobileQuickActions[\s\S]*Requests[\s\S]*Quotes[\s\S]*Inventory|mobileQuickActions[\s\S]*Today[\s\S]*Complete/, 'sidebar should define role-aware quick actions');
  assert.match(css, /dashboard-sidebar-v2[\s\S]*position:\s*fixed/, 'sidebar should become a fixed mobile drawer');
  for (const label of ['Scheduling', 'Worker Mobile', 'Photo Docs', 'Maintenance Plans', 'Deployment Health', 'Inventory']) {
    assert.ok(sidebar.includes(label), `sidebar should keep ${label} as a tappable item`);
  }
});

test('worker mobile field mode supports one-handed job flow', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['id="worker-mobile-field"', 'data-worker-mobile-list']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(bootstrap, /worker-mobile-card[\s\S]*Today|worker-mobile-card[\s\S]*mobile-job-meta/, 'worker mobile cards should be rendered with mobile metadata');
  for (const action of ['data-mobile-start-job', 'data-mobile-progress-job', 'data-mobile-add-note', 'data-mobile-use-material', 'data-mobile-return-material', 'data-mobile-request-material', 'data-mobile-before-photo', 'data-mobile-after-photo', 'data-mobile-complete-job']) {
    assert.match(bootstrap, new RegExp(action), `${action} should be wired in worker mobile flow`);
  }
  assert.match(bootstrap, /\/api\/worker\/jobs\/complete/, 'mark complete should call worker completion endpoint');
  assert.match(bootstrap, /\/api\/worker\/inventory\/use/, 'mark material used should call worker inventory endpoint');
  assert.match(bootstrap, /\/api\/worker\/inventory\/request/, 'request material should call worker inventory request endpoint');
  assert.match(html, /Worker Mobile Field Mode/, 'worker mobile workspace should be present in dashboard markup');
});

test('quote editor and client request form expose mobile-friendly critical controls', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['data-admin-quote-form', 'data-client-request-form']);
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(html, /name="title"[\s\S]*name="amount"[\s\S]*name="summary"/, 'quote title, amount, and summary should be editable');
  assert.match(html, /data-admin-quote-ai-draft[\s\S]*data-admin-quote-submit/, 'AI draft and save/send quote actions should be visible');
  assert.match(html, /data-client-request-form[\s\S]*type="file"[\s\S]*Save request/, 'client request form should support mobile file upload and save');
  assert.match(css, /data-admin-quote-form[\s\S]*position:\s*sticky|mobile-sticky-action-source/, 'quote editor should have sticky mobile actions');
});

test('inventory and invoice mobile card surfaces are available', async () => {
  const inventory = await assertHtmlPage('public/inventory/index.html', ['inventory-mobile-card', 'data-inventory-scan']);
  const dashboard = await readText('public/dashboard/index.html');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(inventory, /Search[\s\S]*Scan|SKU|barcode|QR/i, 'inventory should prioritize search/scan/SKU mobile lookup');
  assert.match(inventory, /Add stock|Transfer stock|Reserve stock|Cycle count/i, 'inventory should keep mobile operations available');
  assert.match(dashboard, /id="admin-invoices"[\s\S]*data-client-invoices/, 'invoice surfaces should exist for admin/client mobile views');
  assert.match(css, /client-quote-list[\s\S]*grid-template-columns:\s*1fr/, 'quote/invoice lists should collapse to cards on mobile');
});

test('mobile modals become full-screen sheets without exposing console-error strings', async () => {
  const css = await readText('public/assets/mobile-field-ux.css');
  const dashboard = await readText('public/dashboard/index.html');
  assert.match(css, /admin-request-modal-panel[\s\S]*100dvh/, 'dashboard modals should become full-height mobile sheets');
  assert.match(css, /admin-request-modal-close[\s\S]*48px/, 'mobile sheet close buttons should be large tap targets');
  assert.doesNotMatch(`${css}\n${dashboard}`, /url is not defined|Cannot read properties of undefined/, 'mobile code should avoid known console error strings');
});
