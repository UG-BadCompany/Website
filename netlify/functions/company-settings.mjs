import { clean, getSessionToken, hashToken, json, loadDatabase, parseJsonBody } from './auth-utils.mjs';

const FALLBACK_COMPANY = {
  companyName: 'Your Company', legalName: '', displayName: 'Contractor Portal', websiteUrl: '', supportEmail: '', supportPhone: '', businessPhone: '', businessAddress: '', city: '', state: '', zip: '', serviceArea: '', timezone: 'America/Phoenix', currency: 'USD', licenseNumber: '', contractorLicenseNumber: '', taxId: '', businessType: '', logoUrl: '', faviconUrl: '', primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626', themeMode: 'system', defaultTheme: 'system', enableThemeToggle: true, showCompanyNameInHeader: false, installationComplete: false, adminSettings: {},
};

const camel = (row = {}) => ({
  id: row.id || null,
  companyName: row.company_name || FALLBACK_COMPANY.companyName,
  legalName: row.legal_name || '',
  displayName: row.display_name || row.company_name || FALLBACK_COMPANY.displayName,
  websiteUrl: row.website_url || '', supportEmail: row.support_email || '', supportPhone: row.support_phone || '', businessPhone: row.business_phone || '', businessAddress: row.business_address || '', city: row.city || '', state: row.state || '', zip: row.zip || '', serviceArea: row.service_area || '', timezone: row.timezone || 'America/Phoenix', currency: row.currency || 'USD', licenseNumber: row.license_number || '', contractorLicenseNumber: row.contractor_license_number || '', taxId: row.tax_id || '', businessType: row.business_type || '', logoUrl: row.logo_url || '', faviconUrl: row.favicon_url || '',
  primaryColor: row.primary_color || FALLBACK_COMPANY.primaryColor,
  accentColor: row.accent_color || FALLBACK_COMPANY.accentColor,
  backgroundColor: row.background_color || FALLBACK_COMPANY.backgroundColor,
  surfaceColor: row.surface_color || FALLBACK_COMPANY.surfaceColor,
  textColor: row.text_color || FALLBACK_COMPANY.textColor,
  buttonColor: row.button_color || row.primary_color || FALLBACK_COMPANY.buttonColor,
  successColor: row.success_color || FALLBACK_COMPANY.successColor,
  warningColor: row.warning_color || FALLBACK_COMPANY.warningColor,
  dangerColor: row.danger_color || FALLBACK_COMPANY.dangerColor,
  themeMode: row.theme_mode || row.default_theme || FALLBACK_COMPANY.themeMode,
  defaultTheme: row.default_theme || row.theme_mode || FALLBACK_COMPANY.defaultTheme,
  enableThemeToggle: row.enable_theme_toggle !== false,
  showCompanyNameInHeader: Boolean(row.show_company_name_in_header),
  installationComplete: Boolean(row.installation_complete),
  adminSettings: row.admin_settings && typeof row.admin_settings === 'object' ? row.admin_settings : {},
  createdAt: row.created_at || null, updatedAt: row.updated_at || null,
});

