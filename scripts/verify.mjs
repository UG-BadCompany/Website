import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { modules } from '../netlify/functions/shared/core-data.mjs';
const requiredFiles=['netlify/functions/api.mjs','netlify/functions/shared/db.mjs','netlify/functions/shared/workflow.mjs','netlify/functions/shared/env-metadata.mjs','src/index.html','src/app.js','src/styles/app.css','Doc/migrations/001_core_platform.sql'];
let failures=[];
for(const f of requiredFiles){ try{await stat(f);}catch{failures.push(`Missing ${f}`);} }
await import('../netlify/functions/api.mjs');
const api=await readFile('netlify/functions/api.mjs','utf8');
if(!api.includes('export const handler=async')) failures.push('Netlify function handler export is missing or invalid');
for(const route of ['/install-status','/install/health','/install/bootstrap-database','/install/finish','/install/integration-status','/system/integration-status','/auth/magic-link','/workflow/transition','/health']) if(!api.includes(route)) failures.push(`Missing route ${route}`);
const netlify=await readFile('netlify.toml','utf8');
if(!netlify.includes('from = "/api/*"')||!netlify.includes('to = "/.netlify/functions/api/:splat"')||!netlify.includes('status = 200')) failures.push('Missing /api/* Netlify function redirect');
const pkg=JSON.parse(await readFile('package.json','utf8'));
if(!pkg.dependencies?.['@netlify/database']) failures.push('Missing @netlify/database client dependency in package.json');
if(!pkg.dependencies?.pg) failures.push('Missing pg database driver dependency in package.json');
const db=await readFile('netlify/functions/shared/db.mjs','utf8');
for(const table of ['platform_installation','company_settings','homepage_settings','app_users','roles','permissions','role_permissions','user_roles','workspace_access','module_registry','module_settings','service_categories','customers','customer_properties','estimate_requests','job_requests','quotes','quote_line_items','work_orders','work_order_assignments','schedule_events','inventory_items','inventory_transactions','invoices','payments','uploaded_files','files','ai_runs','workflow_events','audit_logs','magic_tokens','magic_link_tokens','platform_secret_settings','installer_drafts']) if(!db.includes(`create table if not exists ${table}`)) failures.push(`Missing table ${table}`);
for(const m of modules){ try{const raw=await readFile(`src/modules/${m.id}/manifest.json`,'utf8'); const json=JSON.parse(raw); if(!json.route||!json.permission||!json.features?.includes('workflow')) failures.push(`Incomplete manifest ${m.id}`);}catch{failures.push(`Missing manifest ${m.id}`);} }
const env=await readFile('netlify/functions/shared/env-metadata.mjs','utf8');
if(!env.includes('SERPAPI_API_KEY')) failures.push('SERPAPI_API_KEY missing');
if(env.includes('SERPAPI'+'_KEY')) failures.push('Wrong SerpAPI key present in env metadata');
if(api.includes('temporary JSON')||api.includes('fake success')) failures.push('Prototype persistence wording found');
try{await stat('out/index.html');}catch{console.warn('out/index.html not present yet; run npm run build before release verification.');}
if(failures.length){ console.error(failures.join('\n')); process.exit(1); }
console.log(`verify passed: ${modules.length} modules, core API routes, schema tables, workflow, auth, exact env metadata.`);
