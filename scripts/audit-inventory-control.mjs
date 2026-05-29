import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];
const ok = (message) => console.log(`✓ ${message}`);
const fail = (message) => failures.push(message);
const requireFile = (file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`);

requireFile('public/inventory/index.html');
requireFile('netlify/functions/admin-inventory.mjs');
requireFile('netlify/functions/worker-inventory.mjs');
requireFile('netlify/database/migrations/0029_inventory_control_system.sql');

const inventoryHtml = read('public/inventory/index.html');
const adminApi = read('netlify/functions/admin-inventory.mjs');
const workerApi = read('netlify/functions/worker-inventory.mjs');
const migration = read('netlify/database/migrations/0029_inventory_control_system.sql');
const dashboard = read('public/dashboard/index.html');
const authUtils = read('netlify/functions/auth-utils.mjs');
const netlifyToml = read('netlify.toml');

[
  'Overview', 'Items', 'Low Stock', 'Locations', 'Workers/Trucks', 'Job Reservations',
  'Tools/Equipment', 'Suppliers', 'Purchase/Restock', 'Cycle Count', 'Movement History',
  'data-admin-inventory-form', 'data-admin-inventory-list', 'data-inventory-reservation-form',
  'data-inventory-transfer-form', 'data-inventory-count-form', 'data-inventory-scan-input',
].forEach((needle) => inventoryHtml.includes(needle) ? ok(`inventory UI includes ${needle}`) : fail(`inventory UI missing ${needle}`));

[
  'inventory_items', 'inventory_locations', 'inventory_movements', 'inventory_reservations',
  'inventory_suppliers', 'inventory_purchase_orders', 'inventory_purchase_order_items',
  'inventory_counts', 'inventory_count_items', 'inventory_assets', 'barcode_value', 'qr_value',
].forEach((needle) => migration.includes(needle) ? ok(`migration includes ${needle}`) : fail(`migration missing ${needle}`));

[
  '/api/admin/inventory', '/api/admin/inventory/*', '/api/worker/inventory', '/api/worker/inventory/*',
].forEach((route) => netlifyToml.includes(`from = "${route}"`) ? ok(`${route} route exists`) : fail(`${route} route missing`));

[
  'reserveInventoryForJob', 'transferInventory', 'recordCycleCount', 'markReorderStatus',
  'inventory_movements', 'inventory_reservations', 'quantity_reserved', 'barcodeValue', 'ai_quote_catalog_key',
].forEach((needle) => adminApi.includes(needle) ? ok(`admin inventory API includes ${needle}`) : fail(`admin inventory API missing ${needle}`));

[
  'createWorkerInventoryHandler', 'useInventory', 'returnInventory', 'requestInventory', 'damaged_lost',
].forEach((needle) => workerApi.includes(needle) ? ok(`worker inventory API includes ${needle}`) : fail(`worker inventory API missing ${needle}`));

dashboard.includes('href="/inventory/"') ? ok('dashboard links to inventory workspace page') : fail('dashboard inventory workspace link missing');
authUtils.includes('admin.inventory.manage') ? ok('admin inventory permission exists') : fail('admin inventory permission missing');
!authUtils.match(/client[^\n]+admin\.inventory\.manage/) ? ok('client defaults do not grant inventory') : fail('client role appears to grant inventory');

if (failures.length) {
  console.error('\nInventory control audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nInventory control audit passed.');
