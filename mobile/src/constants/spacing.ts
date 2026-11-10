/**
 * LifeAdmin Mobile Spacing & Layout Tokens
 * Synchronized with Website Authority (client/src/index.css & root DESIGN.md)
 */

import { Platform } from 'react-native';

export const Spacing = {
  zero: 0,
  half: 2,
  one: 4,     // space-1 (micro)
  two: 8,     // space-2 (compact elements, button padding)
  three: 12,  // space-3 (input padding, list item spacing)
  four: 16,   // space-4 (card padding, mobile gutters)
  five: 20,   // space-5 (desktop card padding, prominent gaps)
  six: 24,    // space-6 (modal padding, section gap)
  seven: 32,  // space-8 (desktop header spacing)
  eight: 40,  // space-10
  nine: 48,   // space-12 (page vertical rhythm)
  ten: 64,    // space-16 (editorial separation)
} as const;

export const Radius = {
  none: 0,
  xs: 4,
  sm: 6,      // Pills, compact tags, badge indicators
  md: 8,      // Compact controls, small inputs
  lg: 12,     // Standard buttons, form fields, dropdowns
  xl: 16,     // Primary cards, task containers, panels
  '2xl': 24,  // Bottom sheet modal top corners, featured banners
  full: 9999, // Circular avatars, full pills, urgency chips
} as const;

export const Layout = {
  maxContentWidth: 768,
  bottomTabHeight: Platform.select({ ios: 64, android: 72 }) ?? 72,
  bottomTabInset: Platform.select({ ios: 50, android: 80 }) ?? 80,
  headerHeight: Platform.select({ ios: 54, android: 56 }) ?? 56,
} as const;
