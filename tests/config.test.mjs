import test from 'node:test'; import assert from 'node:assert/strict'; import { envStatus, assertNoSecretLeak } from '../netlify/functions/_shared/config.mjs';
test('env status exposes only safe shape',()=>{process.env.OPENAI_API_KEY='secret-openai'; const s=envStatus(); assert.equal(typeof s.required.OPENAI_API_KEY,'boolean'); assert.throws(()=>assertNoSecretLeak({bad:'secret-openai'}));});
