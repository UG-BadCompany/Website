import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dashboard = read('public/dashboard/index.html');
const moduleCss = read('public/assets/module-completion-2026.css');
const mobileCss = read('public/assets/mobile-field-ux.css');
const failures = [];
const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };

has(moduleCss, /--module-bg:[\s\S]*rgba\(15, 23, 42/, 'Module polish CSS must use dark navy/slate surfaces.');
has(moduleCss, /--module-orange:[\s\S]*#fb923c/, 'Module polish CSS must keep copper/orange accents.');
has(moduleCss, /border-radius:\s*28px/, 'Module polish CSS must use modern rounded cards.');
has(moduleCss, /admin-invoices[\s\S]*admin-access[\s\S]*worker-jobs[\s\S]*smart-schedule-suite[\s\S]*maintenance-suite/, 'Module polish CSS must cover old and new dashboard modules.');
has(moduleCss, /input[\s\S]*select[\s\S]*textarea[\s\S]*background:\s*rgba\(2,6,23/, 'Forms must be restyled away from old white inputs.');
has(mobileCss, /--mobile-tap:\s*44px/, 'Phase 55 mobile tap target standard must remain.');
has(mobileCss, /mobile-quick-action-bar/, 'Phase 55 mobile quick action bar must remain.');
has(dashboard, /module-completion-2026\.css[\s\S]*mobile-field-ux\.css|mobile-field-ux\.css[\s\S]*module-completion-2026\.css/, 'Dashboard must include both mobile and module completion CSS.');

const forbidden = [
  /Invoice &amp; payment desk/i,
  /class="[^"]*(?:old|legacy|gray-panel|white-table)[^"]*"/i,
  /<table[^>]*class="[^"]*(?:white|light|gray)[^"]*"/i,
  /SQUARE_ACCESS_TOKEN=|DATABASE_URL=|RESEND_API_KEY=/,
];
for (const pattern of forbidden) {
  if (pattern.test(dashboard)) fail(`Dashboard contains forbidden legacy/secret pattern: ${pattern}`);
}

if (failures.length) {
  console.error('\nUI consistency audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('UI consistency audit passed: target modules use modern dark/copper styling and mobile UX is preserved.');
