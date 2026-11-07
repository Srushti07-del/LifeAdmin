/**
 * LifeAdmin Mobile Spacing & Layout Tokens
 * Source of truth: docs/DESIGN_SYSTEM.md §3 & UI_UX_SPEC.md
 */

import { Platform } from 'react-native';

export const Spacing = {
  zero: 0,
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export const Layout = {
  maxContentWidth: 768,
  bottomTabHeight: Platform.select({ ios: 64, android: 72 }) ?? 72,
  bottomTabInset: Platform.select({ ios: 50, android: 80 }) ?? 80,
  headerHeight: Platform.select({ ios: 54, android: 56 }) ?? 56,
} as const;
