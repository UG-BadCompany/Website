import { state } from './state.js';

export const defaultTheme = {
  mode: 'system',
  primary: '#2563eb',
  accent: '#14b8a6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  border: '#cbd5e1',
  button: '#2563eb',
  buttonText: '#ffffff',
  sidebarBackground: '#0f172a',
  sidebarText: '#e2e8f0',
  sidebarActiveBackground: '#1d4ed8',
  sidebarActiveText: '#ffffff',
  sidebarHoverBackground: '#1e293b',
  mobileNavBackground: '#ffffff',
  mobileNavActive: '#2563eb',
  mobileNavText: '#334155',
};

export function cssVarName(key) {
  return `--${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
}

export function resolveThemeMode(mode) {
  if (mode === 'system') {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode || 'light';
}

export function applyTheme(themePatch = {}) {
  state.theme = { ...defaultTheme, ...state.theme, ...themePatch };
  document.documentElement.dataset.theme = resolveThemeMode(state.theme.mode);
  Object.entries(state.theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(cssVarName(key), value);
  });
  localStorage.setItem('theme', JSON.stringify(state.theme));
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if ((state.theme.mode || 'system') === 'system') applyTheme({});
});
