import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
mkdirSync('public/config',{recursive:true});
let registry={modules:[]}; try{registry=JSON.parse(readFileSync('public/config/module-manifest.json','utf8'))}catch{}
writeFileSync('public/config/bootstrap.json', JSON.stringify({generatedAt:new Date().toISOString(),company:{name:'Contractor CMMS'},theme:{mode:'system',primary:'#2563eb',accent:'#14b8a6'},homepage:{heroTitle:'Reliable contractor service, ready when you are.'},modules:registry.modules.map(m=>({id:m.id,title:m.title,icon:m.icon,publicVisible:true}))},null,2));
console.log('Public bootstrap generated without secrets.');
