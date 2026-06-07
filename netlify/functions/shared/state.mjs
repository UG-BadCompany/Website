import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const dataDir = path.join(process.cwd(), '.platform-data');
const stateFile = path.join(dataDir, 'state.json');
const defaultTheme = { mode: 'system', primary: '#2563eb', accent: '#f97316', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', border: '#cbd5e1', button: '#2563eb', buttonText: '#ffffff', customSidebar: false, sidebarBackground: '#0f172a', sidebarText: '#e2e8f0', sidebarActiveBackground: '#2563eb', sidebarActiveText: '#ffffff', sidebarHoverBackground: '#1e293b', customMobileNav: false, mobileNavBackground: '#ffffff', mobileNavActive: '#2563eb', mobileNavText: '#0f172a' };
export const defaultState = {
  installation: { id: 'default', installation_complete: false, installed_version: null, installed_at: null, installed_by_user_id: null, current_step: 'welcome', license_status: 'not_checked', bootstrap_generated: false, metadata: { steps: {} }, created_at: null, updated_at: null },
  company: { companyName: 'Your Company', siteUrl: '', businessType: 'Contractor Services', logoUrl: '', supportEmail: '', theme: defaultTheme },
  environment: {}, environmentStatus: {}, license: { status: 'placeholder', validationEnabled: false, graceDays: 14 },
  users: [], roles: ['owner','admin','manager','worker','client'], permissions: [], moduleSettings: {}, workflows: [], auditLogs: [], files: [], aiRuns: [], homepage: { sections: defaultHomepageSections(), settings: {} }, backups: []
};
function defaultHomepageSections(){ return [
  { id: 'hero', type: 'hero', visible: true, order: 1, data: { eyebrow: 'White-label contractor platform', title: 'Request service, approve quotes, and track work online.', body: 'A configurable homepage controlled by the owner after installation.', cta: 'Request an Estimate' } },
  { id: 'services', type: 'services', visible: true, order: 2, data: { title: 'Services', items: ['Repairs','Maintenance','Installation','Emergency Support'] } },
  { id: 'estimate', type: 'estimate-card', visible: true, order: 3, data: { title: 'AI-assisted estimates', body: 'Upload photos and request a quote.' } },
  { id: 'gallery', type: 'gallery', visible: true, order: 4, data: { title: 'Project Gallery', items: [] } },
  { id: 'cta', type: 'cta', visible: true, order: 5, data: { title: 'Ready to get started?', button: 'Open Portal' } }
]; }
async function ensure(){ await fs.mkdir(dataDir, { recursive: true }); try { await fs.access(stateFile); } catch { await fs.writeFile(stateFile, JSON.stringify(defaultState, null, 2)); } }
export async function readState(){ await ensure(); try { return { ...structuredClone(defaultState), ...JSON.parse(await fs.readFile(stateFile, 'utf8')) }; } catch { return structuredClone(defaultState); } }
export async function writeState(next){ await ensure(); next.installation.updated_at = new Date().toISOString(); await fs.writeFile(stateFile, JSON.stringify(next, null, 2)); return next; }
export async function updateState(fn){ const state = await readState(); const next = await fn(state) || state; return writeState(next); }
export function originFromEvent(event){ const proto = event.headers?.['x-forwarded-proto'] || 'https'; const host = event.headers?.host || event.headers?.['x-forwarded-host'] || process.env.URL || process.env.DEPLOY_PRIME_URL || 'your-domain.com'; return host.startsWith('http') ? host : `${proto}://${host}`; }
export function mask(value){ if (!value) return null; return `${String(value).slice(0, 3)}••••${String(value).slice(-2)}`; }
export function fingerprint(value){ return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16); }
export async function audit(action, metadata = {}, actor = null){ await updateState((state)=>{ state.auditLogs.unshift({ id: crypto.randomUUID(), action, actorUserId: actor, metadata, createdAt: new Date().toISOString() }); return state; }); }
export function publicBootstrap(state){ return { ok: true, installed: !!state.installation.installation_complete, company: state.company, theme: state.company.theme, license: { status: state.license.status, validationEnabled: false }, homepage: state.homepage, modulesGeneratedAt: new Date().toISOString() }; }
