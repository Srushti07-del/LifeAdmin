/**
 * LifeAdmin Mobile Theme Context
 * Connects system appearance + persisted per-user preference to Ocean Teal & Deep Ocean Blue tokens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { Colors, ThemeColors, ThemeType } from '@/constants/colors';
import { settingsService } from '@/features/settings/services/settingsService';
import {
  getSettingsStorageScope,
  isValidThemeMode,
  resolveScopedTheme,
} from '@/features/settings/services/settingsCalculations';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  themePreference: ThemePreference;
  activeTheme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  setThemePreference: (
    preference: ThemePreference,
    options?: { synced?: boolean }
  ) => void;
  applyUserTheme: (
    userId?: string | null,
    isGuest?: boolean,
    serverTheme?: ThemePreference | null,
    preferServerWhenSynced?: boolean
  ) => Promise<void>;
  resetToUnauthenticatedTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  const activeScopeRef = useRef<{ userId?: string | null; isGuest: boolean; scopeKey: string }>({
    userId: null,
    isGuest: false,
    scopeKey: 'default',
  });
  const hasExplicitChangeInScopeRef = useRef(false);

  // Cold-start hydration from last active device theme before auth finishes loading
  useEffect(() => {
    let mounted = true;
    settingsService.loadLastThemePreference().then((saved) => {
      if (mounted && saved && !hasExplicitChangeInScopeRef.current) {
        setThemePreferenceState(saved);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setThemePreference = useCallback(
    (preference: ThemePreference, options?: { synced?: boolean }) => {
      if (!isValidThemeMode(preference)) return;
      hasExplicitChangeInScopeRef.current = true;
      setThemePreferenceState(preference);

      const { userId, isGuest } = activeScopeRef.current;
      settingsService
        .saveScopedThemePreference(preference, Boolean(options?.synced), userId, isGuest)
        .catch(() => {});
    },
    []
  );

  const applyUserTheme = useCallback(
    async (
      userId?: string | null,
      isGuest: boolean = false,
      serverTheme?: ThemePreference | null,
      preferServerWhenSynced: boolean = true
    ) => {
      const nextScopeKey = getSettingsStorageScope(userId, isGuest);
      const scopeChanged = nextScopeKey !== activeScopeRef.current.scopeKey;

      activeScopeRef.current = { userId, isGuest, scopeKey: nextScopeKey };
      if (scopeChanged) {
        hasExplicitChangeInScopeRef.current = false;
      }

      if (!scopeChanged && hasExplicitChangeInScopeRef.current) {
        return;
      }

      const savedScoped = await settingsService.loadScopedThemeRecord(userId, isGuest);
      const effective = resolveScopedTheme(savedScoped, serverTheme, preferServerWhenSynced);

      if (scopeChanged || !hasExplicitChangeInScopeRef.current) {
        setThemePreferenceState(effective);
        await settingsService.saveScopedThemePreference(
          effective,
          preferServerWhenSynced && Boolean(serverTheme),
          userId,
          isGuest
        );
      }
    },
    []
  );

  const resetToUnauthenticatedTheme = useCallback(async () => {
    activeScopeRef.current = { userId: null, isGuest: false, scopeKey: 'default' };
    hasExplicitChangeInScopeRef.current = false;
    setThemePreferenceState('system');
    await settingsService.saveScopedThemePreference('system', false, null, false);
  }, []);

  const activeTheme: ThemeType = useMemo(() => {
    if (themePreference === 'system') {
      return deviceColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themePreference;
  }, [themePreference, deviceColorScheme]);

  const colors = useMemo(
    () => (activeTheme === 'dark' ? Colors.dark : Colors.light),
    [activeTheme]
  );

  // Sync native Android/iOS root window background seamlessly on theme change
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = activeTheme === 'dark';
    return {
      themePreference,
      activeTheme,
      colors,
      isDark,
      setThemePreference,
      applyUserTheme,
      resetToUnauthenticatedTheme,
    };
  }, [
    themePreference,
    activeTheme,
    colors,
    setThemePreference,
    applyUserTheme,
    resetToUnauthenticatedTheme,
  ]);

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
