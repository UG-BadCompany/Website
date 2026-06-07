import { error, json } from './shared/response.mjs';
import registry from '../generated/module-registry.json' assert { type: 'json' };
export async function handler(event) {
  const parts = (event.path || '').split('/api/modules/')[1]?.split('/').filter(Boolean) || [];
  const [moduleId, action = 'records'] = parts;
  const mod = registry.modules.find((m)=>m.id===moduleId);
  if (!mod) return error(404, 'MODULE_NOT_FOUND', `Unknown module ${moduleId || ''}`);
  const route = (mod.backend.functions || []).find((fn)=>fn.route.endsWith(`/${action}`) || fn.route.includes(`/${action}`) || action === 'records');
  if (!route) return error(404, 'MODULE_ACTION_NOT_FOUND', `Unknown module action ${action}`);
  if (!route.method.includes(event.httpMethod)) return error(405, 'METHOD_NOT_ALLOWED', `Use ${route.method.join(', ')}`);
  return json(200, { ok: true, data: { moduleId, action, method: event.httpMethod, permission: route.permission || mod.permissions?.[0]?.key, records: [] }, message: event.httpMethod === 'POST' ? 'Saved.' : undefined });
}
