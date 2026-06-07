import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const modulesDir = path.join(root, 'modules');
const publicConfigDir = path.join(root, 'public/config');
const generatedDir = path.join(root, 'netlify/generated');
function fail(msg){ console.error(`Module discovery failed: ${msg}`); process.exit(1); }
async function exists(p){ try { await fs.access(p); return true; } catch { return false; } }
const ids = new Set(); const permissions = new Set(); const modules = [];
for (const name of (await fs.readdir(modulesDir)).sort()) {
  const dir = path.join(modulesDir, name); const stat = await fs.stat(dir); if (!stat.isDirectory()) continue;
  const manifestPath = path.join(dir, 'module.json'); if (!(await exists(manifestPath))) fail(`${name} missing module.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  for (const key of ['schemaVersion','id','title','version','category','workspaces','frontend','backend','permissions']) if (manifest[key] === undefined) fail(`${name} missing ${key}`);
  if (!/^[a-z0-9-]+$/.test(manifest.id)) fail(`${name} has invalid id`);
  if (ids.has(manifest.id)) fail(`duplicate module id ${manifest.id}`); ids.add(manifest.id);
  if (manifest.id !== name) fail(`folder ${name} must match id ${manifest.id}`);
  for (const f of [manifest.frontend.entry, manifest.frontend.html, manifest.frontend.css]) if (!(await exists(path.join(dir, 'frontend', f)))) fail(`${manifest.id} missing frontend/${f}`);
  for (const fn of manifest.backend.functions || []) if (!(await exists(path.join(dir, fn.file)))) fail(`${manifest.id} missing ${fn.file}`);
  for (const perm of manifest.permissions || []) { if (!perm.key) fail(`${manifest.id} permission missing key`); if (permissions.has(perm.key)) fail(`duplicate permission ${perm.key}`); permissions.add(perm.key); }
  modules.push({ ...manifest, discoveredPath: `modules/${name}` });
}
for (const mod of modules) for (const dep of mod.dependencies || []) if (!ids.has(dep)) fail(`${mod.id} depends on missing ${dep}`);
const registry = { generatedAt: new Date().toISOString(), modules: modules.sort((a,b)=>(a.nav?.sortOrder||0)-(b.nav?.sortOrder||0)) };
await fs.mkdir(publicConfigDir, { recursive: true }); await fs.mkdir(generatedDir, { recursive: true });
await fs.writeFile(path.join(publicConfigDir, 'module-manifest.json'), JSON.stringify(registry, null, 2));
await fs.writeFile(path.join(generatedDir, 'module-registry.json'), JSON.stringify(registry, null, 2));
console.log(`Discovered ${modules.length} drop-in modules.`);
