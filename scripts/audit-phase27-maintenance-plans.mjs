#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
let failed=false;

const required=[
'public/assets/dashboard-phase27-maintenance-plans.css',
'public/assets/dashboard-phase27-maintenance-plans.js',
'public/dashboard/index.html'
];

for(const item of required){
 if(existsSync(join(root,item))) console.log('OK',item);
 else {console.log('MISS',item);failed=true;}
}

const dash=readFileSync(join(root,'public/dashboard/index.html'),'utf8');

if(!dash.includes('dashboard-phase27-maintenance-plans.js')) failed=true;

if(failed) process.exit(1);

console.log('Phase27 audit passed');
