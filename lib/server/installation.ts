import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase, type Queryable } from './database';
import { sendMagicLink } from './auth';
import { createStorage } from './storage';
import { addActivity, ensureWorkflowFoundation } from './workflow';

export type InstallStatus = {
  installed: boolean;
  installerEnabled: boolean;
  companyConfigured: boolean;
  ownerCreated: boolean;
  databaseReady: boolean;
};

type InstallChecks = InstallStatus & {
  migrationsRan: boolean;
  defaultRolesExist: boolean;
  defaultPermissionsExist: boolean;
  foundationCompleted: boolean;
  installerLocked: boolean;
  completionFlagSet: boolean;
};

const REQUIRED_ROLES = ['Owner', 'Admin', 'Office', 'Dispatcher', 'Technician', 'Client', 'Vendor'];
export const DEFAULT_PERMISSION_KEYS = [
  'dashboard.view','dashboard.manage','settings.view','settings.manage','users.view','users.manage','roles.view','roles.manage','permissions.view','permissions.manage',
  'clients.view','clients.manage','properties.view','properties.manage','requests.view','requests.manage','quotes.view','quotes.create','quotes.approve','quotes.manage','jobs.view','jobs.manage',
  'work_orders.view','work_orders.manage','invoices.view','invoices.manage','payments.view','payments.manage','cmms.view','cmms.manage','messages.view','messages.manage',
  'website.view','website.manage','homepage.view','homepage.manage','project_showcase.view','project_showcase.manage','theme.view','theme.manage','branding.view','branding.manage','service_catalog.view','service_catalog.manage','media.view','media.manage','integrations.manage',
  'audit_logs.view','license.view','license.manage','expansion_packs.view','expansion_packs.manage','*'
];
const REQUIRED_PERMISSIONS = DEFAULT_PERMISSION_KEYS.length;
const INSTALLATION_VERSION = process.env.npm_package_version ?? '1.0.0';

const asBoolean = (value: unknown) => value === true || value === 'true';

type UploadInput = { fileName?: string; mimeType?: string; dataUrl?: string };
type BrandingAssetInput = { mediaId?: string | null; url?: string | null; resolvedUrl?: string | null };
type MediaUploadResult = { id: string; url: string; filename: string; contentType: string; size: number };
type EstimateInput = Record<string, unknown> & { firstName?: string; lastName?: string; email?: string; phone?: string; serviceAddress?: string; city?: string; state?: string; zip?: string; serviceCategory?: string; urgency?: string; title?: string; description?: string; files?: UploadInput[] };
type HomepageSetupInput = {
  logoUrl?: string;
  logoMediaId?: string | null;
  logoResolvedUrl?: string | null;
  logoUpload?: UploadInput | null;
  faviconUrl?: string;
  faviconMediaId?: string | null;
  faviconResolvedUrl?: string | null;
  faviconUpload?: UploadInput | null;
  displayName?: string;
  tagline?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  primaryCtaLabel?: string;
  primaryCtaLink?: string;
  secondaryCtaLabel?: string;
  secondaryCtaLink?: string;
  aboutText?: string;
  servicesIntro?: string;
  services?: unknown[];
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  serviceArea?: string;
  businessHours?: string;
  trustText?: string;
  yearsExperience?: string;
  emergencyServiceEnabled?: boolean;
  financingAvailableEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  homepagePresetId?: string;
};

const PUBLIC_SETTING_KEYS = [
  'branding.logo_media_id','branding.logo_url','branding.logo_resolved_url','branding.favicon_media_id','branding.favicon_url','branding.favicon_resolved_url','branding.display_name','branding.tagline','branding.updated_at','company.name','company.display_name','company.email','company.phone','company.logo_url','company.logo_media_id','company.logo_resolved_url','company.favicon_url','company.favicon_media_id','company.favicon_resolved_url','company.updated_at','theme.settings','homepage.hero_headline','homepage.hero_subheadline',
  'homepage.primary_cta_label','homepage.primary_cta_link','homepage.secondary_cta_label','homepage.secondary_cta_link','homepage.about_text','homepage.services_intro',
  'homepage.services','homepage.contact_phone','homepage.contact_email','homepage.contact_address','homepage.service_area','homepage.business_hours','homepage.trust_text',
  'homepage.years_experience','homepage.emergency_service_enabled','homepage.financing_available_enabled','homepage.seo_title','homepage.seo_description','homepage.preset_id'
];

