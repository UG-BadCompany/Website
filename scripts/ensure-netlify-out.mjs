import { access, cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'out');
const publicDir = path.join(root, 'public');
const outIndex = path.join(outDir, 'index.html');
const publicIndex = path.join(publicDir, 'index.html');
const requiredOutputPaths = [
  ['index.html', path.join(outDir, 'index.html')],
  ['404.html', path.join(outDir, '404.html')],
  ['assets/', path.join(outDir, 'assets')],
  ['dashboard/', path.join(outDir, 'dashboard')],
];

try {
  await access(outIndex);
  console.log('Netlify publish directory verified: ./out');
} catch {
  if (!existsSync(publicIndex)) {
    throw new Error('Netlify publish directory ./out is missing and public/index.html is unavailable as a fallback.');
  }

  await mkdir(outDir, { recursive: true });
  await cp(publicDir, outDir, { recursive: true });
  console.log('Created Netlify publish directory ./out from ./public fallback.');
}

const missingOutputPaths = [];

for (const [label, outputPath] of requiredOutputPaths) {
  try {
    await access(outputPath);
  } catch {
    missingOutputPaths.push(label);
  }
}

if (missingOutputPaths.length > 0) {
  throw new Error(`Netlify publish directory ./out is missing required output: ${missingOutputPaths.join(', ')}`);
}

console.log('OUT DIRECTORY VERIFIED');
