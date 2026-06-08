import { promises as fs } from 'node:fs';
import path from 'node:path';

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function findManifests() {
  const roots = ['modules', 'public/dashboard/modules'];
  const files = [];
  for (const root of roots) {
    if (!(await exists(root))) continue;
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const direct = path.join(root, entry.name, 'module.json');
      if (await exists(direct)) files.push(direct);
      const nestedRoot = path.join(root, entry.name);
      for (const nested of await fs.readdir(nestedRoot, { withFileTypes: true }).catch(() => [])) {
        const nestedManifest = path.join(nestedRoot, nested.name, 'module.json');
        if (nested.isDirectory() && await exists(nestedManifest)) files.push(nestedManifest);
      }
    }
  }
  return [...new Set(files)].sort();
}
export async function discoverModules() {
  const manifests = await findManifests();
  const modules = [];
  for (const file of manifests) {
    const mod = JSON.parse(await fs.readFile(file, 'utf8'));
    modules.push({ ...mod, manifestPath: file.replace(/\\/g, '/') });
  }
  return modules.sort((a,b)=>(a.sidebar?.order||999)-(b.sidebar?.order||999));
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await discoverModules(), null, 2));
