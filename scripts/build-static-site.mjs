import { promises as fs } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
async function copy(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    for (const entry of await fs.readdir(src)) await copy(path.join(src, entry), path.join(dest, entry));
  } else await fs.copyFile(src, dest);
}
await fs.rm(path.join(root, 'out'), { recursive: true, force: true });
await copy(path.join(root, 'public'), path.join(root, 'out'));
await fs.mkdir(path.join(root, 'out/config'), { recursive: true });
try { await fs.access(path.join(root, 'out/config/bootstrap.json')); } catch {
  await fs.writeFile(path.join(root, 'out/config/bootstrap.json'), JSON.stringify({ generatedAt: new Date().toISOString(), installed: false, company: { displayName: 'Your Contractor Team' }, theme: { mode: 'system' }, modulesConfigUrl: '/config/module-manifest.json' }, null, 2));
}
console.log('Static site built to out/.');
