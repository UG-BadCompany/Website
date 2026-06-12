import type { ThemeMode } from '../types/domain';
import { generateDesignTokens, type GlobalDesignSettings } from './homepage-builder';
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
  | 'commercial_blue'
  | 'premium_black'
  | 'contractor_dark'
  | 'industrial_gray'
  | 'modern_blue'
  | 'high_contrast';

export type ThemeSettings = {
  mode: ThemeMode;
  presetId: ThemePresetId;
  custom: ThemePalette;
};

export const themePresets: Record<ThemePresetId, { name: string; description: string; palette: ThemePalette }> = {
  contractoros_default: {
    name: 'ContractorOS Default (Legacy)',
    description: 'Legacy alias for Modern Blue.',
    palette: {
      primary: '#0f5fff', secondary: '#0b1f3a', accent: '#19c2ff', background: '#f5f9ff', surface: '#ffffff', sidebar: '#ffffff',
      text: '#0f172a', mutedText: '#64748b', border: '#dbe3ef', success: '#16a34a', warning: '#d97706', danger: '#dc2626',
      buttonRadius: '999px', cardRadius: '18px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  modern_blue: {
    name: 'Modern Blue',
    description: 'Premium blue field-service palette for high-converting contractor sites.',
    palette: {
      primary: '#0f5fff', secondary: '#0b1f3a', accent: '#19c2ff', background: '#f5f9ff', surface: '#ffffff', sidebar: '#ffffff',
      text: '#0f172a', mutedText: '#64748b', border: '#dbe3ef', success: '#16a34a', warning: '#d97706', danger: '#dc2626',
      buttonRadius: '999px', cardRadius: '18px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  contractor_dark: {
    name: 'Contractor Dark',
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
  industrial_gray: {
    name: 'Industrial Gray',
    description: 'Steel, graphite, and safety-yellow accents.',
    palette: {
      primary: '#475569', secondary: '#1f2937', accent: '#eab308', background: '#e2e8f0', surface: '#f8fafc', sidebar: '#cbd5e1',
      text: '#0f172a', mutedText: '#475569', border: '#94a3b8', success: '#166534', warning: '#a16207', danger: '#991b1b',
      buttonRadius: '8px', cardRadius: '12px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },

  commercial_blue: {
    name: 'Commercial Blue',
    description: 'Enterprise commercial contractor blue with bright action accents.',
    palette: {
      primary: '#1d4ed8', secondary: '#0f172a', accent: '#38bdf8', background: '#eff6ff', surface: '#ffffff', sidebar: '#dbeafe',
      text: '#0f172a', mutedText: '#475569', border: '#bfdbfe', success: '#15803d', warning: '#ca8a04', danger: '#b91c1c',
      buttonRadius: '14px', cardRadius: '18px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  premium_black: {
    name: 'Premium Black',
    description: 'Luxury black and gold visual system for premium home services.',
    palette: {
      primary: '#d4af37', secondary: '#020617', accent: '#f59e0b', background: '#030712', surface: '#0b1120', sidebar: '#020617',
      text: '#fff7ed', mutedText: '#cbd5e1', border: '#334155', success: '#22c55e', warning: '#f59e0b', danger: '#f87171',
      buttonRadius: '999px', cardRadius: '24px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  industrial_slate: {
    name: 'Industrial Slate (Legacy)',
    description: 'Alias for Industrial Gray for existing installs.',
    palette: {
      primary: '#475569', secondary: '#1f2937', accent: '#eab308', background: '#e2e8f0', surface: '#f8fafc', sidebar: '#cbd5e1',
      text: '#0f172a', mutedText: '#475569', border: '#94a3b8', success: '#166534', warning: '#a16207', danger: '#991b1b',
      buttonRadius: '8px', cardRadius: '12px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    }
  },
  modern_dark: {
    name: 'Modern Dark (Legacy)',
    description: 'Alias for Contractor Dark for existing installs.',
    palette: {
      primary: '#38bdf8', secondary: '#818cf8', accent: '#22d3ee', background: '#020617', surface: '#0f172a', sidebar: '#111827',
      text: '#e5f4ff', mutedText: '#94a3b8', border: '#1e293b', success: '#22c55e', warning: '#f59e0b', danger: '#f87171',
      buttonRadius: '16px', cardRadius: '22px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
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


const presetAliases: Partial<Record<ThemePresetId, GlobalDesignSettings['themePreset']>> = {
  contractoros_default: 'modern_blue',
  modern_dark: 'contractor_dark',
  industrial_slate: 'industrial_gray',
  high_contrast: 'premium_black',
};

const toDesignThemePreset = (presetId: ThemePresetId): GlobalDesignSettings['themePreset'] => {
  const mapped = presetAliases[presetId] ?? presetId;
  return mapped === 'modern_blue' || mapped === 'contractor_dark' || mapped === 'arizona_copper' || mapped === 'industrial_gray' || mapped === 'commercial_blue' || mapped === 'premium_black' || mapped === 'clean_light' ? mapped : 'modern_blue';
};

const paletteToGlobalDesign = (palette: ThemePalette, presetId: ThemePresetId): Partial<GlobalDesignSettings> => ({
  themePreset: toDesignThemePreset(presetId),
  colors: {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    card: palette.surface,
    text: palette.text,
    background: palette.background,
    muted: palette.mutedText,
  },
  radius: palette.cardRadius,
  shadow: '0 22px 60px color-mix(in srgb, var(--site-secondary) 16%, transparent)',
  typography: { headingStyle: palette.fontFamily, bodyStyle: palette.fontFamily },
  buttons: { style: palette.buttonRadius === '999px' ? 'pill' : 'rounded' },
  cards: { style: 'raised' },
});

const lightPalette = themePresets.clean_light.palette;
const darkPalette = themePresets.contractor_dark.palette;

const defaultTheme: ThemeSettings = {
  mode: 'system',
  presetId: 'modern_blue',
  custom: themePresets.modern_blue.palette,
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
  if (theme.mode === 'preset') return themePresets[theme.presetId]?.palette ?? themePresets.modern_blue.palette;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? darkPalette : lightPalette;
}

export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const resolved = theme.mode === 'system' ? (prefersDark ? 'dark' : 'light') : theme.mode;
  const palette = resolveThemePalette(theme);
  const tokenMap = generateDesignTokens(paletteToGlobalDesign(palette, theme.presetId));

  root.dataset.theme = resolved;
  root.dataset.themeMode = theme.mode;
  Object.entries(tokenMap).forEach(([key, value]) => root.style.setProperty(key, value));

  // Legacy aliases remain as read-throughs to the single generated token map so older modules,
  // emails, and app surfaces inherit the same Theme/Branding color source of truth.
  root.style.setProperty('--primary', tokenMap['--site-primary']);
  root.style.setProperty('--secondary', tokenMap['--site-secondary']);
  root.style.setProperty('--accent', tokenMap['--site-accent']);
  root.style.setProperty('--bg', tokenMap['--site-background']);
  root.style.setProperty('--card', tokenMap['--surface-card']);
  root.style.setProperty('--surface', tokenMap['--surface-card']);
  root.style.setProperty('--surface-muted', tokenMap['--surface-section-alt']);
  root.style.setProperty('--sidebar', tokenMap['--surface-sidebar']);
  root.style.setProperty('--text', tokenMap['--site-text']);
  root.style.setProperty('--muted', tokenMap['--site-muted']);
  root.style.setProperty('--line', tokenMap['--site-border']);
  root.style.setProperty('--border', tokenMap['--site-border']);
  root.style.setProperty('--success', tokenMap['--site-success']);
  root.style.setProperty('--warning', tokenMap['--site-warning']);
  root.style.setProperty('--danger', tokenMap['--site-danger']);
  root.style.setProperty('--button-radius', palette.buttonRadius);
  root.style.setProperty('--radius', tokenMap['--site-radius']);
  root.style.setProperty('--font-family', palette.fontFamily);
  root.style.setProperty('--site-card', tokenMap['--surface-card']);
  root.style.setProperty('--site-muted', tokenMap['--site-muted']);
}


