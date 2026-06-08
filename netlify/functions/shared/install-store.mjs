import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.NETLIFY_DATABASE_URL ? '/tmp/platform-data' : path.join(process.cwd(), '.platform-data');
const STATE_FILE = path.join(DATA_DIR, 'installation.json');

export const INSTALL_STEPS = ['welcome', 'company', 'branding', 'theme', 'owner', 'services', 'modules', 'homepage', 'review', 'finish'];
export const REQUIRED_KEYS = ['company_profile', 'owner_account', 'theme_settings', 'homepage_config', 'services', 'module_registry'];

export function defaultDraft() {
  return {
    currentStep: 'welcome',
    company: {},
    branding: {},
    theme: { mode: 'system' },
    owner: {},
    services: [],
    modules: [],
    homepage: {},
    completedSteps: [],
    skippedOptionalSteps: [],
    updatedAt: null
  };
}

export function defaultState() {
  return {
    id: 'default',
    installation_complete: false,
    installed_version: null,
    installed_at: null,
    installed_by_user_id: null,
    current_step: 'welcome',
    license_status: 'not_checked',
    bootstrap_generated: false,
    metadata: {},
    draft: defaultDraft(),
    company: null,
    owner: null,
    theme: null,
    homepage: null,
    services: [],
    modules: [],
    roles: [],
    permissions: [],
    auditLog: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function ensureDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }

export async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export async function writeState(next) {
  await ensureDir();
  const state = { ...next, updated_at: new Date().toISOString() };
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

export function normalizeDraft(input = {}) {
  const base = defaultDraft();
  const draft = { ...base, ...input };
  draft.company = { ...base.company, ...(input.company || {}) };
  draft.branding = { ...base.branding, ...(input.branding || {}) };
  draft.theme = { ...base.theme, ...(input.theme || {}) };
  draft.owner = { ...base.owner, ...(input.owner || {}) };
  draft.homepage = { ...base.homepage, ...(input.homepage || {}) };
  draft.services = Array.isArray(input.services) ? input.services : base.services;
  draft.modules = Array.isArray(input.modules) ? input.modules : base.modules;
  draft.completedSteps = Array.isArray(input.completedSteps) ? input.completedSteps : base.completedSteps;
  draft.skippedOptionalSteps = Array.isArray(input.skippedOptionalSteps) ? input.skippedOptionalSteps : base.skippedOptionalSteps;
  draft.currentStep = INSTALL_STEPS.includes(input.currentStep) ? input.currentStep : base.currentStep;
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export function validateFinish(draft) {
  const missing = [];
  if (!draft.company?.name?.trim()) missing.push('company_profile');
  if (!draft.owner?.name?.trim() || !draft.owner?.email?.trim()) missing.push('owner_account');
  if (!draft.theme?.mode || !['light', 'dark', 'system', 'custom'].includes(draft.theme.mode)) missing.push('theme_settings');
  if (!draft.homepage?.headline?.trim()) missing.push('homepage_config');
  if (!Array.isArray(draft.services) || draft.services.filter(Boolean).length === 0) missing.push('services');
  if (!Array.isArray(draft.modules) || draft.modules.filter(Boolean).length === 0) missing.push('module_registry');
  return missing;
}

export function goToStepForMissing(key) {
  return ({ company_profile: 'company', owner_account: 'owner', theme_settings: 'theme', homepage_config: 'homepage', services: 'services', module_registry: 'modules' })[key] || 'review';
}

export function seedRolesAndPermissions(modules) {
  const roles = ['owner', 'admin', 'manager', 'worker', 'client'].map((id) => ({ id, name: id === 'owner' ? 'Super Owner' : id[0].toUpperCase() + id.slice(1) }));
  const permissions = modules.flatMap((mod) => (mod.permissions || []).map((p) => ({ ...p, moduleId: mod.id })));
  permissions.push({ id: 'owner.impersonate', name: 'Impersonate users', moduleId: 'system' });
  return { roles, permissions };
}
