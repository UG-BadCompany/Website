import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd(), modRoot=join(root,'modules');
const modules=[], perms=new Set(), errors=[];
for (const dir of readdirSync(modRoot,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort()) {
  const mf=join(modRoot,dir,'module.json'); if(!existsSync(mf)) continue;
  let m; try{m=JSON.parse(readFileSync(mf,'utf8'));}catch(e){errors.push(`${dir}: invalid JSON`); continue;}
  for (const k of ['schemaVersion','id','title','version','category','frontend','permissions']) if(!(k in m)) errors.push(`${dir}: missing ${k}`);
  if(m.id!==dir) errors.push(`${dir}: id must match folder`);
  const fe=m.frontend||{}; for(const f of [fe.entry, fe.html, fe.css].filter(Boolean)) if(!existsSync(join(modRoot,dir,'frontend',f))) errors.push(`${m.id}: missing frontend/${f}`);
  for (const fn of (m.backend?.functions||[])) if(!existsSync(join(modRoot,dir,fn.file))) errors.push(`${m.id}: missing ${fn.file}`);
  for (const p of (m.permissions||[])) { if(!p.key) errors.push(`${m.id}: permission missing key`); if(perms.has(p.key)) errors.push(`duplicate permission ${p.key}`); perms.add(p.key); }
  modules.push(m);
}
const ids=new Set(modules.map(m=>m.id));
for (const m of modules) for (const d of (m.dependencies||[])) if(!ids.has(d)) errors.push(`${m.id}: unknown dependency ${d}`);
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
const registry={generatedAt:new Date().toISOString(),modules};
mkdirSync('public/config',{recursive:true}); mkdirSync('netlify/generated',{recursive:true});
writeFileSync('public/config/module-manifest.json', JSON.stringify(registry,null,2));
writeFileSync('netlify/generated/module-registry.json', JSON.stringify(registry,null,2));
console.log(`Discovered ${modules.length} modules.`);
