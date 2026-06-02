import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };

const cssPath = 'public/assets/responsive-parity-2026.css';
if (!existsSync(path.join(root, cssPath))) fail(`${cssPath} is missing.`);
const css = existsSync(path.join(root, cssPath)) ? read(cssPath) : '';
const packageJson = read('package.json');

const requiredPages = [
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html',
  'public/inventory/index.html',
  'public/admin/index.html',
  'public/admin/ai-quotes/index.html',
  'public/portal/admin/index.html',
  'public/portal/client/index.html',
  'public/portal/worker/index.html',
  'public/portal/admin/audit-activity/index.html',
  'public/portal/admin/inventory/index.html',
  'public/portal/admin/invoices/index.html',
  'public/portal/admin/work-orders/index.html',
  'public/thank-you/index.html',
];

for (const file of requiredPages) {
  const html = read(file);
  if (!html.includes('/assets/responsive-parity-2026.css')) fail(`${file} must link the responsive parity layer.`);
}

for (const width of ['320px', '375px', '390px', '414px', '768px', '1024px', '1280px', '1440px', '1920px']) {
  if (!css.includes(width)) fail(`Responsive parity CSS must document/review the ${width} standard.`);
}

has(css, /Desktop review standard[\s\S]*@media\s*\(min-width:\s*1024px\)/, 'Desktop review breakpoint must exist at 1024px and above.');
has(css, /Mobile review standard[\s\S]*@media\s*\(max-width:\s*767px\)/, 'Mobile review breakpoint must exist below tablet width.');
has(css, /overflow-x:\s*clip/, 'Responsive parity CSS must guard against horizontal page overflow.');
has(css, /--parity-touch-target:\s*44px/, 'Responsive parity CSS must keep 44px minimum touch target standard.');
has(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(260px,\s*1fr\)\)/, 'Desktop cards must use responsive multi-column layouts.');
has(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'Tablet layouts must preserve two-column productivity where possible.');
has(css, /grid-template-columns:\s*1fr\s*!important/, 'Mobile layouts must collapse to one column.');
has(css, /table[\s\S]*overflow-x:\s*auto/, 'Tables must remain usable on mobile without breaking page width.');
has(css, /\.dashboard-hero[\s\S]*\.smart-intake-shell/, 'Desktop/mobile parity layer must cover major page and form shells.');
has(css, /\.admin-request-list[\s\S]*\.worker-job-list[\s\S]*\.admin-assignment-list/, 'Responsive parity layer must cover request, quote, job, and assignment card lists.');
has(css, /\.inventory-card-grid[\s\S]*\.phase54-grid/, 'Responsive parity layer must cover inventory and workspace module grids.');
has(css, /\.client-request-form-actions[\s\S]*\.mobile-evidence-actions/, 'Responsive parity layer must cover desktop and mobile action groups.');
has(css, /max-width:\s*var\(--parity-page-max\)/, 'Desktop layouts must define a large-screen maximum workspace.');
has(css, /@media\s*\(max-width:\s*360px\)/, 'Very small 320px-class phones must have a dedicated guard.');
has(packageJson, /"audit:responsive-parity"/, 'package.json missing audit:responsive-parity script.');

if (failures.length) {
  console.error('\nResponsive parity audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Responsive parity audit passed: desktop, tablet, and mobile standards are linked and guarded across the site.');
