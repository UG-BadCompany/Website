#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const files=[
'public/assets/dashboard-phase24-photo-documentation.css',
'public/assets/dashboard-phase24-photo-documentation.js',
'public/dashboard/index.html'
];
let failed=false;
for(const f of files){
 if(existsSync(join(root,f))) console.log('OK',f);
 else {console.log('MISS',f);failed=true;}
}
const dash=readFileSync(join(root,'public/dashboard/index.html'),'utf8');
if(!dash.includes('dashboard-phase24-photo-documentation.js')) failed=true;
if(failed) process.exit(1);
console.log('Phase24 audit passed');
