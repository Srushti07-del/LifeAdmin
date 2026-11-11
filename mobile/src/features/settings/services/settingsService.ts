/**
 * LifeAdmin Mobile — Settings Persistence & API Sync Service
 * Handles hardware-backed per-user/guest SecureStore isolation, onboarding preference syncing,
 * theme persistence, backend profile/settings updates, export, and account cleanup.
 */

import { secureStorage } from '@/services/secureStore';
import { authService } from '@/features/auth/services/authService';
import { onboardingService } from '@/features/onboarding/services/onboardingService';
import { User } from '@/types/auth';
import { ScopedThemeRecord, SettingsPreferences, ThemeMode } from '../types';
import {
  LAST_THEME_STORAGE_KEY,
  getLocalSettingsStorageKey,
  getSettingsStorageScope,
  getThemeStorageKey,
} from './settingsCalculations';

export const settingsService = {
  async loadLastThemePreference(): Promise<ThemeMode | null> {
    const saved = await secureStorage.getCustomData<ThemeMode | ScopedThemeRecord>(
      LAST_THEME_STORAGE_KEY
    );
    if (saved && typeof saved === 'object') {
      return saved.theme;
    }
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return null;
  },

  async loadScopedThemeRecord(
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<ScopedThemeRecord | ThemeMode | null> {
    const key = getThemeStorageKey(userId, isGuest);
    return secureStorage.getCustomData<ScopedThemeRecord | ThemeMode>(key);
  },

  async saveScopedThemePreference(
    theme: ThemeMode,
    synced: boolean,
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<void> {
    const record: ScopedThemeRecord = {
      theme,
      synced,
      updatedAt: new Date().toISOString(),
    };
    const scopedKey = getThemeStorageKey(userId, isGuest);
    await Promise.all([
      secureStorage.setCustomData(LAST_THEME_STORAGE_KEY, theme),
      userId || isGuest ? secureStorage.setCustomData(scopedKey, record) : Promise.resolve(),
    ]);
  },

  async loadLocalPreferences(
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<Partial<SettingsPreferences> | null> {
    const key = getLocalSettingsStorageKey(userId, isGuest);
    return secureStorage.getCustomData<Partial<SettingsPreferences>>(key);
  },

  async saveLocalPreferences(
    updates: Partial<SettingsPreferences>,
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<void> {
    const key = getLocalSettingsStorageKey(userId, isGuest);
    const existing = (await secureStorage.getCustomData<Partial<SettingsPreferences>>(key)) || {};
    const merged: Partial<SettingsPreferences> = {
      ...existing,
      ...updates,
      aiPreferences: {
        ...(existing.aiPreferences || { autoExtract: true, suggestionsEnabled: true }),
        ...(updates.aiPreferences || {}),
      },
    };
    await secureStorage.setCustomData(key, merged);
  },

  async syncWithOnboardingPreferences(
    userId: string,
    updates: Partial<Pick<SettingsPreferences, 'categories' | 'notificationsEnabled' | 'defaultReminderTiming' | 'preferredCurrency'>>
  ): Promise<void> {
    try {
      const current = await onboardingService.getStoredPreferences(userId);
      await onboardingService.saveStoredPreferences(userId, {
        ...current,
        ...(updates.categories ? { categories: updates.categories } : {}),
        ...(typeof updates.notificationsEnabled === 'boolean'
          ? { notificationsEnabled: updates.notificationsEnabled }
          : {}),
        ...(updates.defaultReminderTiming
          ? { defaultReminderTiming: updates.defaultReminderTiming }
          : {}),
        ...(updates.preferredCurrency
          ? { preferredCurrency: updates.preferredCurrency }
          : {}),
      });
    } catch (err) {
      console.warn('[SettingsService] Failed to sync onboarding preferences:', err);
    }
  },

  async updateProfile(payload: { name: string }): Promise<{ message: string; user: User }> {
    return authService.updateProfile({ name: payload.name });
  },

  async savePreferences(
    updates: Partial<SettingsPreferences>,
    userId?: string | null,
    isGuest: boolean = false
  ): Promise<{ user?: User; syncedRemotely: boolean }> {
    // 1. Always save locally per-user/guest immediately so offline state stays responsive
    await this.saveLocalPreferences(updates, userId, isGuest);
    if (updates.theme) {
      await this.saveScopedThemePreference(updates.theme, false, userId, isGuest);
    }
    if (userId) {
      await this.syncWithOnboardingPreferences(userId, updates);
    }

    // 2. Push supported settings to backend endpoints
    let updatedUser: User | undefined;
    let syncedRemotely = false;

    const settingsPayload: {
      theme?: ThemeMode;
      notificationsEnabled?: boolean;
      defaultReminderTiming?: number[];
      categories?: string[];
      preferredCurrency?: string;
      aiPreferences?: { autoExtract?: boolean; suggestionsEnabled?: boolean };
    } = {};

    if (updates.theme) settingsPayload.theme = updates.theme;
    if (typeof updates.notificationsEnabled === 'boolean') {
      settingsPayload.notificationsEnabled = updates.notificationsEnabled;
    }
    if (updates.defaultReminderTiming) {
      settingsPayload.defaultReminderTiming = updates.defaultReminderTiming;
    }
    if (updates.categories) {
      settingsPayload.categories = updates.categories;
    }
    if (updates.preferredCurrency) {
      settingsPayload.preferredCurrency = updates.preferredCurrency;
    }
    if (updates.aiPreferences) {
      settingsPayload.aiPreferences = updates.aiPreferences;
    }

    if (Object.keys(settingsPayload).length > 0) {
      const res = await authService.updateSettings(settingsPayload);
      updatedUser = res?.user;
      syncedRemotely = true;
      if (updates.theme) {
        await this.saveScopedThemePreference(updates.theme, true, userId, isGuest);
      }
    }

    if (
      typeof updates.quietHoursStart === 'string' &&
      typeof updates.quietHoursEnd === 'string'
    ) {
      const profileRes = await authService.updateAuthProfile({
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
      });
      if (profileRes?.user) {
        updatedUser = { ...(updatedUser || {}), ...profileRes.user };
      }
      syncedRemotely = true;
    }

    return { user: updatedUser, syncedRemotely };
  },

  async requestPasswordResetEmail(email: string): Promise<{ message: string }> {
    return authService.forgotPassword(email);
  },

  async exportUserData(): Promise<Record<string, unknown>> {
    return authService.exportUserData();
  },

  async deleteAccount(): Promise<{ message: string }> {
    return authService.deleteAccount();
  },

  /**
   * Purges local preferences & cached state belonging to the active user or guest session
   * during account deletion or ephemeral guest exit.
   */
  async clearUserScopedData(
    userId?: string | null,
    isGuest: boolean = false,
    resetDeviceLastTheme: boolean = false
  ): Promise<void> {
    const scope = getSettingsStorageScope(userId, isGuest);
    const keysToDelete = [
      getThemeStorageKey(userId, isGuest),
      getLocalSettingsStorageKey(userId, isGuest),
      `lifeadmin_dashboard_layout_${scope}`,
    ];

    if (userId) {
      keysToDelete.push(
        `lifeadmin_onboarding_prefs_${userId}`,
        `lifeadmin_companion_state_${userId}`,
        `lifeadmin_onboarded_${userId}`
      );
    }

    if (isGuest) {
      keysToDelete.push('lifeadmin_onboarded_guest');
    }

    await Promise.all([
      ...keysToDelete.map((k) => secureStorage.removeCustomData(k)),
      resetDeviceLastTheme
        ? secureStorage.setCustomData(LAST_THEME_STORAGE_KEY, 'system')
        : Promise.resolve(),
    ]);
  },
};

export default settingsService;

