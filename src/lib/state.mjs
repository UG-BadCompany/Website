export const PLATFORM_VERSION = '1.0.0';

export const requiredInstallFields = ['companyProfile', 'ownerAccount', 'themeSettings', 'homepageConfig', 'moduleRegistry', 'servicesTrades'];

export function optionalIntegrationWarnings(env = process.env) {
  const checks = [
    ['OPENAI_API_KEY', 'AI is not configured yet.'],
    ['RESEND_API_KEY', 'Email is not configured yet.'],
    ['SQUARE_ACCESS_TOKEN', 'Square payments are not configured yet.'],
    ['SMTP_HOST', 'SMTP is not configured yet.'],
    ['SERPAPI_KEY', 'Search enrichment is not configured yet.'],
    ['LICENSE_VERIFY_URL', 'License server is not configured yet.']
  ];
  return checks.filter(([key]) => !env[key]).map(([, warning]) => warning);
}

export function safeInstallStatus(record) {
  const installed = Boolean(record?.installation_complete || record?.installationComplete);
  if (!installed) return { ok: true, installed: false, installationComplete: false, needsInstall: true, currentStep: record?.current_step || 'welcome' };
  return { ok: true, installed: true, installationComplete: true, needsInstall: false, installedAt: record.installed_at || new Date().toISOString(), installedVersion: record.installed_version || PLATFORM_VERSION };
}

export function finishInstallation(payload = {}, modules = []) {
  const missingCore = requiredInstallFields.filter((field) => !payload[field]);
  if (missingCore.length) return { ok: false, installationComplete: false, missingCore, message: 'Required core setup is incomplete.' };
  return {
    ok: true,
    installationComplete: true,
    installed: true,
    installedAt: new Date().toISOString(),
    installedVersion: PLATFORM_VERSION,
    warnings: optionalIntegrationWarnings(),
    redirectTo: '/dashboard/',
    modulesRegistered: modules.length
  };
}
