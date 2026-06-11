import type { ThemeMode } from '../types/domain';
import { loadJson, saveJson } from './storage';

export type ThemeVariableKey =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'sidebar'
  | 'text'
  | 'mutedText'
  | 'border'
  | 'success'
  | 'warning'
  | 'danger';

export type ThemeRadii = {
  buttonRadius: string;
  cardRadius: string;
};

export type ThemePalette = Record<ThemeVariableKey, string> & ThemeRadii & {
  fontFamily: string;
};

export type ThemePresetId =
  | 'contractoros_default'
  | 'modern_dark'
  | 'clean_light'
  | 'arizona_copper'
  | 'industrial_slate'
  | 'high_contrast';

export type ThemeSettings = {
  mode: ThemeMode;
  presetId: ThemePresetId;
  custom: ThemePalette;
};

export const themePresets: Record<ThemePresetId, { name: string; description: string; palette: ThemePalette }> = {
  contractoros_default: {
    name: 'ContractorOS Default',
    description: 'Balanced teal palette for contractor operations.',
    palette: {
      primary: '#0f766e', secondary: '#134e4a', accent: '#14b8a6', background: '#f8fafc', surface: '#ffffff', sidebar: '#ffffff',
      text: '#0f172a', mutedText: '#64748b', border: '#dbe3ef', success: '#16a34a', warning: '#d97706', danger: '#dc2626',
      buttonRadius: '999px', cardRadius: '18px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  modern_dark: {
    name: 'Modern Dark',
    description: 'Deep slate surfaces with electric blue accents.',
    palette: {
      primary: '#38bdf8', secondary: '#818cf8', accent: '#22d3ee', background: '#020617', surface: '#0f172a', sidebar: '#111827',
      text: '#e5f4ff', mutedText: '#94a3b8', border: '#1e293b', success: '#22c55e', warning: '#f59e0b', danger: '#f87171',
      buttonRadius: '16px', cardRadius: '22px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  clean_light: {
    name: 'Clean Light',
    description: 'Bright neutral workspace with soft blue actions.',
    palette: {
      primary: '#2563eb', secondary: '#0f766e', accent: '#60a5fa', background: '#ffffff', surface: '#f8fafc', sidebar: '#f1f5f9',
      text: '#111827', mutedText: '#6b7280', border: '#e5e7eb', success: '#15803d', warning: '#ca8a04', danger: '#b91c1c',
      buttonRadius: '12px', cardRadius: '16px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  arizona_copper: {
    name: 'Arizona Copper',
    description: 'Warm desert copper colors for field service brands.',
    palette: {
      primary: '#b45309', secondary: '#7c2d12', accent: '#f97316', background: '#fff7ed', surface: '#fffbeb', sidebar: '#fed7aa',
      text: '#431407', mutedText: '#9a3412', border: '#fdba74', success: '#15803d', warning: '#d97706', danger: '#be123c',
      buttonRadius: '999px', cardRadius: '20px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  industrial_slate: {
    name: 'Industrial Slate',
    description: 'Steel, graphite, and safety-yellow accents.',
    palette: {
      primary: '#475569', secondary: '#1f2937', accent: '#eab308', background: '#e2e8f0', surface: '#f8fafc', sidebar: '#cbd5e1',
      text: '#0f172a', mutedText: '#475569', border: '#94a3b8', success: '#166534', warning: '#a16207', danger: '#991b1b',
      buttonRadius: '8px', cardRadius: '12px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  high_contrast: {
    name: 'High Contrast',
    description: 'Maximum contrast with bold focus colors.',
    palette: {
      primary: '#ffff00', secondary: '#00ffff', accent: '#ff00ff', background: '#000000', surface: '#0a0a0a', sidebar: '#000000',
      text: '#ffffff', mutedText: '#e5e5e5', border: '#ffffff', success: '#00ff66', warning: '#ffff00', danger: '#ff3333',
      buttonRadius: '6px', cardRadius: '8px', fontFamily: 'Arial, Helvetica, sans-serif'
    }
  }
};

const lightPalette = themePresets.clean_light.palette;
const darkPalette = themePresets.modern_dark.palette;

const defaultTheme: ThemeSettings = {
  mode: 'system',
  presetId: 'contractoros_default',
  custom: themePresets.contractoros_default.palette,
};

export function getTheme() {
  const stored = loadJson<Partial<ThemeSettings> & { accent?: string; radius?: string }>('contractoros.theme', defaultTheme);
  return {
    mode: stored.mode ?? defaultTheme.mode,
    presetId: stored.presetId ?? defaultTheme.presetId,
    custom: {
      ...defaultTheme.custom,
      ...(stored.custom ?? {}),
      ...(stored.accent ? { accent: stored.accent, primary: stored.accent } : {}),
      ...(stored.radius ? { buttonRadius: stored.radius, cardRadius: stored.radius } : {}),
    },
  } satisfies ThemeSettings;
}
export function saveTheme(theme: ThemeSettings) { saveJson('contractoros.theme', theme); applyTheme(theme); }

export function resolveThemePalette(theme = getTheme()): ThemePalette {
  if (theme.mode === 'light') return lightPalette;
  if (theme.mode === 'dark') return darkPalette;
  if (theme.mode === 'custom') return theme.custom;
  if (theme.mode === 'preset') return themePresets[theme.presetId]?.palette ?? themePresets.contractoros_default.palette;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? darkPalette : lightPalette;
}

export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolved = theme.mode === 'system' ? (prefersDark ? 'dark' : 'light') : theme.mode;
  const palette = resolveThemePalette(theme);

  root.dataset.theme = resolved;
  root.dataset.themeMode = theme.mode;
  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--secondary', palette.secondary);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--bg', palette.background);
  root.style.setProperty('--card', palette.surface);
  root.style.setProperty('--sidebar', palette.sidebar);
  root.style.setProperty('--text', palette.text);
  root.style.setProperty('--muted', palette.mutedText);
  root.style.setProperty('--line', palette.border);
  root.style.setProperty('--success', palette.success);
  root.style.setProperty('--warning', palette.warning);
  root.style.setProperty('--danger', palette.danger);
  root.style.setProperty('--button-radius', palette.buttonRadius);
  root.style.setProperty('--radius', palette.cardRadius);
  root.style.setProperty('--font-family', palette.fontFamily);
}
