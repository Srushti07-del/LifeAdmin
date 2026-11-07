/**
 * LifeAdmin Mobile Theme Context
 * Connects the system appearance to LifeAdmin's Ocean Teal & Deep Ocean Blue design tokens.
 */

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { Colors, ThemeColors, ThemeType } from '@/constants/colors';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  themePreference: ThemePreference;
  activeTheme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const activeTheme: ThemeType = useMemo(() => {
    if (themePreference === 'system') {
      return deviceColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themePreference;
  }, [themePreference, deviceColorScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = activeTheme === 'dark';
    return {
      themePreference,
      activeTheme,
      colors: isDark ? Colors.dark : Colors.light,
      isDark,
      setThemePreference,
    };
  }, [themePreference, activeTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
