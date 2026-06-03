(() => {
  const defaults = {
    primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626', themeMode: 'system', defaultTheme: 'system', enableThemeToggle: true,
  };
  const darkDefaults = { backgroundColor: '#06111f', surfaceColor: '#0f1c2e', textColor: '#e5edf7' };
  const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');
  const set = (name, value) => document.documentElement.style.setProperty(name, value);
  const resolveMode = (mode = 'system') => mode === 'system' ? (media()?.matches ? 'dark' : 'light') : mode;
  const pickThemeColor = (mode, source, key) => {
    const value = source[key];
    if (mode === 'dark' && (!value || value === defaults[key]) && darkDefaults[key]) return darkDefaults[key];
    return value || defaults[key];
  };
  const apply = (settings = {}) => {
    const requestedMode = settings.themeMode || settings.defaultTheme || defaults.themeMode;
    const mode = resolveMode(requestedMode);
    const source = { ...defaults, ...settings, themeMode: requestedMode, defaultTheme: settings.defaultTheme || requestedMode };
    window.TATheme.current = source;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.themeMode = requestedMode;
    set('--color-primary', source.primaryColor || defaults.primaryColor);
    set('--color-accent', source.accentColor || defaults.accentColor);
    set('--color-background', pickThemeColor(mode, source, 'backgroundColor'));
    set('--color-surface', pickThemeColor(mode, source, 'surfaceColor'));
    set('--color-text', pickThemeColor(mode, source, 'textColor'));
    set('--color-button', source.buttonColor || source.primaryColor || defaults.buttonColor);
    set('--color-success', source.successColor || defaults.successColor);
    set('--color-warning', source.warningColor || defaults.warningColor);
    set('--color-danger', source.dangerColor || defaults.dangerColor);
    set('--primary', source.primaryColor || defaults.primaryColor);
    set('--accent', source.accentColor || defaults.accentColor);
    set('--bg', pickThemeColor(mode, source, 'backgroundColor'));
    set('--panel', pickThemeColor(mode, source, 'surfaceColor'));
    set('--ink', pickThemeColor(mode, source, 'textColor'));
    set('--danger', source.dangerColor || defaults.dangerColor);
  };
  const onSystemChange = () => apply(window.TATheme.current || window.TACompany?.current || defaults);
  media()?.addEventListener?.('change', onSystemChange);
  window.TATheme = { defaults, darkDefaults, apply, resolveMode, current: defaults };
})();
