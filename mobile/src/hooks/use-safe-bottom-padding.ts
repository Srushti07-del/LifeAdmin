/**
 * LifeAdmin Mobile — Viewport-aware Bottom Padding Hook
 * Clears the native bottom tab bar on compact phones and uses safe-area bottom insets
 * on tablets (drawer/rail) and pushed root-Stack sub-screens.
 */

import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabInset } from '@/constants/theme';
import {
  FAB_SCROLL_CLEARANCE,
  getFabScrollBottomPadding,
  getSafeBottomInset,
} from '@/utils/navigationLayout';

export { FAB_SCROLL_CLEARANCE };

export function useSafeBottomPadding(
  extraSpacing: number,
  isTabScreen: boolean = true,
): number {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return getSafeBottomInset({
    insetsBottom: insets.bottom,
    extraSpacing,
    windowWidth: width,
    isTabScreen,
    bottomTabInset: BottomTabInset,
    platformOS: Platform.OS,
  });
}

export function useFabBottomPadding(
  baseSpacing: number = 24,
  isTabScreen: boolean = true,
): number {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return getFabScrollBottomPadding({
    insetsBottom: insets.bottom,
    baseSpacing,
    windowWidth: width,
    isTabScreen,
    bottomTabInset: BottomTabInset,
    platformOS: Platform.OS,
  });
}

