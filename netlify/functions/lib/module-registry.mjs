import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
export function loadModules() {
  const root = resolve(process.cwd());
  const dir = join(root, 'modules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(dir, d.name, 'module.json')))
    .map(d => JSON.parse(readFileSync(join(dir, d.name, 'module.json'), 'utf8')))
    .sort((a,b) => (a.nav?.order ?? 999) - (b.nav?.order ?? 999));
}
export function generatedPermissions(modules = loadModules()) {
  return modules.flatMap(module => module.permissions.map(permission => ({ ...permission, moduleId: module.id, label: `${module.name}: ${permission.action}` })));
}
