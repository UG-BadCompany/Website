import { fail, json } from './shared/response.mjs';
import { readInstallState } from './shared/install-state.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
async function loadRegistry() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(path.join(here, '../generated/module-registry.json'), 'utf8');
  return JSON.parse(raw);
}

export async function handler(event) {
  const state = await readInstallState();
  if (!state.installation_complete) return fail(423, 'INSTALLATION_REQUIRED', 'Module APIs are locked until installation is complete.', { redirectTo: '/install/' });
  const parts = event.path.replace(/^\/api\/modules\/?/, '').split('/').filter(Boolean);
  const [moduleId, action = 'health'] = parts;
  const mod = (await loadRegistry()).modules.find((item) => item.id === moduleId);
  if (!mod) return fail(404, 'MODULE_NOT_FOUND', 'No module is registered for this API path.', { moduleId });
  const route = (mod.api || []).find((item) => item.action === action || item.path?.replace(/^\//, '') === action);
  if (!route && action !== 'health') return fail(404, 'MODULE_ACTION_NOT_FOUND', 'No action is registered for this module.', { moduleId, action });
  if (action === 'health') return json(200, { ok: true, data: { moduleId, status: 'healthy', frontend: mod.frontend, backend: mod.backend, version: mod.version } });
  if (route.method && ![].concat(route.method).includes(event.httpMethod)) return fail(405, 'METHOD_NOT_ALLOWED', 'This module action does not allow the requested method.', { allowed: route.method });
  return json(200, { ok: true, data: { moduleId, action, route, message: 'Module API dispatcher reached the registered module route.' } });
}
