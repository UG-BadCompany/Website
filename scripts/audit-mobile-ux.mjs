import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };

const cssPath = 'public/assets/mobile-field-ux.css';
if (!existsSync(path.join(root, cssPath))) fail('public/assets/mobile-field-ux.css is missing.');
const mobileCss = existsSync(path.join(root, cssPath)) ? read(cssPath) : '';
const dashboard = read('public/dashboard/index.html');
const inventory = read('public/inventory/index.html');
const sidebar = read('public/assets/dashboard-phase30-sidebar.js');
const bootstrap = read('public/dashboard/modules/dashboard/bootstrap.js');
const packageJson = read('package.json');

for (const file of [
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html',
  'public/inventory/index.html',
  'public/portal/admin/index.html',
  'public/portal/client/index.html',
  'public/portal/worker/index.html',
]) {
  const html = read(file);
  if (!html.includes('/assets/mobile-field-ux.css')) fail(`${file} must link the mobile UX layer.`);
}

has(mobileCss, /@media\s*\(max-width:\s*820px\)/, 'Mobile CSS must define a phone/tablet breakpoint.');
has(mobileCss, /overflow-x:\s*clip|overflow-x:\s*hidden/, 'Mobile CSS must guard against horizontal overflow.');
has(mobileCss, /--mobile-tap:\s*44px/, 'Mobile CSS must define 44px tap target standard.');
has(mobileCss, /\.dashboard-sidebar-v2[\s\S]*position:\s*fixed/, 'Mobile sidebar drawer CSS is missing.');
has(mobileCss, /\.dashboard-sidebar-backdrop/, 'Mobile sidebar backdrop CSS is missing.');
has(mobileCss, /mobile-quick-action-bar[\s\S]*position:\s*sticky/, 'Sticky mobile quick action bar CSS is missing.');
has(mobileCss, /mobile-modal-sheet|admin-request-modal-panel[\s\S]*100dvh/, 'Mobile modal sheet CSS is missing.');
has(mobileCss, /mobile-sticky-actions[\s\S]*position:\s*sticky/, 'Sticky mobile action classes are missing.');
has(mobileCss, /inventory-mobile-card/, 'Inventory mobile card CSS hook is missing.');
has(mobileCss, /worker-mobile-card/, 'Worker mobile card CSS hook is missing.');
has(mobileCss, /worker-ai-troubleshooting-suite/, 'AI Troubleshooting mobile CSS hook is missing.');

has(dashboard, /id="worker-mobile-field"[\s\S]*class="[^"]*worker-mobile-suite|class="[^"]*worker-mobile-suite[\s\S]*id="worker-mobile-field"/, 'Worker Mobile workspace is missing.');
has(dashboard, /id="smart-schedule-suite"/, 'Scheduling workspace is missing while sidebar uses it.');
has(dashboard, /class="[^"]*photo-doc-suite/, 'Photo Docs workspace is missing while sidebar uses it.');
has(dashboard, /id="worker-ai-troubleshooting"[\s\S]*data-ai-troubleshooting-form/, 'AI Troubleshooting workspace is missing while sidebar uses it.');
has(dashboard, /class="[^"]*maintenance-suite/, 'Maintenance workspace is missing while sidebar uses it.');
has(dashboard, /data-admin-quote-form[\s\S]*data-admin-quote-ai-draft[\s\S]*data-admin-quote-submit/, 'Mobile quote editor critical actions are missing.');
has(dashboard, /data-client-request-form[\s\S]*type="file"[\s\S]*Save request/, 'Client mobile request form and upload field are missing.');
has(dashboard, /mobile-sticky-action-source/, 'Dashboard must mark critical mobile sticky action areas.');
has(inventory, /inventory-mobile-card|inventory-card-grid/, 'Inventory page must expose mobile card layout hooks.');
has(inventory, /data-inventory-scan|SKU|barcode|QR/i, 'Inventory mobile scan/SKU lookup must exist.');

has(sidebar, /mobileQuickActions/, 'Sidebar must define mobile quick actions.');
has(sidebar, /data-sidebar-toggle|sidebarToggle/, 'Sidebar mobile drawer toggle is missing.');
has(sidebar, /data-sidebar-close/, 'Sidebar mobile close button is missing.');
has(sidebar, /data-sidebar-backdrop|sidebarBackdrop/, 'Sidebar mobile backdrop is missing.');
has(sidebar, /href: '\/inventory\/'/, 'Inventory sidebar link must remain /inventory/.');
has(sidebar, /Troubleshoot[\s\S]*ai-troubleshooting/, 'Worker/admin mobile quick actions must include Troubleshoot.');

has(bootstrap, /data-ai-troubleshooting-form[\s\S]*\/api\/worker\/ai-troubleshooting/, 'AI Troubleshooting generate action must call its worker endpoint.');
has(bootstrap, /data-mobile-use-material[\s\S]*\/api\/worker\/inventory\/use/, 'Worker mobile material usage must call worker inventory use endpoint.');
has(bootstrap, /data-mobile-return-material[\s\S]*\/api\/worker\/inventory\/\$\{action\}/, 'Worker mobile return/release material path must be wired.');
has(bootstrap, /data-mobile-request-material[\s\S]*\/api\/worker\/inventory\/request/, 'Worker mobile stock request must call worker inventory request endpoint.');
has(bootstrap, /data-mobile-before-photo[\s\S]*\/api\/job-files|data-mobile-after-photo[\s\S]*\/api\/job-files/, 'Worker mobile photo buttons must explain or route to evidence handling.');

const suspiciousFixedWidths = [...mobileCss.matchAll(/(?:width|min-width|max-width):\s*(\d{3,})px/g)].filter((match) => {
  const context = match.input.slice(Math.max(0, match.index - 50), match.index + 80);
  return Number(match[1]) > 430 && !/100vw|max-width:\s*820px/.test(context);
});
if (suspiciousFixedWidths.length) fail(`Mobile CSS includes large fixed widths: ${suspiciousFixedWidths.slice(0, 5).map((m) => m[0]).join(', ')}`);

has(packageJson, /"test:mobile-ux"/, 'package.json missing test:mobile-ux.');
has(packageJson, /"audit:mobile-ux"/, 'package.json missing audit:mobile-ux.');
has(packageJson, /"audit:phase55"/, 'package.json missing audit:phase55.');

if (failures.length) {
  console.error('\nMobile UX audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Mobile UX audit passed: mobile CSS, drawer, sticky actions, worker field flow, inventory cards, and scripts are wired.');