function defaultPublicSiteSettings() {
  return {
    ok: true,
    companyName: 'ContractorOS',
    companyDisplayName: 'ContractorOS',
    logoUrl: '',
    faviconUrl: '',
    brandingUpdatedAt: '',
    branding: {
      displayName: 'ContractorOS',
      companyDisplayName: 'ContractorOS',
      tagline: 'Foundation business operating system',
      companyName: 'ContractorOS',
      logoMediaId: '',
      logoUrl: '',
      logoResolvedUrl: '',
      faviconMediaId: '',
      faviconUrl: '',
      faviconResolvedUrl: '',
      theme: {},
      homepage: '/',
      brandingUpdatedAt: '',
    },
    homepage: {
      heroHeadline: 'Contractor services made simple',
      heroSubheadline: 'Request estimates, schedule service, and stay informed online.',
      primaryCtaLabel: 'Request Estimate',
      primaryCtaLink: '/request-estimate',
      secondaryCtaLabel: 'View Services',
      secondaryCtaLink: '/services',
      aboutText: '',
      servicesIntro: '',
      services: [],
      contactPhone: '',
      contactEmail: '',
      contactAddress: '',
      serviceArea: '',
      businessHours: '',
      trustText: '',
      yearsExperience: '',
      emergencyServiceEnabled: false,
      financingAvailableEnabled: false,
      seoTitle: 'Contractor Services',
      seoDescription: 'Request a service estimate from a trusted local contractor.',
      presetId: 'premium-contractor',
    },
  };
}

async function saveHomepageSetup(db: Queryable, setup: HomepageSetupInput, companyName: string, branding?: { logo?: BrandingAssetInput; favicon?: BrandingAssetInput }) {
  const legacyLogo = setup.logoUpload?.dataUrl ? await storeUpload(db, setup.logoUpload, 'branding/logo') : null;
  const legacyFavicon = setup.faviconUpload?.dataUrl ? await storeUpload(db, setup.faviconUpload, 'branding/favicon') : null;
  const logo = normalizeBrandingAsset({
    mediaId: branding?.logo?.mediaId ?? setup.logoMediaId ?? legacyLogo?.id ?? null,
    url: branding?.logo?.url ?? setup.logoUrl ?? null,
    resolvedUrl: branding?.logo?.resolvedUrl ?? setup.logoResolvedUrl ?? legacyLogo?.url ?? null,
  });
  const favicon = normalizeBrandingAsset({
    mediaId: branding?.favicon?.mediaId ?? setup.faviconMediaId ?? legacyFavicon?.id ?? null,
    url: branding?.favicon?.url ?? setup.faviconUrl ?? null,
    resolvedUrl: branding?.favicon?.resolvedUrl ?? setup.faviconResolvedUrl ?? legacyFavicon?.url ?? null,
  });
  const displayName = setup.displayName?.trim() || companyName;
  const updatedAt = new Date().toISOString();

  await saveBrandingSettings(db, { logo, favicon, updatedAt });
  await saveCompanyBrandingColumns(db, { logo, favicon });
  await upsertSetting(db, 'branding.display_name', displayName);
  await upsertSetting(db, 'company.display_name', displayName);
  await upsertSetting(db, 'company.name', companyName);
  await upsertSetting(db, 'company.email', setup.contactEmail?.trim() || '');
  await upsertSetting(db, 'company.phone', setup.contactPhone?.trim() || '');
  await upsertSetting(db, 'company.updated_at', updatedAt);
  await upsertSetting(db, 'branding.tagline', setup.tagline?.trim() || '');
  await upsertSetting(db, 'branding.updated_at', updatedAt);
  await upsertSetting(db, 'homepage.hero_headline', setup.heroHeadline?.trim() || `${companyName} keeps your property running`);
  await upsertSetting(db, 'homepage.hero_subheadline', setup.heroSubheadline?.trim() || 'Request estimates, schedule service, and stay informed online.');
  await upsertSetting(db, 'homepage.primary_cta_label', setup.primaryCtaLabel?.trim() || 'Request Estimate');
  await upsertSetting(db, 'homepage.primary_cta_link', setup.primaryCtaLink?.trim() || '/request-estimate');
  await upsertSetting(db, 'homepage.secondary_cta_label', setup.secondaryCtaLabel?.trim() || 'View Services');
  await upsertSetting(db, 'homepage.secondary_cta_link', setup.secondaryCtaLink?.trim() || '/services');
  await upsertSetting(db, 'homepage.about_text', setup.aboutText?.trim() || '');
  await upsertSetting(db, 'homepage.services_intro', setup.servicesIntro?.trim() || '');
  await upsertSetting(db, 'homepage.services', Array.isArray(setup.services) ? setup.services : []);
  await upsertSetting(db, 'homepage.contact_phone', setup.contactPhone?.trim() || '');
  await upsertSetting(db, 'homepage.contact_email', setup.contactEmail?.trim() || '');
  await upsertSetting(db, 'homepage.contact_address', setup.contactAddress?.trim() || '');
  await upsertSetting(db, 'homepage.service_area', setup.serviceArea?.trim() || '');
  await upsertSetting(db, 'homepage.business_hours', setup.businessHours?.trim() || '');
  await upsertSetting(db, 'homepage.trust_text', setup.trustText?.trim() || '');
  await upsertSetting(db, 'homepage.years_experience', setup.yearsExperience?.trim() || '');
  await upsertSetting(db, 'homepage.emergency_service_enabled', Boolean(setup.emergencyServiceEnabled));
  await upsertSetting(db, 'homepage.financing_available_enabled', Boolean(setup.financingAvailableEnabled));
  await upsertSetting(db, 'homepage.seo_title', setup.seoTitle?.trim() || `${companyName} | Contractor Services`);
  await upsertSetting(db, 'homepage.seo_description', setup.seoDescription?.trim() || 'Request a service estimate from a trusted local contractor.');
  await upsertSetting(db, 'homepage.preset_id', setup.homepagePresetId?.trim() || 'premium-contractor');
}

