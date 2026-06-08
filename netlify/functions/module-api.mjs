import { json, options } from './shared/json-response.mjs';
import { moduleApiRegistry } from '../generated/module-api-registry.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  const moduleId = (event.path || '').split('/api/modules/')[1]?.split('/')[0];
  const mod = moduleApiRegistry.find((m) => m.id === moduleId);
  if (!mod) return json(404, { ok: false, code: 'MODULE_NOT_FOUND', message: 'Module API route was dispatched, but no module manifest matched.', moduleId });
  return json(200, { ok: true, module: mod.id, health: 'healthy', message: 'Drop-in module API dispatcher is active.' });
}
