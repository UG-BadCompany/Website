import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd(), out=path.join(root,'out');
await fs.rm(out,{recursive:true,force:true}); await fs.mkdir(out,{recursive:true});
execFileSync(process.execPath,[path.join(root,'scripts/discover-modules.mjs')],{stdio:'inherit'});
async function cp(src,dst){ await fs.mkdir(path.dirname(dst),{recursive:true}); await fs.copyFile(src,dst); }
async function copyDir(src,dst){ for (const ent of await fs.readdir(src,{withFileTypes:true}).catch(()=>[])){ const s=path.join(src,ent.name), d=path.join(dst,ent.name); if(ent.isDirectory()) await copyDir(s,d); else await cp(s,d); }}
await copyDir(path.join(root,'public'), out);
await copyDir(path.join(root,'src/frontend'), path.join(out,'assets/app'));
for (const dir of await fs.readdir(path.join(root,'modules'),{withFileTypes:true})) if(dir.isDirectory()) await copyDir(path.join(root,'modules',dir.name,'frontend'), path.join(out,'modules',dir.name,'frontend'));
const shell=(title, script, body='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/assets/app/ui/styles.css"><script type="module" src="/assets/app/auth/install-lock.js"></script></head><body data-protected="${script==='install'?'install':'protected'}"><div id="app">${body}</div><script type="module" src="/assets/app/${script}/${script==='public'?'public-shell':script==='dashboard'?'dashboard-app':'installer'}.js"></script></body></html>`;
await cp(path.join(root,'src/frontend/public/index.html'), path.join(out,'index.html'));
for (const [route,title,script] of [['install','Install','install'],['dashboard','Dashboard','dashboard'],['login','Login','public'],['portal','Portal','public'],['quote','Quote','public'],['invoice','Invoice','public']]) { await fs.mkdir(path.join(out,route),{recursive:true}); await fs.writeFile(path.join(out,route,'index.html'), shell(title,script)); }
console.log('Static site built to /out');
