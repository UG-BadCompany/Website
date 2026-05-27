#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const finance = readFileSync(join(root, 'netlify/functions/admin-finance-overview.mjs'), 'utf8');
[
  'PAYMENT_INTELLIGENCE_VERSION',
  'buildPaymentPlan',
  'readinessScore',
  'depositRecommended',
  'paymentStructure',
  'closeoutStatus',
  'paymentPlan: buildPaymentPlan'
].forEach((needle) => finance.includes(needle) ? ok(`${needle} present in finance endpoint`) : fail(`${needle} missing in finance endpoint`));

const css = 'public/assets/dashboard-phase22-payments.css';
existsSync(join(root, css)) ? ok(`${css} exists`) : fail(`${css} missing`);

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('/assets/dashboard-phase22-payments.css') ? ok('phase22 css included') : fail('phase22 css missing');

const js = readFileSync(join(root, 'public/assets/dashboard-phase4-finance.js'), 'utf8');
[
  'renderPaymentPlan',
  'Payment readiness',
  'invoice.paymentPlan',
  'deposit suggested',
  'needs checkout link'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present in dashboard`) : fail(`${needle} missing in dashboard`));

if (failed) process.exit(1);
console.log('\nPhase 22 payments/accounting audit passed.');