function normalizeBrandingAsset(asset: BrandingAssetInput): Required<BrandingAssetInput> {
  const mediaId = typeof asset.mediaId === 'string' ? asset.mediaId.trim() : '';
  const directUrl = typeof asset.url === 'string' ? asset.url.trim() : '';
  const resolvedUrl = typeof asset.resolvedUrl === 'string' ? asset.resolvedUrl.trim() : '';
  return {
    mediaId,
    url: mediaId ? '' : directUrl,
    resolvedUrl: resolvedUrl || (mediaId ? mediaUrl(mediaId) : directUrl),
  };
}

async function saveBrandingSettings(db: Queryable, input: { logo: Required<BrandingAssetInput>; favicon: Required<BrandingAssetInput>; updatedAt: string }) {
  await upsertSetting(db, 'branding.logo_media_id', input.logo.mediaId || null);
  await upsertSetting(db, 'branding.logo_url', input.logo.url || '');
  await upsertSetting(db, 'branding.logo_resolved_url', input.logo.resolvedUrl || '');
  await upsertSetting(db, 'branding.favicon_media_id', input.favicon.mediaId || null);
  await upsertSetting(db, 'branding.favicon_url', input.favicon.url || '');
  await upsertSetting(db, 'branding.favicon_resolved_url', input.favicon.resolvedUrl || '');
  await upsertSetting(db, 'branding.updated_at', input.updatedAt);
  await upsertSetting(db, 'company.logo_media_id', input.logo.mediaId || null);
  await upsertSetting(db, 'company.logo_url', input.logo.url || '');
  await upsertSetting(db, 'company.logo_resolved_url', input.logo.resolvedUrl || '');
  await upsertSetting(db, 'company.favicon_media_id', input.favicon.mediaId || null);
  await upsertSetting(db, 'company.favicon_url', input.favicon.url || '');
  await upsertSetting(db, 'company.favicon_resolved_url', input.favicon.resolvedUrl || '');
}

async function saveCompanyBrandingColumns(db: Queryable, input: { logo: Required<BrandingAssetInput>; favicon: Required<BrandingAssetInput> }) {
  await db.query(
    `update company_settings
     set logo_media_id = nullif($1, '')::uuid,
         logo_url = nullif($2, ''),
         logo_resolved_url = nullif($3, ''),
         favicon_media_id = nullif($4, '')::uuid,
         favicon_url = nullif($5, ''),
         favicon_resolved_url = nullif($6, ''),
         branding_updated_at = now(),
         updated_at = now()
     where id = (select id from company_settings order by created_at asc limit 1)`,
    [input.logo.mediaId, input.logo.url, input.logo.resolvedUrl, input.favicon.mediaId, input.favicon.url, input.favicon.resolvedUrl]
  );
}

function mediaUrl(mediaId: string) {
  return `/api/media/${encodeURIComponent(mediaId)}`;
}

