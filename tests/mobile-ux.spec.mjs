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

test('mobile header links and dashboard module shortcuts remain functional', async () => {
  const dashboard = await readText('public/dashboard/index.html');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(dashboard, /<a href="\/">Home<\/a>/, 'Desktop Home link should route to the public home page');
  assert.match(dashboard, /<a href="\/dashboard\/">Dashboard<\/a>/, 'Desktop Dashboard link should route back to the dashboard');
  assert.match(dashboard, /href="\/#estimate"[^>]*data-request-estimate-link>Request Estimate/, 'Desktop Request Estimate should route to the public estimate form');
  assert.match(dashboard, /data-main-dashboard-actions[\s\S]*Estimate Review[\s\S]*Work Orders[\s\S]*Invoices[\s\S]*AI Troubleshooting/, 'Dashboard shortcuts should keep admin, client, and worker modules reachable');
  assert.match(dashboard, /data-mobile-dashboard-greeting[\s\S]*data-mobile-current-role[\s\S]*data-mobile-notifications/, 'Mobile header should show greeting, current role, notifications, and avatar controls');
  assert.match(dashboard, /data-mobile-role-option="owner"[\s\S]*data-mobile-role-option="admin"[\s\S]*data-mobile-role-option="client"[\s\S]*data-mobile-role-option="worker"/, 'Mobile role selector should expose Owner, Admin, Client, and Worker');
  assert.match(dashboard, /data-mobile-metric="revenue"[\s\S]*data-mobile-metric="jobs"[\s\S]*data-mobile-metric="quotes"[\s\S]*data-mobile-metric="requests"/, 'Mobile dashboard KPI cards should expose revenue, jobs, quotes, and requests');
  assert.match(dashboard, /Today&apos;s Priorities[\s\S]*Inventory alerts[\s\S]*Past due invoices/, 'Mobile dashboard should include Today priorities');
  assert.match(dashboard, /mobile-bottom-navigation[\s\S]*Home[\s\S]*Requests[\s\S]*Quotes[\s\S]*Jobs[\s\S]*More/, 'Mobile bottom navigation should expose Home, Requests, Quotes, Jobs, and More');
  assert.match(dashboard, /mobile-more-menu[\s\S]*Dashboard[\s\S]*Request Estimate[\s\S]*Invoices[\s\S]*Inventory \/ Stock[\s\S]*Troubleshooter[\s\S]*Schedule[\s\S]*Profile[\s\S]*Sign out/, 'More menu should expose the remaining mobile modules and sign out.');
  assert.match(dashboard, /data-mobile-fab[\s\S]*New Estimate[\s\S]*New Invoice[\s\S]*New Job[\s\S]*New Customer[\s\S]*New Request[\s\S]*Sign out/, 'Floating quick action button should expose create actions and mobile sign out without dead links');
  assert.match(css, /dashboard-mobile-nav-toggle[\s\S]*width:\s*44px/, 'Mobile workspace toggle should be compact instead of a full-width menu button');
  assert.match(css, /dashboard-nav-row[\s\S]*display:\s*none !important/, 'Crowded top nav buttons should be removed on mobile');
  assert.match(css, /mobile-more-menu[\s\S]*position:\s*fixed/, 'More menu should be a fixed clean mobile sheet.');
  assert.match(css, /mobile-bottom-navigation[\s\S]*position:\s*fixed/, 'Bottom mobile navigation should be fixed and app-like');
  const mobileJs = await readText('public/assets/mobile-dashboard-ux.js');
  assert.match(mobileJs, /data-mobile-notifications[\s\S]*data-mobile-notification-panel/, 'Notifications should toggle a real panel');
  assert.match(mobileJs, /roleRoutes[\s\S]*data-mobile-bottom-key[\s\S]*data-mobile-more-key/, 'Bottom nav and More menu should route through role-aware mobile routes.');
  assert.doesNotMatch(mobileJs, /observe\(document\.body, \{ attributes: true, childList: true, subtree: true/, 'Mobile JS should avoid whole-body subtree observers for performance');
});

test('mobile sidebar opens/closes and every sidebar item remains tappable', async () => {
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(sidebar, /dataSidebarToggle|sidebarToggle|data-sidebar-toggle/, 'sidebar should create a mobile open control');
  assert.match(sidebar, /data-sidebar-close/, 'sidebar should create a large close control');
  assert.match(sidebar, /sidebarBackdrop|data-sidebar-backdrop/, 'sidebar should create a backdrop that closes the drawer');
  assert.match(sidebar, /mobileQuickActions[\s\S]*Requests[\s\S]*Quotes[\s\S]*Inventory|mobileQuickActions[\s\S]*Today[\s\S]*Troubleshoot[\s\S]*Complete/, 'sidebar should define role-aware quick actions including Troubleshoot');
  assert.match(css, /dashboard-sidebar-v2[\s\S]*position:\s*fixed/, 'sidebar should become a fixed mobile drawer');
  for (const label of ['Scheduling', 'Worker Mobile', 'AI Troubleshooting', 'Photo Docs', 'Maintenance Plans', 'Deployment Health', 'Inventory']) {
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

test('AI troubleshooting is mobile-ready for field workers', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['id="worker-ai-troubleshooting"', 'data-ai-troubleshooting-form']);
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.match(sidebar, /Troubleshoot[\s\S]*ai-troubleshooting[\s\S]*#worker-ai-troubleshooting[\s\S]*views: \['admin', 'worker'\]/, 'mobile quick actions should include Troubleshoot for admin and worker');
  assert.doesNotMatch(html, /id="worker-ai-troubleshooting"[^>]*data-views="client/, 'AI troubleshooting should not be visible to client view');
  for (const field of ['name="systemType"', 'name="component"', 'name="make"', 'name="model"', 'name="issue"', 'name="errorCode"', 'name="readings"', 'name="checkedAlready"', 'name="urgency"', 'name="workOrderId"']) {
    assert.match(html, new RegExp(field), `AI troubleshooting field ${field} should exist`);
  }
  assert.match(bootstrap, /\/api\/worker\/ai-troubleshooting/, 'Generate button should call worker AI troubleshooting endpoint');
  assert.match(bootstrap, /data-ai-troubleshooting-copy[\s\S]*navigator\.clipboard/, 'Copy Plan should be wired after a plan exists');
  assert.match(html, /data-ai-troubleshooting-save disabled title="Generate a plan and add a work order ID before saving\./, 'Save Notes should be disabled with explanation until a work order plan exists');
  assert.match(css, /worker-ai-troubleshooting-suite[\s\S]*grid-template-columns:\s*1fr !important/, 'AI troubleshooting should collapse to one mobile column');
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
