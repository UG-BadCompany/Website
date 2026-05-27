#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
let failed=false;
const req=[
'public/assets/dashboard-phase25-inventory-assets.css',
'public/assets/dashboard-phase25-inventory-assets.js',
'public/dashboard/index.html'
];
for(const item of req){
 if(existsSync(join(root,item))) console.log('OK',item);
 else {console.log('MISS',item);failed=true;}
}
const dash=readFileSync(join(root,'public/dashboard/index.html'),'utf8');
if(!dash.includes('dashboard-phase25-inventory-assets.js')) failed=true;
if(failed) process.exit(1);
console.log('Phase25 audit passed');
