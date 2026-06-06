(() => {
  const storageKey = 'TAThemeSettings';
  const defaults = {
    primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', cardColor: '#ffffff', textColor: '#0f172a', mutedColor: '#64748b', borderColor: '#d9e2ef', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626', themeMode: 'system', defaultTheme: 'system', enableThemeToggle: true,
    sidebarBackgroundColor: '', sidebarTextColor: '', sidebarActiveColor: '', sidebarBorderColor: '', sidebarHoverColor: '', mobileNavBackgroundColor: '', mobileNavTextColor: '', mobileNavActiveColor: '', mobileNavBorderColor: '', customSidebarColorsEnabled: false, customMobileNavColorsEnabled: false, hasCustomSidebarColors: false,
  };
  const palettes = {
    light: { backgroundColor: '#f8fafc', surfaceColor: '#ffffff', cardColor: '#ffffff', textColor: '#0f172a', mutedColor: '#64748b', borderColor: '#d9e2ef', sidebarBackgroundColor: '#ffffff', sidebarTextColor: '#0f172a', sidebarActiveColor: '#dbeafe', sidebarBorderColor: '#d9e2ef', sidebarHoverColor: '#eff6ff', mobileNavBackgroundColor: '#ffffff', mobileNavTextColor: '#0f172a', mobileNavActiveColor: '#dbeafe', mobileNavBorderColor: '#d9e2ef' },
    dark: { backgroundColor: '#06111f', surfaceColor: '#0f1c2e', cardColor: '#101f34', textColor: '#e5edf7', mutedColor: '#a5b4c8', borderColor: '#2f4360', sidebarBackgroundColor: '#0f172a', sidebarTextColor: '#e5edf7', sidebarActiveColor: '#2563eb', sidebarBorderColor: '#1e293b', sidebarHoverColor: '#1e293b', mobileNavBackgroundColor: '#0f172a', mobileNavTextColor: '#e5edf7', mobileNavActiveColor: '#2563eb', mobileNavBorderColor: '#1e293b' },
  };
  let systemUnsubscribe = null;
  let bootPromise = null;
  const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');
  const set = (name, value) => document.documentElement.style.setProperty(name, value);
  const safeJson = (value) => { try { return JSON.parse(value || '{}') || {}; } catch { return {}; } };
  const readStored = () => safeJson(localStorage.getItem(storageKey));
  const persist = (settings = {}) => { try { localStorage.setItem(storageKey, JSON.stringify({ ...readStored(), ...settings })); } catch {} };
  const normalizeMode = (mode = 'system') => ['light', 'dark', 'system'].includes(String(mode)) ? String(mode) : 'system';
  const resolveThemeMode = (themeMode = 'system') => normalizeMode(themeMode) === 'system' ? (media()?.matches ? 'dark' : 'light') : normalizeMode(themeMode);
  const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
  const bool = (value) => value === true || value === 'true' || value === 1 || value === '1';
  const isCustomSidebar = (source = {}) => bool(source.customSidebarColorsEnabled ?? source.custom_sidebar_colors_enabled ?? source.hasCustomSidebarColors ?? source.has_custom_sidebar_colors ?? source.sidebarColorsCustomized ?? source.sidebar_colors_customized);
  const isCustomMobileNav = (source = {}) => bool(source.customMobileNavColorsEnabled ?? source.custom_mobile_nav_colors_enabled ?? source.hasCustomMobileNavColors ?? source.has_custom_mobile_nav_colors ?? source.mobileNavColorsCustomized ?? source.mobile_nav_colors_customized);
  const themedValue = (source, mode, key) => first(source[`${mode}${key[0].toUpperCase()}${key.slice(1)}`], source[`${mode}_${key}`]);
  const applyCssVariables = (settings = {}) => {
    const requestedMode = normalizeMode(first(settings.themeMode, settings.defaultTheme, settings.selectedTheme, defaults.themeMode));
    const mode = resolveThemeMode(requestedMode);
    const palette = palettes[mode];
    const source = { ...defaults, ...settings, themeMode: requestedMode, defaultTheme: normalizeMode(first(settings.defaultTheme, requestedMode)) };
    const background = mode === 'dark' ? first(themedValue(source, mode, 'backgroundColor'), palette.backgroundColor) : first(source.backgroundColor, palette.backgroundColor);
    const surface = mode === 'dark' ? first(themedValue(source, mode, 'surfaceColor'), palette.surfaceColor) : first(source.surfaceColor, palette.surfaceColor);
    const card = mode === 'dark' ? first(themedValue(source, mode, 'cardColor'), palette.cardColor, surface) : first(source.cardColor, source.card, palette.cardColor, surface);
    const text = mode === 'dark' ? first(themedValue(source, mode, 'textColor'), palette.textColor) : first(source.textColor, palette.textColor);
    const muted = mode === 'dark' ? first(themedValue(source, mode, 'mutedColor'), themedValue(source, mode, 'textMutedColor'), palette.mutedColor) : first(source.mutedColor, source.textMutedColor, palette.mutedColor);
    const border = mode === 'dark' ? first(themedValue(source, mode, 'borderColor'), palette.borderColor) : first(source.borderColor, palette.borderColor);
    const primary = first(source.primaryColor, defaults.primaryColor);
    const accent = first(source.accentColor, defaults.accentColor);
    const button = first(source.buttonColor, primary, defaults.buttonColor);
    const customSidebar = isCustomSidebar(source);
    const customMobileNav = isCustomMobileNav(source);
    const sidebar = {
      backgroundColor: customSidebar ? first(source.sidebarBackgroundColor, palette.sidebarBackgroundColor) : palette.sidebarBackgroundColor,
      textColor: customSidebar ? first(source.sidebarTextColor, palette.sidebarTextColor) : palette.sidebarTextColor,
      activeColor: customSidebar ? first(source.sidebarActiveColor, primary, palette.sidebarActiveColor) : palette.sidebarActiveColor,
      borderColor: customSidebar ? first(source.sidebarBorderColor, palette.sidebarBorderColor) : palette.sidebarBorderColor,
      hoverColor: customSidebar ? first(source.sidebarHoverColor, palette.sidebarHoverColor) : palette.sidebarHoverColor,
      mobileBg: customMobileNav ? first(source.mobileNavBackgroundColor, palette.mobileNavBackgroundColor) : palette.mobileNavBackgroundColor,
      mobileText: customMobileNav ? first(source.mobileNavTextColor, palette.mobileNavTextColor) : palette.mobileNavTextColor,
      mobileActive: customMobileNav ? first(source.mobileNavActiveColor, primary, palette.mobileNavActiveColor) : palette.mobileNavActiveColor,
      mobileBorder: customMobileNav ? first(source.mobileNavBorderColor, palette.mobileNavBorderColor) : palette.mobileNavBorderColor,
    };

    const pairs = {
      '--background': background, '--surface': surface, '--card': card, '--text': text, '--text-muted': muted, '--border': border, '--primary': primary, '--accent': accent, '--success': first(source.successColor, defaults.successColor), '--warning': first(source.warningColor, defaults.warningColor), '--danger': first(source.dangerColor, defaults.dangerColor), '--button': button,
      '--color-background': background, '--color-surface': surface, '--color-surface-alt': mode === 'dark' ? `color-mix(in srgb, ${surface} 86%, ${background})` : `color-mix(in srgb, ${surface} 88%, ${background})`, '--color-card': card, '--color-text': text, '--color-muted': muted, '--color-border': border, '--color-primary': primary, '--color-accent': accent, '--color-success': first(source.successColor, defaults.successColor), '--color-warning': first(source.warningColor, defaults.warningColor), '--color-danger': first(source.dangerColor, defaults.dangerColor), '--color-button': button,
      '--sidebar-background': sidebar.backgroundColor, '--sidebar-bg': sidebar.backgroundColor, '--sidebar-text': sidebar.textColor, '--sidebar-active': sidebar.activeColor, '--sidebar-border': sidebar.borderColor, '--sidebar-hover': sidebar.hoverColor,
      '--mobile-nav-bg': sidebar.mobileBg, '--mobile-nav-background': sidebar.mobileBg, '--mobile-nav-text': sidebar.mobileText, '--mobile-nav-active': sidebar.mobileActive, '--mobile-nav-border': sidebar.mobileBorder,
      '--bg': background, '--panel': surface, '--surface-alt': mode === 'dark' ? `color-mix(in srgb, ${surface} 86%, ${background})` : `color-mix(in srgb, ${surface} 88%, ${background})`, '--ink': text, '--muted': muted, '--line': border, '--button-color': button, '--primary-color': primary, '--accent-color': accent, '--surface-color': surface, '--text-color': text, '--muted-text': muted, '--border-color': border,
      '--field-bg': mode === 'dark' ? `color-mix(in srgb, ${surface} 86%, #000000)` : `color-mix(in srgb, ${surface} 94%, ${background})`, '--field-text': text, '--field-placeholder': `color-mix(in srgb, ${muted} 78%, ${text})`, '--button-text': '#ffffff',
    };
    Object.entries(pairs).forEach(([key, value]) => set(key, value));
    document.documentElement.style.colorScheme = mode;
    return { source: { ...source, resolvedTheme: mode, customSidebarColorsEnabled: customSidebar, customMobileNavColorsEnabled: customMobileNav, hasCustomSidebarColors: customSidebar }, mode, requestedMode };
  };
  const bindSystemTheme = (settings = {}) => {
    if (systemUnsubscribe) { systemUnsubscribe(); systemUnsubscribe = null; }
    if (normalizeMode(first(settings.themeMode, settings.defaultTheme, defaults.themeMode)) !== 'system') return;
    const query = media(); if (!query) return;
    const listener = () => apply(window.TATheme?.current || settings, { persist: false });
    if (query.addEventListener) { query.addEventListener('change', listener); systemUnsubscribe = () => query.removeEventListener('change', listener); }
    else if (query.addListener) { query.addListener(listener); systemUnsubscribe = () => query.removeListener(listener); }
  };
  const apply = (settings = {}, options = {}) => {
    const result = applyCssVariables(settings);
    window.TATheme = window.TATheme || {};
    window.TATheme.current = result.source;
    document.documentElement.dataset.theme = result.mode;
    document.documentElement.dataset.themeMode = result.requestedMode;
    document.documentElement.dataset.resolvedTheme = result.mode;
    document.documentElement.dataset.themeReady = 'true';
    bindSystemTheme(result.source);
    if (options.persist) persist(result.source);
    document.dispatchEvent(new CustomEvent('ta:theme-applied', { detail: { settings: result.source, theme: result.mode, themeMode: result.requestedMode } }));
    return result.mode;
  };
  const loadGlobal = async () => {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      let settings = { ...defaults, ...readStored() };
      if (window.TAApi?.get) {
        try {
          const data = await window.TAApi.get('/.netlify/functions/company-settings');
          settings = window.TACompany?.norm ? window.TACompany.norm(data.company || data.settings || {}) : { ...settings, ...(data.company || data.settings || {}) };
        } catch {}
      }
      apply(settings, { persist: true });
      return settings;
    })();
    return bootPromise;
  };
  const stored = readStored();
  window.TATheme = { defaults, darkDefaults: palettes.dark, lightDefaults: palettes.light, palettes, apply, resolveThemeMode, resolveMode: resolveThemeMode, applyCssVariables, bindSystemTheme, persist, readStored, loadGlobal, current: { ...defaults, ...stored } };
  apply({ ...defaults, ...stored });
  window.addEventListener?.('storage', (event) => { if (event.key === storageKey) apply({ ...defaults, ...readStored() }); });
})();
