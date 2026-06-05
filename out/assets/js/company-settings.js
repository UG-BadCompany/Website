(() => {
  const fallback = {
    companyName: 'Your Company', displayName: 'Contractor Portal', legalName: '', logoUrl: '', faviconUrl: '',
    primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626',
    themeMode: 'system', defaultTheme: 'system', selectedTheme: 'system', colorScheme: 'system',
    sidebarBackgroundColor: '', sidebarTextColor: '', sidebarActiveColor: '', sidebarBorderColor: '', sidebarHoverColor: '', mobileNavBackgroundColor: '', mobileNavTextColor: '', mobileNavActiveColor: '', mobileNavBorderColor: '', hasCustomSidebarColors: false,
    enableThemeToggle: true, showCompanyNameInHeader: false, installationComplete: false,
  };
  const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
  const norm = (raw = {}) => {
    const themeMode = first(raw.themeMode, raw.theme_mode, raw.selectedTheme, raw.selected_theme, raw.defaultTheme, raw.default_theme, fallback.themeMode);
    const defaultTheme = first(raw.defaultTheme, raw.default_theme, themeMode, fallback.defaultTheme);
    return {
      companyName: first(raw.companyName, raw.company_name, fallback.companyName),
      legalName: first(raw.legalName, raw.legal_name, ''),
      displayName: first(raw.displayName, raw.display_name, raw.companyName, raw.company_name, fallback.displayName),
      websiteUrl: first(raw.websiteUrl, raw.website_url, ''), supportEmail: first(raw.supportEmail, raw.support_email, ''), supportPhone: first(raw.supportPhone, raw.support_phone, ''), businessPhone: first(raw.businessPhone, raw.business_phone, ''), businessAddress: first(raw.businessAddress, raw.business_address, ''), city: first(raw.city, ''), state: first(raw.state, ''), zip: first(raw.zip, ''), serviceArea: first(raw.serviceArea, raw.service_area, ''), timezone: first(raw.timezone, 'America/Phoenix'), currency: first(raw.currency, 'USD'),
      logoUrl: first(raw.logoUrl, raw.logo_url, ''), faviconUrl: first(raw.faviconUrl, raw.favicon_url, ''),
      primaryColor: first(raw.primaryColor, raw.primary_color, fallback.primaryColor), accentColor: first(raw.accentColor, raw.accent_color, fallback.accentColor), backgroundColor: first(raw.backgroundColor, raw.background_color, fallback.backgroundColor), surfaceColor: first(raw.surfaceColor, raw.surface_color, fallback.surfaceColor), textColor: first(raw.textColor, raw.text_color, fallback.textColor), buttonColor: first(raw.buttonColor, raw.button_color, raw.primaryColor, raw.primary_color, fallback.buttonColor), successColor: first(raw.successColor, raw.success_color, fallback.successColor), warningColor: first(raw.warningColor, raw.warning_color, fallback.warningColor), dangerColor: first(raw.dangerColor, raw.danger_color, fallback.dangerColor),
      themeMode, defaultTheme, selectedTheme: first(raw.selectedTheme, raw.selected_theme, themeMode), colorScheme: first(raw.colorScheme, raw.color_scheme, themeMode),
      sidebarBackgroundColor: first(raw.sidebarBackgroundColor, raw.sidebar_background_color, fallback.sidebarBackgroundColor), sidebarTextColor: first(raw.sidebarTextColor, raw.sidebar_text_color, fallback.sidebarTextColor), sidebarActiveColor: first(raw.sidebarActiveColor, raw.sidebar_active_color, fallback.sidebarActiveColor), sidebarBorderColor: first(raw.sidebarBorderColor, raw.sidebar_border_color, fallback.sidebarBorderColor), sidebarHoverColor: first(raw.sidebarHoverColor, raw.sidebar_hover_color, fallback.sidebarHoverColor), mobileNavBackgroundColor: first(raw.mobileNavBackgroundColor, raw.mobile_nav_background_color, fallback.mobileNavBackgroundColor), mobileNavTextColor: first(raw.mobileNavTextColor, raw.mobile_nav_text_color, raw.sidebarTextColor, raw.sidebar_text_color, fallback.mobileNavTextColor), mobileNavActiveColor: first(raw.mobileNavActiveColor, raw.mobile_nav_active_color, fallback.mobileNavActiveColor), mobileNavBorderColor: first(raw.mobileNavBorderColor, raw.mobile_nav_border_color, raw.sidebarBorderColor, raw.sidebar_border_color, fallback.mobileNavBorderColor), hasCustomSidebarColors: Boolean(raw.hasCustomSidebarColors ?? raw.has_custom_sidebar_colors ?? raw.sidebarColorsCustomized ?? raw.sidebar_colors_customized),
      enableThemeToggle: raw.enableThemeToggle ?? raw.enable_theme_toggle ?? true,
      showCompanyNameInHeader: Boolean(raw.showCompanyNameInHeader ?? raw.show_company_name_in_header ?? false),
      installationComplete: Boolean(raw.installationComplete ?? raw.installation_complete ?? false),
    };
  };
  function initials(name) { return (name || 'YC').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'YC'; }
  function apply(company) {
    window.TACompany.current = company;
    window.TATheme?.apply(company, { persist: true });
    document.title = document.title.replace('Contractor Portal', company.displayName || 'Contractor Portal');
    if (company.faviconUrl) { const f = document.querySelector('link[rel="icon"]') || document.createElement('link'); f.rel = 'icon'; f.href = company.faviconUrl; document.head.appendChild(f); }
    document.querySelectorAll('[data-company-name]').forEach((el) => { el.textContent = company.displayName || company.companyName; });
    document.querySelectorAll('[data-company-legal]').forEach((el) => { el.textContent = company.legalName || company.companyName; });
    document.querySelectorAll('[data-company-phone]').forEach((el) => { el.textContent = company.supportPhone || company.businessPhone || ''; });
    document.querySelectorAll('[data-company-email]').forEach((el) => { el.textContent = company.supportEmail || ''; });
    document.querySelectorAll('[data-company-service-area]').forEach((el) => { el.textContent = company.serviceArea || 'your service area'; });
    document.querySelectorAll('[data-brand]').forEach((el) => { el.innerHTML = ''; const logo = document.createElement(company.logoUrl ? 'img' : 'span'); logo.className = 'brand-logo'; if (company.logoUrl) { logo.src = company.logoUrl; logo.alt = 'Company logo'; } else { logo.textContent = initials(company.displayName || company.companyName); } el.appendChild(logo); if (company.showCompanyNameInHeader) { const n = document.createElement('strong'); n.className = 'brand-name'; n.textContent = company.displayName || company.companyName; el.appendChild(n); } });
  }
  async function load() { try { const data = await window.TAApi.get('/.netlify/functions/company-settings'); const company = norm(data.company || data.settings || {}); apply(company); return company; } catch (e) { const stored = window.TATheme?.readStored?.() || {}; const company = norm({ ...fallback, ...stored }); apply(company); return company; } }
  async function installStatus() { try { return await window.TAApi.get('/.netlify/functions/install-status'); } catch (e) { return { installed: false }; } }
  async function requireInstalled() { const status = await installStatus(); if (!status.installed) { location.replace('/install/'); return false; } return true; }
  window.TACompany = { fallback, norm, apply, load, installStatus, requireInstalled, initials, current: fallback };
})();
