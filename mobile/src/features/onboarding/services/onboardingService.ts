/**
 * LifeAdmin Mobile Onboarding Service
 * Manages onboarding completion persistence, user preference syncing with backend,
 * and companion initialization.
 * 
 * Works seamlessly across authenticated registered users and guest sessions.
 */

import { secureStorage } from '@/services/secureStore';
import { authService } from '@/features/auth/services/authService';
import { companionService } from '@/features/companions/services/companionService';
import {
  OnboardingPreferences,
  DEFAULT_ONBOARDING_PREFERENCES,
  INITIAL_ONBOARDING_PREFERENCES,
  SENSIBLE_DEFAULT_CATEGORIES,
} from '../types';

const ONBOARDING_PREFS_KEY = 'lifeadmin_onboarding_prefs_';

export const onboardingService = {
  /**
   * Checks whether onboarding has been completed for a user ID
   */
  async isOnboardingCompleted(userId: string, isGuest: boolean = false): Promise<boolean> {
    if (isGuest) {
      return secureStorage.isGuestOnboardingCompleted();
    }
    return secureStorage.isOnboardingCompleted(userId);
  },

  /**
   * Retrieves any in-progress or stored onboarding preferences.
   * Preserves returning users' existing categories.
   * New users start fresh with zero selected domains.
   */
  async getStoredPreferences(userId: string): Promise<OnboardingPreferences> {
    try {
      const key = `${ONBOARDING_PREFS_KEY}${userId}`;
      const saved = await secureStorage.getCustomData<OnboardingPreferences>(key);
      if (saved) {
        return saved;
      }

      // Check if returning user already has saved categories on their profile
      const cachedUser = await secureStorage.getCachedUser<{
        id?: string;
        categories?: string[];
        notificationsEnabled?: boolean;
        defaultReminderTiming?: number[];
      }>();

      if (
        cachedUser &&
        cachedUser.id === userId &&
        Array.isArray(cachedUser.categories) &&
        cachedUser.categories.length > 0
      ) {
        return {
          categories: cachedUser.categories,
          notificationsEnabled: cachedUser.notificationsEnabled ?? true,
          defaultReminderTiming: cachedUser.defaultReminderTiming ?? [7, 3, 1, 0],
          preferredCurrency: 'INR',
          companionId: 'aura',
          companionName: 'Aura',
        };
      }

      // First-time onboarding user starts with no domains selected
      return INITIAL_ONBOARDING_PREFERENCES;
    } catch {
      return INITIAL_ONBOARDING_PREFERENCES;
    }
  },

  /**
   * Persists in-progress preferences
   */
  async saveStoredPreferences(userId: string, prefs: OnboardingPreferences): Promise<void> {
    try {
      const key = `${ONBOARDING_PREFS_KEY}${userId}`;
      await secureStorage.setCustomData(key, prefs);
    } catch (err) {
      console.warn('[OnboardingService] Failed to persist in-progress preferences:', err);
    }
  },

  /**
   * Completes onboarding: syncs preferences to backend (if registered),
   * initializes the chosen LifeBuddy companion, and marks onboarding complete.
   */
  async completeOnboarding(
    userId: string,
    prefs: OnboardingPreferences,
    isGuest: boolean = false
  ): Promise<void> {
    // Ensure final categories default sensibly if empty
    const finalCategories =
      prefs.categories && prefs.categories.length > 0
        ? prefs.categories
        : SENSIBLE_DEFAULT_CATEGORIES;

    const finalPrefs: OnboardingPreferences = {
      ...prefs,
      categories: finalCategories,
    };

    const companionInitialState = {
      activeId: finalPrefs.companionId,
      customName: finalPrefs.companionName.trim() || 'Aura',
      xp: 150,
      level: 1,
      growthStage: 'Sprout' as const,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };

    // 1. Sync settings and companion to backend for registered accounts
    if (!isGuest) {
      try {
        await authService.updateSettings({
          categories: finalPrefs.categories,
          notificationsEnabled: finalPrefs.notificationsEnabled,
          defaultReminderTiming: finalPrefs.defaultReminderTiming,
          preferredCurrency: finalPrefs.preferredCurrency,
          companion: companionInitialState,
        });
      } catch (networkError) {
        // Graceful fallback: Network failure does not block local onboarding completion
        console.warn('[OnboardingService] Could not sync settings to backend, saving locally:', networkError);
      }
    }

    // 2. Initialize and persist selected LifeBuddy companion locally
    try {
      await companionService.saveCompanionState(userId, companionInitialState, false);
    } catch (err) {
      console.warn('[OnboardingService] Failed to save companion state:', err);
    }

    // 3. Mark onboarding completed in hardware-backed SecureStore
    if (isGuest) {
      await secureStorage.setGuestOnboardingCompleted(true);
      await secureStorage.setOnboardingCompleted(userId, true);
    } else {
      await secureStorage.setOnboardingCompleted(userId, true);
    }

    // 4. Save final preferences copy
    await this.saveStoredPreferences(userId, finalPrefs);
  },

  /**
   * Skips onboarding: applies sensible defaults without requiring manual selection.
   * Ensures returning users' existing saved preferences are never overwritten.
   */
  async skipOnboarding(userId: string, isGuest: boolean = false): Promise<void> {
    const existing = await this.getStoredPreferences(userId);
    const hasExistingCategories = Boolean(
      existing && Array.isArray(existing.categories) && existing.categories.length > 0
    );
    const prefsToApply = hasExistingCategories
      ? existing
      : DEFAULT_ONBOARDING_PREFERENCES;

    await this.completeOnboarding(userId, prefsToApply, isGuest);
  },
};

export default onboardingService;

