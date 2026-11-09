/**
 * LifeAdmin Mobile Theme Bridge
 * Synchronized with Website Authority (client/src/index.css & root DESIGN.md)
 */

import '@/global.css';
import { Colors as CanonicalColors, ThemeColors, ThemeType } from './colors';
import { Spacing as CanonicalSpacing, Radius as CanonicalRadius, Layout as CanonicalLayout } from './spacing';
import { Typography } from './typography';
import { createShadow as canonicalCreateShadow, ShadowLevel } from './shadows';

export const Colors = CanonicalColors;
export type { ThemeColors, ThemeType };
export type ThemeColor = keyof ThemeColors;

export const Fonts = {
  sans: Typography.fontFamilies.sans,
  sansMedium: Typography.fontFamilies.sansMedium,
  sansSemiBold: Typography.fontFamilies.sansSemiBold,
  sansBold: Typography.fontFamilies.sansBold,
  serif: Typography.fontFamilies.editorial,
  editorial: Typography.fontFamilies.editorial,
  mono: Typography.fontFamilies.mono,
};

export const Spacing = CanonicalSpacing;
export const Radius = CanonicalRadius;
export const Layout = CanonicalLayout;

export const BottomTabInset = CanonicalLayout.bottomTabInset;
export const MaxContentWidth = CanonicalLayout.maxContentWidth;
export const createShadow = canonicalCreateShadow;
export type { ShadowLevel };
