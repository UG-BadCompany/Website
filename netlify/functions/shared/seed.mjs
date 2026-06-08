import { modules, permissions, roleDefinitions, rolePermissions, serviceCategories } from './core-data.mjs';
import { audit } from './db.mjs';

export const defaultTheme = {
  mode: 'system',
  primary: '#2563eb',
  accent: '#14b8a6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  border: '#cbd5e1',
  button: '#2563eb',
  buttonText: '#ffffff',
  sidebarBackground: '#0f172a',
  sidebarText: '#e2e8f0',
  sidebarActiveBackground: '#1d4ed8',
  sidebarActiveText: '#ffffff',
  sidebarHoverBackground: '#1e293b',
  mobileNavBackground: '#ffffff',
  mobileNavActive: '#2563eb',
  mobileNavText: '#334155',
};

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function buildHomepageContent(company, homepage = {}) {
  return {
    heroTitle: homepage.heroTitle || `Welcome to ${company.name || 'Contractor Platform'}`,
    heroSubtitle: homepage.heroSubtitle || 'Request estimates, approve quotes, and track work from one polished portal.',
    sections: homepage.sections || [
      { type: 'hero', enabled: true },
      { type: 'services', enabled: true },
      { type: 'request-estimate', enabled: true },
      { type: 'projects', enabled: true },
      { type: 'testimonials', enabled: true },
    ],
    services: serviceCategories,
    cta: homepage.cta || 'Request an Estimate',
  };
}

export async function seedPlatform(db, draft = {}) {
  const company = draft.company || {};
  const owner = draft.owner || {};
  const homepage = draft.homepage || {};
  const theme = { ...defaultTheme, ...(draft.theme || {}) };
  const email = normalizeEmail(owner.email || company.email || 'owner@example.com');
  const fullName = owner.fullName || owner.full_name || 'Platform Owner';

  await db.begin(async (tx) => {
    await tx`insert into platform_installation(id, installer_draft)
      values('default', ${tx.json(draft)})
      on conflict(id) do update set installer_draft = excluded.installer_draft, updated_at = now()`;

    await tx`insert into company_settings(id, company_name, logo_url, phone, email, address, theme)
      values('default', ${company.name || 'Contractor Platform'}, ${company.logoUrl || null}, ${company.phone || null}, ${company.email || email}, ${company.address || null}, ${tx.json(theme)})
      on conflict(id) do update set company_name = excluded.company_name, logo_url = excluded.logo_url,
        phone = excluded.phone, email = excluded.email, address = excluded.address, theme = excluded.theme, updated_at = now()`;

    await tx`insert into homepage_settings(id, content, published)
      values('default', ${tx.json(buildHomepageContent(company, homepage))}, true)
      on conflict(id) do update set content = excluded.content, published = true, updated_at = now()`;

    const [user] = await tx`insert into app_users(full_name, email, normalized_email, phone, active, metadata)
      values(${fullName}, ${email}, ${email}, ${owner.phone || null}, true, ${tx.json({ installerOwner: true })})
      on conflict(normalized_email) do update set full_name = excluded.full_name, phone = excluded.phone,
        active = true, updated_at = now()
      returning id`;

    for (const role of roleDefinitions) {
      await tx`insert into roles(key, label, description)
        values(${role.key}, ${role.label}, ${role.description})
        on conflict(key) do update set label = excluded.label, description = excluded.description`;
    }

    for (const permission of permissions) {
      await tx`insert into permissions(key, label)
        values(${permission}, ${permission.replaceAll('.', ' ')})
        on conflict(key) do update set label = excluded.label`;
    }

    for (const [roleKey, rolePerms] of Object.entries(rolePermissions)) {
      for (const permission of rolePerms) {
        await tx`insert into role_permissions(role_key, permission_key)
          values(${roleKey}, ${permission}) on conflict do nothing`;
      }
    }

    await tx`insert into user_roles(user_id, role_key) values(${user.id}, 'owner') on conflict do nothing`;

    for (const workspace of ['owner', 'admin', 'manager', 'worker', 'client']) {
      await tx`insert into workspace_access(user_id, workspace, role_key)
        values(${user.id}, ${workspace}, ${workspace})
        on conflict(user_id, workspace) do update set role_key = excluded.role_key`;
    }

    for (const module of modules) {
      await tx`insert into module_registry(id, label, group_name, icon, route, permission_key, enabled, manifest, version)
        values(${module.id}, ${module.label}, ${module.group}, ${module.icon}, ${module.route}, ${module.permission}, true, ${tx.json(module)}, ${module.version})
        on conflict(id) do update set label = excluded.label, group_name = excluded.group_name, icon = excluded.icon,
          route = excluded.route, permission_key = excluded.permission_key, enabled = true,
          manifest = excluded.manifest, version = excluded.version, updated_at = now()`;
      await tx`insert into module_settings(module_id, settings)
        values(${module.id}, '{}'::jsonb) on conflict(module_id) do nothing`;
    }

    for (const service of serviceCategories) {
      await tx`insert into service_categories(name, active)
        values(${service}, true) on conflict(name) do update set active = true`;
    }

    await audit(tx, 'install.finish', { ownerEmail: email, moduleCount: modules.length }, 'platform_installation', 'default', user.id);

    await tx`update platform_installation
      set installation_complete = true, completed_at = coalesce(completed_at, now()), updated_at = now()
      where id = 'default'`;
  });
}

export async function validateInstall(db) {
  const [checks] = await db`
    select
      (select count(*) from app_users) as users,
      (select count(*) from roles) as roles,
      (select count(*) from permissions) as permissions,
      (select count(*) from role_permissions) as role_permissions,
      (select count(*) from module_registry) as modules,
      (select count(*) from company_settings) as company_settings,
      (select count(*) from homepage_settings) as homepage_settings,
      (select installation_complete from platform_installation where id = 'default') as complete`;

  const ok = Boolean(
    checks.complete
    && Number(checks.users) >= 1
    && Number(checks.roles) >= 5
    && Number(checks.permissions) >= 30
    && Number(checks.role_permissions) >= 30
    && Number(checks.modules) >= 30
    && Number(checks.company_settings) >= 1
    && Number(checks.homepage_settings) >= 1
  );

  return { ok, checks };
}
