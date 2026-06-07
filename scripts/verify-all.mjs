import fs from 'node:fs/promises';
function assert(cond,msg){ if(!cond){ console.error(`VERIFY FAIL: ${msg}`); process.exitCode=1; } }
async function read(f){ return fs.readFile(f,'utf8'); }
const netlify = await read('netlify.toml');
assert(netlify.includes('publish = "out"'),'Netlify publish must be out');
assert(netlify.includes('functions = "netlify/functions"'),'Netlify functions configured');
assert(netlify.includes('NETLIFY_NEXT_PLUGIN_SKIP'),'Next plugin skip set');
assert(!netlify.includes('@netlify/plugin-nextjs'), 'No Netlify Next plugin');
const installer = await read('public/assets/js/public/installer.js');
assert(installer.includes('/api/install/finish'),'Installer calls real finish endpoint');
assert(installer.includes('input type=\"color\"'),'Installer uses color inputs');
assert(installer.includes('Required') && installer.includes('Environment & Integrations'),'Installer includes grouped env UX');
const lock = await read('public/assets/js/core/install-lock.js');
for (const r of ['/dashboard/','/login/','/portal/','/client/','/quote/','/invoice/','/admin/','/manager/','/worker/']) assert(lock.includes(r),`Install lock protects ${r}`);
const registry = JSON.parse(await read('public/config/module-manifest.json'));
assert(registry.modules.length >= 15, 'Core modules discovered');
assert(registry.modules.some(m=>m.id==='module-manager'), 'Module manager present');
assert(registry.modules.some(m=>m.id==='ai-photo-estimate'), 'AI photo estimate present');
assert(registry.modules.every(m=>m.frontend && m.backend && m.permissions), 'Modules have contracts');
const env = await read('netlify/functions/shared/env-metadata.mjs');
for (const key of ['SITE_URL','MAGIC_LINK_FROM_EMAIL','RESEND_API_KEY','OPENAI_API_KEY','SQUARE_ACCESS_TOKEN']) assert(env.includes(key),`Env metadata includes ${key}`);
const workflow = await read('netlify/functions/shared/workflow-service.mjs');
for (const s of ['request_received','quote_draft','work_order_created','invoice_sent','paid','archived']) assert(workflow.includes(s),`Workflow has ${s}`);
if(!process.exitCode) console.log('verify:all passed');
