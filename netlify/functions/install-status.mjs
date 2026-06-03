import { json, loadDatabase } from './auth-utils.mjs';
import { ensureCompanyTables } from './company-settings.mjs';

const count = async (db, sql) => {
  try { const [row] = await sql(); return Number(row?.count || 0); } catch (error) { console.error('install-status count failed', error); return 0; }
};

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    await ensureCompanyTables(db);
    const [company] = await db.sql`select installation_complete from company_settings order by created_at asc limit 1`;
    const [install] = await db.sql`select installed, installer_locked from platform_install order by created_at desc limit 1`;
    const ownerCount = await count(db, () => db.sql`select count(*) from app_users join user_roles on user_roles.user_id = app_users.id join roles on roles.id = user_roles.role_id where app_users.is_active = true and roles.key = 'owner'`);
    const roleCount = await count(db, () => db.sql`select count(*) from roles where key in ('owner','admin','manager','worker','client','guest')`);
    const permissionCount = await count(db, () => db.sql`select count(*) from permissions`);
    const companySettingsExists = Boolean(company);
    const companyComplete = Boolean(company?.installation_complete);
    const ownerExists = ownerCount > 0;
    const rolesExist = roleCount >= 6;
    const permissionsExist = permissionCount >= 30;
    const installed = companySettingsExists && companyComplete && ownerExists && rolesExist && permissionsExist && Boolean(install?.installed);
    return json(200, { ok: true, installed, installer_locked: Boolean(install?.installer_locked || installed), company_settings_exists: companySettingsExists, owner_exists: ownerExists, roles_exist: rolesExist, permissions_exist: permissionsExist, company_installation_complete: companyComplete, platform_install_installed: Boolean(install?.installed) });
  } catch (error) {
    console.error('install-status failed', error);
    return json(200, { ok: true, installed: false, installer_locked: false, company_settings_exists: false, owner_exists: false, roles_exist: false, permissions_exist: false, message: 'Install status unavailable; installer required.' });
  }
};
