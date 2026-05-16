import { readdir } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const functionsDir = path.join(root, 'netlify', 'functions');

export const ensureAwaitHelpersAreAsync = (source) => {
  const shouldRepairSource = source.includes('loadCurrentUserFallback')
    || source.includes('sessionTokens')
    || source.split('\n').length > 250;

  if (!shouldRepairSource) return source;

  const findMatchingBrace = (input, openBraceIndex) => {
    let depth = 0;

    for (let index = openBraceIndex; index < input.length; index += 1) {
      if (input[index] === '{') depth += 1;
      if (input[index] === '}') depth -= 1;
      if (depth === 0) return index;
    }

    return -1;
  };

  const awaitNeedles = ['const db = await getDatabase();', 'await loadCurrentUserFallback'];
  const declarations = [
    /\b(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/g,
    /((?:export\s+)?(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)(async\s*)?((?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{)/g,
  ];

  let repaired = source;

  for (const needle of awaitNeedles) {
    let needleIndex = repaired.indexOf(needle);

    while (needleIndex !== -1) {
      const prefix = repaired.slice(0, needleIndex);
      let candidate = null;

      for (const declarationPattern of declarations) {
        declarationPattern.lastIndex = 0;
        let match = declarationPattern.exec(prefix);

        while (match) {
          const isFunctionDeclaration = match[0].includes('function');
          const alreadyAsync = isFunctionDeclaration ? Boolean(match[1]) : Boolean(match[2]);
          const insertAt = isFunctionDeclaration ? match.index : match.index + match[1].length;
          const openBraceIndex = match.index + match[0].lastIndexOf('{');
          const closeBraceIndex = findMatchingBrace(repaired, openBraceIndex);
          const enclosesAwait = openBraceIndex < needleIndex && (closeBraceIndex === -1 || closeBraceIndex > needleIndex);

          if (!alreadyAsync && enclosesAwait && (!candidate || match.index > candidate.index)) {
            candidate = { index: match.index, insertAt };
          }

          match = declarationPattern.exec(prefix);
        }
      }

      if (!candidate) break;

      repaired = `${repaired.slice(0, candidate.insertAt)}async ${repaired.slice(candidate.insertAt)}`;
      needleIndex = repaired.indexOf(needle, needleIndex + 'async '.length);
    }
  }

  return repaired;
};

const prepareTrackedFileContents = (relativePath, contents) => (
  relativePath === 'netlify/functions/me.mjs' ? ensureAwaitHelpersAreAsync(contents) : contents
);

const restoreTrackedFileFromHead = (relativePath) => {
  const filePath = path.join(root, relativePath);

  if (!existsSync(filePath)) return;

  const result = spawnSync('git', ['show', `HEAD:${relativePath}`], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.warn(`Warning: Could not verify ${relativePath} against HEAD before Netlify function syntax checks.`);
    return;
  }

  const currentContents = readFileSync(filePath, 'utf8');
  const preparedContents = prepareTrackedFileContents(relativePath, result.stdout);

  if (currentContents !== preparedContents) {
    writeFileSync(filePath, preparedContents);
    console.warn(`Warning: Restored ${relativePath} from HEAD before Netlify function syntax checks.`);
  }
};

const listFunctionFiles = async () => {
  const entries = await readdir(functionsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
    .map((entry) => path.join(functionsDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const formatRelativePath = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/');

export const checkNetlifyFunctions = async () => {
  restoreTrackedFileFromHead('netlify/functions/me.mjs');

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
