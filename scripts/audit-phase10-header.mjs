#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
let failed = false;
const ok = (message) => console.log(`✅ ${message}`);
const fail = (message) => { console.error(`❌ ${message}`); failed = true; };
const required = ['public/assets/header-phase10.css','public/assets/dashboard-phase10-refine.css','public/dashboard/index.html','public/index.html','public/login/index.html'];
required.forEach((file)=>existsSync(join(root,file))?ok(`${file} exists`):fail(`${file} missing`));
const dashboard = readFileSync(join(root,'public/dashboard/index.html'),'utf8');
const home = readFileSync(join(root,'public/index.html'),'utf8');
const login = readFileSync(join(root,'public/login/index.html'),'utf8');
[['dashboard header css',dashboard],['home header css',home],['login header css',login]].forEach(([label,text])=>{text.includes('/assets/header-phase10.css')?ok(`${label} included`):fail(`${label} missing`)});
dashboard.includes('dashboard-quick-nav')?ok('dashboard quick nav exists'):fail('dashboard quick nav missing');
dashboard.includes('#executive-overview')?ok('owner view quick link exists'):fail('owner view quick link missing');
dashboard.includes('#estimate-review')?ok('estimate review quick link exists'):fail('estimate review quick link missing');
dashboard.includes('#finance-command-center')?ok('finance quick link exists'):fail('finance quick link missing');
if(failed)process.exit(1);
console.log('\nPhase 10 header/dashboard audit passed.');
