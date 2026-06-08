import { json, ok, fail, safe, parseBody } from './lib/response.mjs';
import { databaseStatus, databaseRuntimeDiagnostics, bootstrapSchema, getDraft, saveDraft, finishInstall, dashboardBootstrap, query } from './lib/db.mjs';
import { getIntegrationStatus } from './lib/integrations.mjs';

function methodPath(event) {
  const raw = event.path || '';
  const path = raw.replace(/^\/\.netlify\/functions\/api/, '/api').replace(/^\/api\/?/, '/api/').replace(/\/$/, '') || '/api';
  return { method: event.httpMethod || 'GET', path };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true }, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
  return safe(async () => {
    const { method, path } = methodPath(event);
    if (method === 'GET' && path === '/api/install-status') {
      const status = await databaseStatus();
      return ok({ ...status, installed: Boolean(status.installationComplete), requiresInstall: !status.installationComplete });
    }
    if (method === 'GET' && path === '/api/install/health') {
      const status = await databaseStatus();
      return ok({ installer: 'healthy', database: status, recoveryAvailable: true });
    }
    if (method === 'GET' && path === '/api/install/runtime-diagnostics') {
      return ok(databaseRuntimeDiagnostics());
    }
    if (method === 'POST' && path === '/api/install/bootstrap-database') {
      const result = await bootstrapSchema();
      return json(200, { ok: Boolean(result.connected && result.schemaReady && result.writeTestPassed), ...result });
    }
    if (method === 'GET' && path === '/api/install/draft') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', status.message || 'Connect Netlify Database before loading draft.', { draft: {}, database: status });
      const draft = await getDraft();
      return ok({ draft: draft.draft, updatedAt: draft.updated_at });
    }
    if (method === 'POST' && path === '/api/install/draft') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', status.message || 'Connect Netlify Database before saving draft.', { saved: false, database: status });
      const saved = await saveDraft(parseBody(event).draft || parseBody(event));
      return ok({ saved: true, draft: saved.draft, updatedAt: saved.updated_at });
    }
    if (method === 'POST' && path === '/api/install/finish') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', 'Installation cannot finish until Netlify Database is connected.', { database: status });
      const result = await finishInstall(parseBody(event));
      return ok(result);
    }
    if (method === 'GET' && (path === '/api/install/integration-status' || path === '/api/system/integration-status')) {
      return ok({ integrations: getIntegrationStatus(), message: 'These integrations can be configured later in System Center.' });
    }
    if (method === 'GET' && path === '/api/dashboard/bootstrap') {
      return ok(await dashboardBootstrap());
    }
    if (method === 'POST' && path === '/api/files/upload') {
      const body = parseBody(event);
      await query(`insert into uploaded_files(file_name,mime_type,file_size,category,data_base64) values($1,$2,$3,$4,$5)`, [body.fileName || 'upload', body.mimeType || 'application/octet-stream', Number(body.fileSize || 0), body.category || 'general', body.dataBase64 || '']);
      return ok({ uploaded: true });
    }
    return fail(404, 'NOT_FOUND', `No API route for ${method} ${path}`);
  });
}
