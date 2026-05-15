import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const functionsDir = path.join(root, 'netlify', 'functions');

const listFunctionFiles = async () => {
  const entries = await readdir(functionsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
    .map((entry) => path.join(functionsDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const formatRelativePath = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/');

export const checkNetlifyFunctions = async () => {
  const functionFiles = await listFunctionFiles();
  const failures = [];

  for (const filePath of functionFiles) {
    const result = spawnSync(process.execPath, ['--check', filePath], {
      cwd: root,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      failures.push({
        file: formatRelativePath(filePath),
        output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
      });
    }
  }

  return {
    checked: functionFiles.map(formatRelativePath),
    failures,
  };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { checked, failures } = await checkNetlifyFunctions();

  if (failures.length) {
    console.error('Netlify function syntax check failed:');
    for (const failure of failures) {
      console.error(failure.file);
      if (failure.output) {
        console.error(failure.output);
      }
    }
    process.exit(1);
  }

  console.log(`Netlify function syntax check passed for ${checked.length} function files.`);
}
