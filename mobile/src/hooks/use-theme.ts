/**
 * Theme hook referencing LifeAdmin Ocean Teal and Deep Ocean Blue tokens
 * Synchronized with Website Authority
 */

import { Colors, ThemeColors, ThemeType } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const theme: ThemeType = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}

export function useThemeMode(): ThemeType {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useIsDark(): boolean {
  const scheme = useColorScheme();
  return scheme === 'dark';
}
