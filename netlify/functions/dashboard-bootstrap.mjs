import { json, options } from './shared/json-response.mjs';
import { readState } from './shared/install-store.mjs';
import { moduleApiRegistry } from '../generated/module-api-registry.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  const state = await readState();
  if (!state.installation_complete) return json(403, { ok: false, needsInstall: true, redirectTo: '/install/' });
  const modules = (state.modules?.length ? state.modules : moduleApiRegistry).map((m) => ({ id: m.id, name: m.id.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' '), icon: '🧩', ...m }));
  return json(200, { ok: true, user: state.owner, company: state.company || { name: 'Business Platform' }, theme: state.theme || { mode: 'system' }, permissions: state.permissions || [], workspaceAccess: state.owner?.workspaceAccess || ['owner','admin','manager','worker','client'], modules, mobileNav: modules.filter((m) => ['work-orders','schedule','invoices','customers'].includes(m.id)).map((m) => ({ id: m.id, label: m.name, icon: m.icon || '🧩' })), quickCounts: { requests: 0, quotes: 0, workOrders: 0, invoices: 0 }, setupProgress: 55 });
}
