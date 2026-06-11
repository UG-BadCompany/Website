import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase, type Queryable } from './database';
import { createStorage } from './storage';

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
const REQUIRED_PERMISSIONS = 36;
const INSTALLATION_VERSION = process.env.npm_package_version ?? '1.0.0';

const asBoolean = (value: unknown) => value === true || value === 'true';

type UploadInput = { fileName?: string; mimeType?: string; dataUrl?: string };
type EstimateInput = Record<string, unknown> & { firstName?: string; lastName?: string; email?: string; phone?: string; serviceAddress?: string; city?: string; state?: string; zip?: string; serviceCategory?: string; urgency?: string; title?: string; description?: string; files?: UploadInput[] };
type HomepageSetupInput = {
  logoUrl?: string;
  logoUpload?: UploadInput | null;
  faviconUrl?: string;
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
};

const PUBLIC_SETTING_KEYS = [
  'branding.logo_media_id','branding.logo_url','branding.favicon_media_id','branding.favicon_url','branding.display_name','branding.tagline','branding.updated_at','company.display_name','company.name','theme.settings','homepage.hero_headline','homepage.hero_subheadline',
  'homepage.primary_cta_label','homepage.primary_cta_link','homepage.secondary_cta_label','homepage.secondary_cta_link','homepage.about_text','homepage.services_intro',
  'homepage.services','homepage.contact_phone','homepage.contact_email','homepage.contact_address','homepage.service_area','homepage.business_hours','homepage.trust_text',
  'homepage.years_experience','homepage.emergency_service_enabled','homepage.financing_available_enabled','homepage.seo_title','homepage.seo_description'
];

function defaultPublicSiteSettings() {
  return {
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
      logoUrl: '',
      faviconUrl: '',
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
    },
  };
}

async function saveHomepageSetup(db: Queryable, setup: HomepageSetupInput, companyName: string) {
  const logoMediaId = setup.logoUpload?.dataUrl ? await storeUpload(db, setup.logoUpload, 'branding/logo') : null;
  const faviconMediaId = setup.faviconUpload?.dataUrl ? await storeUpload(db, setup.faviconUpload, 'branding/favicon') : null;

  await upsertSetting(db, 'branding.logo_media_id', logoMediaId);
  await upsertSetting(db, 'branding.logo_url', logoMediaId ? '' : setup.logoUrl?.trim() || '');
  await upsertSetting(db, 'branding.favicon_media_id', faviconMediaId);
  await upsertSetting(db, 'branding.favicon_url', faviconMediaId ? '' : setup.faviconUrl?.trim() || '');
  const displayName = setup.displayName?.trim() || companyName;
  await upsertSetting(db, 'branding.display_name', displayName);
  await upsertSetting(db, 'company.display_name', displayName);
  await upsertSetting(db, 'company.name', companyName);
  await upsertSetting(db, 'branding.tagline', setup.tagline?.trim() || '');
  await upsertSetting(db, 'branding.updated_at', new Date().toISOString());
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
}