async function storeUpload(db: Queryable, upload: UploadInput, prefix: string): Promise<MediaUploadResult> {
  const parsed = parseDataUrl(upload.dataUrl || '');
  const fileName = upload.fileName?.replace(/[^a-z0-9._-]/gi, '-') || 'upload.bin';
  const storageKey = `${prefix}/${Date.now()}-${fileName}`;
  const storage = createStorage();
  const storedPath = await storage.put(storageKey, parsed.buffer);
  await db.query(`alter table files add column if not exists data_base64 text`);
  const file = await db.query<{ id: string }>(
    `insert into files (storage_provider, storage_key, file_name, mime_type, size_bytes, data_base64)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'database' : 'local'), storedPath, fileName, upload.mimeType || parsed.mimeType, parsed.buffer.byteLength, parsed.buffer.toString('base64')]
  );
  const media = await db.query<{ id: string }>(
    `insert into media_assets (file_id, owner_type, visibility, alt_text, metadata)
     values ($1, 'branding', 'public', $2, $3::jsonb)
     returning id`,
    [file.rows[0].id, fileName, JSON.stringify({ storageKey })]
  );
  const id = media.rows[0].id;
  return { id, url: mediaUrl(id), filename: fileName, contentType: upload.mimeType || parsed.mimeType, size: parsed.buffer.byteLength };
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: 'application/octet-stream', buffer: Buffer.from(dataUrl, 'base64') };
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}


export async function runMigrations(db: Queryable = createDatabase()) {
  for (const file of ['001_foundation.sql', '002_seed_foundation.sql', '003_admin_settings_dashboard.sql', '004_dashboard_modules.sql', '005_homepage_builder.sql', '006_premium_homepage_design.sql', '007_backend_completion.sql']) {
    await db.query(await readMigration(file));
  }
}

async function readMigration(file: string) {
  const candidateDirs = [
    path.resolve('migrations'),
    path.resolve(process.cwd(), 'migrations'),
    process.env.LAMBDA_TASK_ROOT ? path.join(process.env.LAMBDA_TASK_ROOT, 'migrations') : '',
    process.env.NETLIFY ? path.resolve(process.cwd(), '..', 'migrations') : '',
  ].filter(Boolean);

  const tried: string[] = [];
  for (const dir of candidateDirs) {
    const filePath = path.join(dir, file);
    tried.push(filePath);
    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
      if (code !== 'ENOENT') throw error;
    }
  }

  throw new Error(`Migration file ${file} was not found. Tried: ${tried.join(', ')}`);
}

export async function getInstallChecks(db: Queryable = createDatabase()): Promise<InstallChecks> {
  try {
    await db.query('select 1');

    const tableResult = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)`,
      [['app_settings', 'company_settings', 'users', 'roles', 'permissions', 'user_roles', 'installer_state']]
    );
    const tables = new Set(tableResult.rows.map((row) => row.table_name));
    const migrationsRan = ['app_settings', 'company_settings', 'users', 'roles', 'permissions', 'user_roles', 'installer_state'].every((table) => tables.has(table));

    if (!migrationsRan) return emptyChecks({ databaseReady: true });

    const settings = await db.query<{ key: string; value: unknown }>(
      `select key, value from app_settings where key in ('installation.completed', 'foundation.install.completed')`
    );
    const settingsByKey = new Map(settings.rows.map((row) => [row.key, row.value]));
    const completionFlagSet = asBoolean(settingsByKey.get('installation.completed'));
    const foundationCompleted = asBoolean(settingsByKey.get('foundation.install.completed'));

    const company = await db.query<{ exists: boolean }>(
      `select exists(select 1 from company_settings where nullif(trim(company_name), '') is not null) as exists`
    );
    const owner = await db.query<{ exists: boolean }>(
      `select exists(
        select 1
        from users u
        join user_roles ur on ur.user_id = u.id
        join roles r on r.id = ur.role_id
        where r.name = 'Owner'
      ) as exists`
    );
    const roles = await db.query<{ count: string }>(`select count(*) from roles where name = any($1)`, [REQUIRED_ROLES]);
    const permissions = await db.query<{ count: string }>(`select count(*) from permissions`);
    const installer = await db.query<{ locked: boolean }>(
      `select exists(select 1 from installer_state where locked = true) as locked`
    );

    const companyConfigured = Boolean(company.rows[0]?.exists);
    const ownerCreated = Boolean(owner.rows[0]?.exists);
    const defaultRolesExist = Number(roles.rows[0]?.count ?? 0) >= REQUIRED_ROLES.length;
    const defaultPermissionsExist = Number(permissions.rows[0]?.count ?? 0) >= REQUIRED_PERMISSIONS;
    const installerLocked = Boolean(installer.rows[0]?.locked);
    const installed = Boolean(
      completionFlagSet &&
      foundationCompleted &&
      installerLocked &&
      companyConfigured &&
      ownerCreated &&
      defaultRolesExist &&
      defaultPermissionsExist
    );

    return {
      installed,
      installerEnabled: !installed,
      companyConfigured,
      ownerCreated,
      databaseReady: true,
      migrationsRan,
      defaultRolesExist,
      defaultPermissionsExist,
      foundationCompleted,
      installerLocked,
      completionFlagSet,
    };
  } catch {
    return emptyChecks();
  }
}

export async function getInstallStatus(db: Queryable = createDatabase()): Promise<InstallStatus> {
  const checks = await getInstallChecks(db);
  return {
    installed: checks.installed,
    installerEnabled: checks.installerEnabled,
    companyConfigured: checks.companyConfigured,
    ownerCreated: checks.ownerCreated,
    databaseReady: checks.databaseReady,
  };
}

