/**
 * LifeAdmin Mobile Typography
 * Source of truth: docs/DESIGN_SYSTEM.md §2
 */

import { Platform } from 'react-native';

export const Typography = {
  fontFamilies: {
    // Editorial headings (DM Serif Display fallback to serif)
    editorial: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    // Body & Interface (Inter fallback to system sans-serif)
    sans: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'sans-serif',
    }),
    mono: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 36,
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.5,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
