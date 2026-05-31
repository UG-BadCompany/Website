import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const ok = (message) => console.log(`✓ ${message}`);
const fail = (message) => failures.push(message);
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const has = (file, pattern, message) => (pattern.test(read(file)) ? ok(message) : fail(`${file}: ${message}`));
const hasAll = (file, patterns, message) => {
  const text = read(file);
  return patterns.every((pattern) => pattern.test(text)) ? ok(message) : fail(`${file}: ${message}`);
};
const exists = (file, message) => (existsSync(path.join(root, file)) ? ok(message) : fail(`${file}: ${message}`));

exists('tests/e2e-business-workflows.spec.mjs', 'real E2E workflow test file exists');
exists('PHASE_52_E2E_WORKFLOW_INVENTORY_QUOTE_INTEGRATION.md', 'Phase 52 documentation exists');

has('netlify/functions/admin-inventory.mjs', /reserveInventoryForJob[\s\S]*quantity_reserved = quantity_reserved \+/, 'inventory reservation code increases reserved quantity');
has('netlify/functions/admin-inventory.mjs', /releaseInventoryReservation[\s\S]*released_from_job/, 'inventory release action and movement type exist');
has('netlify/functions/admin-inventory.mjs', /consumed_on_job[\s\S]*used_quantity = least\(reserved_quantity, used_quantity \+/, 'consume action records movement and syncs reservation usage');
has('netlify/functions/worker-inventory.mjs', /useInventory[\s\S]*quantity_on_hand = quantity_on_hand -[\s\S]*quantity_reserved = greatest/, 'worker inventory usage endpoint consumes stock and reserved quantity');
has('netlify/functions/worker-inventory.mjs', /releaseReservedInventory[\s\S]*released_from_job/, 'worker unused material release endpoint exists');
has('public/assets/dashboard-phase2-upgrade.js', /Inventory Match & Reservation[\s\S]*data-estimate-reserve-inventory[\s\S]*data-estimate-release-inventory/, 'quote editor has Inventory Match & Reservation section');
hasAll('public/assets/dashboard-phase47-quote-editor-controller.js', [/data-estimate-reserve-inventory/, /api\/admin\/inventory\/\$\{action\}/], 'quote editor reservation buttons call real inventory API');
has('public/dashboard/index.html', /Job Materials[\s\S]*data-admin-work-order-material-list[\s\S]*data-admin-work-order-invoice-readiness/, 'work order material section exists');
has('public/dashboard/modules/dashboard/bootstrap.js', /renderAdminWorkOrderMaterials[\s\S]*data-admin-release-job-material[\s\S]*\/api\/admin\/inventory\/release/, 'work order materials render release action and call release endpoint');
has('netlify/functions/admin-estimate-rewrite.mjs', /materialBreakdown[\s\S]*inventoryMatchHint[\s\S]*estimatedQuantity/, 'AI rewrite includes structured materialBreakdown fields');
hasAll('netlify/functions/admin-estimate-review.mjs', [/buildInventoryMatches/, /confidenceForInventoryMatch/, /exact/, /strong/, /possible/, /no_match/], 'estimate review maps quote materials to inventory with confidence values');
has('netlify/functions/admin-quote-draft.mjs', /materialBreakdown[\s\S]*inventoryMatchHint/, 'AI quote draft returns structured materialBreakdown');
has('netlify.toml', /from = "\/api\/auth\/verify"[\s\S]*verify-magic-link/, 'Phase 51 auth verify route warning is handled');
has('netlify.toml', /from = "\/api\/admin\/square\/payment-link"[\s\S]*square-create-payment-link/, 'Phase 51 Square payment-link route warning is handled');
has('scripts/audit-dead-buttons.mjs', /API call[\s\S]*exact redirect\/function match/, 'dead-button audit still verifies API route coverage');

if (failures.length) {
  console.error('\nPhase 52 workflow audit failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('Phase 52 workflow audit passed.');
