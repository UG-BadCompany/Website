import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import crypto from 'node:crypto';
import { loadModules, generatedPermissions } from './module-registry.mjs';
const file = process.env.PLATFORM_STATE_FILE || '/tmp/contractor-cmms-platform-state.json';
const optionalIntegrations = ['OPENAI_API_KEY','RESEND_API_KEY','SQUARE_ACCESS_TOKEN','SMTP_HOST','SERPAPI_KEY','RECAPTCHA_SECRET_KEY','LICENSE_SERVER_URL','GOOGLE_MAPS_API_KEY','SUPPLIER_API_KEY'];
export const roles = ['owner','admin','manager','worker','client'];
export const workflowStages = ['client_request','estimate_ready','admin_quote_review','quote_sent','quote_accepted','work_order_created','worker_assigned','work_scheduled','work_in_progress','worker_completed','admin_review','client_approval','invoice_created','payment_pending','payment_verified','closed_archived'];
function defaultState() {
  const modules = loadModules();
  return {
    installation_complete: false,
    installDraft: autoDetect({}),
    company: {}, branding: {}, theme: {}, homepage: null,
    users: [], sessions: [], magicTokens: [], auditLogs: [], impersonations: [],
    roles: [], permissions: [], services: [], modules,
    records: { customers: [], requests: [], estimates: [], quotes: [], workOrders: [], schedules: [], inventory: [], invoices: [], payments: [], files: [], maintenancePlans: [] },
    workflow: [], bootstrap: null,
    integrations: optionalIntegrations.map(key => ({ key, configured: Boolean(process.env[key]), requiredForInstall: false }))
  };
}
export function autoDetect(existing = {}) {
  return {
    siteUrl: process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL || '',
    companyName: existing.company?.name || process.env.COMPANY_NAME || '',
    logoUrl: existing.branding?.logoUrl || '',
    brandColor: existing.branding?.brandColor || '#2563eb',
    accentColor: existing.branding?.accentColor || '#14b8a6',
    theme: existing.theme?.name || 'Modern Contractor',
    homepageHeadline: existing.homepage?.hero?.headline || 'Contractor service made simple',
    ownerEmail: existing.users?.find(u => u.roles?.includes('owner'))?.email || process.env.OWNER_EMAIL || '',
    moduleCount: loadModules().length,
    integrations: optionalIntegrations.map(key => ({ key, configured: Boolean(process.env[key]), requiredForInstall: false }))
  };
}
export function readState() {
  if (!existsSync(file)) return defaultState();
  try { return { ...defaultState(), ...JSON.parse(readFileSync(file, 'utf8')) }; }
  catch { return defaultState(); }
}
export function writeState(state) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2));
  return state;
}
export function audit(state, actor, action, metadata = {}) {
  state.auditLogs.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), actor: actor || 'system', action, metadata });
}
export function normalizeEmail(email = '') { return String(email).trim().toLowerCase(); }
export function finishInstallation(payload = {}) {
  const state = readState();
  const modules = loadModules();
  const now = new Date().toISOString();
  const ownerEmail = normalizeEmail(payload.owner?.email || payload.ownerEmail || state.installDraft.ownerEmail || 'owner@example.com');
  const owner = { id: crypto.randomUUID(), email: ownerEmail, name: payload.owner?.name || payload.ownerName || 'Platform Owner', phone: payload.owner?.phone || '', roles: ['owner','admin','manager','worker','client'], status: 'active', createdAt: now };
  state.company = { name: payload.company?.name || payload.companyName || state.installDraft.companyName || 'Your Company', phone: payload.company?.phone || '', serviceArea: payload.company?.serviceArea || '', siteUrl: payload.company?.siteUrl || state.installDraft.siteUrl || '' };
  state.branding = { logoUrl: payload.branding?.logoUrl || state.installDraft.logoUrl || '', brandColor: payload.branding?.brandColor || state.installDraft.brandColor, accentColor: payload.branding?.accentColor || state.installDraft.accentColor };
  state.theme = { name: payload.theme?.name || state.installDraft.theme, mode: payload.theme?.mode || 'light', radius: 'rounded' };
  state.users = [owner, ...state.users.filter(u => normalizeEmail(u.email) !== ownerEmail)];
  state.roles = roles.map(role => ({ id: role, name: role[0].toUpperCase()+role.slice(1), seeded: true }));
  state.permissions = generatedPermissions(modules);
  state.services = (payload.services?.length ? payload.services : ['General Repair','Preventive Maintenance','Emergency Service','Inspection','Installation']).map((name, i) => ({ id: `svc-${i+1}`, name, active: true }));
  state.modules = modules.map(m => ({ ...m, enabled: payload.modules?.[m.id] ?? m.enabledByDefault }));
  state.homepage = { hero: { headline: payload.homepage?.headline || state.installDraft.homepageHeadline, subheadline: payload.homepage?.subheadline || 'Request estimates, approve quotes, and track work from one branded portal.' }, sections: ['services','request-estimate','maintenance-plans','client-portal'], published: true };
  state.bootstrap = { generatedAt: now, company: state.company, theme: state.theme, branding: state.branding, modules: state.modules.map(m => ({ id: m.id, route: m.route, enabled: m.enabled })) };
  state.installation_complete = true;
  audit(state, owner.email, 'installation.finished', { moduleCount: modules.length, optionalIntegrationsBlocked: false });
  writeState(state);
  return state;
}
export function integrationStatus() { return optionalIntegrations.map(key => ({ key, configured: Boolean(process.env[key]), status: process.env[key] ? 'configured' : 'warning', message: process.env[key] ? 'Configured' : 'Not configured; platform will use manual mode.' })); }
