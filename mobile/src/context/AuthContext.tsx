/**
 * LifeAdmin Mobile Authentication Context & Provider
 * Manages global authentication state, token persistence with SecureStore,
 * automated session restoration, and 401 handling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { AppState } from 'react-native';
import { apiConfig } from '@/services/config';
import { secureStorage } from '@/services/secureStore';
import { authService } from '@/features/auth/services/authService';
import { onboardingService } from '@/features/onboarding/services/onboardingService';
import { companionService } from '@/features/companions/services/companionService';
import { notificationService } from '@/features/reminders/services/notificationService';
import { settingsService } from '@/features/settings/services/settingsService';
import { useAppTheme } from '@/context/ThemeContext';
import { AuthContextType, User } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { applyUserTheme, resetToUnauthenticatedTheme } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Complete logout: clears state, SecureStore, and API client headers
   */
  const logout = useCallback(async () => {
    try {
      if (user?.id) {
        await notificationService.clearAllUserSchedules(user.id);
      } else {
        await notificationService.clearAllUserSchedules();
      }
    } catch (e) {
      console.warn('Error clearing notification schedules on logout:', e);
    }

    try {
      await secureStorage.clearSession();
    } catch (e) {
      console.warn('Error clearing secure storage session:', e);
    } finally {
      await resetToUnauthenticatedTheme().catch(() => {});
      apiConfig.setAuthToken(null);
      setToken(null);
      setUser(null);
      setIsOnboardingCompleted(true);
    }
  }, [user?.id, resetToUnauthenticatedTheme]);

  /**
   * Exit ephemeral demo/guest session: cleans up demo data on server, clears guest caches, then logs out
   */
  const exitGuest = useCallback(async () => {
    try {
      await authService.exitGuestSession();
    } catch (e) {
      console.warn('Server-side demo session cleanup failed:', e);
    } finally {
      await settingsService.clearUserScopedData(user?.id, true, true).catch(() => {});
      await logout();
    }
  }, [logout, user?.id]);

  /**
   * Updates the active user in React state and persistent encrypted cache
   */
  const updateUser = useCallback(async (updates: Partial<User>) => {
    let nextUserRef: User | null = null;
    setUser((prev) => {
      if (!prev) return prev;
      const merged: User = {
        ...prev,
        ...updates,
        aiPreferences: updates.aiPreferences
          ? {
              autoExtract:
                updates.aiPreferences.autoExtract ??
                prev.aiPreferences?.autoExtract ??
                true,
              suggestionsEnabled:
                updates.aiPreferences.suggestionsEnabled ??
                prev.aiPreferences?.suggestionsEnabled ??
                true,
            }
          : prev.aiPreferences,
      };
      nextUserRef = merged;
      return merged;
    });
    if (nextUserRef) {
      await secureStorage.setCachedUser(nextUserRef);
    }
  }, []);

  /**
   * Permanently deletes the authenticated user's account and cleans up all local state
   */
  const deleteAccount = useCallback(async () => {
    const activeUserId = user?.id;
    const isDemoUser = Boolean(user?.isDemo);

    await settingsService.deleteAccount();

    try {
      if (activeUserId) {
        await notificationService.clearAllUserSchedules(activeUserId);
      } else {
        await notificationService.clearAllUserSchedules();
      }
      await settingsService.clearUserScopedData(activeUserId, isDemoUser, true);
      await secureStorage.clearSession();
    } finally {
      await resetToUnauthenticatedTheme().catch(() => {});
      apiConfig.setAuthToken(null);
      setToken(null);
      setUser(null);
      setIsOnboardingCompleted(true);
    }
  }, [user?.id, user?.isDemo, resetToUnauthenticatedTheme]);

  /**
   * Refreshes user profile from the server
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        await secureStorage.setCachedUser(res.user);
        if (res.user.companion) {
          await companionService.saveCompanionState(res.user.id, res.user.companion, false);
        }
        await applyUserTheme(
          res.user.id,
          Boolean(res.user.isDemo),
          res.user.theme,
          true
        );
      }
    } catch (err: any) {
      console.warn('Failed to refresh user profile:', err);
    }
  }, [applyUserTheme]);

  /**
   * Restore existing session from SecureStore on cold start
   */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedToken = await secureStorage.getToken();
        if (!storedToken) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Set token on API configuration
        apiConfig.setAuthToken(storedToken);
        if (isMounted) setToken(storedToken);

        // Optionally load cached user first for immediate UI paint
        const cachedUser = await secureStorage.getCachedUser<User>();
        if (cachedUser && isMounted) {
          setUser(cachedUser);
          await applyUserTheme(
            cachedUser.id,
            Boolean(cachedUser.isDemo),
            cachedUser.theme,
            false
          );
        }

        // Validate token with live backend
        try {
          const res = await authService.getCurrentUser();
          if (isMounted && res?.user) {
            setUser(res.user);
            await secureStorage.setCachedUser(res.user);
            if (res.user.companion) {
              await companionService.saveCompanionState(res.user.id, res.user.companion, false);
            }
            // Check onboarding completion status for hydrated session
            const isGuestUser = Boolean(res.user.isDemo);
            const isCompleted =
              res.user.onboardingCompleted === true ||
              (await onboardingService.isOnboardingCompleted(res.user.id, isGuestUser));
            if (isMounted) {
              setIsOnboardingCompleted(isCompleted);
            }
            await applyUserTheme(
              res.user.id,
              isGuestUser,
              res.user.theme,
              true
            );
          }
        } catch (fetchErr: any) {
          // If token is invalid or expired (401), clear the session
          if (fetchErr?.status === 401) {
            console.log('Session expired or invalid token detected during startup');
            await secureStorage.clearSession();
            await resetToUnauthenticatedTheme().catch(() => {});
            apiConfig.setAuthToken(null);
            if (isMounted) {
              setToken(null);
              setUser(null);
              setIsOnboardingCompleted(true);
            }
          }
        }
      } catch (err) {
        console.warn('Error during session restoration:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [applyUserTheme, resetToUnauthenticatedTheme]);

  /**
   * Focus/Resume synchronization: refreshes user profile and active companion
   * when mobile application returns to active state from background.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && token) {
        refreshUser();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token, refreshUser]);

  /**
   * Listen for 401 Unauthorized signals from API requests (session expired)
   */
  useEffect(() => {
    const unsubscribe = apiConfig.onUnauthorized(() => {
      console.log('[Auth] Received 401 Unauthorized signal. Invalidating session.');
      logout();
      setError('Your session has expired. Please sign in again.');
    });

    return () => {
      unsubscribe();
    };
  }, [logout]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      const { token: newToken, user: userData } = response;

      await secureStorage.setToken(newToken);
      await secureStorage.setCachedUser(userData);
      apiConfig.setAuthToken(newToken);

      if (userData.companion) {
        await companionService.saveCompanionState(userData.id, userData.companion, false);
      }

      // Existing user login: mark onboarding as completed if not previously flagged on this device
      const wasCompleted = await secureStorage.isOnboardingCompleted(userData.id);
      if (!wasCompleted) {
        await secureStorage.setOnboardingCompleted(userData.id, true);
      }

      await applyUserTheme(userData.id, false, userData.theme, true);

      setToken(newToken);
      setUser(userData);
      setIsOnboardingCompleted(true);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Unable to sign in. Please verify your email and password.';
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, [applyUserTheme]);

  /**
   * Register a new account
   */
  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await authService.register({ name, email, password });
      const { token: newToken, user: userData } = response;

      await secureStorage.setToken(newToken);
      await secureStorage.setCachedUser(userData);
      await secureStorage.setOnboardingCompleted(userData.id, false);
      apiConfig.setAuthToken(newToken);

      if (userData.companion) {
        await companionService.saveCompanionState(userData.id, userData.companion, false);
      }

      await applyUserTheme(userData.id, false, userData.theme, true);

      setToken(newToken);
      setUser(userData);
      setIsOnboardingCompleted(false);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Unable to create account. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, [applyUserTheme]);

  /**
   * Start a guest demo session
   */
  const loginAsGuest = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await authService.loginAsGuest();
      const { token: newToken, user: userData } = response;

      await secureStorage.setToken(newToken);
      await secureStorage.setCachedUser(userData);
      apiConfig.setAuthToken(newToken);

      if (userData.companion) {
        await companionService.saveCompanionState(userData.id, userData.companion, false);
      }

      await applyUserTheme(userData.id, true, userData.theme, true);

      const guestCompleted = await secureStorage.isGuestOnboardingCompleted();

      setToken(newToken);
      setUser(userData);
      setIsOnboardingCompleted(guestCompleted);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Unable to start guest demo session.';
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, [applyUserTheme]);

  /**
   * Complete onboarding and transition to dashboard
   */
  const completeOnboarding = useCallback(async (prefs?: any) => {
    if (!user) return;
    try {
      const isGuestUser = Boolean(user.isDemo);
      if (prefs) {
        await onboardingService.completeOnboarding(user.id, prefs, isGuestUser);
      } else {
        await onboardingService.skipOnboarding(user.id, isGuestUser);
      }
    } catch (err) {
      console.warn('Error completing onboarding:', err);
    } finally {
      setIsOnboardingCompleted(true);
    }
  }, [user]);

  /**
   * Skip onboarding
   */
  const skipOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      await onboardingService.skipOnboarding(user.id, Boolean(user.isDemo));
    } finally {
      setIsOnboardingCompleted(true);
    }
  }, [user]);

  /**
   * Restart onboarding manually (e.g. from Settings / More)
   */
  const restartOnboarding = useCallback(() => {
    setIsOnboardingCompleted(false);
  }, []);

  /**
   * Request password reset email
   */
  const forgotPassword = useCallback(async (email: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await authService.forgotPassword(email);
      return response;
    } catch (err: any) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Failed to process password reset request. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(async (token: string, password: string, confirmPassword: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await authService.resetPassword(token, { password, confirmPassword });
      return response;
    } catch (err: any) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Failed to reset password. The token may be invalid or expired.';
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const isGuest = useMemo(() => Boolean(user?.isDemo), [user?.isDemo]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticating,
      error,
      isGuest,
      isOnboardingCompleted,
      completeOnboarding,
      skipOnboarding,
      restartOnboarding,
      login,
      register,
      loginAsGuest,
      logout,
      exitGuest,
      forgotPassword,
      resetPassword,
      clearError,
      refreshUser,
      updateUser,
      deleteAccount,
    }),
    [
      user,
      token,
      isLoading,
      isAuthenticating,
      error,
      isGuest,
      isOnboardingCompleted,
      completeOnboarding,
      skipOnboarding,
      restartOnboarding,
      login,
      register,
      loginAsGuest,
      logout,
      exitGuest,
      forgotPassword,
      resetPassword,
      clearError,
      refreshUser,
      updateUser,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
