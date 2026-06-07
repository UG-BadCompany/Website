import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), modulesDir=path.join(root,'modules'), outDir=path.join(root,'generated');
const required=['id','title','description','version','workspace','category','enabledByDefault','permissions','routes','nav'];
const modules=[];
for(const name of fs.existsSync(modulesDir)?fs.readdirSync(modulesDir).sort():[]){
  const dir=path.join(modulesDir,name); if(!fs.statSync(dir).isDirectory()) continue;
  const manifestPath=path.join(dir,'module.json'); if(!fs.existsSync(manifestPath)) continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  for(const key of required) if(!(key in manifest)) throw new Error(`${name}/module.json missing ${key}`);
  if(manifest.id!==name) throw new Error(`${name}/module.json id must match folder name`);
  modules.push({...manifest, assets:{html:`/modules/${name}/module.html`,js:`/modules/${name}/module.js`,css:`/modules/${name}/module.css`}});
}
const registry={generatedAt:new Date().toISOString(), modules, routes:modules.flatMap(m=>m.routes.map(r=>({...r,moduleId:m.id}))), sidebar:modules.filter(m=>m.nav).map(m=>({...m.nav,moduleId:m.id})).sort((a,b)=>(a.order||0)-(b.order||0)), mobileNav:modules.filter(m=>m.mobileNav).map(m=>({...m.mobileNav,moduleId:m.id})), permissions:Object.fromEntries(modules.map(m=>[m.id,m.permissions||[]])), managerList:modules.map(({id,title,description,version,workspace,category,enabledByDefault,dependencies,icon})=>({id,title,description,version,workspace,category,enabledByDefault,dependencies,icon})), homepageSections:modules.flatMap(m=>(m.homepageSections||[]).map(s=>({...s,moduleId:m.id}))), installerSteps:modules.flatMap(m=>(m.installerSteps||[]).map(step=>({step,moduleId:m.id})))};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'module-registry.json'),JSON.stringify(registry,null,2));
fs.writeFileSync(path.join(outDir,'module-registry.mjs'),`export const registry = ${JSON.stringify(registry,null,2)};\nexport default registry;\n`);
console.log(`Generated registry for ${modules.length} modules.`);
