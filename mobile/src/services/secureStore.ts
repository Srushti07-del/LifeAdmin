/**
 * LifeAdmin Mobile Secure Storage Service
 * Uses Expo SecureStore for encrypted hardware-backed key-value storage on Android/iOS,
 * with graceful localStorage fallback for web environments.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'lifeadmin_auth_token';
const USER_KEY = 'lifeadmin_cached_user';

export const secureStorage = {
  /**
   * Retrieves stored JWT authorization token.
   */
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY);
        }
        return null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('[SecureStore] Failed to retrieve auth token:', error);
      return null;
    }
  },

  /**
   * Persists JWT authorization token into encrypted storage.
   */
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
        return;
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.warn('[SecureStore] Failed to save auth token:', error);
    }
  },

  /**
   * Clears stored JWT authorization token.
   */
  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('[SecureStore] Failed to remove auth token:', error);
    }
  },

  /**
   * Retrieves cached user metadata for instant offline/cold-start hydration.
   */
  async getCachedUser<T>(): Promise<T | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(USER_KEY);
        }
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      console.warn('[SecureStore] Failed to parse cached user:', error);
      return null;
    }
  },

  /**
   * Caches user metadata.
   */
  async setCachedUser(user: unknown): Promise<void> {
    try {
      const raw = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(USER_KEY, raw);
        }
        return;
      }
      await SecureStore.setItemAsync(USER_KEY, raw);
    } catch (error) {
      console.warn('[SecureStore] Failed to cache user metadata:', error);
    }
  },

  /**
   * Clears cached user metadata.
   */
  async removeCachedUser(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(USER_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('[SecureStore] Failed to remove cached user:', error);
    }
  },

  /**
   * Complete session purge (token + user data).
   */
  async clearSession(): Promise<void> {
    await Promise.all([this.removeToken(), this.removeCachedUser()]);
  },

  /**
   * Generic key-value retrieval for user preferences & companion states.
   */
  async getCustomData<T>(key: string): Promise<T | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          raw = window.localStorage.getItem(key);
        }
      } else {
        raw = await SecureStore.getItemAsync(key);
      }
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  /**
   * Generic key-value persistence for user preferences & companion states.
   */
  async setCustomData(key: string, data: unknown): Promise<void> {
    try {
      const raw = JSON.stringify(data);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, raw);
        }
        return;
      }
      await SecureStore.setItemAsync(key, raw);
    } catch (error) {
      console.warn(`[SecureStore] Failed to save custom data for ${key}:`, error);
    }
  },

  /**
<<<<<<< HEAD
   * Deletes custom preference/state data by key.
   */
  async removeCustomData(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStore] Failed to remove custom data for ${key}:`, error);
    }
  },

  /**
=======
>>>>>>> origin/main
   * Checks whether onboarding is marked completed for a specific user ID.
   */
  async isOnboardingCompleted(userId: string): Promise<boolean> {
    try {
      const key = `lifeadmin_onboarded_${userId}`;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key) === 'true';
        }
        return false;
      }
      const val = await SecureStore.getItemAsync(key);
      return val === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Sets onboarding completion state for a specific user ID.
   */
  async setOnboardingCompleted(userId: string, completed: boolean = true): Promise<void> {
    try {
      const key = `lifeadmin_onboarded_${userId}`;
      const val = completed ? 'true' : 'false';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, val);
        }
        return;
      }
      await SecureStore.setItemAsync(key, val);
    } catch (error) {
      console.warn('[SecureStore] Failed to set onboarding state:', error);
    }
  },

  /**
   * Checks whether onboarding is marked completed for the guest demo session.
   */
  async isGuestOnboardingCompleted(): Promise<boolean> {
    return this.isOnboardingCompleted('guest');
  },

  /**
   * Sets onboarding completion state for the guest demo session.
   */
  async setGuestOnboardingCompleted(completed: boolean = true): Promise<void> {
    return this.setOnboardingCompleted('guest', completed);
  },
};

export default secureStorage;