export const ensureCompanyTables = async (db) => {
  await db.sql`create extension if not exists pgcrypto`;
  await db.sql`
    create table if not exists company_settings (
      id uuid primary key default gen_random_uuid(), company_name text not null, legal_name text, display_name text, website_url text, support_email text, support_phone text, business_phone text, business_address text, city text, state text, zip text, service_area text, timezone text not null default 'America/Phoenix', currency text not null default 'USD', license_number text, contractor_license_number text, tax_id text, business_type text, logo_url text, favicon_url text, primary_color text not null default '#2563eb', accent_color text not null default '#22c55e', background_color text not null default '#f8fafc', surface_color text not null default '#ffffff', text_color text not null default '#0f172a', button_color text not null default '#2563eb', success_color text not null default '#16a34a', warning_color text not null default '#f59e0b', danger_color text not null default '#dc2626', theme_mode text not null default 'system', default_theme text not null default 'system', enable_theme_toggle boolean not null default true, show_company_name_in_header boolean not null default false, installation_complete boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`;
  await db.sql`alter table company_settings add column if not exists background_color text not null default '#f8fafc'`;
  await db.sql`alter table company_settings add column if not exists surface_color text not null default '#ffffff'`;
  await db.sql`alter table company_settings add column if not exists text_color text not null default '#0f172a'`;
  await db.sql`alter table company_settings add column if not exists button_color text not null default '#2563eb'`;
  await db.sql`alter table company_settings add column if not exists success_color text not null default '#16a34a'`;
  await db.sql`alter table company_settings add column if not exists warning_color text not null default '#f59e0b'`;
  await db.sql`alter table company_settings add column if not exists danger_color text not null default '#dc2626'`;
  await db.sql`alter table company_settings add column if not exists default_theme text not null default 'system'`;
  await db.sql`alter table company_settings add column if not exists enable_theme_toggle boolean not null default true`;
  await db.sql`alter table company_settings add column if not exists contractor_license_number text`;
  await db.sql`alter table company_settings add column if not exists tax_id text`;
  await db.sql`alter table company_settings add column if not exists admin_settings jsonb not null default '{}'::jsonb`;
  await db.sql`
    create table if not exists platform_install (
      id uuid primary key default gen_random_uuid(), installed boolean not null default false, installed_at timestamptz, installed_by_user_id uuid, version text, setup_summary jsonb not null default '{}'::jsonb, installer_locked boolean not null default false, locked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`;
  await db.sql`alter table platform_install add column if not exists installer_locked boolean not null default false`;
  await db.sql`alter table platform_install add column if not exists locked_at timestamptz`;
};

const loadCompany = async (db) => { await ensureCompanyTables(db); const [row] = await db.sql`select * from company_settings order by created_at asc limit 1`; return row ? camel(row) : FALLBACK_COMPANY; };

