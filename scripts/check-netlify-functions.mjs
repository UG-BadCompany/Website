import fs from 'node:fs';
const required = ['install-status.js','install-finish.js','install-draft.js','env-status.js','env-save.js','health.js','modules-dispatch.js','workflow.js'];
const missing = required.filter(f => !fs.existsSync(`netlify/functions/${f}`));
if (missing.length) throw new Error(`Missing Netlify functions: ${missing.join(', ')}`);
console.log(`Netlify functions ready: ${required.length}`);
