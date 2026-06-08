import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = 'src/modules';
const entries = [];
for (const name of await readdir(root)) {
  const manifestPath = path.join(root, name, 'manifest.json');
  try { entries.push(JSON.parse(await readFile(manifestPath, 'utf8'))); } catch {}
}
entries.sort((a,b)=>a.id.localeCompare(b.id));
await mkdir('src/generated', { recursive:true });
await writeFile('src/generated/module-registry.json', JSON.stringify({ generatedAt:new Date().toISOString(), modules:entries }, null, 2));
console.log(`Discovered ${entries.length} drop-in modules.`);
