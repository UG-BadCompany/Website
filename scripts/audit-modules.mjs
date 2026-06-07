import { readdir, readFile } from 'node:fs/promises';
let count=0; for(const d of await readdir('modules',{withFileTypes:true})) if(d.isDirectory()){ const m=JSON.parse(await readFile(`modules/${d.name}/module.json`,'utf8')); for(const key of ['id','name','description','permissions','routes']) if(!m[key]) throw new Error(`${d.name} missing ${key}`); count++; }
if(count<18) throw new Error(`Expected core modules, found ${count}`); console.log(`Audited ${count} modules`);
