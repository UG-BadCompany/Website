import fs from 'fs';
import assert from 'node:assert/strict';
const files = ['src/assets/app.js','src/config/bootstrap.json','netlify/functions/_lib/store.js'];
const secretPatterns = [/sk-[A-Za-z0-9_-]{20,}/,/SQUARE_ACCESS_TOKEN\s*[:=]\s*['"][^'"]+['"]/,/RESEND_API_KEY\s*[:=]\s*['"][^'"]+['"]/];
for (const file of files) {
  const text = fs.readFileSync(file,'utf8');
  for (const pattern of secretPatterns) assert.doesNotMatch(text, pattern, `${file} exposes a secret-like value`);
}
const app = fs.readFileSync('src/assets/app.js','utf8');
assert.match(app,/No hardcoded customer branding or exposed secrets/);
assert.match(app,/Environment & Integrations/);
assert.match(app,/audit log entry created/);
console.log('audit:all passed.');
