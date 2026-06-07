import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const modulesDir=path.join(root,'modules');
const pub=path.join(root,'public/config/module-manifest.json');
const gen=path.join(root,'netlify/generated/module-registry.json');
function fail(msg){ console.error(msg); process.exitCode=1; }
async function exists(p){ try{ await fs.access(p); return true;}catch{return false;} }
const entries=(await fs.readdir(modulesDir,{withFileTypes:true}).catch(()=>[])).filter(d=>d.isDirectory()).map(d=>d.name).sort();
const modules=[]; const permissions=new Set();
for (const dir of entries){
  const file=path.join(modulesDir,dir,'module.json');
  if(!(await exists(file))) { fail(`Missing module.json for ${dir}`); continue; }
  const mod=JSON.parse(await fs.readFile(file,'utf8'));
  for (const k of ['schemaVersion','id','title','version','frontend']) if(!mod[k]) fail(`${dir} missing ${k}`);
  if(mod.id!==dir) fail(`${dir} folder id must match manifest id ${mod.id}`);
  const frontend=mod.frontend||{};
  for (const rel of [frontend.entry, frontend.html, frontend.css].filter(Boolean)) if(!(await exists(path.join(modulesDir,dir,'frontend',path.basename(rel))))) fail(`${mod.id} missing frontend file ${rel}`);
  for (const fn of mod.backend?.functions||[]) if(fn.file && !(await exists(path.join(modulesDir,dir,fn.file)))) fail(`${mod.id} missing backend file ${fn.file}`);
  for (const p of mod.permissions||[]) { if(permissions.has(p.key)) fail(`Duplicate permission ${p.key}`); permissions.add(p.key); }
  modules.push(mod);
}
const ids=new Set(modules.map(m=>m.id));
for (const m of modules) for (const dep of m.dependencies||[]) if(!ids.has(dep)) fail(`${m.id} dependency ${dep} not found`);
if(process.exitCode) process.exit(process.exitCode);
const registry={ generatedAt:new Date().toISOString(), modules };
await fs.mkdir(path.dirname(pub),{recursive:true}); await fs.writeFile(pub, JSON.stringify(registry,null,2));
await fs.mkdir(path.dirname(gen),{recursive:true}); await fs.writeFile(gen, JSON.stringify(registry,null,2));
console.log(`Discovered ${modules.length} modules.`);
