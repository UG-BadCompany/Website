import { finishInstall, json } from './shared/data-store.mjs';
export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const input = event.body ? JSON.parse(event.body) : {};
    const { store, checks } = await finishInstall(input);
    return json(200, { ok: true, installation_complete: true, redirectTo: '/dashboard/', checks, counts: { app_users: store.app_users.length, roles: store.roles.length, permissions: store.permissions.length, role_permissions: store.role_permissions.length, workspace_access: store.workspace_access.length, module_registry: store.module_registry.length, module_settings: store.module_settings.length, service_categories: store.service_categories.length, audit_logs: store.audit_logs.length } });
  } catch (error) {
    return json(422, { ok: false, message: error.message, missing: error.missing || [], goToStep: error.goToStep || 'review' });
  }
}
