import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const functionsDir = path.join(root, 'netlify', 'functions');
const entries = await readdir(functionsDir, { withFileTypes: true });
const functionFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
  .map((entry) => path.join(functionsDir, entry.name))
  .sort();

const failures = [];

for (const file of functionFiles) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    failures.push({ file: path.relative(root, file), stderr: result.stderr || result.stdout });
  }
}

if (failures.length) {
  console.error('Netlify function syntax check failed:');
  for (const failure of failures) {
    console.error(`\n${failure.file}`);
    console.error(failure.stderr.trim());
  }
  process.exit(1);
}

console.log(`Netlify function syntax verified: ${functionFiles.length} file${functionFiles.length === 1 ? '' : 's'}.`);
