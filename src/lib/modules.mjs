import fs from 'fs';
import path from 'path';

export function discoverModules(root = process.cwd()) {
  const modulesDir = path.join(root, 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  return fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(modulesDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return { ...manifest, folder: entry.name };
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

export function validateModuleCompatibility(modules, platformVersion = '1.0.0') {
  const ids = new Set(modules.map((module) => module.id));
  return modules.map((module) => {
    const missingDependencies = (module.dependencies || []).filter((dep) => !ids.has(dep));
    const compatible = !missingDependencies.length && (module.minimumPlatform || '1.0.0') <= platformVersion;
    return { ...module, compatible, missingDependencies };
  });
}
