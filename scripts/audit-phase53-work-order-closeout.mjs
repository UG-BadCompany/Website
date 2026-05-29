import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const has = (file, regex, message) => {
  const text = read(file);
  if (!regex.test(text)) failures.push(`${file}: ${message}`);
};
const hasAll = (file, patterns, message) => patterns.forEach((pattern) => has(file, pattern, message));

const dashboard = read('public/dashboard/index.html');
const inlineScripts = [...dashboard.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
for (const [index, script] of inlineScripts.entries()) {
  if (/\burl\.searchParams\b|\burl\.pathname\b|\burl\.href\b/.test(script) && !/const\s+url\s*=\s*new\s+URL\(/.test(script)) {
    failures.push(`public/dashboard/index.html inline script ${index + 1}: bare url.* usage without local const url`);
  }
}
if (/const tokenFromDashboardUrl = url\.searchParams/.test(dashboard)) failures.push('public/dashboard/index.html: old url.searchParams runtime error is still present');

has('public/assets/dashboard-phase30-sidebar.js', /label: 'Inventory'[\s\S]*href: '\/inventory\/'/, 'sidebar Inventory must navigate to /inventory/');
has('public/assets/dashboard-phase30-sidebar.js', /data-sidebar-href/, 'sidebar href links must be rendered as real anchors');
has('public/assets/dashboard-phase30-sidebar.js', /canManageInventory[\s\S]*currentDashboardView/, 'Inventory sidebar permission sync must exist');
has('public/inventory/index.html', /Inventory control|data-inventory-pane-tab|data-admin-inventory-form/, 'inventory page/workspace must load with tabs and add item form');

hasAll('public/dashboard/index.html', [/data-admin-completion-review-panel/, /data-admin-completion-review-form/, /data-admin-work-order-invoice-readiness/, /data-worker-jobs/, /data-worker-job-list/, /data-admin-work-order-material-list/], 'closeout UI panels must exist');
hasAll('public/dashboard/modules/dashboard/bootstrap.js', [/getInvoiceReadinessBlocks/, /data-admin-completion-review-form/, /\/api\/admin\/work-orders\/review/, /data-worker-mark-complete/, /\/api\/worker\/jobs\/complete/, /data-worker-material-use/, /data-worker-material-release/, /\/api\/worker\/inventory\/use/, /\/api\/worker\/inventory\/release/], 'closeout JS must wire review, completion, inventory use/release, and invoice readiness');
hasAll('netlify/functions/admin-work-orders.mjs', [/handleCompletionReview/, /work_order\.completion_approved/, /work_order\.completion_rejected/, /waiting_payment/, /toStoredWorkOrderStatus/], 'admin work-orders completion review endpoint must exist');
hasAll('netlify/functions/worker-jobs.mjs', [/path\.endsWith\('\/complete'\)/, /completion_notes/, /completion_submitted_at/, /status = \$\{payload\.status\}/], 'worker complete endpoint must persist completion evidence');
hasAll('netlify/functions/worker-inventory.mjs', [/consumed_on_job/, /released_from_job/, /returned_from_worker/, /worker_assignments\.worker_id/], 'worker inventory closeout actions must exist and use worker_id');
has('netlify.toml', /from = "\/api\/worker\/jobs\/\*"[\s\S]*worker-jobs/, 'worker jobs wildcard redirect must exist');
has('netlify.toml', /from = "\/api\/admin\/work-orders\/\*"[\s\S]*admin-work-orders/, 'admin work-orders wildcard redirect must exist');

has('tests/work-order-closeout.spec.mjs', /sidebar Inventory click navigates|worker can mark job complete|admin can review completion|invoice readiness/, 'Phase 53 work-order closeout test must cover requested flows');
has('package.json', /"test:work-order-closeout"/, 'test:work-order-closeout npm script must exist');
has('package.json', /"audit:phase53"/, 'audit:phase53 npm script must exist');
if (existsSync(path.join(root, 'public/dashboard/index.html')) && /workspace-route-tabs/.test(dashboard) && !/display:\s*none\s*!important/.test(dashboard)) failures.push('old top workspace tabs appear restored');
if (!existsSync(path.join(root, 'PHASE_53_WORK_ORDER_CLOSEOUT.md'))) failures.push('PHASE_53_WORK_ORDER_CLOSEOUT.md is missing');

if (failures.length) {
  console.error('\nPhase 53 work-order closeout audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Phase 53 work-order closeout audit passed.');
