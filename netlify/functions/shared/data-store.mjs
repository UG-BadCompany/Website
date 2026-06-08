import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { coreModules, defaultPermissions, defaultRoles, rolePermissions } from './seed-data.mjs';

const storePath = process.env.PLATFORM_STORE_PATH || join(tmpdir(), 'white-label-contractor-cmms-store.json');

const emptyStore = () => ({
  platform_installation: { id: 'default', installation_complete: false },
  install_draft: {},
  company_settings: null,
  homepage_settings: null,
  theme_settings: null,
  app_users: [],
  roles: [],
  permissions: [],
  role_permissions: [],
  user_roles: [],
  workspace_access: [],
  module_registry: [],
  module_settings: [],
  service_categories: [],
  audit_logs: [],
  magic_tokens: []
});

export async function readStore() {
  try {
    return { ...emptyStore(), ...JSON.parse(await readFile(storePath, 'utf8')) };
  } catch {
    return emptyStore();
  }
}

export async function writeStore(store) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
  return store;
}

const now = () => new Date().toISOString();
const normalizedEmail = (email = '') => String(email).trim().toLowerCase();
const upsertById = (items, item) => {
  const idx = items.findIndex((existing) => existing.id === item.id);
  if (idx >= 0) items[idx] = { ...items[idx], ...item, updated_at: now() };
  else items.push({ ...item, created_at: now(), updated_at: now() });
};

export async function saveDraft(input) {
  const store = await readStore();
  store.install_draft = { ...store.install_draft, ...input, updated_at: now() };
  await writeStore(store);
  return store.install_draft;
}

export async function finishInstall(input = {}) {
  const store = await readStore();
  const draft = { ...store.install_draft, ...input };
  const owner = draft.owner || {};
  const company = draft.company || {};
  const theme = draft.theme || {};
  const email = normalizedEmail(owner.email);
  if (!email) throw Object.assign(new Error('Owner account is missing.'), { missing: ['owner_account'], goToStep: 'owner' });

  store.platform_installation = {
    id: 'default', installation_complete: true, completed_at: now(), updated_at: now(), version: 'v13', manual_mode_enabled: true
  };
  store.company_settings = {
    id: 'default', company_name: company.name || company.company_name || 'Your Company', display_name: company.display_name || company.name || 'Your Company', phone: company.phone || '', support_email: company.support_email || email, timezone: company.timezone || 'UTC', updated_at: now()
  };
  store.theme_settings = {
    id: 'default', theme_mode: theme.mode || 'system', theme_primary_color: theme.primary || '#2563eb', theme_accent_color: theme.accent || '#14b8a6', theme_background_color: theme.background || '#f8fafc', theme_surface_color: theme.surface || '#ffffff', theme_text_color: theme.text || '#0f172a', theme_border_color: theme.border || '#dbe4ef', theme_button_color: theme.button || theme.primary || '#2563eb', theme_button_text_color: theme.buttonText || '#ffffff', custom_sidebar_colors_enabled: Boolean(theme.customSidebar), sidebar_background_color: theme.sidebarBackground || '#0f172a', sidebar_text_color: theme.sidebarText || '#e2e8f0', sidebar_active_background_color: theme.sidebarActiveBackground || '#2563eb', sidebar_active_text_color: theme.sidebarActiveText || '#ffffff', sidebar_hover_background_color: theme.sidebarHoverBackground || '#1e293b', custom_mobile_nav_colors_enabled: Boolean(theme.customMobile), mobile_nav_background_color: theme.mobileBackground || '#ffffff', mobile_nav_active_color: theme.mobileActive || '#2563eb', mobile_nav_text_color: theme.mobileText || '#0f172a', updated_at: now()
  };
  store.homepage_settings = { id: 'default', hero_title: draft.homepage?.hero_title || `Welcome to ${store.company_settings.display_name}`, hero_subtitle: draft.homepage?.hero_subtitle || 'Request estimates, approve quotes, and track work in one contractor platform.', sections: draft.homepage?.sections || ['hero', 'services', 'request-estimate', 'gallery', 'cta'], updated_at: now() };

  const existingUser = store.app_users.find((user) => user.normalized_email === email);
  const ownerUser = { id: existingUser?.id || `user_${email.replace(/[^a-z0-9]/g, '_')}`, full_name: owner.full_name || owner.name || 'Owner', email, normalized_email: email, phone: owner.phone || '', role: 'owner', active: true };
  upsertById(store.app_users, ownerUser);

  defaultRoles.forEach((role) => upsertById(store.roles, { id: role, name: role, label: role[0].toUpperCase() + role.slice(1), active: true }));
  defaultPermissions.forEach((permission) => upsertById(store.permissions, { id: permission, name: permission, description: permission }));
  for (const [role, permissions] of Object.entries(rolePermissions)) {
    permissions.forEach((permission) => upsertById(store.role_permissions, { id: `${role}:${permission}`, role_id: role, permission_id: permission }));
  }
  upsertById(store.user_roles, { id: `${ownerUser.id}:owner`, user_id: ownerUser.id, role_id: 'owner' });
  defaultRoles.forEach((role) => upsertById(store.workspace_access, { id: `${ownerUser.id}:${role}`, user_id: ownerUser.id, workspace: role, can_access: true }));
  coreModules.forEach((mod, index) => {
    upsertById(store.module_registry, { ...mod, enabled: true, required: ['dashboard-overview','customers','request-estimate','estimate-quote-center','work-orders','schedule-calendar','inventory','invoices','finance'].includes(mod.id), order: index });
    upsertById(store.module_settings, { id: mod.id, module_id: mod.id, enabled: true, manual_mode_enabled: true, settings: {} });
  });
  ['General Contracting', 'Maintenance', 'Emergency Service', 'Inspection'].forEach((name, index) => upsertById(store.service_categories, { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, active: true, sort_order: index }));
  upsertById(store.audit_logs, { id: `install:${Date.now()}`, action: 'installer.completed', actor_id: ownerUser.id, message: 'Installer completed and core platform records were seeded.' });

  const requiredChecks = {
    owner_user_exists: store.app_users.some((user) => user.id === ownerUser.id),
    owner_role_exists: store.roles.some((role) => role.id === 'owner'),
    owner_has_owner_role: store.user_roles.some((item) => item.user_id === ownerUser.id && item.role_id === 'owner'),
    roles_exist: defaultRoles.every((role) => store.roles.some((item) => item.id === role)),
    permissions_exist: defaultPermissions.every((permission) => store.permissions.some((item) => item.id === permission)),
    role_permissions_exist: store.role_permissions.length > 0,
    core_modules_exist: coreModules.filter((mod) => mod.required).every((mod) => store.module_registry.some((item) => item.id === mod.id)),
    company_settings_exist: Boolean(store.company_settings),
    theme_settings_exist: Boolean(store.theme_settings),
    homepage_settings_exist: Boolean(store.homepage_settings),
    installation_complete: store.platform_installation.installation_complete === true
  };
  const failed = Object.entries(requiredChecks).filter(([, ok]) => !ok).map(([key]) => key);
  if (failed.length) throw Object.assign(new Error('Install validation failed.'), { missing: failed, goToStep: 'review' });
  await writeStore(store);
  return { store, checks: requiredChecks };
}

export function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) };
}
