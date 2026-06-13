import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { moduleAllowedByTier, requiredTierForModule, type LicenseTier } from '../../lib/license-modules';

type LicenseStatus = {
  ok: boolean;
  tier: LicenseTier;
  status: string;
  enabledModules: string[];
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  warnings: string[];
  licenseEmail?: string;
  maskedLicenseKey?: string;
  installId?: string;
  siteUrl?: string;
  licenseApiUrl?: string;
  lastCheckError?: string | null;
  gracePeriodEndsAt?: string | null;
};

type LicenseContextValue = {
  license: LicenseStatus | null;
  loading: boolean;
  reload: () => Promise<void>;
  canUseModule: (moduleKey: string) => boolean;
  requiredTier: (moduleKey: string) => LicenseTier;
  isBusiness: () => boolean;
  isProOrHigher: () => boolean;
};

const fallback: LicenseStatus = { ok: true, tier: 'basic', status: 'unverified', enabledModules: [], lastVerifiedAt: null, expiresAt: null, warnings: [] };
const hardLockedStatuses = new Set(['invalid', 'expired', 'suspended', 'revoked']);

function hasActiveLicenseAccess(license: LicenseStatus | null) {
  if (!license) return false;
  if (hardLockedStatuses.has(license.status)) return false;
  if (license.lastCheckError && license.gracePeriodEndsAt && Date.now() > new Date(license.gracePeriodEndsAt).getTime()) return false;
  return true;
}

const LicenseContext = createContext<LicenseContextValue>({ license: fallback, loading: true, reload: async () => undefined, canUseModule: (moduleKey) => moduleAllowedByTier(moduleKey, 'basic', []), requiredTier: requiredTierForModule, isBusiness: () => false, isProOrHigher: () => false });

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<LicenseStatus | null>(fallback);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/license/status', { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } });
      setLicense(response.ok ? await response.json() : fallback);
    } catch { setLicense(fallback); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);
  const value = useMemo<LicenseContextValue>(() => {
    const active = hasActiveLicenseAccess(license);
    const tier = active ? (license?.tier || 'basic') : 'basic';
    const enabledModules = active ? (license?.enabledModules || []) : [];
    return {
      license,
      loading,
      reload,
      canUseModule: (moduleKey) => moduleAllowedByTier(moduleKey, tier, enabledModules),
      requiredTier: requiredTierForModule,
      isBusiness: () => tier === 'business' || Boolean(enabledModules.includes('*')),
      isProOrHigher: () => tier === 'pro' || tier === 'business' || Boolean(enabledModules.includes('*')),
    };
  }, [license, loading]);
  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() { return useContext(LicenseContext); }
