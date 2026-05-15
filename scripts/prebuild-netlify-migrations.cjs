const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const migrationsDir = join(__dirname, '..', 'netlify', 'database', 'migrations');

const rootDir = join(__dirname, '..');

const isNetlifyBuild = () => (
  process.env.NETLIFY === 'true'
  || Boolean(process.env.CONTEXT)
  || Boolean(process.env.BUILD_ID)
  || Boolean(process.env.DEPLOY_ID)
);

const restoreTrackedFileFromHead = (relativePath) => {
  if (!isNetlifyBuild()) return;

  const filePath = join(rootDir, relativePath);

  try {
    const headContents = execFileSync('git', ['show', `HEAD:${relativePath}`], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const currentContents = readFileSync(filePath, 'utf8');

    if (currentContents !== headContents) {
      writeFileSync(filePath, headContents);
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
