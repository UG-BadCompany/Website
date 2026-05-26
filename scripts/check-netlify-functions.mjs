import { readdir } from 'node:fs/promises';
import path from 'node:path';

const dir = path.join(process.cwd(), 'netlify', 'functions');
try {
  const files = await readdir(dir);
  console.log(`Netlify functions found: ${files.filter((f) => f.endsWith('.mjs')).length}`);
} catch {
  console.log('No netlify/functions directory found.');
}
