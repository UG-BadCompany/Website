const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html',
  'netlify/functions/create-job-request.mjs',
  'netlify/functions/request-magic-link.mjs',
  'netlify/functions/admin-estimate-review.mjs',
  'netlify/functions/admin-work-orders.mjs',
  'netlify/functions/admin-finance-overview.mjs',
  'netlify/functions/admin-executive-overview.mjs',
  'netlify/functions/system-health.mjs',
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase3-workflow.js',
  'public/assets/dashboard-phase4-finance.js',
  'public/assets/dashboard-phase5-executive.js',
  'public/assets/dashboard-phase6-ai-estimates.css',
  'public/assets/dashboard-phase7-ux.js',
  'public/assets/dashboard-phase8-readiness.js',
];

const requiredRoutes = [
  '/api/job-requests',
  '/api/auth/magic-link',
  '/api/me',
  '/api/admin/estimate-review',
  '/api/admin/work-orders',
  '/api/admin/finance-overview',
  '/api/admin/executive-overview',
  '/api/system-health',
  '/api/square/create-payment-link',
];

const problems = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) problems.push(`Missing required file: ${file}`);
}

const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
for (const route of requiredRoutes) {
  if (!toml.includes(`from = "${route}"`)) problems.push(`Missing Netlify redirect: ${route}`);
}

const publicFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|js|css)$/.test(entry.name)) publicFiles.push(full);
  }
};
walk(path.join(root, 'public'));

for (const file of publicFiles) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  if (rel !== 'public/assets/site-cleanup.js' && /AI Request Estimate|Generate AI Quote/i.test(text)) {
    problems.push(`Customer-facing AI quote wording remains in ${rel}`);
  }
}

if (problems.length) {
  console.error('Phase 8 audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Phase 8 audit passed. Required files, routes, and cleanup checks look good.');
