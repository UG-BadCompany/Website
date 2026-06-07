import fs from 'node:fs/promises';
import path from 'node:path';
const registry = JSON.parse(await fs.readFile('public/config/module-manifest.json','utf8'));
const bootstrap = { ok: true, installed: false, company: { companyName: 'Your Company', businessType: 'Contractor Services' }, theme: { mode: 'system', primary: '#2563eb', accent: '#f97316', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', border: '#cbd5e1', button: '#2563eb', buttonText: '#ffffff' }, modules: registry.modules.map(({id,title,category,icon,version,workspaces,nav,enabledByDefault})=>({id,title,category,icon,version,workspaces,nav,enabledByDefault})), generatedAt: new Date().toISOString() };
await fs.mkdir('public/config',{recursive:true});
await fs.writeFile('public/config/bootstrap.json', JSON.stringify(bootstrap,null,2));
console.log('Generated bootstrap config without secrets.');
