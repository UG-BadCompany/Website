export type LicenseTier = 'basic' | 'pro' | 'business';
export type LicenseModuleKey = keyof typeof moduleLicenseMap;

export const licenseTierRank: Record<LicenseTier, number> = { basic: 1, pro: 2, business: 3 };

export const moduleLicenseMap = {
  website: { minTier: 'basic' },
  homepage_builder: { minTier: 'basic' },
  branding: { minTier: 'basic' },
  theme: { minTier: 'basic' },
  magic_login: { minTier: 'basic' },
  dashboard: { minTier: 'basic' },
  clients: { minTier: 'basic' },
  properties: { minTier: 'basic' },
  requests: { minTier: 'basic' },
  quotes: { minTier: 'basic' },
  basic_invoices: { minTier: 'basic' },
  basic_media: { minTier: 'basic' },
  basic_settings: { minTier: 'basic' },

  jobs: { minTier: 'pro' },
  work_orders: { minTier: 'pro' },
  payments: { minTier: 'pro' },
  messages: { minTier: 'pro' },
  service_catalog: { minTier: 'pro' },
  project_showcase: { minTier: 'pro' },
  google_reviews: { minTier: 'pro' },
  client_portal: { minTier: 'pro' },

  cmms: { minTier: 'business' },
  assets: { minTier: 'business' },
  advanced_roles_permissions: { minTier: 'business' },
  owner_view_as: { minTier: 'business' },
  workflow_automation: { minTier: 'business' },
  advanced_reporting: { minTier: 'business' },
  multiple_payment_providers: { minTier: 'business' },
  ai_quoting: { minTier: 'business' },
  ai_troubleshooting: { minTier: 'business' },
  advanced_media: { minTier: 'business' },
  technician_workflow: { minTier: 'business' },
  quote_job_invoice_automation: { minTier: 'business' },
} as const;

export const basicModules = Object.entries(moduleLicenseMap).filter(([, value]) => value.minTier === 'basic').map(([key]) => key);
export const proModules = Object.entries(moduleLicenseMap).filter(([, value]) => ['basic', 'pro'].includes(value.minTier)).map(([key]) => key);

export function normalizeLicenseTier(value: unknown): LicenseTier {
  const tier = String(value || '').toLowerCase();
  if (tier === 'business' || tier === 'pro' || tier === 'basic') return tier;
  return 'basic';
}

export function requiredTierForModule(moduleKey: string): LicenseTier {
  return moduleLicenseMap[moduleKey as LicenseModuleKey]?.minTier || 'business';
}

export function moduleAllowedByTier(moduleKey: string, tier: LicenseTier, enabledModules: string[] = []) {
  if (enabledModules.includes('*') || tier === 'business') return true;
  if (enabledModules.includes(moduleKey)) return true;
  const requiredTier = requiredTierForModule(moduleKey);
  return licenseTierRank[tier] >= licenseTierRank[requiredTier];
}

export function friendlyModuleName(moduleKey: string) {
  return moduleKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