export async function completeInstallation(input: { companyName?: string; ownerName?: string; ownerEmail?: string; theme?: unknown; homepageSetup?: HomepageSetupInput; branding?: { logoMediaId?: string | null; logoUrl?: string | null; logoResolvedUrl?: string | null; faviconMediaId?: string | null; faviconUrl?: string | null; faviconResolvedUrl?: string | null } } = {}, db: Queryable = createDatabase()) {
  await runMigrations(db);

  const companyName = input.companyName?.trim() || input.homepageSetup?.displayName?.trim() || 'My Company';
  const ownerName = input.ownerName?.trim() || 'Owner';
  const ownerEmail = input.ownerEmail?.trim() || 'owner@example.com';

  await db.query(
    `insert into company_settings (company_name, company_email, company_phone)
     select $1, nullif($2, ''), nullif($3, '')
     where not exists (select 1 from company_settings)`,
    [companyName, input.homepageSetup?.contactEmail?.trim() || '', input.homepageSetup?.contactPhone?.trim() || '']
  );
  await db.query(
    `update company_settings set company_name = coalesce(nullif(company_name, ''), $1), company_email = coalesce(nullif(company_email, ''), nullif($2, '')), company_phone = coalesce(nullif(company_phone, ''), nullif($3, '')), updated_at = now()
     where id = (select id from company_settings order by created_at asc limit 1)`,
    [companyName, input.homepageSetup?.contactEmail?.trim() || '', input.homepageSetup?.contactPhone?.trim() || '']
  );

  const owner = await db.query<{ id: string }>(
    `insert into users (name, email, status)
     values ($1, $2, 'active')
     on conflict (email) do update set name = excluded.name, status = 'active', updated_at = now()
     returning id`,
    [ownerName, ownerEmail]
  );
  await db.query(
    `insert into user_roles (user_id, role_id)
     select $1, id from roles where name = 'Owner'
     on conflict do nothing`,
    [owner.rows[0].id]
  );
  await repairOwnerAccess({ ownerEmail }, db);

  await db.query(
    `insert into installer_state (step, completed, locked, summary)
     values ('finish', true, true, $1::jsonb)
     on conflict do nothing`,
    [JSON.stringify({ completedBy: ownerEmail })]
  );
  await db.query(`update installer_state set completed = true, locked = true, updated_at = now()`);

  await upsertSetting(db, 'foundation.install.completed', true);
  await upsertSetting(db, 'installation.completed', true);
  await upsertSetting(db, 'installation.completed_at', new Date().toISOString());
  await upsertSetting(db, 'installation.version', INSTALLATION_VERSION);
  await upsertSetting(db, 'company.name', companyName);
  await upsertSetting(db, 'company.display_name', input.homepageSetup?.displayName?.trim() || companyName);
  await upsertSetting(db, 'company.email', input.homepageSetup?.contactEmail?.trim() || '');
  await upsertSetting(db, 'company.phone', input.homepageSetup?.contactPhone?.trim() || '');
  await upsertSetting(db, 'company.updated_at', new Date().toISOString());
  if (input.theme) await upsertSetting(db, 'theme.settings', input.theme);
  if (input.homepageSetup) await saveHomepageSetup(db, input.homepageSetup, companyName, input.branding ? { logo: { mediaId: input.branding.logoMediaId, url: input.branding.logoUrl, resolvedUrl: input.branding.logoResolvedUrl }, favicon: { mediaId: input.branding.faviconMediaId, url: input.branding.faviconUrl, resolvedUrl: input.branding.faviconResolvedUrl } } : undefined);

  try {
    await sendMagicLink(ownerEmail, '/dashboard', await getPublicSiteSettings(db), {}, db);
  } catch (error) {
    console.warn('Owner magic login link could not be sent during installation.', error);
  }

  return getInstallStatus(db);
}


function permissionDescription(key: string) {
  if (key === '*') return 'Wildcard super admin permission';
  const [group, action] = key.split('.');
  return `${action === 'manage' ? 'Manage' : 'View'} ${group?.replaceAll('_', ' ') || key}`;
}

export async function repairOwnerAccess(input: { ownerEmail?: string } = {}, db: Queryable = createDatabase()) {
  await runMigrations(db);

  await db.query(
    `insert into roles (name, description, system_role)
     values ('Owner', 'Full system owner', true)
     on conflict (name) do update set description = excluded.description, system_role = true`
  );

  for (const key of DEFAULT_PERMISSION_KEYS) {
    await db.query(
      `insert into permissions (key, group_name, description)
       values ($1, $2, $3)
       on conflict (key) do update set group_name = excluded.group_name, description = excluded.description`,
      [key, key === '*' ? 'system' : key.split('.')[0], permissionDescription(key)]
    );
  }

  await db.query(
    `insert into role_permissions (role_id, permission_id)
     select r.id, p.id from roles r cross join permissions p
     where r.name = 'Owner' and p.key = any($1)
     on conflict do nothing`,
    [DEFAULT_PERMISSION_KEYS]
  );

  const ownerUser = input.ownerEmail?.trim()
    ? await db.query<{ id: string; email: string }>(`select id, email::text from users where lower(email::text) = lower($1) limit 1`, [input.ownerEmail.trim()])
    : await db.query<{ id: string; email: string }>(
        `select u.id, u.email::text
         from users u
         left join user_roles ur on ur.user_id = u.id
         left join roles r on r.id = ur.role_id
         order by case when r.name = 'Owner' then 0 else 1 end, u.created_at asc
         limit 1`
      );

  if (ownerUser.rows[0]) {
    await db.query(
      `insert into user_roles (user_id, role_id)
       select $1, id from roles where name = 'Owner'
       on conflict do nothing`,
      [ownerUser.rows[0].id]
    );
  }

  const summary = await db.query<{
    owner_role_exists: boolean;
    wildcard_permission_exists: boolean;
    owner_has_wildcard: boolean;
    explicit_permissions_assigned: string;
    owner_user_id: string | null;
    owner_email: string | null;
  }>(
    `select
       exists(select 1 from roles where name = 'Owner') as owner_role_exists,
       exists(select 1 from permissions where key = '*') as wildcard_permission_exists,
       exists(select 1 from roles r join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where r.name = 'Owner' and p.key = '*') as owner_has_wildcard,
       (select count(*) from roles r join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where r.name = 'Owner' and p.key = any($1))::text as explicit_permissions_assigned,
       $2::uuid as owner_user_id,
       $3::text as owner_email`,
    [DEFAULT_PERMISSION_KEYS.filter((key) => key !== '*'), ownerUser.rows[0]?.id || null, ownerUser.rows[0]?.email || null]
  );

  return { ok: true, repaired: true, ...summary.rows[0], defaultPermissionCount: DEFAULT_PERMISSION_KEYS.length };
}



