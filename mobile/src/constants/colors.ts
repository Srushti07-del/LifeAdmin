/**
 * LifeAdmin Mobile Color Palette
 * Source of truth: docs/DESIGN_SYSTEM.md
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated?: string;
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
  // Light Theme (Ocean Teal)
  light: {
    background: '#E7F3F1',
    surface: '#FFFFFF',
    surfaceSecondary: '#D3EAE7',
    primary: '#168F91',
    primaryDeep: '#106F71',
    primarySoft: '#D3EAE7',
    text: '#183B3D',
    textSecondary: '#587477',
    textMuted: '#789598',
    border: '#D0E2DF',
    borderSubtle: '#E2ECE9',
    backgroundElement: '#E2EFE9',
    backgroundSelected: '#D3EAE7',
    card: '#FFFFFF',
    notification: '#EF4444',
  } satisfies ThemeColors,

  // Dark Theme (Deep Ocean Blue + Teal)
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

  // Functional Urgency Palette (Source: docs/DESIGN_SYSTEM.md §1.1)
  urgency: {
    critical: {
      accent: '#EF4444',
      lightBg: '#FEE2E2',
      lightText: '#B91C1C',
      darkBg: '#5C2828',
      darkText: '#FFD2D2',
    },
    urgent: {
      accent: '#F97316',
      lightBg: '#FFEDD5',
      lightText: '#C2410C',
      darkBg: '#5A2C14',
      darkText: '#FFDEC7',
    },
    dueSoon: {
      accent: '#F59E0B',
      lightBg: '#FEF3C7',
      lightText: '#B45309',
      darkBg: '#54390E',
      darkText: '#FFE8AD',
    },
    upcoming: {
      accent: '#69BDB7',
      lightBg: '#D3EAE7',
      lightText: '#168F91',
      darkBg: '#285D63',
      darkText: '#8EE0D9',
    },
    completed: {
      accent: '#10B981',
      lightBg: '#DCFCE7',
      lightText: '#15803D',
      darkBg: '#1D4F40',
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
