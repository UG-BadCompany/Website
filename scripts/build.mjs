import { mkdirSync, rmSync, copyFileSync, writeFileSync, readdirSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const out = join(root, 'out');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const modulesDir = join(root, 'modules');
const registry = readdirSync(modulesDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(modulesDir, d.name, 'module.json')))
  .map(d => JSON.parse(readFileSync(join(modulesDir, d.name, 'module.json'), 'utf8')))
  .sort((a,b) => (a.nav?.order ?? 999) - (b.nav?.order ?? 999));
mkdirSync(join(out, 'assets'), { recursive: true });
writeFileSync(join(out, 'assets', 'module-registry.json'), JSON.stringify({ generatedAt: new Date().toISOString(), modules: registry }, null, 2));
writeFileSync(join(out, 'bootstrap.json'), JSON.stringify({ installationComplete: false, moduleCount: registry.length, modules: registry.map(m => ({ id: m.id, route: m.route, permissions: m.permissions.map(p => p.key) })) }, null, 2));
for (const file of ['index.html','app.css','app.js']) copyFileSync(join(root, 'src', file), join(out, file));
writeFileSync(join(out, '_redirects'), `/api/* /.netlify/functions/api/:splat 200\n/* /index.html 200\n`);
cpSync(modulesDir, join(out, 'modules'), { recursive: true });
console.log(`Built static platform with ${registry.length} drop-in modules to out/`);