export async function getPublicSiteSettings(db: Queryable = createDatabase()) {
  try {
    const tableResult = await db.query<{ exists: boolean }>(
      `select exists(
        select 1
        from information_schema.tables
        where table_schema = 'public' and table_name = 'app_settings'
      ) as exists`
    );

    if (!tableResult.rows[0]?.exists) return defaultPublicSiteSettings();

    const result = await db.query<{ key: string; value: unknown }>(`select key, value from app_settings where key = any($1)`, [PUBLIC_SETTING_KEYS]);
    const values = new Map(result.rows.map((row) => [row.key, row.value]));
    const companyResult = await db.query<{ company_name: string | null; company_email: string | null; company_phone: string | null; logo_media_id: string | null; logo_url: string | null; logo_resolved_url: string | null; favicon_media_id: string | null; favicon_url: string | null; favicon_resolved_url: string | null; branding_updated_at: string | null }>(`select company_name, company_email, company_phone, logo_media_id::text, logo_url, logo_resolved_url, favicon_media_id::text, favicon_url, favicon_resolved_url, branding_updated_at::text from company_settings order by created_at asc limit 1`);
    const companySettings = companyResult.rows[0];
    const defaults = defaultPublicSiteSettings();

    const companyName = asText(values.get('company.name'), companySettings?.company_name || asText(values.get('branding.display_name'), defaults.branding.companyName));
    const companyDisplayName = asText(values.get('company.display_name'), asText(values.get('branding.display_name'), companyName));
    const brandingUpdatedAt = asText(values.get('company.updated_at'), asText(values.get('branding.updated_at'), companySettings?.branding_updated_at || defaults.branding.brandingUpdatedAt));
    const logoMediaId = values.get('company.logo_media_id') || values.get('branding.logo_media_id') || companySettings?.logo_media_id || '';
    const logoUrlRaw = values.get('company.logo_url') || values.get('branding.logo_url') || companySettings?.logo_url || '';
    const logoResolvedUrl = values.get('company.logo_resolved_url') || values.get('branding.logo_resolved_url') || companySettings?.logo_resolved_url || '';
    const faviconMediaId = values.get('company.favicon_media_id') || values.get('branding.favicon_media_id') || companySettings?.favicon_media_id || '';
    const faviconUrlRaw = values.get('company.favicon_url') || values.get('branding.favicon_url') || companySettings?.favicon_url || '';
    const faviconResolvedUrl = values.get('company.favicon_resolved_url') || values.get('branding.favicon_resolved_url') || companySettings?.favicon_resolved_url || '';
    const logoUrl = resolveBrandingAsset(logoResolvedUrl, logoUrlRaw, logoMediaId);
    const faviconUrl = resolveBrandingAsset(faviconResolvedUrl, faviconUrlRaw, faviconMediaId);

    return {
      ok: true,
      companyName,
      companyDisplayName,
      logoUrl,
      faviconUrl,
      brandingUpdatedAt,
      companyEmail: asText(values.get('company.email'), companySettings?.company_email || ''),
      companyPhone: asText(values.get('company.phone'), companySettings?.company_phone || ''),
      branding: {
        companyName,
        companyDisplayName,
        displayName: companyDisplayName,
        tagline: asText(values.get('branding.tagline'), defaults.branding.tagline),
        logoMediaId: typeof logoMediaId === 'string' ? logoMediaId : '',
        logoUrl,
        logoResolvedUrl: typeof logoResolvedUrl === 'string' ? logoResolvedUrl : '',
        faviconMediaId: typeof faviconMediaId === 'string' ? faviconMediaId : '',
        faviconUrl,
        faviconResolvedUrl: typeof faviconResolvedUrl === 'string' ? faviconResolvedUrl : '',
        theme: values.get('theme.settings') || defaults.branding.theme,
        homepage: '/',
        brandingUpdatedAt,
      },
      homepage: {
        heroHeadline: asText(values.get('homepage.hero_headline'), defaults.homepage.heroHeadline),
        heroSubheadline: asText(values.get('homepage.hero_subheadline'), defaults.homepage.heroSubheadline),
        primaryCtaLabel: asText(values.get('homepage.primary_cta_label'), defaults.homepage.primaryCtaLabel),
        primaryCtaLink: asText(values.get('homepage.primary_cta_link'), defaults.homepage.primaryCtaLink),
        secondaryCtaLabel: asText(values.get('homepage.secondary_cta_label'), defaults.homepage.secondaryCtaLabel),
        secondaryCtaLink: asText(values.get('homepage.secondary_cta_link'), defaults.homepage.secondaryCtaLink),
        aboutText: asText(values.get('homepage.about_text'), defaults.homepage.aboutText),
        servicesIntro: asText(values.get('homepage.services_intro'), defaults.homepage.servicesIntro),
        services: Array.isArray(values.get('homepage.services')) ? values.get('homepage.services') : defaults.homepage.services,
        contactPhone: asText(values.get('homepage.contact_phone'), defaults.homepage.contactPhone),
        contactEmail: asText(values.get('homepage.contact_email'), defaults.homepage.contactEmail),
        contactAddress: asText(values.get('homepage.contact_address'), defaults.homepage.contactAddress),
        serviceArea: asText(values.get('homepage.service_area'), defaults.homepage.serviceArea),
        businessHours: asText(values.get('homepage.business_hours'), defaults.homepage.businessHours),
        trustText: asText(values.get('homepage.trust_text'), defaults.homepage.trustText),
        yearsExperience: asText(values.get('homepage.years_experience'), defaults.homepage.yearsExperience),
        emergencyServiceEnabled: asBoolean(values.get('homepage.emergency_service_enabled')),
        financingAvailableEnabled: asBoolean(values.get('homepage.financing_available_enabled')),
        seoTitle: asText(values.get('homepage.seo_title'), defaults.homepage.seoTitle),
        seoDescription: asText(values.get('homepage.seo_description'), defaults.homepage.seoDescription),
        presetId: asText(values.get('homepage.preset_id'), defaults.homepage.presetId),
      },
    };
  } catch (error) {
    console.warn('Public site settings unavailable; using installer-safe defaults', error);
    return defaultPublicSiteSettings();
  }
}


