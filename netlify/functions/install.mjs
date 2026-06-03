import { clean, getSessionToken, hashToken, json, loadDatabase, parseJsonBody, validateEmail } from './auth-utils.mjs';
import { ensureCompanyTables } from './company-settings.mjs';

const permissions = ['dashboard.view.admin','dashboard.view.client','dashboard.view.worker','users.manage','roles.manage','company.manage','branding.manage','requests.manage','quotes.manage','quotes.create','quotes.edit','quotes.send','invoices.manage','inventory.manage','customers.manage','workers.manage','scheduling.manage','ai.quote.use','ai.quote.manage','ai.troubleshooting.use','ai.knowledge.manage','reports.view','settings.manage','admin.tools','client.tools','worker.tools','admin.users.manage','admin.roles.manage','admin.requests.manage','admin.quotes.manage','admin.invoices.manage','admin.inventory.manage','dashboard.switch_views'];
const roles = ['owner','admin','manager','worker','client','guest'];
const services = ['HVAC','Mini Splits','Water Heaters','Plumbing','Commercial Plumbing','Electrical','Commercial Electrical','Roofing','Drywall','Painting','Flooring','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements'];
const statuses = ['new','information_needed','quote_in_progress','quote_sent','accepted','scheduled','assigned','in_progress','pending_review','waiting_payment','completed','cancelled'];

