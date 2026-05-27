#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const required = [
  'public/index.html','public/login/index.html','public/dashboard/index.html','public/thank-you/index.html','public/inventory/index.html',
  'public/portal/admin/index.html','public/portal/client/index.html','public/portal/worker/index.html',
  'netlify/functions/create-job-request.mjs','netlify/functions/admin-estimate-review.mjs','netlify/functions/admin-work-orders.mjs',
  'netlify/functions/admin-finance-overview.mjs','netlify/functions/admin-executive-overview.mjs','netlify/functions/system-health.mjs'
];
required.forEach((file)=>existsSync(join(root,file))?ok(`${file} exists`):fail(`${file} missing`));

const publicFiles = required.filter((file)=>file.startsWith('public/'));
const forbidden = [
  'temporary secure sign-in link',
  'html[data-theme="light"]',
  'AI Request Estimate',
  'Generate AI Quote',
  'Open work-order tools in a quick popup',
  'Open invoice tools in a quick popup',
  'Open inventory tools in a quick popup',
  'will be managed',
  'can later feed'
];

publicFiles.forEach((file)=>{
  const text = readFileSync(join(root,file),'utf8');
  forbidden.forEach((term)=> text.includes(term) ? fail(`${file} still contains unfinished copy: ${term}`) : ok(`${file} clean of: ${term}`));
});

const portalFiles = ['public/portal/admin/index.html','public/portal/client/index.html','public/portal/worker/index.html'];
portalFiles.forEach((file)=>{
  const text = readFileSync(join(root,file),'utf8');
  text.includes('/dashboard/?view=') ? ok(`${file} points to role dashboard`) : fail(`${file} does not point to role dashboard`);
});

const netlifyToml = readFileSync(join(root,'netlify.toml'),'utf8');
['/api/job-requests','/api/auth/magic-link','/api/admin/estimate-review','/api/admin/work-orders','/api/admin/finance-overview','/api/admin/executive-overview','/api/system-health']
  .forEach((route)=> netlifyToml.includes(`from = "${route}"`) ? ok(`${route} route exists`) : fail(`${route} route missing`));
if (failed) process.exit(1);
console.log('\nPhase 11 finish audit passed.');
