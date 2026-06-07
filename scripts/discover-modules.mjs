import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const root='modules';
const modules=[];
if (existsSync(root)) for (const entry of await readdir(root,{withFileTypes:true})) if(entry.isDirectory()) { const manifest=JSON.parse(await readFile(`${root}/${entry.name}/module.json`,'utf8')); modules.push(manifest); }
modules.sort((a,b)=>a.name.localeCompare(b.name));
await mkdir('public/config',{recursive:true});
await mkdir('netlify/functions/shared',{recursive:true});
await writeFile('public/config/module-registry.json', JSON.stringify({generated_at:new Date().toISOString(),modules},null,2));
await writeFile('netlify/functions/shared/module-registry.mjs', `export const modules = ${JSON.stringify(modules,null,2)};\n`);
console.log(`Discovered ${modules.length} modules`);