const tableSeeds = async (db) => {
  await db.sql`create table if not exists permissions (key text primary key, label text, description text, created_at timestamptz not null default now())`;
  await db.sql`create table if not exists role_permissions (role_id uuid not null references roles(id) on delete cascade, permission_key text not null, enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (role_id, permission_key))`;
  await db.sql`create table if not exists service_categories (id uuid primary key default gen_random_uuid(), name text not null unique, enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists quote_settings (id uuid primary key default gen_random_uuid(), settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists ai_settings (id uuid primary key default gen_random_uuid(), settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists cmms_settings (id uuid primary key default gen_random_uuid(), statuses jsonb not null default '[]'::jsonb, settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists invoice_settings (id uuid primary key default gen_random_uuid(), settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists trade_intelligence_categories (id uuid primary key default gen_random_uuid(), trade text not null unique, library jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
  await db.sql`create table if not exists module_registry (id text primary key, role_key text not null, title text not null, nav_label text not null, permissions jsonb not null default '[]'::jsonb, enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
};

const ownerAllowedMaintenance = async (db, request) => {
  const url = new URL(request.url);
  if (url.searchParams.get('maintenance') !== '1') return false;
  const token = getSessionToken(request);
  if (!token) return false;
  const rows = await db.sql`select 1 from auth_sessions join user_roles on user_roles.user_id=auth_sessions.user_id join roles on roles.id=user_roles.role_id where auth_sessions.session_hash=${hashToken(token)} and roles.key='owner' and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() limit 1`;
  return rows.length > 0;
};

const tradeLibrary = (trade) => ({ requiredInfo: ['location','symptoms or scope','access conditions'], helpfulInfo: ['photos','model numbers','measurements'], commonQuestions: [`What details are known for ${trade}?`, 'Are photos available?', 'Is access restricted?'], commonMaterials: ['standard materials','trade-specific parts','consumables'], laborRules: ['apply minimum charge','include travel/setup','adjust for access and urgency'], safetyNotes: ['verify site safety','escalate licensed/safety hazards'], permitNotes: ['review permit requirements where applicable'], inspectionNotes: ['document before/after and completion evidence'], pricingRiskFactors: ['hidden damage','old equipment','unknown measurements'], missingInfoPrompts: ['Ask only optional follow-up questions; Admin may continue manually.'] });

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  const companyName = clean(body.companyName, 160);
  const ownerEmail = clean(body.ownerEmail, 254).toLowerCase();
  if (!companyName) return json(422, { ok: false, message: 'Company Name is required.' });
  const emailError = validateEmail(ownerEmail);
  if (emailError) return json(422, { ok: false, message: emailError });
  try {
    const db = await loadDatabase();
    await ensureCompanyTables(db); await tableSeeds(db);
    const [installed] = await db.sql`select * from platform_install where installed = true order by installed_at desc limit 1`;
    if (installed && !await ownerAllowedMaintenance(db, request)) return json(409, { ok: false, message: 'Installation is already complete.' });
    const [company] = await db.sql`
      insert into company_settings (company_name, legal_name, display_name, website_url, support_email, support_phone, business_phone, business_address, city, state, zip, service_area, timezone, currency, license_number, contractor_license_number, tax_id, business_type, logo_url, favicon_url, primary_color, accent_color, theme_mode, show_company_name_in_header, installation_complete)
      values (${companyName}, ${clean(body.legalName,180)||null}, ${clean(body.displayName,160)||companyName}, ${clean(body.websiteUrl,300)||null}, ${clean(body.supportEmail,254)||null}, ${clean(body.supportPhone,60)||null}, ${clean(body.businessPhone,60)||null}, ${clean(body.businessAddress,300)||null}, ${clean(body.city,120)||null}, ${clean(body.state,60)||null}, ${clean(body.zip,40)||null}, ${clean(body.serviceArea,500)||null}, ${clean(body.timezone,80)||'America/Phoenix'}, ${clean(body.currency,8)||'USD'}, ${clean(body.licenseNumber,120)||null}, ${clean(body.contractorLicenseNumber,120)||null}, ${clean(body.taxId,120)||null}, ${clean(body.businessType,120)||null}, ${clean(body.logoUrl,700)||null}, ${clean(body.faviconUrl,700)||null}, ${clean(body.primaryColor,32)||'#2563eb'}, ${clean(body.accentColor,32)||'#22c55e'}, ${clean(body.themeMode,20)||'light'}, ${Boolean(body.showCompanyNameInHeader)}, true)
      returning *`;
    const [owner] = await db.sql`insert into app_users (auth_provider, auth_subject, email, full_name, phone, is_active) values ('magic_link', ${ownerEmail}, ${ownerEmail}, ${clean(body.ownerFullName,140)||ownerEmail}, ${clean(body.ownerPhone,60)||null}, true) on conflict (email) do update set full_name=excluded.full_name, phone=excluded.phone, is_active=true, updated_at=now() returning id, email`;
    for (const role of roles) await db.sql`insert into roles (key,name,description,is_system) values (${role}, ${role.replace(/^./, c => c.toUpperCase())}, ${role + ' role'}, true) on conflict (key) do update set name=excluded.name, description=excluded.description, is_system=true, updated_at=now()`;
    for (const permission of permissions) await db.sql`insert into permissions (key,label,description) values (${permission}, ${permission}, ${'Permission: ' + permission}) on conflict (key) do update set label=excluded.label, description=excluded.description`;
    const roleRows = (await db.sql`select id,key from roles`).filter((role) => roles.includes(role.key));
    for (const role of roleRows) {
      const granted = role.key === 'owner' || role.key === 'admin' ? permissions : role.key === 'worker' ? ['dashboard.view.worker','worker.tools','ai.troubleshooting.use'] : role.key === 'client' ? ['dashboard.view.client','client.tools'] : role.key === 'manager' ? ['dashboard.view.admin','requests.manage','quotes.manage','scheduling.manage','customers.manage','workers.manage','invoices.manage'] : [];
      for (const permission of granted) await db.sql`insert into role_permissions (role_id, permission_key, enabled) values (${role.id}, ${permission}, true) on conflict (role_id, permission_key) do update set enabled=true, updated_at=now()`;
      if (['owner','admin'].includes(role.key)) await db.sql`insert into user_roles (user_id, role_id) values (${owner.id}, ${role.id}) on conflict do nothing`;
    }
    for (const service of (Array.isArray(body.serviceCategories) && body.serviceCategories.length ? body.serviceCategories : services)) await db.sql`insert into service_categories (name, enabled) values (${service}, true) on conflict (name) do update set enabled=true, updated_at=now()`;
    await db.sql`insert into quote_settings (settings) values (${JSON.stringify({ defaultLaborRate: Number(body.defaultLaborRate || 95), defaultMarkupPercentage: Number(body.defaultMarkupPercentage || 25), defaultMaterialMarkup: Number(body.defaultMaterialMarkup || 25), defaultTripCharge: Number(body.defaultTripCharge || 75), defaultTaxRate: Number(body.defaultTaxRate || 0), defaultMinimumJobPrice: Number(body.defaultMinimumJobPrice || 175), defaultQuoteExpirationDays: Number(body.defaultQuoteExpirationDays || 14), adminManualOverride: true })}::jsonb)`;
    await db.sql`insert into ai_settings (settings) values (${JSON.stringify({ enableAiQuoting: body.enableAiQuoting !== false, enableFollowUpQuestions: body.enableFollowUpQuestions !== false, enableInformationNeededQueue: body.enableInformationNeededQueue !== false, requireAdminReview: body.requireAdminReview !== false, aiNeverBlocksAdmin: true })}::jsonb)`;
    await db.sql`insert into cmms_settings (statuses, settings) values (${JSON.stringify(statuses)}::jsonb, ${JSON.stringify({ enableWorkerAssignments: true, enableScheduling: true, enablePhotos: true, enableMaterialTracking: true, enableInventoryReservations: true, enableCustomerApproval: true, enableInvoiceReadiness: true })}::jsonb)`;
    await db.sql`insert into invoice_settings (settings) values (${JSON.stringify({ enableInvoices: body.enableInvoices !== false, enableSquarePaymentLinks: body.enableSquarePaymentLinks !== false, defaultInvoiceDueDays: Number(body.defaultInvoiceDueDays || 14), defaultPaymentTerms: clean(body.defaultPaymentTerms,200) || 'Due on receipt', defaultTaxRate: Number(body.invoiceDefaultTaxRate || 0), defaultInvoiceFooter: clean(body.defaultInvoiceFooter,500) || 'Thank you for your business.', enableManualPaymentConfirmation: true, enablePaidUnpaidTracking: true })}::jsonb)`;
    for (const service of services) await db.sql`insert into trade_intelligence_categories (trade, library) values (${service}, ${JSON.stringify(tradeLibrary(service))}::jsonb) on conflict (trade) do update set library=excluded.library, updated_at=now()`;
    const modules = ['admin.overview','admin.quotes','admin.requests','admin.work-orders','admin.schedule','admin.customers','admin.invoices','admin.finance','admin.inventory','admin.users','admin.roles','admin.ai-knowledge','admin.brand-settings','admin.settings','client.overview','client.requests','client.quotes','client.invoices','client.project-updates','client.profile','client.properties','worker.overview','worker.jobs','worker.schedule','worker.materials','worker.photos','worker.notes','worker.troubleshooting'];
    for (const id of modules) { const [role, slug] = id.split('.'); await db.sql`insert into module_registry (id, role_key, title, nav_label, permissions) values (${id}, ${role}, ${slug}, ${slug}, ${JSON.stringify([])}::jsonb) on conflict (id) do update set enabled=true, updated_at=now()`; }
    await db.sql`insert into platform_install (installed, installed_at, installed_by_user_id, version, setup_summary) values (true, now(), ${owner.id}, 'clean-white-label-v1', ${JSON.stringify({ companyName, ownerEmail, roles, permissions, services, statuses, environment: { openai: 'OPENAI_API_KEY server-side only', resend: 'RESEND_API_KEY/MAGIC_LINK_FROM_EMAIL/QUOTE_FROM_EMAIL preserved', square: 'Square variables preserved' } })}::jsonb)`;
    return json(200, { ok: true, companyId: company.id, ownerId: owner.id, redirect: '/login/' });
  } catch (error) {
    console.error('install failed', error);
    return json(500, { ok: false, message: 'Installation failed. Check database configuration and migrations.' });
  }
};
