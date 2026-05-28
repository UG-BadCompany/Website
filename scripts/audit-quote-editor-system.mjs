import { readFile } from 'node:fs/promises';

const fail = (m) => { throw new Error(m); };
const ok = (m) => console.log(`✓ ${m}`);

const files = {
  controller: 'public/assets/dashboard-phase47-quote-editor-controller.js',
  reviewFn: 'netlify/functions/admin-estimate-review.mjs',
  rewriteFn: 'netlify/functions/admin-estimate-rewrite.mjs',
  dashboard: 'public/dashboard/index.html',
};

const [controller, reviewFn, rewriteFn, dashboard] = await Promise.all([
  readFile(files.controller, 'utf8'),
  readFile(files.reviewFn, 'utf8'),
  readFile(files.rewriteFn, 'utf8'),
  readFile(files.dashboard, 'utf8'),
]);

if (!controller.includes('[data-estimate-edit-form]')) fail('Quote editor controller missing [data-estimate-edit-form] selector.');
ok('Quote editor controller exists with estimate form selector');

if (!rewriteFn.includes('export default async (request)')) fail('AI rewrite endpoint missing export default handler.');
ok('AI rewrite endpoint exists');

if (!reviewFn.includes("if (!['GET', 'PATCH'].includes(request.method))")) fail('Estimate review endpoint PATCH support missing.');
ok('Estimate review endpoint supports PATCH');

if (!dashboard.includes('/assets/dashboard-phase47-quote-editor-controller.js')) fail('Dashboard missing quote editor controller script include.');
ok('Dashboard includes quote editor controller script');

const requiredSelectors = [
  '[data-estimate-edit-form]',
  '[data-ai-rewrite-estimate]',
  '[data-cancel-estimate-edit]',
  '[data-save-send-estimate]',
  '[data-estimate-title]',
  '[data-estimate-amount]',
  '[data-estimate-summary]',
  '[data-estimate-missing-info]',
  '[data-estimate-edit-status]',
  '[data-estimate-rewrite-notes]',
];
for (const selector of requiredSelectors) {
  if (!controller.includes(selector) && !dashboard.includes(selector.replace('[', '').replace(']', ''))) {
    fail(`Required selector missing: ${selector}`);
  }
}
ok('Required selectors exist');

const requiredHandlers = [
  '[data-ai-rewrite-estimate]',
  '[data-cancel-estimate-edit]',
  '[data-save-send-estimate]',
  "document.addEventListener('submit'",
];
for (const marker of requiredHandlers) {
  if (!controller.includes(marker)) fail(`Missing required handler marker: ${marker}`);
}
ok('Save Draft, Cancel Edits, AI Rewrite, and Save & Send handlers exist');

if (!rewriteFn.includes('adminReviewChecklist') || !rewriteFn.includes('customerClarifications')) {
  fail('AI rewrite endpoint missing adminReviewChecklist/customerClarifications.');
}
ok('AI rewrite endpoint includes adminReviewChecklist and customerClarifications');

console.log('\nQuote editor system audit passed.');
