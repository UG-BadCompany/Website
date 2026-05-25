import assert from 'node:assert/strict';
import test from 'node:test';
import { createEstimateSuggestionsHandler } from '../netlify/functions/estimate-suggestions.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });

test('estimate suggestions endpoint returns db prompts plus fallback essentials', async () => {
  const handler = createEstimateSuggestionsHandler({
    getDatabase: async () => ({
      sql: async () => ([
        {
          id: 1,
          trigger_terms: 'mini split,minisplit',
          prompt_text: 'About how many feet of electrical will need to be run for the mini split install?',
          service_filter: '',
          scope_filter: 'new install,installation',
          category_filter: 'hvac',
        },
      ]),
    }),
  });

  const response = await readJson(await handler(new Request('https://site.test/api/estimate-suggestions?q=mini%20split%20new%20install&scope=New%20install&category=HVAC')));

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(Array.isArray(response.body.suggestions), true);
  assert.ok(response.body.suggestions.some((item) => item.includes('electrical')));
  assert.ok(response.body.suggestions.some((item) => item.includes('Exact job location')));
});
