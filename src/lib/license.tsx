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
  const value = useMemo<LicenseContextValue>(() => ({
    license,
    loading,
    reload,
    canUseModule: (moduleKey) => moduleAllowedByTier(moduleKey, license?.tier || 'basic', license?.enabledModules || []),
    requiredTier: requiredTierForModule,
    isBusiness: () => license?.tier === 'business' || Boolean(license?.enabledModules?.includes('*')),
    isProOrHigher: () => license?.tier === 'pro' || license?.tier === 'business' || Boolean(license?.enabledModules?.includes('*')),
  }), [license, loading]);
  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() { return useContext(LicenseContext); }
