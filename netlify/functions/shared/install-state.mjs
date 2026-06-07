import { promises as fs } from 'node:fs';
import path from 'node:path';

const STATE_PATH = process.env.PLATFORM_INSTALL_STATE_PATH || '/tmp/platform-installation-state.json';
const BOOTSTRAP_PATH = path.join(process.cwd(), 'public/config/bootstrap.json');

const DEFAULT_THEME = {
  mode: 'system',
  primary: '#2563eb',
  accent: '#f97316',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  border: '#cbd5e1',
  button: '#2563eb',
  buttonText: '#ffffff',
  customSidebar: false,
  sidebarBackground: '#0f172a',
  sidebarText: '#e2e8f0',
  sidebarActiveBackground: '#1d4ed8',
  sidebarActiveText: '#ffffff',
  sidebarHoverBackground: '#1e293b',
  customMobileNav: false,
  mobileNavBackground: '#ffffff',
  mobileNavActive: '#2563eb',
  mobileNavText: '#0f172a'
};

export const DEFAULT_INSTALL_STATE = {
  id: 'default',
  installation_complete: false,
  installed_version: null,
  installed_at: null,
  installed_by_user_id: null,
  current_step: 'welcome',
  license_status: 'verification_disabled',
  bootstrap_generated: false,
  metadata: {
    company: {}, branding: {}, theme: DEFAULT_THEME, owner: {}, roles: ['owner', 'admin', 'manager', 'worker', 'client'], modules: {}, homepage: {}, ai: {}, payments: {}, environment: {}
  },
  created_at: null,
  updated_at: null
};

export async function readInstallState() {
  if (process.env.PLATFORM_INSTALLATION_COMPLETE === 'true') {
    return { ...DEFAULT_INSTALL_STATE, installation_complete: true, installed_version: '1.0.0', installed_at: process.env.PLATFORM_INSTALLED_AT || new Date().toISOString(), current_step: 'finish', bootstrap_generated: true };
  }
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return { ...DEFAULT_INSTALL_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_INSTALL_STATE, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }
}

export async function writeInstallState(patch) {
  const current = await readInstallState();
  const next = {
    ...current,
    ...patch,
    metadata: { ...current.metadata, ...(patch.metadata || {}) },
    updated_at: new Date().toISOString(),
    created_at: current.created_at || new Date().toISOString()
  };
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2));
  return next;
}

export function installStatusPayload(state) {
  const installed = Boolean(state.installation_complete);
  return {
    ok: true,
    installed,
    installationComplete: installed,
    needsInstall: !installed,
    currentStep: state.current_step || 'welcome',
    ...(installed ? { installedAt: state.installed_at, installedVersion: state.installed_version || '1.0.0' } : {})
  };
}

export async function requireInstalled() {
  const state = await readInstallState();
  return Boolean(state.installation_complete);
}

export async function generateBootstrap() {
  const state = await readInstallState();
  const theme = state.metadata?.theme || DEFAULT_THEME;
  const company = state.metadata?.company || {};
  const bootstrap = {
    generatedAt: new Date().toISOString(),
    installed: Boolean(state.installation_complete),
    company: {
      displayName: company.displayName || company.companyName || 'Your Contractor Team',
      phone: company.phone || '',
      supportEmail: company.supportEmail || '',
      serviceArea: company.serviceArea || ''
    },
    theme,
    homepage: state.metadata?.homepage || {},
    modulesConfigUrl: '/config/module-manifest.json'
  };
  try {
    await fs.mkdir(path.dirname(BOOTSTRAP_PATH), { recursive: true });
    await fs.writeFile(BOOTSTRAP_PATH, JSON.stringify(bootstrap, null, 2));
  } catch {
    // Netlify functions may not be able to write to the deployed bundle; build script also generates this file.
  }
  await writeInstallState({ bootstrap_generated: true });
  return bootstrap;
}

export { DEFAULT_THEME };
