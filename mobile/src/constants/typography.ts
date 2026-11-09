/**
 * LifeAdmin Mobile Typography
 * Bundles DM Serif Display & Inter fonts matching website authority
 */

import { Platform } from 'react-native';

export const Typography = {
  fontFamilies: {
    // Editorial headings (DM Serif Display 400 Regular)
    editorial: 'DMSerifDisplay_400Regular',

    // Inter UI & body text variants
    sansLight: 'Inter_300Light',
    sans: 'Inter_400Regular',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    sansBold: 'Inter_700Bold',

    // Monospace for tabular currency & IDs
    mono: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  fontSize: {
    micro: 11,
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
    micro: 14,
    tight: 1.2,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.5,
  },

  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