export async function getPublicServiceCatalog(db: Queryable = createDatabase()) {
  await runMigrations(db);
  const result = await db.query<{ id: string; name: string; description: string | null }>(`select id::text, name, description from service_categories where enabled is true order by sort_order, name`);
  return { ok: true, services: result.rows };
}

export async function createPublicEstimateRequest(input: EstimateInput, db: Queryable = createDatabase()) {
  await runMigrations(db);
  await ensureWorkflowFoundation(db);
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const displayName = `${firstName} ${lastName}`.trim() || email || phone || 'Website lead';
  const address = [input.serviceAddress, input.city, input.state, input.zip].map((value) => String(value || '').trim()).filter(Boolean).join(', ');
  const description = [input.title, input.description].map((value) => String(value || '').trim()).filter(Boolean).join('\n\n');
  if (!displayName || (!email && !phone) || !address || !description) throw new Error('Missing required request estimate fields');

  const client = await db.query<{ id: string }>(
    `insert into clients (display_name, status, email, phone) values ($1, 'lead', nullif($2,''), nullif($3,'')) returning id`,
    [displayName, email, phone]
  );
  await db.query(
    `insert into client_contacts (client_id, name, email, phone, primary_contact) values ($1, $2, nullif($3, ''), nullif($4, ''), true)`,
    [client.rows[0].id, displayName, email, phone]
  );
  const property = await db.query<{ id: string }>(
    `insert into properties (client_id, address, notes, property_type, access_notes) values ($1, $2, $3, $4, $5) returning id`,
    [client.rows[0].id, address, JSON.stringify({ propertyType: input.propertyType, accessNotes: input.accessNotes }), String(input.propertyType || ''), String(input.accessNotes || '')]
  );
  const category = await db.query<{ id: string }>(
    `insert into service_categories (name, enabled) values ($1, true) on conflict (name) do update set enabled = true returning id`,
    [String(input.serviceCategory || 'General Repair')]
  );
  const request = await db.query<{ id: string }>(
    `insert into work_requests (client_id, property_id, service_category_id, title, status, priority, description) values ($1, $2, $3, $4, 'new', $5, $6) returning id`,
    [client.rows[0].id, property.rows[0].id, category.rows[0].id, String(input.title || input.serviceCategory || 'Service request'), urgencyToPriority(String(input.urgency || 'Flexible')), description]
  );

  const files = Array.isArray(input.files) ? input.files : [];
  for (const file of files) {
    if (!file?.dataUrl) continue;
    const media = await storeUpload(db, file, `requests/${request.rows[0].id}`);
    await db.query(`update media_assets set owner_type = 'work_request', owner_id = $1, visibility = 'private' where id = $2`, [request.rows[0].id, media.id]);
  }

  await addActivity(db, null, 'client', client.rows[0].id, 'created', 'Client created from public estimate request', { visibility: 'client', metadata: { requestId: request.rows[0].id, propertyId: property.rows[0].id } });
  await addActivity(db, null, 'property', property.rows[0].id, 'created', 'Property created from public estimate request', { visibility: 'client', metadata: { requestId: request.rows[0].id, clientId: client.rows[0].id } });
  await addActivity(db, null, 'request', request.rows[0].id, 'created', 'Work request submitted', { visibility: 'client', metadata: { clientId: client.rows[0].id, propertyId: property.rows[0].id, source: 'public_request_estimate' } });
  const requestNumber = `REQ-${request.rows[0].id.slice(0, 8).toUpperCase()}`;
  return { ok: true, id: request.rows[0].id, requestNumber, status: 'new', emailConfirmationQueued: Boolean(email && process.env.RESEND_API_KEY) };
}

function urgencyToPriority(urgency: string) {
  if (urgency.toLowerCase().includes('emergency')) return 'emergency';
  if (urgency.toLowerCase().includes('week')) return 'high';
  return 'normal';
}

