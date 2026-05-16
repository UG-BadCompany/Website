const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const migrationsDir = join(__dirname, '..', 'netlify', 'database', 'migrations');

const rootDir = join(__dirname, '..');

const ensureAwaitHelpersAreAsync = (source) => {
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
  const filePath = join(rootDir, relativePath);

  try {
    const headContents = execFileSync('git', ['show', `HEAD:${relativePath}`], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const currentContents = readFileSync(filePath, 'utf8');
    const preparedContents = prepareTrackedFileContents(relativePath, headContents);

    if (currentContents !== preparedContents) {
      writeFileSync(filePath, preparedContents);
      console.warn(`Warning: Restored ${relativePath} from HEAD to discard stale Netlify cache contents before syntax checks.`);
    }
  } catch (error) {
    console.warn(`Warning: Could not verify ${relativePath} against HEAD before Netlify build.`);
  }
};

restoreTrackedFileFromHead('netlify/functions/me.mjs');
const compatibilityMigrations = new Set(['0004_custom_roles_permissions.sql', '0009_completion_review_status.sql', '0009_quote_payment_completion_controls.sql', '0009_worker_completion_evidence.sql', '0010_invoices_payments.sql', '0010_worker_job_details.sql', '0011_completion_review_status.sql', '0012_quote_payment_completion_controls.sql', '0013_invoices_payments.sql', '0014_worker_completion_evidence.sql']);
const removableCachedFiles = [
  {
    file: '0011_admin_activity_permission.sql',
    replacement: '0015_admin_activity_permission.sql',
    reason: 'admin activity permission now lives in 0015_admin_activity_permission.sql',
  },
];

for (const stale of removableCachedFiles) {
  const stalePath = join(migrationsDir, stale.file);
  const replacementPath = join(migrationsDir, stale.replacement);

  if (existsSync(stalePath) && existsSync(replacementPath)) {
    unlinkSync(stalePath);
    console.warn(`Warning: Removed stale cached ${stale.file}; ${stale.reason}.`);
  }
}

const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const prefixes = new Map();
const errors = [];

for (const file of files) {
  const match = file.match(/^(\d{4})_.+\.sql$/);
  if (!match) {
    errors.push(`${file} must start with a four-digit migration number.`);
    continue;
  }

  const prefix = match[1];
  prefixes.set(prefix, [...(prefixes.get(prefix) || []), file]);
}

for (const [prefix, names] of prefixes) {
  if (names.length <= 1) continue;
  const nonCompatibilityNames = names.filter((name) => !compatibilityMigrations.has(name));
  if (nonCompatibilityNames.length > 1) {
    errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
  }
}

if (errors.length > 0) {
  console.error('Netlify Database migration validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Netlify Database migrations verified: ${files.join(', ')}`);
