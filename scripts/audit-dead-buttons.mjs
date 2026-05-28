import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const ok = (message) => console.log(`✓ ${message}`);
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const walk = (dir, predicate, out = []) => {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, predicate, out);
    else if (predicate(rel)) out.push(rel);
  }
  return out;
};

const htmlFiles = walk('public', (file) => file.endsWith('.html'));
const jsFiles = [
  ...walk('public/assets', (file) => file.endsWith('.js')),
  ...walk('public/dashboard/modules', (file) => file.endsWith('.js')),
];
const netlifyToml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');

const attr = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] || '';
const attrs = (tag) => tag.match(/^<\w+\b([^>]*)>/i)?.[1] || '';
const textOf = (tag) => tag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const publicPathExists = (href) => {
  const clean = href.split(/[?#]/)[0];
  return existsSync(path.join(root, 'public', clean, 'index.html')) || existsSync(path.join(root, 'public', clean));
};

for (const file of htmlFiles) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));

  for (const script of html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const src = script[1];
    if (src.startsWith('/') && !existsSync(path.join(root, 'public', src))) fail(`${file}: script reference ${src} is missing`);
  }

  for (const link of html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    const href = link[1];
    if (href.startsWith('/') && !existsSync(path.join(root, 'public', href))) fail(`${file}: stylesheet/asset reference ${href} is missing`);
  }

  for (const anchor of html.matchAll(/<a\b[\s\S]*?<\/a>/gi)) {
    const tag = anchor[0];
    const href = attr(tag, 'href');
    if (!href) fail(`${file}: anchor "${textOf(tag)}" is missing href`);
    if (href.startsWith('#') && href.length > 1 && !ids.has(href.slice(1))) fail(`${file}: hash link ${href} has no matching id`);
    if (href.startsWith('/') && !href.startsWith('/api/') && !publicPathExists(href)) fail(`${file}: local link ${href} does not resolve in public/`);
  }

  for (const button of html.matchAll(/<button\b[\s\S]*?<\/button>/gi)) {
    const tag = button[0];
    const a = attrs(tag);
    const label = textOf(tag);
    const purposeful = /\bdata-[\w-]+\b|\bonclick=|\bdisabled\b|\bhidden\b|type=["'](?:submit|reset)["']|aria-label=|form=|id=/.test(a);
    if (!purposeful) fail(`${file}: button "${label || a}" has no handler hook, submit/reset semantics, id/form, or disabled state`);
    if (/coming soon|placeholder|todo|not wired|fake/i.test(label) && !/\bdisabled\b|aria-disabled=["']true["']/.test(a)) fail(`${file}: placeholder-like button "${label}" is not disabled with an explanation`);
  }

  if (/workspace-route-tabs/.test(html) && !/display:\s*none\s*!important/.test(html)) fail(`${file}: old workspace tabs appear to be restored`);
}

const apiCalls = new Set();
for (const file of [...htmlFiles, ...jsFiles]) {
  const text = readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/fetch\(\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g)) apiCalls.add(match[1].split(/[?#]/)[0]);
}
for (const api of apiCalls) {
  const normalized = api.replace(/\/$/, '');
  if (normalized.includes('${')) continue;
  const hasRedirect = netlifyToml.includes(`from = "${normalized}"`) || netlifyToml.includes(`from = "${normalized}/*"`);
  const functionName = normalized.replace(/^\/api\//, '').replaceAll('/', '-');
  const hasFunction = existsSync(path.join(root, 'netlify/functions', `${functionName}.mjs`));
  if (!hasRedirect && !hasFunction) warn(`API call ${api} has no exact redirect/function match; verify dynamic fallback is intentional.`);
}

if (warnings.length) {
  console.warn('\nDead-button audit warnings:');
  warnings.forEach((message) => console.warn(`- ${message}`));
}
if (failures.length) {
  console.error('\nDead-button audit failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

ok(`${htmlFiles.length} HTML files scanned for buttons, hrefs, scripts, and stale workspace tabs`);
ok(`${jsFiles.length} JS files scanned for API redirect coverage`);
console.log('Dead-button audit passed.');
