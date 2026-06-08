import { json } from './_shared.mjs';
export async function handler(event) {
  const moduleId = event.path.split('/').pop() || 'unknown';
  return json(200, { ok: true, moduleId, health: 'healthy', message: 'Module API dispatcher resolved the drop-in module namespace.' });
}
