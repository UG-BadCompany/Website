import { json, loadDatabase } from './auth-utils.mjs';
import { DEFAULT_HOMEPAGE_SETTINGS } from './homepage-settings.mjs';

const publicSiteKey = (process.env.RECAPTCHA_SITE_KEY || '').trim();

const FALLBACK_COMPANY = {
  companyName: 'Your Company', displayName: 'Contractor Portal', logoUrl: '', faviconUrl: '',
  primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626',
  themeMode: 'system', defaultTheme: 'system', selectedTheme: 'system', colorScheme: 'system',
  sidebarBackgroundColor: '', sidebarTextColor: '', sidebarActiveColor: '', sidebarBorderColor: '', sidebarHoverColor: '', mobileNavBackgroundColor: '', mobileNavTextColor: '', mobileNavActiveColor: '', mobileNavBorderColor: '', customSidebarColorsEnabled: false, customMobileNavColorsEnabled: false, hasCustomSidebarColors: false,
  supportEmail: '', supportPhone: '', businessPhone: '', businessAddress: '', city: '', state: '', zip: '', serviceArea: '', showCompanyNameInHeader: false, installationComplete: false,
};

const bool = (value) => value === true || value === 'true' || value === 1 || value === '1';
const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const pickArray = (value, fallback = []) => Array.isArray(value) ? value : fallback;
const cacheHeaders = { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' };

const resolveTheme = (mode = 'system') => mode === 'dark' || mode === 'light' ? mode : 'system';

const companyFromRow = (row = {}) => ({
  ...FALLBACK_COMPANY,
  companyName: first(row.company_name, FALLBACK_COMPANY.companyName),
  displayName: first(row.display_name, row.company_name, FALLBACK_COMPANY.displayName),
  logoUrl: first(row.logo_url, ''),
  faviconUrl: first(row.favicon_url, ''),
  supportEmail: first(row.support_email, ''),
  supportPhone: first(row.support_phone, ''),
  businessPhone: first(row.business_phone, ''),
  businessAddress: first(row.business_address, ''),
  city: first(row.city, ''), state: first(row.state, ''), zip: first(row.zip, ''), serviceArea: first(row.service_area, ''),
  primaryColor: first(row.primary_color, FALLBACK_COMPANY.primaryColor), accentColor: first(row.accent_color, FALLBACK_COMPANY.accentColor), backgroundColor: first(row.background_color, FALLBACK_COMPANY.backgroundColor), surfaceColor: first(row.surface_color, FALLBACK_COMPANY.surfaceColor), textColor: first(row.text_color, FALLBACK_COMPANY.textColor), buttonColor: first(row.button_color, row.primary_color, FALLBACK_COMPANY.buttonColor), successColor: first(row.success_color, FALLBACK_COMPANY.successColor), warningColor: first(row.warning_color, FALLBACK_COMPANY.warningColor), dangerColor: first(row.danger_color, FALLBACK_COMPANY.dangerColor),
  themeMode: first(row.theme_mode, row.default_theme, 'system'), defaultTheme: first(row.default_theme, row.theme_mode, 'system'), selectedTheme: first(row.selected_theme, row.theme_mode, row.default_theme, 'system'), colorScheme: first(row.color_scheme, row.theme_mode, row.default_theme, 'system'),
  resolvedTheme: resolveTheme(first(row.theme_mode, row.default_theme, 'system')),
  sidebarBackgroundColor: first(row.sidebar_background_color, ''), sidebarTextColor: first(row.sidebar_text_color, ''), sidebarActiveColor: first(row.sidebar_active_color, ''), sidebarBorderColor: first(row.sidebar_border_color, ''), sidebarHoverColor: first(row.sidebar_hover_color, ''),
  mobileNavBackgroundColor: first(row.mobile_nav_background_color, ''), mobileNavTextColor: first(row.mobile_nav_text_color, row.sidebar_text_color, ''), mobileNavActiveColor: first(row.mobile_nav_active_color, ''), mobileNavBorderColor: first(row.mobile_nav_border_color, row.sidebar_border_color, ''),
  customSidebarColorsEnabled: bool(row.custom_sidebar_colors_enabled), customMobileNavColorsEnabled: bool(row.custom_mobile_nav_colors_enabled), hasCustomSidebarColors: bool(row.custom_sidebar_colors_enabled),
  showCompanyNameInHeader: bool(row.show_company_name_in_header), installationComplete: bool(row.installation_complete), updatedAt: row.updated_at || null,
});

const homepageFromRow = (row = {}) => {
  const config = row.homepage_config && typeof row.homepage_config === 'object' ? row.homepage_config : {};
  const settings = { ...DEFAULT_HOMEPAGE_SETTINGS, ...config, sectionVisibility: { ...(DEFAULT_HOMEPAGE_SETTINGS.sectionVisibility || {}), ...(row.section_visibility || {}), ...(config.sectionVisibility || {}) } };
  return {
    hero: { headline: first(row.hero_headline, settings.heroHeadline), subheadline: first(row.hero_subheadline, settings.heroSubheadline), trustLine: settings.heroTrustLine || '', primaryButtonText: first(row.primary_button_text, settings.primaryButtonText), primaryButtonLink: first(row.primary_button_link, settings.primaryButtonLink), secondaryButtonText: first(row.secondary_button_text, settings.secondaryButtonText), secondaryButtonLink: first(row.secondary_button_link, settings.secondaryButtonLink), showSecondaryButton: row.show_secondary_button ?? settings.showSecondaryButton, backgroundUrl: first(row.hero_background_url, settings.heroBackgroundUrl, '') },
    settings: { ...settings, id: row.id || null, heroHeadline: first(row.hero_headline, settings.heroHeadline), heroSubheadline: first(row.hero_subheadline, settings.heroSubheadline), primaryButtonText: first(row.primary_button_text, settings.primaryButtonText), primaryButtonLink: first(row.primary_button_link, settings.primaryButtonLink), secondaryButtonText: first(row.secondary_button_text, settings.secondaryButtonText), secondaryButtonLink: first(row.secondary_button_link, settings.secondaryButtonLink), showSecondaryButton: row.show_secondary_button ?? settings.showSecondaryButton, servicesTitle: first(row.services_title, settings.servicesTitle), servicesSubtitle: first(row.services_subtitle, settings.servicesSubtitle), servicesConfig: pickArray(row.services_config, settings.servicesConfig), sectionVisibility: { ...settings.sectionVisibility }, updatedAt: row.updated_at || null },
    visibleNavSections: Object.entries(settings.sectionVisibility || {}).filter(([, visible]) => visible !== false).map(([key]) => key),
    serviceGroups: pickArray(config.serviceGroups, []).slice(0, 8),
    services: pickArray(config.services, pickArray(row.services_config, settings.servicesConfig)).filter((service) => service?.enabled !== false).slice(0, 12),
    projects: { visible: settings.sectionVisibility?.projects !== false && config.projects?.visible !== false, title: settings.projectsTitle || 'Recent projects' },
    contact: { phone: first(settings.contact?.phone, row.footer_phone, ''), email: first(settings.contact?.email, row.footer_email, ''), serviceArea: first(settings.contact?.serviceArea, row.footer_address, '') },
    portal: settings.portal || {},
    updatedAt: row.updated_at || null,
  };
};

const fallbackConfig = (startedAt) => ({
  ok: true, source: 'fallback', recaptchaSiteKey: publicSiteKey || null, company: FALLBACK_COMPANY, ...FALLBACK_COMPANY,
  homepage: homepageFromRow({}), visibleNavSections: Object.keys(DEFAULT_HOMEPAGE_SETTINGS.sectionVisibility || {}), serviceGroupsSummary: [], projectsVisibility: { visible: true }, contactInfo: {},
  cacheVersion: 'fallback', updatedAt: null, generatedAt: new Date().toISOString(), timingMs: Date.now() - startedAt,
});

export default async () => {
  const startedAt = Date.now();
  try {
    const db = await loadDatabase();
    const [[companyRow], [homepageRow], [gallerySummary]] = await Promise.all([
      db.sql`select * from company_settings order by updated_at desc limit 1`,
      db.sql`select * from homepage_settings order by updated_at desc limit 1`,
      db.sql`select count(*)::int as visible_count, max(updated_at) as updated_at from homepage_gallery where visible = true`,
    ]);
    const company = companyFromRow(companyRow || {});
    const homepage = homepageFromRow(homepageRow || {});
    const updatedAt = [company.updatedAt, homepage.updatedAt, gallerySummary?.updated_at].filter(Boolean).sort().at(-1) || new Date(0).toISOString();
    const config = {
      ok: true, source: 'database', recaptchaSiteKey: publicSiteKey || null,
      company, ...company,
      colorVariables: { primaryColor: company.primaryColor, accentColor: company.accentColor, backgroundColor: company.backgroundColor, surfaceColor: company.surfaceColor, textColor: company.textColor, buttonColor: company.buttonColor, successColor: company.successColor, warningColor: company.warningColor, dangerColor: company.dangerColor },
      sidebarColors: { backgroundColor: company.sidebarBackgroundColor, textColor: company.sidebarTextColor, activeColor: company.sidebarActiveColor, borderColor: company.sidebarBorderColor, hoverColor: company.sidebarHoverColor, custom: company.customSidebarColorsEnabled },
      mobileNavColors: { backgroundColor: company.mobileNavBackgroundColor, textColor: company.mobileNavTextColor, activeColor: company.mobileNavActiveColor, borderColor: company.mobileNavBorderColor, custom: company.customMobileNavColorsEnabled },
      homepage, homepageHeroSummary: homepage.hero, visibleNavSections: homepage.visibleNavSections, serviceGroupsSummary: homepage.serviceGroups, projectsVisibility: { ...homepage.projects, count: gallerySummary?.visible_count || 0 }, contactInfo: homepage.contact,
      cacheVersion: String(updatedAt), updatedAt, generatedAt: new Date().toISOString(), timingMs: Date.now() - startedAt,
    };
    if (config.timingMs > 750) console.warn('/api/public-config slow response', { timingMs: config.timingMs, updatedAt });
    return json(200, config, cacheHeaders);
  } catch (error) {
    console.error('Failed to load public config bootstrap; using fallback', error);
    return json(200, fallbackConfig(startedAt), { 'cache-control': 'no-store' });
  }
};

export const config = { path: '/api/public-config' };
