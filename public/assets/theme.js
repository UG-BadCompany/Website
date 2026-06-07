(function () {
  const defaults = { mode: 'system', primary: '#2563eb', accent: '#f97316', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', border: '#cbd5e1', button: '#2563eb', buttonText: '#ffffff', customSidebar: false, sidebarBackground: '#0f172a', sidebarText: '#e2e8f0', sidebarActiveBackground: '#1d4ed8', sidebarActiveText: '#ffffff', sidebarHoverBackground: '#1e293b', customMobileNav: false, mobileNavBackground: '#ffffff', mobileNavActive: '#2563eb', mobileNavText: '#0f172a' };
  function readSaved() { try { return JSON.parse(localStorage.getItem('ta-theme') || 'null') || {}; } catch { return {}; } }
  function effective(theme) {
    const mode = theme.mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme.mode;
    if (mode === 'dark') return { ...defaults, background: '#020617', surface: '#0f172a', text: '#e2e8f0', border: '#334155', mobileNavBackground: '#0f172a', mobileNavText: '#e2e8f0', ...theme };
    return { ...defaults, ...theme };
  }
  window.TATheme = {
    defaults,
    apply(theme) {
      const t = effective({ ...defaults, ...(theme || readSaved()) });
      const root = document.documentElement;
      root.dataset.themeMode = theme?.mode || readSaved().mode || defaults.mode;
      for (const [key, value] of Object.entries(t)) root.style.setProperty(`--${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, value);
      root.style.setProperty('--sidebar-background-effective', t.customSidebar ? t.sidebarBackground : t.surface);
      root.style.setProperty('--sidebar-text-effective', t.customSidebar ? t.sidebarText : t.text);
      root.style.setProperty('--sidebar-active-background-effective', t.customSidebar ? t.sidebarActiveBackground : t.primary);
      root.style.setProperty('--sidebar-active-text-effective', t.customSidebar ? t.sidebarActiveText : '#ffffff');
      root.style.setProperty('--mobile-nav-background-effective', t.customMobileNav ? t.mobileNavBackground : t.surface);
      root.style.setProperty('--mobile-nav-active-effective', t.customMobileNav ? t.mobileNavActive : t.primary);
      root.style.setProperty('--mobile-nav-text-effective', t.customMobileNav ? t.mobileNavText : t.text);
      return t;
    },
    save(theme) { localStorage.setItem('ta-theme', JSON.stringify(theme)); this.apply(theme); }
  };
  window.TATheme.apply();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => window.TATheme.apply()); } catch {}
})();
