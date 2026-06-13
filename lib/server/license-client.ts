import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase, type Queryable } from './database';
import { basicModules, moduleAllowedByTier, normalizeLicenseTier, requiredTierForModule, type LicenseTier } from '../license-modules';

export type LicenseStatus = 'active' | 'inactive' | 'invalid' | 'expired' | 'suspended' | 'revoked' | 'unverified' | 'missing';
export type LicenseSnapshot = {
  id?: string;
  licenseKey: string;
  licenseEmail: string;
  licenseApiUrl: string;
  tier: LicenseTier;
  status: LicenseStatus;
  enabledModules: string[];
  installId: string;
  siteUrl: string;
  domain: string;
  appVersion: string;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  lastCheckError: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type VerifyLicenseInput = Partial<Pick<LicenseSnapshot, 'licenseKey' | 'licenseEmail' | 'licenseApiUrl' | 'installId' | 'siteUrl' | 'domain' | 'appVersion'>> & { email?: string; environment?: string; machineFingerprint?: string };
export class LicenseRequiredError extends Error {
  statusCode = 402;
  code = 'LICENSE_REQUIRED';
  licenseStatus: string;
  constructor(status = 'inactive') {
    super('A valid ContractorOS license is required.');
    this.licenseStatus = status;
  }
  toResponse() { return { ok: false, error: this.message, code: this.code, status: this.licenseStatus }; }
}

export class LicenseModuleLockedError extends Error {
  statusCode = 402;
  code = 'LICENSE_MODULE_LOCKED';
  requiredTier: LicenseTier;
  module: string;
  constructor(moduleKey: string) {
    const requiredTier = requiredTierForModule(moduleKey);
    super(`This module requires ${requiredTier === 'business' ? 'Business' : 'Pro or Business'}.`);
    this.requiredTier = requiredTier;
    this.module = moduleKey;
  }
  toResponse() { return { ok: false, error: this.message, code: this.code, requiredTier: this.requiredTier, module: this.module }; }
}

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
export const OFFICIAL_LICENSE_API_URL = 'https://taselling.netlify.app';
const CHECK_INTERVAL_HOURS = Number(process.env.LICENSE_CHECK_INTERVAL_HOURS || 24) || 24;

export async function ensureLicenseTables(db: Queryable = createDatabase()) {
  await db.query(`create table if not exists license_settings (
    id uuid primary key default gen_random_uuid(),
    license_api_url text not null default 'https://taselling.netlify.app',
    license_key text not null,
    license_email text not null,
    tier text,
    status text,
    enabled_modules jsonb default '[]'::jsonb,
    install_id text unique not null,
    site_url text,
    domain text,
    app_version text,
    expires_at timestamptz,
    last_verified_at timestamptz,
    last_check_error text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`);
  await db.query(`alter table license_settings alter column license_api_url set default 'https://taselling.netlify.app'`).catch(() => undefined);
  await db.query(`update license_settings set license_api_url = 'https://taselling.netlify.app', license_key = coalesce(license_key, ''), license_email = coalesce(license_email, ''), tier = coalesce(tier, 'basic'), status = coalesce(status, 'unverified')`);
  await db.query(`alter table license_settings alter column license_api_url set not null, alter column license_key set not null, alter column license_email set not null`);
  await db.query(`create table if not exists license_events (id uuid primary key default gen_random_uuid(), event_type text not null, summary text not null, metadata jsonb default '{}'::jsonb, created_at timestamptz default now())`);
}

async function packageVersion() {
  try { return JSON.parse(await readFile(path.resolve('package.json'), 'utf8')).version || process.env.npm_package_version || '1.0.0'; }
  catch { return process.env.npm_package_version || '1.0.0'; }
}
function envName(input?: string) { if (input) return input; if (process.env.CONTEXT) return process.env.CONTEXT; if (process.env.NETLIFY_DEV) return 'local'; return process.env.NODE_ENV || 'local'; }
function siteUrlFromEnv() { return process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.APP_URL || ''; }
function defaultLicenseApiUrl() { return OFFICIAL_LICENSE_API_URL; }
function normalizeUrl(url: string) { return url.trim().replace(/\/+$/, ''); }
function maskMetadata(snapshot: Partial<LicenseSnapshot>) { return { ...snapshot, licenseKey: maskLicenseKey(snapshot.licenseKey || '') }; }
export function maskLicenseKey(key = '') { const parts = key.split('-'); return parts.length >= 4 ? [...parts.slice(0, 2), ...parts.slice(2, -1).map(() => '****'), parts.at(-1)].join('-') : key ? `****${key.slice(-4)}` : ''; }
function enabledModulesFromResponse(response: any, tier: LicenseTier) { if (Array.isArray(response?.enabledModules)) return response.enabledModules.map(String); return tier === 'business' ? ['*'] : tier === 'pro' ? [] : basicModules; }
function rowToSnapshot(row: any): LicenseSnapshot {
  return {
    id: row.id, licenseKey: row.license_key || '', licenseEmail: row.license_email || '', licenseApiUrl: row.license_api_url || OFFICIAL_LICENSE_API_URL, tier: normalizeLicenseTier(row.tier), status: row.status || 'unverified',
    enabledModules: Array.isArray(row.enabled_modules) ? row.enabled_modules : [], installId: row.install_id || '', siteUrl: row.site_url || '', domain: row.domain || '', appVersion: row.app_version || '',
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null, lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at).toISOString() : null, lastCheckError: row.last_check_error || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined, updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}
async function logLicenseEvent(db: Queryable, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await db.query(`insert into license_events (event_type, summary, metadata) values ($1, $2, $3::jsonb)`, [eventType, summary, JSON.stringify(metadata)]).catch(() => undefined);
}
async function fetchJsonWithTimeout(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally { clearTimeout(timer); }
}
export async function getLocalLicense(db: Queryable = createDatabase()): Promise<LicenseSnapshot | null> {
  await ensureLicenseTables(db);
  const result = await db.query(`select * from license_settings order by updated_at desc limit 1`);
  if (result.rows[0]) return rowToSnapshot(result.rows[0]);
  return null;
}
function createInstallId() { return `cos-${createHash('sha256').update(`${process.env.SITE_URL || process.env.URL || process.cwd()}`).digest('hex').slice(0, 16)}`; }
export function getDefaultLicenseApiUrl() { return normalizeUrl(defaultLicenseApiUrl()); }
function resolveLicenseApiUrlValue(_savedLicenseApiUrl?: string | null) { return normalizeUrl(defaultLicenseApiUrl()); }
export async function resolveLicenseApiUrl(db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db).catch(() => null);
  return resolveLicenseApiUrlValue(local?.licenseApiUrl);
}
export async function saveLicenseSnapshot(input: Partial<LicenseSnapshot>, db: Queryable = createDatabase()) {
  await ensureLicenseTables(db);
  const existing = await getLocalLicense(db).catch(() => null);
  const snapshot = { ...existing, ...input } as LicenseSnapshot;
  snapshot.installId = snapshot.installId || createInstallId();
  snapshot.licenseApiUrl = resolveLicenseApiUrlValue(snapshot.licenseApiUrl);
  snapshot.enabledModules = snapshot.enabledModules?.length ? snapshot.enabledModules : (snapshot.tier === 'business' ? ['*'] : basicModules);
  const result = await db.query(`insert into license_settings (license_key, license_email, license_api_url, tier, status, enabled_modules, install_id, site_url, domain, app_version, expires_at, last_verified_at, last_check_error)
    values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13)
    on conflict (install_id) do update set license_key=excluded.license_key, license_email=excluded.license_email, license_api_url=excluded.license_api_url, tier=excluded.tier, status=excluded.status, enabled_modules=excluded.enabled_modules, site_url=excluded.site_url, domain=excluded.domain, app_version=excluded.app_version, expires_at=excluded.expires_at, last_verified_at=excluded.last_verified_at, last_check_error=excluded.last_check_error, updated_at=now()
    returning *`, [snapshot.licenseKey, snapshot.licenseEmail, snapshot.licenseApiUrl, snapshot.tier, snapshot.status, JSON.stringify(snapshot.enabledModules || []), snapshot.installId, snapshot.siteUrl, snapshot.domain, snapshot.appVersion, snapshot.expiresAt, snapshot.lastVerifiedAt, snapshot.lastCheckError]);
  return rowToSnapshot(result.rows[0]);
}
export async function verifyLicense(input: VerifyLicenseInput, db: Queryable = createDatabase()) {
  await ensureLicenseTables(db);
  const local = await getLocalLicense(db).catch(() => null);
  const licenseApiUrl = resolveLicenseApiUrlValue();
  const licenseKey = input.licenseKey || local?.licenseKey || '';
  const email = input.email || input.licenseEmail || local?.licenseEmail || '';
  if (!licenseKey || !email) return { ok: false, valid: false, status: 'invalid', error: 'License key and license email are required.' };
  const siteUrl = input.siteUrl || siteUrlFromEnv() || local?.siteUrl || '';
  const payload = { licenseKey, email, installId: input.installId || local?.installId || createInstallId(), siteUrl, domain: input.domain || local?.domain || '', appVersion: input.appVersion || local?.appVersion || await packageVersion(), environment: envName(input.environment), machineFingerprint: input.machineFingerprint || createInstallId() };
  try {
    const { response, payload: data } = await fetchJsonWithTimeout(`${licenseApiUrl}/api/license/verify`, payload);
    if (!response.ok || data?.valid === false) {
      await logLicenseEvent(db, 'verify_failed', data?.reason || 'License invalid', { status: data?.status, licenseKey: maskLicenseKey(licenseKey) });
      return { ok: false, valid: false, status: data?.status || 'invalid', error: data?.reason || 'License invalid. Please check your key and email.' };
    }
    const tier = normalizeLicenseTier(data.tier);
    const saved = await saveLicenseSnapshot({ licenseKey: data.licenseKey || licenseKey, licenseEmail: data.email || email, licenseApiUrl, tier, status: data.status || 'active', enabledModules: enabledModulesFromResponse(data, tier), installId: data.activation?.installId || payload.installId, siteUrl: data.activation?.siteUrl || siteUrl, domain: payload.domain, appVersion: payload.appVersion, expiresAt: data.expiresAt || null, lastVerifiedAt: new Date().toISOString(), lastCheckError: null }, db);
    await logLicenseEvent(db, 'verified', `License verified for ${tier}`, maskMetadata(saved));
    return { valid: true, license: publicLicenseStatus(saved), ...publicLicenseStatus(saved) };
  } catch (error) {
    const message = 'License server unreachable. Using last valid license snapshot.';
    if (local) await saveLicenseSnapshot({ ...local, lastCheckError: message }, db);
    await logLicenseEvent(db, 'verify_unreachable', message, { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, valid: false, status: local?.status || 'unverified', error: message, license: local ? publicLicenseStatus(local) : null };
  }
}
export async function checkLicense(db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db);
  if (!local) return { ok: false, error: 'No local license snapshot.' };
  const licenseApiUrl = resolveLicenseApiUrlValue(local.licenseApiUrl);
  try {
    const { response, payload } = await fetchJsonWithTimeout(`${licenseApiUrl}/api/license/check`, { licenseKey: local.licenseKey, email: local.licenseEmail, installId: local.installId, siteUrl: local.siteUrl, domain: local.domain, appVersion: local.appVersion, environment: envName() });
    if (!response.ok || payload?.valid === false) {
      const status = payload?.status || 'invalid';
      const saved = await saveLicenseSnapshot({ ...local, status, lastCheckError: payload?.reason || 'License invalid. Please check your key and email.' }, db);
      return { ok: false, error: saved.lastCheckError, license: publicLicenseStatus(saved) };
    }
    const tier = normalizeLicenseTier(payload.tier || local.tier);
    const saved = await saveLicenseSnapshot({ ...local, licenseApiUrl, tier, status: payload.status || 'active', enabledModules: enabledModulesFromResponse(payload, tier), expiresAt: payload.expiresAt || local.expiresAt, lastVerifiedAt: new Date().toISOString(), lastCheckError: null }, db);
    return { license: publicLicenseStatus(saved), ...publicLicenseStatus(saved) };
  } catch (error) {
    const saved = await saveLicenseSnapshot({ ...local, lastCheckError: 'License server unreachable. Using last valid license snapshot.' }, db);
    return { warning: saved.lastCheckError, license: publicLicenseStatus(saved), ...publicLicenseStatus(saved) };
  }
}
function isHardLocked(snapshot: LicenseSnapshot | null) { return ['revoked', 'suspended', 'expired', 'invalid', 'inactive', 'missing'].includes(snapshot?.status || ''); }
function inGrace(snapshot: LicenseSnapshot | null) { if (!snapshot?.lastVerifiedAt) return false; return Date.now() - new Date(snapshot.lastVerifiedAt).getTime() <= GRACE_PERIOD_MS; }
export function publicLicenseStatus(snapshot: LicenseSnapshot | null) {
  const warnings: string[] = [];
  if (!snapshot) return { ok: false, tier: 'basic' as LicenseTier, status: 'missing', enabledModules: [], lastVerifiedAt: null, expiresAt: null, warnings: ['No local license snapshot found. Install or verify a license to unlock ContractorOS.'], gracePeriodEndsAt: null, licenseApiUrl: getDefaultLicenseApiUrl(), licenseServerLabel: 'Official ContractorOS License Server' };
  if (snapshot.lastCheckError) warnings.push(snapshot.lastCheckError);
  const gracePeriodEndsAt = snapshot.lastVerifiedAt ? new Date(new Date(snapshot.lastVerifiedAt).getTime() + GRACE_PERIOD_MS).toISOString() : null;
  if (snapshot.lastCheckError && inGrace(snapshot)) warnings.push(`Grace period active until ${gracePeriodEndsAt}.`);
  if (snapshot.lastCheckError && !inGrace(snapshot)) warnings.push('License grace period has expired; premium modules are locked.');
  return { ok: isLicenseActiveSnapshot(snapshot), tier: snapshot.tier, status: licenseRequiredStatus(snapshot), enabledModules: isLicenseActiveSnapshot(snapshot) ? snapshot.enabledModules : [], lastVerifiedAt: snapshot.lastVerifiedAt, expiresAt: snapshot.expiresAt, warnings, licenseEmail: snapshot.licenseEmail, maskedLicenseKey: maskLicenseKey(snapshot.licenseKey), installId: snapshot.installId, siteUrl: snapshot.siteUrl, domain: snapshot.domain, appVersion: snapshot.appVersion, licenseApiUrl: snapshot.licenseApiUrl, licenseServerLabel: 'Official ContractorOS License Server', lastCheckError: snapshot.lastCheckError, gracePeriodEndsAt };
}
export async function getLicenseStatus(db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db);
  if (local?.lastVerifiedAt && !local.lastCheckError && Date.now() - new Date(local.lastVerifiedAt).getTime() > CHECK_INTERVAL_HOURS * 60 * 60 * 1000) return checkLicense(db);
  return publicLicenseStatus(local);
}
export async function isModuleEnabled(moduleKey: string, db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db);
  if (!isLicenseActiveSnapshot(local)) return false;
  return moduleAllowedByTier(moduleKey, local!.tier, local!.enabledModules);
}
export function licenseRequiredStatus(snapshot: LicenseSnapshot | null) {
  if (!snapshot) return 'missing';
  if (snapshot.lastCheckError && !inGrace(snapshot)) return snapshot.status === 'active' ? 'inactive' : snapshot.status || 'inactive';
  if (isHardLocked(snapshot)) return snapshot.status || 'inactive';
  if (snapshot.status !== 'active') return snapshot.status || 'inactive';
  return 'active';
}
export function isLicenseActiveSnapshot(snapshot: LicenseSnapshot | null) { return licenseRequiredStatus(snapshot) === 'active'; }
export async function requireActiveLicense(db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db);
  if (!isLicenseActiveSnapshot(local)) throw new LicenseRequiredError(licenseRequiredStatus(local));
  return local!;
}
export async function requireLicensedModule(moduleKey: string, db: Queryable = createDatabase()) { await requireActiveLicense(db); if (!(await isModuleEnabled(moduleKey, db))) throw new LicenseModuleLockedError(moduleKey); }
export async function getEnabledModules(db: Queryable = createDatabase()) { return (await getLocalLicense(db))?.enabledModules || basicModules; }
export async function getLicenseTier(db: Queryable = createDatabase()) { return (await getLocalLicense(db))?.tier || 'basic'; }
export async function syncLicenseStatus(db: Queryable = createDatabase()) { return checkLicense(db); }
export async function updateAndVerifyLicense(input: VerifyLicenseInput, db: Queryable = createDatabase()) {
  const local = await getLocalLicense(db).catch(() => null);
  await saveLicenseSnapshot({ ...(local || {}), licenseKey: input.licenseKey || local?.licenseKey || '', licenseEmail: input.email || input.licenseEmail || local?.licenseEmail || '', licenseApiUrl: resolveLicenseApiUrlValue(input.licenseApiUrl || local?.licenseApiUrl), installId: input.installId || local?.installId || createInstallId(), siteUrl: input.siteUrl || local?.siteUrl || siteUrlFromEnv(), domain: input.domain || local?.domain || '', appVersion: input.appVersion || local?.appVersion || await packageVersion(), tier: local?.tier || 'basic', status: 'unverified', enabledModules: local?.enabledModules || basicModules, expiresAt: local?.expiresAt || null, lastVerifiedAt: local?.lastVerifiedAt || null, lastCheckError: null }, db);
  return verifyLicense(input, db);
}
