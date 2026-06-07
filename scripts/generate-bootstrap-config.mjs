import { mkdir, readFile, writeFile } from 'node:fs/promises';
const registry=JSON.parse(await readFile('public/config/module-registry.json','utf8'));
const bootstrap={installation_complete:false,installer_first:true,no_secret_values:true,theme:{mode:'system',available:['light','dark','system','custom']},homepage:{headline:'Contractor operations, quoting, and service workflows in one place'},modules:registry.modules.map(m=>({id:m.id,name:m.name,status:m.status}))};
await mkdir('public/config',{recursive:true});
await writeFile('public/config/bootstrap.json', JSON.stringify(bootstrap,null,2));
console.log('Generated bootstrap config');
