#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const create = readFileSync(join(root, 'netlify/functions/create-job-request.mjs'), 'utf8');
[
  'ACCURACY_RULES_VERSION',
  'detectEstimateFactors',
  'applyEstimateAccuracyModifiers',
  'calculateQuoteConfidence',
  'buildQuoteOptions',
  'Accuracy review:',
  'accuracyRulesVersion',
  'quoteOptions'
].forEach((needle) => create.includes(needle) ? ok(`${needle} present in estimator`) : fail(`${needle} missing in estimator`));

const admin = readFileSync(join(root, 'netlify/functions/admin-estimate-review.mjs'), 'utf8');
['accuracyReview', 'quoteOptions', 'factors', 'accuracyRulesVersion'].forEach((needle) => admin.includes(needle) ? ok(`${needle} present in admin review`) : fail(`${needle} missing in admin review`));

const css = 'public/assets/dashboard-phase17-ai-accuracy.css';
existsSync(join(root, css)) ? ok(`${css} exists`) : fail(`${css} missing`);

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('/assets/dashboard-phase17-ai-accuracy.css') ? ok('phase17 css included') : fail('phase17 css not included');

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
['renderAccuracyReview', 'renderQuoteOptions', 'Accuracy review', 'Quote options'].forEach((needle) => js.includes(needle) ? ok(`${needle} present in dashboard js`) : fail(`${needle} missing in dashboard js`));

if (failed) process.exit(1);
console.log('\nPhase 17 AI quote accuracy audit passed.');
