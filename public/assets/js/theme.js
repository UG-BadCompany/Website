(() => {
  const defaults = { primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626', themeMode: 'system' };
  const darkDefaults = { backgroundColor: '#06111f', surfaceColor: '#0f1c2e', textColor: '#e5edf7' };
  const set = (name, value) => document.documentElement.style.setProperty(name, value);
  const resolveMode = (mode = 'system') => mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  const apply = (company = {}) => {
    const mode = resolveMode(company.themeMode || company.defaultTheme || defaults.themeMode);
    document.documentElement.dataset.theme = mode;
    const colorSource = mode === 'dark' ? { ...defaults, ...darkDefaults, ...company } : { ...defaults, ...company };
    set('--color-primary', colorSource.primaryColor || defaults.primaryColor);
    set('--color-accent', colorSource.accentColor || defaults.accentColor);
    set('--color-background', colorSource.backgroundColor || defaults.backgroundColor);
    set('--color-surface', colorSource.surfaceColor || defaults.surfaceColor);
    set('--color-text', colorSource.textColor || defaults.textColor);
    set('--color-button', colorSource.buttonColor || colorSource.primaryColor || defaults.buttonColor);
    set('--color-success', colorSource.successColor || defaults.successColor);
    set('--color-warning', colorSource.warningColor || defaults.warningColor);
    set('--color-danger', colorSource.dangerColor || defaults.dangerColor);
    set('--primary', colorSource.primaryColor || defaults.primaryColor);
    set('--accent', colorSource.accentColor || defaults.accentColor);
    set('--bg', colorSource.backgroundColor || defaults.backgroundColor);
    set('--panel', colorSource.surfaceColor || defaults.surfaceColor);
    set('--ink', colorSource.textColor || defaults.textColor);
    set('--danger', colorSource.dangerColor || defaults.dangerColor);
  };
  window.TATheme = { defaults, apply, resolveMode };
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => window.TACompany?.current && apply(window.TACompany.current));
})();