function resolveBrandingAsset(resolvedUrl: unknown, url: unknown, mediaId: unknown) {
  if (typeof resolvedUrl === 'string' && resolvedUrl.trim()) return resolvedUrl.trim();
  if (typeof url === 'string' && url.trim()) return url.trim();
  if (typeof mediaId === 'string' && mediaId.trim()) return mediaUrl(mediaId.trim());
  return '';
}

export async function uploadBrandingMedia(input: { filename: string; contentType: string; data: Buffer; purpose?: string }, db: Queryable = createDatabase()) {
  await runMigrations(db);
  if (!['branding_logo', 'branding_favicon'].includes(input.purpose || '')) throw new Error('Unsupported media upload purpose');
  if (!input.data.byteLength) throw new Error('Uploaded file is empty');
  if (!input.contentType.startsWith('image/')) throw new Error('Branding uploads must be images');
  const prefix = input.purpose === 'branding_favicon' ? 'branding/favicon' : 'branding/logo';
  const media = await storeUpload(db, { fileName: input.filename, mimeType: input.contentType, dataUrl: input.data.toString('base64') }, prefix);
  if (!media.url) throw new Error('Media upload did not produce a usable URL');
  return { ok: true, media };
}

export async function getPublicMedia(mediaId: string, db: Queryable = createDatabase()) {
  const result = await db.query<{ storage_key: string; mime_type: string | null; data_base64?: string | null }>(
    `select f.storage_key, f.mime_type, f.data_base64 from media_assets m join files f on f.id = m.file_id where m.id = $1 and m.visibility = 'public' limit 1`,
    [mediaId]
  );
  const file = result.rows[0];
  if (!file) return null;
  const data = file.data_base64 ? Buffer.from(file.data_base64, 'base64') : await readFile(file.storage_key).catch(() => null);
  if (!data) return null;
  return { data, mimeType: file.mime_type || 'application/octet-stream' };
}

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

export async function getSystemDiagnostics(currentUser?: { email?: string; role?: string; permissions?: string[] } | null, db: Queryable = createDatabase()) {
  await runMigrations(db);
  const publicSettings = await getPublicSiteSettings(db);
  const permissionStatus = await db.query<{
    owner_role_exists: boolean;
    wildcard_permission_exists: boolean;
    owner_has_wildcard: boolean;
    dashboard_view_exists: boolean;
  }>(
    `select
      exists(select 1 from roles where name = 'Owner') as owner_role_exists,
      exists(select 1 from permissions where key = '*') as wildcard_permission_exists,
      exists(select 1 from roles r join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where r.name = 'Owner' and p.key = '*') as owner_has_wildcard,
      exists(select 1 from permissions where key = 'dashboard.view') as dashboard_view_exists`
  );
  const companyName = publicSettings.companyName || '';
  const displayName = publicSettings.companyDisplayName || publicSettings.branding?.displayName || '';
  const usingFallback = !companyName || companyName === 'ContractorOS' || displayName === 'ContractorOS';
  return {
    currentUser: {
      email: currentUser?.email || '',
      role: currentUser?.role || '',
      permissions: currentUser?.permissions || [],
    },
    permissions: {
      ownerRoleExists: Boolean(permissionStatus.rows[0]?.owner_role_exists),
      wildcardPermissionExists: Boolean(permissionStatus.rows[0]?.wildcard_permission_exists),
      ownerHasWildcard: Boolean(permissionStatus.rows[0]?.owner_has_wildcard),
      dashboardViewExists: Boolean(permissionStatus.rows[0]?.dashboard_view_exists),
    },
    branding: {
      companyName,
      displayName,
      logoMediaId: publicSettings.branding?.logoMediaId || '',
      logoUrl: publicSettings.logoUrl || publicSettings.branding?.logoUrl || '',
      logoResolvedUrl: publicSettings.branding?.logoResolvedUrl || '',
      faviconMediaId: publicSettings.branding?.faviconMediaId || '',
      faviconUrl: publicSettings.faviconUrl || publicSettings.branding?.faviconUrl || '',
      faviconResolvedUrl: publicSettings.branding?.faviconResolvedUrl || '',
      source: usingFallback ? 'fallback' : 'database',
    },
  };
}


export async function resetInstallation(db: Queryable = createDatabase()) {
  await runMigrations(db);
  await upsertSetting(db, 'installation.completed', false);
  await db.query(`update installer_state set locked = false, updated_at = now()`);
  return getInstallStatus(db);
}

async function upsertSetting(db: Queryable, key: string, value: unknown) {
  await db.query(
    `insert into app_settings (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

function emptyChecks(overrides: Partial<InstallChecks> = {}): InstallChecks {
  return {
    installed: false,
    installerEnabled: true,
    companyConfigured: false,
    ownerCreated: false,
    databaseReady: false,
    migrationsRan: false,
    defaultRolesExist: false,
    defaultPermissionsExist: false,
    foundationCompleted: false,
    installerLocked: false,
    completionFlagSet: false,
    ...overrides,
  };
}
