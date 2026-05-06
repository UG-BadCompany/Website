import { access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const publishDir = path.join(root, 'public');
const indexFile = path.join(publishDir, 'index.html');

try {
  await access(indexFile);
} catch {
  throw new Error('Build failed: public/index.html is required because Netlify publishes the public directory.');
}

console.log('Static site validated successfully. Netlify will publish ./public');
