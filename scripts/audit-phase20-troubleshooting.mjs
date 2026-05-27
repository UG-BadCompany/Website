#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const estimator = readFileSync(join(root, 'netlify/functions/create-job-request.mjs'), 'utf8');
[
  'TROUBLESHOOTING_ENGINE_VERSION',
  'buildTroubleshootingPlan',
  'recommendedMode',
  'diagnosticQuestions',
  'repairVsReplaceGuidance',
  'safetyStopFlags',
  'troubleshootingPlan'
].forEach((needle) => estimator.includes(needle) ? ok(`${needle} present in estimator`) : fail(`${needle} missing in estimator`));

const admin = readFileSync(join(root, 'netlify/functions/admin-estimate-review.mjs'), 'utf8');
admin.includes('troubleshootingPlan') ? ok('troubleshootingPlan present in admin review') : fail('troubleshootingPlan missing in admin review');

const css = 'public/assets/dashboard-phase20-troubleshooting.css';
existsSync(join(root, css)) ? ok(`${css} exists`) : fail(`${css} missing`);

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('/assets/dashboard-phase20-troubleshooting.css') ? ok('phase20 css included') : fail('phase20 css missing');

const dashboardJs = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'renderTroubleshootingPlan',
  'Troubleshooting / diagnostic review',
  'troubleshootingPlan'
].forEach((needle) => dashboardJs.includes(needle) ? ok(`${needle} present in dashboard`) : fail(`${needle} missing in dashboard`));

if (failed) process.exit(1);
console.log('\nPhase 20 troubleshooting audit passed.');