const canManageCompanySettings = async (db, request) => {
  const token = getSessionToken(request); if (!token) return false;
  const [session] = await db.sql`select auth_sessions.user_id from auth_sessions join app_users on app_users.id = auth_sessions.user_id where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true limit 1`;
  if (!session) return false;
  const roles = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id}`;
  const roleKeys = roles.map((role) => role.key);
  if (roleKeys.includes('owner')) return true;
  const rolePermissions = await db.sql`select distinct role_permissions.permission_key from user_roles join roles on roles.id = user_roles.role_id join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true where user_roles.user_id = ${session.user_id}`;
  const permissionKeys = rolePermissions.map((permission) => permission.permission_key);
  return ['branding.manage', 'company.manage', 'settings.manage'].some((permission) => permissionKeys.includes(permission));
};

const payloadFrom = (body) => ({
  companyName: clean(body.companyName || body.company_name, 160) || 'Your Company', legalName: clean(body.legalName || body.legal_name, 180), displayName: clean(body.displayName || body.display_name, 160), websiteUrl: clean(body.websiteUrl || body.website_url, 300), supportEmail: clean(body.supportEmail || body.support_email, 254), supportPhone: clean(body.supportPhone || body.support_phone, 60), businessPhone: clean(body.businessPhone || body.business_phone, 60), businessAddress: clean(body.businessAddress || body.business_address, 300), city: clean(body.city, 120), state: clean(body.state, 60), zip: clean(body.zip, 40), serviceArea: clean(body.serviceArea || body.service_area, 500), timezone: clean(body.timezone, 80) || 'America/Phoenix', currency: clean(body.currency, 8) || 'USD', licenseNumber: clean(body.licenseNumber || body.license_number, 120), contractorLicenseNumber: clean(body.contractorLicenseNumber || body.contractor_license_number, 120), taxId: clean(body.taxId || body.tax_id, 120), businessType: clean(body.businessType || body.business_type, 120), logoUrl: clean(body.logoUrl || body.logo_url, 700), faviconUrl: clean(body.faviconUrl || body.favicon_url, 700), primaryColor: clean(body.primaryColor || body.primary_color, 32) || '#2563eb', accentColor: clean(body.accentColor || body.accent_color, 32) || '#22c55e', backgroundColor: clean(body.backgroundColor || body.background_color, 32) || '#f8fafc', surfaceColor: clean(body.surfaceColor || body.surface_color, 32) || '#ffffff', textColor: clean(body.textColor || body.text_color, 32) || '#0f172a', buttonColor: clean(body.buttonColor || body.button_color, 32) || clean(body.primaryColor || body.primary_color, 32) || '#2563eb', successColor: clean(body.successColor || body.success_color, 32) || '#16a34a', warningColor: clean(body.warningColor || body.warning_color, 32) || '#f59e0b', dangerColor: clean(body.dangerColor || body.danger_color, 32) || '#dc2626', themeMode: clean(body.themeMode || body.theme_mode || body.defaultTheme || body.default_theme, 20) || 'system', defaultTheme: clean(body.defaultTheme || body.default_theme || body.themeMode || body.theme_mode, 20) || 'system', enableThemeToggle: body.enableThemeToggle ?? body.enable_theme_toggle ?? true, showCompanyNameInHeader: Boolean(body.showCompanyNameInHeader ?? body.show_company_name_in_header),
  adminSettings: body.adminSettings && typeof body.adminSettings === 'object' ? body.adminSettings : {},
});

export default async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    if (request.method === 'GET') return json(200, { ok: true, company: await loadCompany(db) });
    if (!await canManageCompanySettings(db, request)) return json(403, { ok: false, message: 'Branding, Company, Settings, or Owner access is required.' });
    const body = await parseJsonBody(request); if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    await ensureCompanyTables(db); const [existing] = await db.sql`select * from company_settings order by created_at asc limit 1`; const p = payloadFrom({ ...(existing ? camel(existing) : {}), ...body });
    const [row] = existing ? await db.sql`update company_settings set company_name=${p.companyName}, legal_name=${p.legalName || null}, display_name=${p.displayName || p.companyName}, website_url=${p.websiteUrl || null}, support_email=${p.supportEmail || null}, support_phone=${p.supportPhone || null}, business_phone=${p.businessPhone || null}, business_address=${p.businessAddress || null}, city=${p.city || null}, state=${p.state || null}, zip=${p.zip || null}, service_area=${p.serviceArea || null}, timezone=${p.timezone}, currency=${p.currency}, license_number=${p.licenseNumber || null}, contractor_license_number=${p.contractorLicenseNumber || null}, tax_id=${p.taxId || null}, business_type=${p.businessType || null}, logo_url=${p.logoUrl || null}, favicon_url=${p.faviconUrl || null}, primary_color=${p.primaryColor}, accent_color=${p.accentColor}, background_color=${p.backgroundColor}, surface_color=${p.surfaceColor}, text_color=${p.textColor}, button_color=${p.buttonColor}, success_color=${p.successColor}, warning_color=${p.warningColor}, danger_color=${p.dangerColor}, theme_mode=${p.themeMode}, default_theme=${p.defaultTheme}, enable_theme_toggle=${Boolean(p.enableThemeToggle)}, show_company_name_in_header=${p.showCompanyNameInHeader}, admin_settings=${JSON.stringify(p.adminSettings)}::jsonb, updated_at=now() where id=${existing.id} returning *`
      : await db.sql`insert into company_settings (company_name, legal_name, display_name, website_url, support_email, support_phone, business_phone, business_address, city, state, zip, service_area, timezone, currency, license_number, contractor_license_number, tax_id, business_type, logo_url, favicon_url, primary_color, accent_color, background_color, surface_color, text_color, button_color, success_color, warning_color, danger_color, theme_mode, default_theme, enable_theme_toggle, show_company_name_in_header, admin_settings) values (${p.companyName}, ${p.legalName || null}, ${p.displayName || p.companyName}, ${p.websiteUrl || null}, ${p.supportEmail || null}, ${p.supportPhone || null}, ${p.businessPhone || null}, ${p.businessAddress || null}, ${p.city || null}, ${p.state || null}, ${p.zip || null}, ${p.serviceArea || null}, ${p.timezone}, ${p.currency}, ${p.licenseNumber || null}, ${p.contractorLicenseNumber || null}, ${p.taxId || null}, ${p.businessType || null}, ${p.logoUrl || null}, ${p.faviconUrl || null}, ${p.primaryColor}, ${p.accentColor}, ${p.backgroundColor}, ${p.surfaceColor}, ${p.textColor}, ${p.buttonColor}, ${p.successColor}, ${p.warningColor}, ${p.dangerColor}, ${p.themeMode}, ${p.defaultTheme}, ${Boolean(p.enableThemeToggle)}, ${p.showCompanyNameInHeader}, ${JSON.stringify(p.adminSettings)}::jsonb) returning *`;
    return json(200, { ok: true, company: camel(row) });
  } catch (error) { console.error('company-settings failed', error); return json(500, { ok: false, company: FALLBACK_COMPANY, message: 'Company settings are unavailable.' }); }
};
