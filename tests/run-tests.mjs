import { readFileSync, readdirSync, existsSync } from 'node:fs';
function ok(name, cond){ if(!cond){console.error('FAIL '+name); process.exitCode=1}else console.log('PASS '+name)}
ok('netlify publish is out', /publish = "out"/.test(readFileSync('netlify.toml','utf8')));
ok('functions folder is netlify/functions', /functions = "netlify\/functions"/.test(readFileSync('netlify.toml','utf8')));
ok('Next plugin skipped', /NETLIFY_NEXT_PLUGIN_SKIP = "true"/.test(readFileSync('netlify.toml','utf8')));
ok('no @netlify/plugin-nextjs package', !existsSync('node_modules/@netlify/plugin-nextjs') && !readFileSync('package.json','utf8').includes('@netlify/plugin-nextjs'));
const mig=readdirSync('netlify/database/migrations').filter(f=>f.endsWith('.sql')); ok('migrations start at 0001', mig[0].startsWith('0001_')); ok('migration numbers unique', new Set(mig.map(f=>f.slice(0,4))).size===mig.length);
const reg=JSON.parse(readFileSync('public/config/module-manifest.json','utf8')); ok('module registry generated', reg.modules.length>=10); ok('permissions unique', new Set(reg.modules.flatMap(m=>m.permissions.map(p=>p.key))).size===reg.modules.flatMap(m=>m.permissions).length);
const boot=readFileSync('public/config/bootstrap.json','utf8'); ok('bootstrap has no known secret key names', !/(OPENAI_API_KEY|RESEND_API_KEY|SQUARE_ACCESS_TOKEN|LICENSE_VERIFY_TOKEN|SMTP_PASSWORD)/.test(boot));
ok('install page output exists', existsSync('out/install/index.html')); ok('dashboard output exists', existsSync('out/dashboard/index.html'));
if(process.exitCode) process.exit(process.exitCode);
