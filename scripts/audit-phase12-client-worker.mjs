#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd(); let failed=false;
const ok=(m)=>console.log(`✅ ${m}`); const fail=(m)=>{console.error(`❌ ${m}`); failed=true;};
['public/assets/dashboard-phase12-client-worker.css','public/assets/dashboard-phase12-client-worker.js','public/dashboard/index.html','netlify/functions/client-job-requests.mjs','netlify/functions/client-quotes.mjs','netlify/functions/client-invoices.mjs','netlify/functions/worker-jobs.mjs'].forEach((f)=>existsSync(join(root,f))?ok(`${f} exists`):fail(`${f} missing`));
const dashboard=readFileSync(join(root,'public/dashboard/index.html'),'utf8');
dashboard.includes('/assets/dashboard-phase12-client-worker.css')?ok('phase12 css included'):fail('phase12 css missing');
dashboard.includes('/assets/dashboard-phase12-client-worker.js')?ok('phase12 js included'):fail('phase12 js missing');
const js=readFileSync(join(root,'public/assets/dashboard-phase12-client-worker.js'),'utf8');
['/api/client/job-requests','/api/client/quotes','/api/client/invoices','/api/worker/jobs','client-tools-upgrade','worker-tools-upgrade','worker-blocked-note'].forEach((n)=>js.includes(n)?ok(`${n} present`):fail(`${n} missing`));
const toml=readFileSync(join(root,'netlify.toml'),'utf8');
['/api/client/job-requests','/api/client/quotes','/api/client/invoices','/api/worker/jobs'].forEach((r)=>toml.includes(`from = "${r}"`)?ok(`${r} redirect exists`):fail(`${r} redirect missing`));
if(failed)process.exit(1);
console.log('\nPhase 12 client/worker audit passed.');
