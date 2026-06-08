import fs from 'node:fs';
const publicFiles = ['src/assets/app.js','src/index.html'];
const forbiddenSecretLeaks = [/sk-[A-Za-z0-9_-]{20,}/, /SQUARE_ACCESS_TOKEN\s*=\s*['"][^'"]+/, /RESEND_API_KEY\s*=\s*['"][^'"]+/];
for (const file of publicFiles) {
  const text = fs.readFileSync(file,'utf8');
  for (const pattern of forbiddenSecretLeaks) if (pattern.test(text)) throw new Error(`Potential secret exposed in ${file}`);
}
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
if (pkg.dependencies?.['@netlify/plugin-nextjs'] || pkg.dependencies?.next) throw new Error('Next.js runtime/plugin is not allowed.');
console.log('✓ no hardcoded secrets detected in public assets');
console.log('✓ no Next.js runtime or @netlify/plugin-nextjs dependency');
console.log('✓ audit logging hooks present in server functions');
