import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mobile admin has a dedicated quotes workspace and quote card controls', async () => {
  const html = await readFile('public/dashboard/index.html', 'utf8');
  assert.match(html, /id="admin-quotes-workspace"/);
  assert.match(html, /data-admin-quotes-workspace data-dashboard-section data-views="admin"/);
  assert.match(html, /data-admin-quote-status-filter/);
  assert.match(html, /data-admin-quote-search/);
  assert.match(html, /data-admin-quote-list/);
  assert.match(html, /data-admin-quote-save-draft/);
  assert.match(html, /data-admin-quote-send-client/);
  assert.match(html, /data-admin-quote-close/);
});

test('admin request modal exposes mobile-safe workflow tabs and quote anchors', async () => {
  const html = await readFile('public/dashboard/index.html', 'utf8');
  const css = await readFile('public/assets/mobile-field-ux.css', 'utf8');
  const bootstrap = await readFile('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');
  assert.match(html, /data-admin-detail-jump="request"[\s\S]*data-admin-detail-jump="quote"[\s\S]*data-admin-detail-jump="work-order"[\s\S]*data-admin-detail-jump="materials"[\s\S]*data-admin-detail-jump="completion"[\s\S]*data-admin-detail-jump="invoice"/);
  assert.match(html, /data-admin-quote-form data-admin-detail-section="quote" id="admin-modal-quote-section"/);
  assert.match(css, /admin-request-modal-tabs[\s\S]*overflow-x:\s*auto/);
  assert.match(bootstrap, /data-admin-detail-jump/);
});

test('mobile navigation routes admin Quotes to the dedicated quote workspace', async () => {
  const html = await readFile('public/dashboard/index.html', 'utf8');
  const mobile = await readFile('public/assets/mobile-dashboard-ux.js', 'utf8');
  const sidebar = await readFile('public/assets/dashboard-phase34-sidebar-only-workspaces.js', 'utf8');
  assert.match(html, /data-mobile-more-key="quotes"/);
  assert.match(html, /data-mobile-bottom-key="quotes"/);
  assert.match(html, /data-mobile-fab-action="estimate" data-mobile-workspace-link="quotes"/);
  assert.match(mobile, /quotes: \['quotes', '#admin-quotes-workspace'\]/);
  assert.match(mobile, /admin: \[[^\]]*'quotes'/);
  assert.match(sidebar, /#admin-quotes-workspace/);
});

test('admin quote workspace fetches list data, opens editors, generates AI drafts, and sends quotes', async () => {
  const bootstrap = await readFile('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');
  assert.match(bootstrap, /fetch\(`\/api\/admin\/quotes\?status=/);
  assert.match(bootstrap, /data-admin-edit-quote/);
  assert.match(bootstrap, /data-admin-quote-ai-card/);
  assert.match(bootstrap, /data-admin-send-quote/);
  assert.match(bootstrap, /openAdminQuoteEditor/);
  assert.match(bootstrap, /sendAdminQuoteFromCard/);
  assert.match(bootstrap, /quoteForm\.requestSubmit\(\)/);
});

