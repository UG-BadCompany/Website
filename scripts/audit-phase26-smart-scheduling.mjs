#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
let failed=false;

const required=[
'public/assets/dashboard-phase26-smart-scheduling.css',
'public/assets/dashboard-phase26-smart-scheduling.js',
'public/dashboard/index.html'
];

for(const item of required){
 if(existsSync(join(root,item))) console.log('OK',item);
 else {console.log('MISS',item);failed=true;}
}

const dash=readFileSync(join(root,'public/dashboard/index.html'),'utf8');

if(!dash.includes('dashboard-phase26-smart-scheduling.js')) failed=true;

if(failed) process.exit(1);

console.log('Phase26 audit passed');
