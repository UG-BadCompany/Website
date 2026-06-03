import { clean, getSessionToken, hashToken, json, loadDatabase, parseJsonBody } from './auth-utils.mjs';

const FALLBACK_COMPANY = {
  companyName: 'Your Company',
  displayName: 'Contractor Portal',
  legalName: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#2563eb',
  accentColor: '#22c55e',
  themeMode: 'light',
  showCompanyNameInHeader: false,
  installationComplete: false,
};

const camel = (row = {}) => ({
  id: row.id || null,
  companyName: row.company_name || FALLBACK_COMPANY.companyName,
  legalName: row.legal_name || '',
  displayName: row.display_name || row.company_name || FALLBACK_COMPANY.displayName,
  websiteUrl: row.website_url || '',
  supportEmail: row.support_email || '',
  supportPhone: row.support_phone || '',
  businessPhone: row.business_phone || '',
  businessAddress: row.business_address || '',
  city: row.city || '',
  state: row.state || '',
  zip: row.zip || '',
  serviceArea: row.service_area || '',
  timezone: row.timezone || 'America/Phoenix',
  currency: row.currency || 'USD',
  licenseNumber: row.license_number || '',
  contractorLicenseNumber: row.contractor_license_number || '',
  taxId: row.tax_id || '',
  businessType: row.business_type || '',
  logoUrl: row.logo_url || '',
  faviconUrl: row.favicon_url || '',
  primaryColor: row.primary_color || FALLBACK_COMPANY.primaryColor,
  accentColor: row.accent_color || FALLBACK_COMPANY.accentColor,
  themeMode: row.theme_mode || 'light',
  showCompanyNameInHeader: Boolean(row.show_company_name_in_header),
  installationComplete: Boolean(row.installation_complete),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
});

export const ensureCompanyTables = async (db) => {
  await db.sql`
    create table if not exists company_settings (
      id uuid primary key default gen_random_uuid(),
      company_name text not null,
      legal_name text,
      display_name text,
      website_url text,
      support_email text,
      support_phone text,
      business_phone text,
      business_address text,
      city text,
      state text,
      zip text,
      service_area text,
      timezone text not null default 'America/Phoenix',
      currency text not null default 'USD',
      license_number text,
      contractor_license_number text,
      tax_id text,
      business_type text,
      logo_url text,
      favicon_url text,
      primary_color text not null default '#2563eb',
      accent_color text not null default '#22c55e',
      theme_mode text not null default 'light',
      show_company_name_in_header boolean not null default false,
      installation_complete boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
  await db.sql`
    create table if not exists platform_install (
      id uuid primary key default gen_random_uuid(),
      installed boolean not null default false,
      installed_at timestamptz,
      installed_by_user_id uuid,
      version text,
      setup_summary jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
};

const loadCompany = async (db) => {
  await ensureCompanyTables(db);
  const [row] = await db.sql`select * from company_settings order by created_at asc limit 1`;
  return row ? camel(row) : FALLBACK_COMPANY;
};

const isOwnerOrAdmin = async (db, request) => {
  const token = getSessionToken(request);
  if (!token) return false;
  const rows = await db.sql`
    select roles.key
    from auth_sessions
    join user_roles on user_roles.user_id = auth_sessions.user_id
    join roles on roles.id = user_roles.role_id
    where auth_sessions.session_hash = ${hashToken(token)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and roles.key in ('owner', 'admin')`;
  return rows.length > 0;
};

export default async (request) => {
  if (!['GET', 'PATCH'].includes(request.method)) return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    if (request.method === 'GET') return json(200, { ok: true, company: await loadCompany(db) });
    if (!await isOwnerOrAdmin(db, request)) return json(403, { ok: false, message: 'Owner or Admin access is required.' });
    const body = await parseJsonBody(request);
    if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    await ensureCompanyTables(db);
    const [existing] = await db.sql`select id from company_settings order by created_at asc limit 1`;
    const payload = {
      companyName: clean(body.companyName || body.company_name, 160) || 'Your Company',
      legalName: clean(body.legalName || body.legal_name, 180),
      displayName: clean(body.displayName || body.display_name, 160),
      websiteUrl: clean(body.websiteUrl || body.website_url, 300),
      supportEmail: clean(body.supportEmail || body.support_email, 254),
      supportPhone: clean(body.supportPhone || body.support_phone, 60),
      businessPhone: clean(body.businessPhone || body.business_phone, 60),
      businessAddress: clean(body.businessAddress || body.business_address, 300),
      city: clean(body.city, 120), state: clean(body.state, 60), zip: clean(body.zip, 40),
      serviceArea: clean(body.serviceArea || body.service_area, 500), timezone: clean(body.timezone, 80) || 'America/Phoenix', currency: clean(body.currency, 8) || 'USD',
      logoUrl: clean(body.logoUrl || body.logo_url, 700), faviconUrl: clean(body.faviconUrl || body.favicon_url, 700),
      primaryColor: clean(body.primaryColor || body.primary_color, 32) || '#2563eb', accentColor: clean(body.accentColor || body.accent_color, 32) || '#22c55e',
      themeMode: clean(body.themeMode || body.theme_mode, 20) || 'light', showCompanyNameInHeader: Boolean(body.showCompanyNameInHeader ?? body.show_company_name_in_header),
    };
    const [row] = existing ? await db.sql`
      update company_settings set company_name=${payload.companyName}, legal_name=${payload.legalName || null}, display_name=${payload.displayName || payload.companyName}, website_url=${payload.websiteUrl || null}, support_email=${payload.supportEmail || null}, support_phone=${payload.supportPhone || null}, business_phone=${payload.businessPhone || null}, business_address=${payload.businessAddress || null}, city=${payload.city || null}, state=${payload.state || null}, zip=${payload.zip || null}, service_area=${payload.serviceArea || null}, timezone=${payload.timezone}, currency=${payload.currency}, logo_url=${payload.logoUrl || null}, favicon_url=${payload.faviconUrl || null}, primary_color=${payload.primaryColor}, accent_color=${payload.accentColor}, theme_mode=${payload.themeMode}, show_company_name_in_header=${payload.showCompanyNameInHeader}, updated_at=now() where id=${existing.id} returning *`
      : await db.sql`
      insert into company_settings (company_name, legal_name, display_name, website_url, support_email, support_phone, business_phone, business_address, city, state, zip, service_area, timezone, currency, logo_url, favicon_url, primary_color, accent_color, theme_mode, show_company_name_in_header)
      values (${payload.companyName}, ${payload.legalName || null}, ${payload.displayName || payload.companyName}, ${payload.websiteUrl || null}, ${payload.supportEmail || null}, ${payload.supportPhone || null}, ${payload.businessPhone || null}, ${payload.businessAddress || null}, ${payload.city || null}, ${payload.state || null}, ${payload.zip || null}, ${payload.serviceArea || null}, ${payload.timezone}, ${payload.currency}, ${payload.logoUrl || null}, ${payload.faviconUrl || null}, ${payload.primaryColor}, ${payload.accentColor}, ${payload.themeMode}, ${payload.showCompanyNameInHeader}) returning *`;
    return json(200, { ok: true, company: camel(row) });
  } catch (error) {
    console.error('company-settings failed', error);
    return json(500, { ok: false, company: FALLBACK_COMPANY, message: 'Company settings are unavailable.' });
  }
};
