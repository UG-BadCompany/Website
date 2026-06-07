import { json, readJson } from './shared/response.mjs';
import { getState, saveState, audit } from './shared/state.mjs';

const roles = ['owner', 'admin', 'manager', 'worker', 'client', 'public'];
const requiredEnv = ['SITE_URL', 'MAGIC_LINK_FROM_EMAIL', 'RESEND_API_KEY'];

export async function handler(event) {
  const payload = await readJson(event);
  const missing = [];
  if (!payload.company?.name) missing.push('company.name');
  if (!payload.company?.site_url) missing.push('company.site_url');
  if (!payload.owner?.name) missing.push('owner.name');
  if (!payload.owner?.email) missing.push('owner.email');
  for (const name of requiredEnv) if (!process.env[name] && payload.env?.[name] !== '__provided__') missing.push(`env.${name}`);
  if (missing.length) return json(400, { ok: false, error: 'validation_failed', missing });

  const registry = (await import('./shared/module-registry.mjs')).modules;
  const state = await getState();
  state.company = { id: 'company_default', name: payload.company.name, site_url: payload.company.site_url, created_at: new Date().toISOString() };
  state.owner = { id: 'owner_default', name: payload.owner.name, email: payload.owner.email, role: 'owner', super_owner: true };
  state.roles = roles.map(role => ({ id: role, label: role[0].toUpperCase() + role.slice(1), permissions: role === 'owner' ? ['*'] : [`view:${role}`] }));
  state.modules = registry;
  state.theme = payload.theme || { mode: 'system' };
  state.homepage = payload.homepage || {};
  state.installation_complete = true;
  state.bootstrap = {
    installation_complete: true,
    company: { name: state.company.name, site_url: state.company.site_url },
    theme: state.theme,
    homepage: state.homepage,
    modules: registry.map(module => ({ id: module.id, name: module.name, status: module.status }))
  };
  await saveState(state);
  await audit('install.finish', 'platform', { modules: registry.length });
  return json(200, { ok: true, installation_complete: true, redirect: '/dashboard/', seeded: { roles: state.roles.length, modules: registry.length, permissions: true, theme: true, homepage: true, bootstrap: true } });
}
