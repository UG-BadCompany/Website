import { stat } from 'node:fs/promises';
await stat('netlify/functions/api.mjs');
console.log('Netlify function entry exists');
