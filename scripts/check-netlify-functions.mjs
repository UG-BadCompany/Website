import { access } from 'node:fs/promises';
const required=['netlify/functions/install-status.mjs','netlify/functions/install-health.mjs','netlify/functions/install-draft.mjs','netlify/functions/install-finish.mjs','netlify/functions/integration-status.mjs','netlify/functions/auth-magic-login.mjs'];
for (const file of required) await access(file);
console.log('Netlify function check passed.');
