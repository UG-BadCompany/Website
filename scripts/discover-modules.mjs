import { promises as fs } from 'fs';
import path from 'path';
const roots=['modules','public/dashboard/modules'];
const manifests=[]; const ids=new Set();
async function exists(p){try{await fs.access(p);return true}catch{return false}}
async function walk(dir){if(!await exists(dir))return; for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()) await walk(p); else if(e.name==='module.json') manifests.push(p);}}
for(const r of roots) await walk(r);
const modules=[]; const permissions=[]; const mobile=[]; const routes=[]; const install=[]; const migrations=[];
for(const file of manifests){const m=JSON.parse(await fs.readFile(file,'utf8')); if(!m.id||!m.version||!m.name) throw new Error(`Invalid module manifest ${file}`); if(ids.has(m.id)) throw new Error(`Duplicate module id ${m.id}`); ids.add(m.id); const base=path.dirname(file); if(m.frontend?.entry && !(await exists(path.join(base,'frontend','module.js')))) throw new Error(`Missing frontend module.js for ${m.id}`); modules.push({...m, manifestPath:file}); for(const p of m.permissions||[]){if(permissions.some(x=>x.key===p.key)) throw new Error(`Duplicate permission ${p.key}`); permissions.push({...p,moduleId:m.id});} if(m.nav) mobile.push({moduleId:m.id,...m.nav,workspaces:m.workspaces}); if(m.api) routes.push({moduleId:m.id,handler:m.api.handler,routes:m.api.routes||[]}); install.push({moduleId:m.id,enabledByDefault:m.enabledByDefault!==false,dependencies:m.dependencies||[]}); migrations.push({moduleId:m.id,migrations:[]});}
modules.sort((a,b)=>(a.nav?.order||999)-(b.nav?.order||999));
await fs.mkdir('public/generated',{recursive:true}); await fs.mkdir('netlify/generated',{recursive:true});
await fs.writeFile('public/generated/module-registry.json',JSON.stringify({generatedAt:new Date().toISOString(),modules},null,2));
await fs.writeFile('public/generated/module-permissions.json',JSON.stringify({generatedAt:new Date().toISOString(),permissions},null,2));
await fs.writeFile('public/generated/module-mobile-nav.json',JSON.stringify({generatedAt:new Date().toISOString(),items:mobile},null,2));
await fs.writeFile('public/generated/module-routes.js',`window.TAModuleRegistry=${JSON.stringify({generatedAt:new Date().toISOString(),modules})};\n`);
await fs.writeFile('netlify/generated/module-api-registry.mjs',`export const moduleApiRegistry=${JSON.stringify({generatedAt:new Date().toISOString(),routes},null,2)};\n`);
await fs.writeFile('netlify/generated/module-install-plan.json',JSON.stringify({generatedAt:new Date().toISOString(),modules:install},null,2));
await fs.writeFile('netlify/generated/module-migrations.json',JSON.stringify({generatedAt:new Date().toISOString(),modules:migrations},null,2));
console.log(`Discovered ${modules.length} modules.`);
