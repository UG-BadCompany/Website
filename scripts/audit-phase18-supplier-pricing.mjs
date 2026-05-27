#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const estimator = readFileSync(join(root, 'netlify/functions/create-job-request.mjs'), 'utf8');
[
  'SUPPLIER_INTELLIGENCE_VERSION',
  'inferSupplierCategory',
  'supplierOptionsForCategory',
  'buildSupplierPricingPlan',
  'appendSupplierNotesToMaterials',
  'supplierPricingPlan',
  'preferredSupplier',
  'fallbackSuppliers',
  'shouldVerifyLivePrice'
].forEach((needle) => estimator.includes(needle) ? ok(`${needle} present in estimator`) : fail(`${needle} missing in estimator`));

const admin = readFileSync(join(root, 'netlify/functions/admin-estimate-review.mjs'), 'utf8');
admin.includes('supplierPricingPlan') ? ok('supplierPricingPlan present in admin review') : fail('supplierPricingPlan missing in admin review');

const cssFile = 'public/assets/dashboard-phase18-supplier-pricing.css';
existsSync(join(root, cssFile)) ? ok(`${cssFile} exists`) : fail(`${cssFile} missing`);

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('/assets/dashboard-phase18-supplier-pricing.css') ? ok('phase18 css included') : fail('phase18 css missing');

const dashboardJs = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'renderSupplierPricing',
  'Supplier / pricing review',
  'supplierPricingPlan'
].forEach((needle) => dashboardJs.includes(needle) ? ok(`${needle} present in dashboard`) : fail(`${needle} missing in dashboard`));

if (failed) process.exit(1);
console.log('\nPhase 18 supplier pricing audit passed.');
