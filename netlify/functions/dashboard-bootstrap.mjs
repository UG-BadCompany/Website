import { json } from './shared/response.mjs';
import { readState } from './shared/state.mjs';
import registry from '../generated/module-registry.json' assert { type: 'json' };
export async function handler(event) {
  const state = await readState();
  const role = new URL(event.rawUrl || 'https://local/dashboard').searchParams.get('view') || 'owner';
  const owner = state.users.find((u)=>u.roles?.includes('owner')) || { id: 'demo-owner', email: 'owner@example.com', fullName: 'Platform Owner', roles: ['owner'], workspaces: ['owner','admin','manager','worker','client','public'] };
  const isOwner = owner.roles.includes('owner');
  const modules = registry.modules.filter((m)=>isOwner || (state.moduleSettings[m.id]?.enabled !== false && m.workspaces.includes(role)));
  return json(200, { ok: true, user: owner, company: state.company, theme: state.company.theme, workspace: role, availableWorkspaces: isOwner ? ['owner','admin','manager','worker','client','public'] : owner.workspaces, permissions: isOwner ? ['*', ...state.permissions] : state.permissions, modules, impersonation: state.impersonation || null, health: { database: 'healthy', functions: 'healthy', moduleRegistry: 'healthy', bootstrap: state.installation.bootstrap_generated ? 'healthy' : 'warning' } });
}
