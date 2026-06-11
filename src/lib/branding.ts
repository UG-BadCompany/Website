import { loadJson } from './storage';

export type BrandingSettings = { displayName: string; tagline?: string; logoSrc?: string; faviconSrc?: string };
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

export const defaultBranding: BrandingSettings = { displayName: 'ContractorOS', tagline: 'Foundation business operating system' };
export const defaultHomepage: BasicHomepageSettings = {
  heroHeadline: 'Contractor services made simple',
  heroSubheadline: 'Request estimates, schedule service, and stay informed from one easy online experience.',
  primaryCtaLabel: 'Request Estimate',
  primaryCtaLink: '/request-estimate',
  secondaryCtaLabel: 'View Services',
  secondaryCtaLink: '/services',
  aboutText: 'ContractorOS ships System, Auth, Website, CRM, Operations, Estimating, Financial, Payments, CMMS, Communications, Service Catalog, and Media as one installed product.',
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

export function getBranding() {
  return loadJson<BrandingSettings>('contractoros.branding', defaultBranding);
}

export function getBasicHomepage() {
  return loadJson<BasicHomepageSettings>('contractoros.homepage.basic', defaultHomepage);
}

export function applyFavicon(faviconSrc?: string) {
  if (!faviconSrc) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconSrc;
}

export async function fetchPublicSiteSettings() {
  const response = await fetch('/api/public/site-settings', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Public site settings unavailable');
  return response.json() as Promise<{ branding?: Partial<BrandingSettings>; homepage?: Partial<BasicHomepageSettings> }>;
}
