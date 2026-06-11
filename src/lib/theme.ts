import type { ThemeMode } from '../types/domain';
import { loadJson, saveJson } from './storage';

const defaultTheme = { mode: 'system' as ThemeMode, accent: '#0f766e', radius: '18px' };
export type ThemeSettings = typeof defaultTheme;

export function getTheme() { return loadJson<ThemeSettings>('contractoros.theme', defaultTheme); }
export function saveTheme(theme: ThemeSettings) { saveJson('contractoros.theme', theme); applyTheme(theme); }
export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolved = theme.mode === 'system' ? (prefersDark ? 'dark' : 'light') : theme.mode;
  root.dataset.theme = resolved;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--radius', theme.radius);
}
