import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'out');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.mkdirSync(path.join(out, 'config'), { recursive: true });
fs.copyFileSync('src/index.html', 'out/index.html');
fs.copyFileSync('src/assets/styles.css', 'out/assets/styles.css');
fs.copyFileSync('src/assets/app.js', 'out/assets/app.js');

const modules = discoverModules();
fs.writeFileSync('out/config/modules.json', JSON.stringify({ generatedAt: new Date().toISOString(), modules }, null, 2));
fs.writeFileSync('src/config/modules.generated.json', JSON.stringify({ generatedAt: new Date().toISOString(), modules }, null, 2));
const bootstrap = {
  version: '1.0.0',
  installationLockEnabled: true,
  installationRoute: '/install/',
  publicSafe: true,
  theme: { mode: 'system', primaryColor: '#2563eb', accentColor: '#14b8a6', sidebarColor: '#111827', mobileNavColor: '#111827' },
  homepage: { blockedUntilInstallComplete: true },
  moduleCount: modules.length
};
fs.writeFileSync('out/config/bootstrap.json', JSON.stringify(bootstrap, null, 2));
fs.writeFileSync('out/_redirects', '/* /index.html 200\n');
copyModuleEntries(modules);
console.log(`Built static site to out with ${modules.length} drop-in modules.`);

function discoverModules() {
  const base = path.join(root, 'modules');
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const manifestPath = path.join(base, d.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      for (const key of ['id','name','version','minimumPlatform','nav','permissions','entry']) if (!manifest[key]) throw new Error(`Module ${d.name} missing ${key}`);
      return manifest;
    })
    .filter(Boolean)
    .sort((a,b)=>(a.nav?.order||0)-(b.nav?.order||0));
}
function copyModuleEntries(modules) {
  for (const mod of modules) {
    const src = path.join(root, 'modules', mod.id, 'entry.js');
    const destDir = path.join(out, 'modules', mod.id);
    fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destDir, 'entry.js'));
  }
}