async function storeUpload(db: Queryable, upload: UploadInput, prefix: string) {
  const parsed = parseDataUrl(upload.dataUrl || '');
  const fileName = upload.fileName?.replace(/[^a-z0-9._-]/gi, '-') || 'upload.bin';
  const storageKey = `${prefix}/${Date.now()}-${fileName}`;
  const storage = createStorage();
  const storedPath = await storage.put(storageKey, parsed.buffer);
  const file = await db.query<{ id: string }>(
    `insert into files (storage_provider, storage_key, file_name, mime_type, size_bytes)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'netlify_blobs' : 'local'), storedPath, fileName, upload.mimeType || parsed.mimeType, parsed.buffer.byteLength]
  );
  const media = await db.query<{ id: string }>(
    `insert into media_assets (file_id, owner_type, visibility, alt_text, metadata)
     values ($1, 'branding', 'public', $2, $3::jsonb)
     returning id`,
    [file.rows[0].id, fileName, JSON.stringify({ storageKey })]
  );
  return media.rows[0].id;
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: 'application/octet-stream', buffer: Buffer.from(dataUrl, 'base64') };
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}


export async function runMigrations(db: Queryable = createDatabase()) {
  for (const file of ['001_foundation.sql', '002_seed_foundation.sql']) {
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

export async function completeInstallation(input: { companyName?: string; ownerName?: string; ownerEmail?: string; theme?: unknown; homepageSetup?: HomepageSetupInput } = {}, db: Queryable = createDatabase()) {
  await runMigrations(db);

  const companyName = input.companyName?.trim() || 'ContractorOS';
  const ownerName = input.ownerName?.trim() || 'Owner';
  const ownerEmail = input.ownerEmail?.trim() || 'owner@example.com';

  await db.query(
    `insert into company_settings (company_name)
     select $1
     where not exists (select 1 from company_settings)`,
    [companyName]
  );
  await db.query(
    `update company_settings set company_name = coalesce(nullif(company_name, ''), $1), updated_at = now()
     where id = (select id from company_settings order by created_at asc limit 1)`,
    [companyName]
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
  if (input.theme) await upsertSetting(db, 'theme.settings', input.theme);
  if (input.homepageSetup) await saveHomepageSetup(db, input.homepageSetup, companyName);

  return getInstallStatus(db);
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
    const defaults = defaultPublicSiteSettings();

    const companyName = asText(values.get('company.name'), asText(values.get('branding.display_name'), defaults.branding.companyName));
    const companyDisplayName = asText(values.get('company.display_name'), asText(values.get('branding.display_name'), companyName));
    const logoUrl = resolveBrandingAsset(values.get('branding.logo_media_id'), values.get('branding.logo_url'), values.get('branding.updated_at')) || defaults.branding.logoUrl;
    const faviconUrl = resolveBrandingAsset(values.get('branding.favicon_media_id'), values.get('branding.favicon_url'), values.get('branding.updated_at')) || defaults.branding.faviconUrl;
    const brandingUpdatedAt = asText(values.get('branding.updated_at'), defaults.branding.brandingUpdatedAt);

    return {
      companyName,
      companyDisplayName,
      logoUrl,
      faviconUrl,
      brandingUpdatedAt,
      branding: {
        companyName,
        companyDisplayName,
        displayName: companyDisplayName,
        tagline: asText(values.get('branding.tagline'), defaults.branding.tagline),
        logoUrl,
        faviconUrl,
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
      },
    };
  } catch (error) {
    console.warn('Public site settings unavailable; using installer-safe defaults', error);
    return defaultPublicSiteSettings();
  }
}


export async function createPublicEstimateRequest(input: EstimateInput, db: Queryable = createDatabase()) {
  await runMigrations(db);
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const displayName = `${firstName} ${lastName}`.trim() || email || phone || 'Website lead';
  const address = [input.serviceAddress, input.city, input.state, input.zip].map((value) => String(value || '').trim()).filter(Boolean).join(', ');
  const description = [input.title, input.description].map((value) => String(value || '').trim()).filter(Boolean).join('\n\n');
  if (!displayName || (!email && !phone) || !address || !description) throw new Error('Missing required request estimate fields');

  const client = await db.query<{ id: string }>(
    `insert into clients (display_name, status) values ($1, 'lead') returning id`,
    [displayName]
  );
  await db.query(
    `insert into client_contacts (client_id, name, email, phone, primary_contact) values ($1, $2, nullif($3, ''), nullif($4, ''), true)`,
    [client.rows[0].id, displayName, email, phone]
  );
  const property = await db.query<{ id: string }>(
    `insert into properties (client_id, address, notes) values ($1, $2, $3) returning id`,
    [client.rows[0].id, address, JSON.stringify({ propertyType: input.propertyType, accessNotes: input.accessNotes })]
  );
  const category = await db.query<{ id: string }>(
    `insert into service_categories (name, enabled) values ($1, true) on conflict (name) do update set enabled = true returning id`,
    [String(input.serviceCategory || 'Other')]
  );
  const request = await db.query<{ id: string }>(
    `insert into work_requests (client_id, property_id, service_category_id, status, priority, description) values ($1, $2, $3, 'new', $4, $5) returning id`,
    [client.rows[0].id, property.rows[0].id, category.rows[0].id, urgencyToPriority(String(input.urgency || 'Flexible')), description]
  );

  const files = Array.isArray(input.files) ? input.files : [];
  for (const file of files) {
    if (!file?.dataUrl) continue;
    const mediaId = await storeUpload(db, file, `requests/${request.rows[0].id}`);
    await db.query(`update media_assets set owner_type = 'work_request', owner_id = $1, visibility = 'private' where id = $2`, [request.rows[0].id, mediaId]);
  }

  const requestNumber = `REQ-${request.rows[0].id.slice(0, 8).toUpperCase()}`;
  return { ok: true, id: request.rows[0].id, requestNumber, status: 'new', emailConfirmationQueued: Boolean(email && process.env.RESEND_API_KEY) };
}

function urgencyToPriority(urgency: string) {
  if (urgency.toLowerCase().includes('emergency')) return 'emergency';
  if (urgency.toLowerCase().includes('week')) return 'high';
  return 'normal';
}

function resolveBrandingAsset(mediaId: unknown, url: unknown, updatedAt: unknown) {
  if (typeof mediaId === 'string' && mediaId.trim()) return `/api/media/${mediaId}${typeof updatedAt === 'string' ? `?v=${encodeURIComponent(updatedAt)}` : ''}`;
  return typeof url === 'string' ? url : '';
}

export async function getPublicMedia(mediaId: string, db: Queryable = createDatabase()) {
  const result = await db.query<{ storage_key: string; mime_type: string | null }>(
    `select f.storage_key, f.mime_type from media_assets m join files f on f.id = m.file_id where m.id = $1 and m.visibility = 'public' limit 1`,
    [mediaId]
  );
  const file = result.rows[0];
  if (!file) return null;
  const data = await readFile(file.storage_key).catch(() => null);
  if (!data) return null;
  return { data, mimeType: file.mime_type || 'application/octet-stream' };
}

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
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
