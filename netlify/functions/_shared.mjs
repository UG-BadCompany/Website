import fs from 'node:fs';
import path from 'node:path';

const storePath = process.env.PLATFORM_STORE_PATH || '/tmp/contractor-cmms-platform-store.json';
const optionalIntegrationKeys = ['OPENAI_API_KEY','RESEND_API_KEY','MAGIC_LINK_FROM_EMAIL','QUOTE_FROM_EMAIL','SERPAPI_API_KEY','SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID','SQUARE_WEBHOOK_SIGNATURE_KEY','RECAPTCHA_SITE_KEY','RECAPTCHA_SECRET_KEY','LICENSE_VERIFY_URL','LICENSE_VERIFY_TOKEN','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','GOOGLE_MAPS_API_KEY','SUPPLIER_API_KEY'];
export const envRegistry = [
  ['Email / Resend', ['RESEND_API_KEY','MAGIC_LINK_FROM_EMAIL','QUOTE_FROM_EMAIL']],
  ['OpenAI', ['OPENAI_API_KEY','OPENAI_MODEL','OPENAI_RESPONSES_MODEL','OPENAI_PHOTO_ESTIMATE_MODEL','OPENAI_QUOTE_MODEL','OPENAI_TROUBLESHOOTING_MODEL']],
  ['Square', ['SQUARE_ACCESS_TOKEN','SQUARE_API_VERSION','SQUARE_ENVIRONMENT','SQUARE_LOCATION_ID','SQUARE_WEBHOOK_SIGNATURE_KEY']],
  ['Security', ['RECAPTCHA_SITE_KEY','RECAPTCHA_SECRET_KEY']],
  ['License Server', ['LICENSE_VERIFY_URL','LICENSE_VERIFY_TOKEN','LICENSE_PRODUCT_ID','LICENSE_GRACE_DAYS','LICENSE_VALIDATION_ENABLED']],
  ['Advanced Integrations', ['SERPAPI_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','GOOGLE_MAPS_API_KEY','SUPPLIER_API_KEY','CDN_URL','FILE_STORAGE_PROVIDER','IMAGE_MAX_UPLOAD_MB']]
];
export const allowedSecretKeys = new Set(envRegistry.flatMap(([, keys]) => keys).concat(['SITE_URL']));

export function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
export function readStore() {
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { return defaultStore(); }
}
export function writeStore(store) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}
export function defaultStore() {
  return {
    installation: { id: 'default', installation_complete: false, installed_version: null, installed_at: null, installed_by_user_id: null, current_step: 'welcome', license_status: 'verification_disabled', bootstrap_generated: false, metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    draft: {},
    secrets: {},
    auditLogs: [],
    workflows: [],
    users: [],
    roles: ['owner','admin','manager','worker','client'],
    permissions: []
  };
}
export function getOrigin(event) {
  return event.headers?.origin || event.headers?.['x-forwarded-proto'] && `${event.headers['x-forwarded-proto']}://${event.headers.host}` || (event.headers?.host ? `https://${event.headers.host}` : process.env.SITE_URL || 'http://localhost:8888');
}
export function mask(value) { return value ? String(value).slice(-4) : null; }
export function audit(store, action, metadata = {}) {
  store.auditLogs.push({ id: crypto.randomUUID(), action, metadata, createdAt: new Date().toISOString() });
}
export function integrationWarnings() {
  const warnings = [];
  if (!process.env.RESEND_API_KEY || !process.env.MAGIC_LINK_FROM_EMAIL) warnings.push('Email is not configured yet.');
  if (!process.env.OPENAI_API_KEY) warnings.push('OpenAI is not configured yet.');
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) warnings.push('Square payments are not configured yet.');
  if (!process.env.LICENSE_VERIFY_URL || !process.env.LICENSE_VERIFY_TOKEN) warnings.push('License validation is disabled.');
  return warnings;
}
export function validateCore(draft) {
  const missing = [];
  if (!draft.company?.name) missing.push('company_profile');
  if (!draft.owner?.email || !draft.owner?.name) missing.push('owner_account');
  if (!draft.theme?.mode || !draft.theme?.primaryColor) missing.push('theme_settings');
  if (!Array.isArray(draft.services) || draft.services.length === 0) missing.push('services_trades');
  if (!Array.isArray(draft.modules) || draft.modules.length === 0) missing.push('module_registry');
  if (!draft.homepage?.headline) missing.push('homepage_config');
  return missing;
}
export function publicEnvStatus(store = readStore()) {
  return envRegistry.flatMap(([category, keys]) => keys.map(key => {
    const fromEnv = Boolean(process.env[key]);
    const fromDb = Boolean(store.secrets[key]);
    const configured = fromEnv || fromDb;
    return { key, category, required: false, configured, source: fromEnv ? 'netlify_env' : fromDb ? 'encrypted_db' : 'missing', lastFour: configured ? (fromEnv ? mask(process.env[key]) : store.secrets[key]?.lastFour) : null, valid: configured, lastCheckedAt: store.secrets[key]?.lastCheckedAt || null, helpUrl: helpUrl(key) };
  }));
}
function helpUrl(key) {
  if (key.includes('OPENAI')) return 'https://platform.openai.com/api-keys';
  if (key.includes('RESEND')) return 'https://resend.com/api-keys';
  if (key.includes('SQUARE')) return 'https://developer.squareup.com/apps';
  if (key.includes('RECAPTCHA')) return 'https://www.google.com/recaptcha/admin/create';
  return 'https://docs.netlify.com/environment-variables/overview/';
}
