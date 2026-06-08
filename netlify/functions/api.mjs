import { aiStatus, completeMagicLogin, create, getDraft, getInstallHealth, getInstallStatus, getIntegrationStatus, getPlatformSnapshot, installPlatform, list, requestMagicLink, saveDraft, update, advanceWorkflow } from '../../lib/platformData.mjs';

const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const readBody = (event) => event.body ? JSON.parse(event.body) : {};
const crudTables = new Map([
  ['customers','customers'], ['properties','properties'], ['requests','requests'], ['quotes','quotes'], ['quote-items','quote_items'],
  ['work-orders','work_orders'], ['assignments','assignments'], ['schedule-events','schedule_events'], ['inventory','inventory'],
  ['inventory-transactions','inventory_transactions'], ['invoices','invoices'], ['payments','payments'], ['uploaded-files','uploaded_files'], ['ai-jobs','ai_jobs'],
  ['modules','module_registry'], ['users','app_users'], ['roles','roles'], ['audit-logs','audit_logs']
]);

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
    const path = '/' + (event.path.split('/api/')[1] || '').replace(/^\//, '');
    const method = event.httpMethod;

    if (method === 'GET' && path === '/install-status') return json(200, getInstallStatus());
    if (method === 'GET' && path === '/install/health') return json(200, getInstallHealth());
    if (method === 'GET' && path === '/install/draft') return json(200, { ok: true, draft: getDraft() });
    if (method === 'POST' && path === '/install/draft') return json(200, saveDraft(readBody(event)));
    if (method === 'POST' && path === '/install/finish') return json(200, await installPlatform(readBody(event), process.env));
    if (method === 'GET' && (path === '/install/integration-status' || path === '/system/integration-status')) return json(200, { ok: true, integrations: getIntegrationStatus(process.env) });
    if (method === 'GET' && path === '/system/snapshot') return json(200, { ok: true, data: getPlatformSnapshot() });
    if (method === 'GET' && path === '/ai/status') return json(200, aiStatus(process.env));
    if (method === 'POST' && path === '/auth/magic/request') return json(200, requestMagicLink(readBody(event).email, process.env));
    if (method === 'POST' && path === '/auth/magic/complete') return json(200, completeMagicLogin(readBody(event).token));
    if (method === 'POST' && path === '/workflow/advance') { const b = readBody(event); return json(200, advanceWorkflow(b.entityType, b.entityId, b.action)); }

    const match = path.match(/^\/([^/]+)(?:\/([^/]+))?$/);
    if (match && crudTables.has(match[1])) {
      const table = crudTables.get(match[1]);
      if (method === 'GET') return json(200, { ok: true, items: await list(table, process.env) });
      if (method === 'POST') return json(201, { ok: true, item: await create(table, readBody(event), process.env) });
      if (method === 'PUT' && match[2]) {
        const item = await update(table, match[2], readBody(event), process.env);
        return item ? json(200, { ok: true, item }) : json(404, { ok: false, error: 'Record not found' });
      }
    }

    return json(404, { ok: false, error: `Route ${method} ${path} was not found.` });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Unexpected platform error.' });
  }
};
