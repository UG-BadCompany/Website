import { promises as fs } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const modulesDir = path.join(root, 'modules');
const required = ['id','title','version','category','description','workspaces','frontend','backend','permissions'];
const modules = [];
const ids = new Set();
const permissions = new Set();
for (const dirent of await fs.readdir(modulesDir, { withFileTypes: true }).catch(() => [])) {
  if (!dirent.isDirectory()) continue;
  const file = path.join(modulesDir, dirent.name, 'module.json');
  const raw = await fs.readFile(file, 'utf8');
  const mod = JSON.parse(raw);
  for (const key of required) if (!(key in mod)) throw new Error(`${file} missing ${key}`);
  if (ids.has(mod.id)) throw new Error(`Duplicate module id ${mod.id}`);
  ids.add(mod.id);
  const frontendPath = path.join(modulesDir, dirent.name, mod.frontend.entry);
  await fs.access(frontendPath);
  for (const perm of mod.permissions || []) {
    if (permissions.has(perm.key)) throw new Error(`Duplicate permission ${perm.key}`);
    permissions.add(perm.key);
  }
  modules.push({ ...mod, path: `modules/${dirent.name}`, api: mod.backend?.routes || [] });
}
for (const mod of modules) for (const dep of mod.dependencies || []) if (!ids.has(dep)) throw new Error(`${mod.id} depends on unknown module ${dep}`);
const registry = { generatedAt: process.env.BUILD_TIMESTAMP || '1970-01-01T00:00:00.000Z', modules: modules.sort((a,b) => a.title.localeCompare(b.title)) };
await fs.mkdir(path.join(root, 'public/config'), { recursive: true });
await fs.mkdir(path.join(root, 'netlify/generated'), { recursive: true });
await fs.writeFile(path.join(root, 'public/config/module-manifest.json'), JSON.stringify(registry, null, 2));
await fs.writeFile(path.join(root, 'netlify/generated/module-registry.json'), JSON.stringify(registry, null, 2));
console.log(`Discovered ${modules.length} modules and ${permissions.size} permissions.`);
