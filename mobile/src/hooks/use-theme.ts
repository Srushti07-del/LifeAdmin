/**
 * Theme hook referencing LifeAdmin Ocean Teal and Deep Ocean Blue tokens
 * Synchronized with Website Authority
 */

import { useContext } from 'react';
import { Colors, ThemeColors, ThemeType } from '@/constants/colors';
import ThemeContext from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

function useResolvedThemeState() {
  const context = useContext(ThemeContext);
  const scheme = useColorScheme();
  const fallbackTheme: ThemeType = scheme === 'dark' ? 'dark' : 'light';

  return {
    theme: context ? context.activeTheme : fallbackTheme,
    colors: context ? context.colors : Colors[fallbackTheme],
    isDark: context ? context.isDark : fallbackTheme === 'dark',
  };
}

export function useTheme(): ThemeColors {
  return useResolvedThemeState().colors;
}

export function useThemeMode(): ThemeType {
  return useResolvedThemeState().theme;
}

export function useIsDark(): boolean {
  return useResolvedThemeState().isDark;
}
