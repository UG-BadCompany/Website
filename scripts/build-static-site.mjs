import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'public');
const outputDir = path.join(root, 'out');
const indexFile = path.join(sourceDir, 'index.html');

if (!existsSync(indexFile)) {
  throw new Error('Build failed: public/index.html is required to create the Netlify publish directory.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

console.log('Static site built successfully into ./out');
