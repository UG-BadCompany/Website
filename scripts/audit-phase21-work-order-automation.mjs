#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const fn = readFileSync(join(root, 'netlify/functions/admin-work-orders.mjs'), 'utf8');
[
  'WORK_ORDER_AUTOMATION_VERSION',
  'inferDispatchPriority',
  'buildAutomationPlan',
  'suggestedScheduleWindow',
  'assignmentNeeded',
  'overdue',
  'automation: buildAutomationPlan'
].forEach((needle) => fn.includes(needle) ? ok(`${needle} present in work-order endpoint`) : fail(`${needle} missing in work-order endpoint`));

const css = 'public/assets/dashboard-phase21-work-order-automation.css';
existsSync(join(root, css)) ? ok(`${css} exists`) : fail(`${css} missing`);

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('/assets/dashboard-phase21-work-order-automation.css') ? ok('phase21 css included') : fail('phase21 css missing');

const js = readFileSync(join(root, 'public/assets/dashboard-phase3-workflow.js'), 'utf8');
[
  'renderAutomationPlan',
  'Automation:',
  'item.automation',
  'Suggested schedule'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present in dashboard`) : fail(`${needle} missing in dashboard`));

if (failed) process.exit(1);
console.log('\nPhase 21 work-order automation audit passed.');
