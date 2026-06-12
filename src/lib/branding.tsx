import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson } from './storage';
import { applyTheme } from './theme';
import type { ThemeSettings } from './theme';

export type BrandingTheme = Partial<ThemeSettings> | Record<string, unknown>;
export type BrandingSettings = {
  companyName: string;
  displayName: string;
  companyDisplayName: string;
  logoMediaId?: string;
  logoUrl?: string;
  logoResolvedUrl?: string;
  faviconMediaId?: string;
  faviconUrl?: string;
  faviconResolvedUrl?: string;
  tagline?: string;
  theme?: BrandingTheme;
  homepage?: string;
  brandingUpdatedAt?: string;
};
export type HomepageService = { id: string; name: string; description: string; icon?: string };
export type BasicHomepageSettings = {
  heroHeadline: string;
  heroSubheadline: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  secondaryCtaLabel: string;
  secondaryCtaLink: string;
  aboutText: string;
  servicesIntro: string;
  services: HomepageService[];
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  serviceArea: string;
  businessHours: string;
  trustText: string;
  yearsExperience: string;
  emergencyServiceEnabled: boolean;
  financingAvailableEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
};

type LegacyBrandingSettings = Partial<BrandingSettings> & { logoSrc?: string; faviconSrc?: string };
type PublicSiteSettings = Omit<Partial<BrandingSettings>, 'homepage'> & { branding?: Partial<LegacyBrandingSettings>; homepage?: Partial<BasicHomepageSettings> };
type BrandingContextValue = BrandingSettings & { isLoading: boolean; refreshBranding: () => Promise<void>; updateBranding: (branding: Partial<BrandingSettings>) => void };

export const BRANDING_UPDATED_EVENT = 'contractoros:branding-updated';
export const defaultBranding: BrandingSettings = {
  companyName: 'ContractorOS',
  displayName: 'ContractorOS',
  companyDisplayName: 'ContractorOS',
  tagline: 'Foundation business operating system',
  logoUrl: '',
  faviconUrl: '',
  homepage: '/',
  brandingUpdatedAt: '',
};
export const defaultHomepage: BasicHomepageSettings = {
  heroHeadline: 'Contractor services made simple',
  heroSubheadline: 'Request estimates, schedule service, and stay informed from one easy online experience.',
  primaryCtaLabel: 'Request Estimate',
  primaryCtaLink: '/request-estimate',
  secondaryCtaLabel: 'View Services',
  secondaryCtaLink: '/services',
  aboutText: 'Manage estimates, requests, jobs, invoices, payments, communications, service catalog, media, and CMMS from one installed business platform.',
  servicesIntro: 'Editable service categories are ready for estimates, requests, jobs, and future AI add-ons.',
  services: [],
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  serviceArea: '',
  businessHours: '',
  trustText: 'Licensed and insured',
  yearsExperience: '',
  emergencyServiceEnabled: false,
  financingAvailableEnabled: false,
  seoTitle: 'Contractor Services',
  seoDescription: 'Request a service estimate from a trusted local contractor.',
};

function firstBrandingUrl(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function normalizeBranding(input?: Partial<LegacyBrandingSettings>): BrandingSettings {
  const logoUrl = firstBrandingUrl(input?.logoUrl, input?.logoResolvedUrl, input?.logoSrc);
  const faviconUrl = firstBrandingUrl(input?.faviconUrl, input?.faviconResolvedUrl, input?.faviconSrc);
  const companyDisplayName = (input as Partial<BrandingSettings> | undefined)?.companyDisplayName || input?.companyName || input?.displayName || defaultBranding.displayName;
  const displayName = companyDisplayName;
  return {
    ...defaultBranding,
    ...input,
    companyName: input?.companyName || displayName,
    displayName,
    companyDisplayName,
    logoUrl,
    faviconUrl,
    brandingUpdatedAt: input?.brandingUpdatedAt || '',
  };
}

export function getBranding() {
  return normalizeBranding(loadJson<LegacyBrandingSettings>('contractoros.branding', defaultBranding));
}

export function saveBranding(branding: Partial<BrandingSettings>) {
  const next = normalizeBranding({ ...getBranding(), ...branding, brandingUpdatedAt: branding.brandingUpdatedAt || new Date().toISOString() });
  saveJson('contractoros.branding', next);
  notifyBrandingUpdated(next);
  return next;
}

export function notifyBrandingUpdated(branding?: Partial<BrandingSettings>) {
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT, { detail: branding }));
}

