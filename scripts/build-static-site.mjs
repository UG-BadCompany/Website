import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('out', { recursive: true, force: true });
await mkdir('out', { recursive: true });
await cp('public', 'out', { recursive: true });
await writeFile('out/config-bootstrap.json', JSON.stringify({ ok: true, theme: 'database-driven', generatedAt: new Date().toISOString() }, null, 2));
console.log('Static site built to /out.');
