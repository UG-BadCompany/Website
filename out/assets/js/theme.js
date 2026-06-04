(() => {
  const storageKey = 'TAThemeSettings';
  const defaults = {
    primaryColor: '#2563eb', accentColor: '#22c55e', backgroundColor: '#f8fafc', surfaceColor: '#ffffff', textColor: '#0f172a', buttonColor: '#2563eb', successColor: '#16a34a', warningColor: '#f59e0b', dangerColor: '#dc2626', themeMode: 'system', defaultTheme: 'system', enableThemeToggle: true,
  };
  const darkDefaults = { backgroundColor: '#06111f', surfaceColor: '#0f1c2e', textColor: '#e5edf7' };
  let systemUnsubscribe = null;
  const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');
  const set = (name, value) => document.documentElement.style.setProperty(name, value);
  const readStored = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
    catch { return {}; }
  };
  const persist = (settings = {}) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...readStored(), ...settings })); }
    catch {}
  };
  const normalizeMode = (mode = 'system') => ['light', 'dark', 'system'].includes(String(mode)) ? String(mode) : 'system';
  const resolveThemeMode = (themeMode = 'system') => {
    const requested = normalizeMode(themeMode);
    if (requested !== 'system') return requested;
    return media()?.matches ? 'dark' : 'light';
  };
  const pickThemeColor = (mode, source, key) => {
    const value = source[key];
    if (mode === 'dark' && (!value || value === defaults[key]) && darkDefaults[key]) return darkDefaults[key];
    return value || defaults[key];
  };
  const readableBorder = (mode) => mode === 'dark' ? '#2f4360' : '#d9e2ef';
  const readableMuted = (mode) => mode === 'dark' ? '#a5b4c8' : '#64748b';
  const applyCssVariables = (settings = {}) => {
    const requestedMode = normalizeMode(settings.themeMode || settings.defaultTheme || defaults.themeMode);
    const mode = resolveThemeMode(requestedMode);
    const source = { ...defaults, ...settings, themeMode: requestedMode, defaultTheme: normalizeMode(settings.defaultTheme || requestedMode) };
    const background = pickThemeColor(mode, source, 'backgroundColor');
    const surface = pickThemeColor(mode, source, 'surfaceColor');
    const text = pickThemeColor(mode, source, 'textColor');
    const primary = source.primaryColor || defaults.primaryColor;
    const accent = source.accentColor || defaults.accentColor;
    const border = source.borderColor || readableBorder(mode);
    const muted = source.mutedColor || readableMuted(mode);

    set('--color-primary', primary);
    set('--color-accent', accent);
    set('--color-background', background);
    set('--color-surface', surface);
    set('--color-text', text);
    set('--color-muted', muted);
    set('--color-border', border);
    set('--color-button', source.buttonColor || primary || defaults.buttonColor);
    set('--color-success', source.successColor || defaults.successColor);
    set('--color-warning', source.warningColor || defaults.warningColor);
    set('--color-danger', source.dangerColor || defaults.dangerColor);
    set('--primary', primary);
    set('--accent', accent);
    set('--bg', background);
    set('--panel', surface);
    set('--surface', surface);
    set('--ink', text);
    set('--text', text);
    set('--muted', muted);
    set('--line', border);
    set('--danger', source.dangerColor || defaults.dangerColor);
    set('--button-color', source.buttonColor || primary || defaults.buttonColor);
    set('--primary-color', primary);
    set('--accent-color', accent);
    set('--surface-color', surface);
    set('--text-color', text);
    set('--muted-text', muted);
    set('--border-color', border);
    return { source, mode, requestedMode };
  };
  const bindSystemTheme = (settings = {}) => {
    if (systemUnsubscribe) { systemUnsubscribe(); systemUnsubscribe = null; }
    const requestedMode = normalizeMode(settings.themeMode || settings.defaultTheme || defaults.themeMode);
    if (requestedMode !== 'system') return;
    const query = media();
    if (!query) return;
    const listener = () => apply(window.TATheme?.current || settings);
    if (query.addEventListener) {
      query.addEventListener('change', listener);
      systemUnsubscribe = () => query.removeEventListener('change', listener);
    } else if (query.addListener) {
      query.addListener(listener);
      systemUnsubscribe = () => query.removeListener(listener);
    }
  };
  const apply = (settings = {}, options = {}) => {
    const result = applyCssVariables(settings);
    const source = result.source;
    window.TATheme = window.TATheme || {};
    window.TATheme.current = source;
    document.documentElement.dataset.theme = result.mode;
    document.documentElement.dataset.themeMode = result.requestedMode;
    bindSystemTheme(source);
    if (options.persist) persist(source);
    document.dispatchEvent(new CustomEvent('ta:theme-applied', { detail: { settings: source, theme: result.mode, themeMode: result.requestedMode } }));
    return result.mode;
  };
  const stored = readStored();
  window.TATheme = { defaults, darkDefaults, apply, resolveThemeMode, resolveMode: resolveThemeMode, applyCssVariables, bindSystemTheme, persist, readStored, current: { ...defaults, ...stored } };
  if (Object.keys(stored).length) apply(stored);
  window.addEventListener?.('storage', (event) => {
    if (event.key !== storageKey) return;
    apply(readStored());
  });
})();