export function getBasicHomepage() {
  return loadJson<BasicHomepageSettings>('contractoros.homepage.basic', defaultHomepage);
}

function isLocalAsset(url: string) {
  if (url.startsWith('/')) return true;
  try { return new URL(url).origin === window.location.origin; } catch { return false; }
}

export function versionedAsset(url?: string, version?: string) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url || '';
  if (!version || !isLocalAsset(url)) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('v', String(new Date(version).getTime() || version));
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

export function pageTitle(pageTitle?: string, branding: Pick<BrandingSettings, 'companyDisplayName' | 'displayName' | 'companyName'> = defaultBranding) {
  const company = branding.companyDisplayName || branding.companyName || 'ContractorOS';
  return pageTitle ? `${pageTitle} | ${company}` : company;
}

export function applyFavicon(faviconUrl?: string, version?: string) {
  if (!faviconUrl) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = versionedAsset(faviconUrl, version);
}

export async function fetchPublicSiteSettings() {
  const response = await fetch('/api/public/site-settings', { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error('Public site settings unavailable');
  return response.json() as Promise<PublicSiteSettings>;
}

const BrandingContext = createContext<BrandingContextValue>({ ...defaultBranding, isLoading: true, refreshBranding: async () => undefined, updateBranding: () => undefined });

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(() => getBranding());
  const [isLoading, setIsLoading] = useState(true);

  const updateBranding = useCallback((patch: Partial<BrandingSettings>) => {
    setBranding((current) => {
      const next = normalizeBranding({ ...current, ...patch, brandingUpdatedAt: patch.brandingUpdatedAt || current.brandingUpdatedAt || new Date().toISOString() });
      saveJson('contractoros.branding', next);
      return next;
    });
  }, []);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await fetchPublicSiteSettings();
      const { homepage: _homepage, branding: nestedBranding, ...topLevelBranding } = settings;
      const publicBranding = nestedBranding ?? topLevelBranding;
      if (publicBranding) updateBranding(normalizeBranding(publicBranding));
    } finally {
      setIsLoading(false);
    }
  }, [updateBranding]);

  useEffect(() => { refreshBranding().catch(() => setIsLoading(false)); }, [refreshBranding]);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<BrandingSettings> | undefined>).detail;
      if (detail) updateBranding(detail);
      refreshBranding().catch(() => undefined);
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, listener);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, listener);
  }, [refreshBranding, updateBranding]);
  useEffect(() => applyFavicon(branding.faviconUrl, branding.brandingUpdatedAt), [branding.faviconUrl, branding.brandingUpdatedAt]);
  useEffect(() => { if (branding.theme && Object.keys(branding.theme).length) applyTheme(branding.theme as ThemeSettings); }, [branding.theme]);
  useEffect(() => { document.title = pageTitle(undefined, branding); }, [branding.companyDisplayName, branding.companyName, branding.displayName]);
  useEffect(() => { document.documentElement.style.setProperty('--brand-logo', branding.logoUrl ? `url("${versionedAsset(branding.logoUrl, branding.brandingUpdatedAt)}")` : 'none'); }, [branding.logoUrl, branding.brandingUpdatedAt]);

  const value = useMemo(() => ({ ...branding, isLoading, refreshBranding, updateBranding }), [branding, isLoading, refreshBranding, updateBranding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() { return useContext(BrandingContext); }
export function useHomepageSettings() {
  const [homepage, setHomepage] = useState(() => getBasicHomepage());
  const [isLoading, setIsLoading] = useState(true);
  const refreshHomepage = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await fetchPublicSiteSettings();
      if (settings.homepage) {
        const next = { ...defaultHomepage, ...settings.homepage };
        setHomepage(next);
        saveJson('contractoros.homepage.basic', next);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { refreshHomepage().catch(() => setIsLoading(false)); }, [refreshHomepage]);
  return { homepage, isLoading, refreshHomepage };
}
