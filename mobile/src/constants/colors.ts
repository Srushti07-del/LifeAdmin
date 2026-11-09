/**
 * LifeAdmin Mobile Color Palette
 * Synchronized with Website Authority (client/src/index.css & root DESIGN.md)
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  backgroundElement: string;
  backgroundSelected: string;
  card: string;
  notification: string;
}

export const Colors = {
  // Light Theme (Ocean Teal identity, high-contrast WCAG AAA text)
  light: {
    background: '#F5F7F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#E8F2F0',
    surfaceElevated: '#FFFFFF',
    primary: '#087E83',
    primaryDeep: '#066568',
    primarySoft: '#DDF1EF',
    text: '#1D3032',
    textSecondary: '#526967',
    textMuted: '#687F7D',
    border: '#E1E9E6',
    borderSubtle: '#EBF0EE',
    backgroundElement: '#E8F2F0',
    backgroundSelected: '#DDF1EF',
    card: '#FFFFFF',
    notification: '#EF4444',
  } satisfies ThemeColors,

  // Dark Theme (Deep Ocean Blue + Teal — calm, sophisticated, premium)
  dark: {
    background: '#183B4A',
    surface: '#204B5A',
    surfaceSecondary: '#143440',
    surfaceElevated: '#285968',
    primary: '#55BDB5',
    primaryDeep: '#4AA8A1',
    primarySoft: '#285968',
    text: '#F1F7F7',
    textSecondary: '#C5DDDE',
    textMuted: '#A7C5C8',
    border: '#355966',
    borderSubtle: '#2A4E5A',
    backgroundElement: '#204B5A',
    backgroundSelected: '#285968',
    card: '#204B5A',
    notification: '#EF4444',
  } satisfies ThemeColors,

  // Functional Urgency Palette (Calibrated for strict deadline tiers)
  urgency: {
    critical: {
      accent: '#EF4444',
      lightBg: '#FEE2E2',
      lightText: '#B91C1C',
      darkBg: 'rgba(239, 68, 68, 0.18)',
      darkText: '#FFD2D2',
    },
    urgent: {
      accent: '#F97316',
      lightBg: '#FFEDD5',
      lightText: '#C2410C',
      darkBg: 'rgba(249, 115, 22, 0.18)',
      darkText: '#FFDEC7',
    },
    dueSoon: {
      accent: '#F59E0B',
      lightBg: '#FEF3C7',
      lightText: '#B45309',
      darkBg: 'rgba(245, 158, 11, 0.18)',
      darkText: '#FFE8AD',
    },
    upcoming: {
      accent: '#168F91',
      lightBg: '#D3EAE7',
      lightText: '#0E6567',
      darkBg: 'rgba(85, 189, 181, 0.15)',
      darkText: '#8EE0D9',
    },
    completed: {
      accent: '#10B981',
      lightBg: '#DCFCE7',
      lightText: '#15803D',
      darkBg: 'rgba(16, 185, 129, 0.18)',
      darkText: '#A7F3D0',
    },
  },

  // Common UI Accents
  status: {
    info: '#0284C7',
    warning: '#D97706',
    danger: '#DC2626',
    success: '#059669',
  },
} as const;

export type ThemeType = 'light' | 'dark';
