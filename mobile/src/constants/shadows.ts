/**
 * LifeAdmin Mobile Shadow & Elevation Tokens
 * Produces crisp, platform-native depth matching website's teal-tinted shadows
 */

import { Platform, ViewStyle } from 'react-native';

export type ShadowLevel = 'xs' | 'card' | 'elevated' | 'modal';

export const createShadow = (
  isDark: boolean,
  level: ShadowLevel
): ViewStyle => {
  const shadowColor = isDark ? '#000000' : '#183B3D';

  switch (level) {
    case 'xs':
      return Platform.select({
        ios: {
          shadowColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
        default: {},
      });

    case 'card':
      return Platform.select({
        ios: {
          shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        default: {},
      });

    case 'elevated':
      return Platform.select({
        ios: {
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 16,
        },
        android: {
          elevation: 4,
        },
        default: {},
      });

    case 'modal':
      return Platform.select({
        ios: {
          shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.45 : 0.16,
          shadowRadius: 24,
        },
        android: {
          elevation: 8,
        },
        default: {},
      });
  }
};

