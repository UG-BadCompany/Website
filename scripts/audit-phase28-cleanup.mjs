#!/usr/bin/env node
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
let failed=false;
const ok=(m)=>console.log('OK',m);
const fail=(m)=>{console.error('MISS',m);failed=true;};

const required=[
'public/assets/dashboard-phase28-cleanup.css',
'public/assets/dashboard-phase28-cleanup.js',
'public/dashboard/index.html',
'public/assets/dashboard-phase27-maintenance-plans.js',
'public/assets/dashboard-phase26-smart-scheduling.js',
'public/assets/dashboard-phase25-inventory-assets.js',
'public/assets/dashboard-phase24-photo-documentation.js'
];
for(const f of required){existsSync(join(root,f))?ok(f):fail(f)}

const dash=readFileSync(join(root,'public/dashboard/index.html'),'utf8');
[
'dashboard-phase28-cleanup.css',
'dashboard-phase28-cleanup.js',
'dashboard-phase27-maintenance-plans.js',
'dashboard-phase26-smart-scheduling.js',
'dashboard-phase25-inventory-assets.js',
'dashboard-phase24-photo-documentation.js'
].forEach(s=>dash.includes(s)?ok('dashboard includes '+s):fail('dashboard missing '+s));

const publicFiles=[
'public/index.html',
'public/login/index.html',
'public/dashboard/index.html',
'public/thank-you/index.html',
'public/inventory/index.html'
];
for(const file of publicFiles){
 const text=readFileSync(join(root,file),'utf8');
 if(text.includes('html[data-theme="light"]')) fail(file+' contains light theme selector');
 else ok(file+' no light selector');
}

if(failed) process.exit(1);
console.log('Phase28 cleanup audit passed');
