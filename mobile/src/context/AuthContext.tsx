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
import { apiConfig } from '@/services/config';
import { secureStorage } from '@/services/secureStore';
import { authService } from '@/features/auth/services/authService';
import { AuthContextType, User } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Complete logout: clears state, SecureStore, and API client headers
   */
  const logout = useCallback(async () => {
    try {
      await secureStorage.clearSession();
    } catch (e) {
      console.warn('Error clearing secure storage session:', e);
    } finally {
      apiConfig.setAuthToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  /**
   * Exit ephemeral demo/guest session: cleans up demo data on server, then logs out
   */
  const exitGuest = useCallback(async () => {
    try {
      await authService.exitGuestSession();
    } catch (e) {
      console.warn('Server-side demo session cleanup failed:', e);
    } finally {
      await logout();
    }
  }, [logout]);

  /**
   * Refreshes user profile from the server
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
        await secureStorage.setCachedUser(res.user);
      }
    } catch (err: any) {
      console.warn('Failed to refresh user profile:', err);
    }
  }, []);

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
        }

        // Validate token with live backend
        try {
          const res = await authService.getCurrentUser();
          if (isMounted && res?.user) {
            setUser(res.user);
            await secureStorage.setCachedUser(res.user);
          }
        } catch (fetchErr: any) {
          // If token is invalid or expired (401), clear the session
          if (fetchErr?.status === 401) {
            console.log('Session expired or invalid token detected during startup');
            await secureStorage.clearSession();
            apiConfig.setAuthToken(null);
            if (isMounted) {
              setToken(null);
              setUser(null);
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
  }, []);

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

      setToken(newToken);
      setUser(userData);
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
  }, []);

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
      apiConfig.setAuthToken(newToken);

      setToken(newToken);
      setUser(userData);
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
  }, []);

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

      setToken(newToken);
      setUser(userData);
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
      login,
      register,
      loginAsGuest,
      logout,
      exitGuest,
      forgotPassword,
      resetPassword,
      clearError,
      refreshUser,
    }),
    [
      user,
      token,
      isLoading,
      isAuthenticating,
      error,
      isGuest,
      login,
      register,
      loginAsGuest,
      logout,
      exitGuest,
      forgotPassword,
      resetPassword,
      clearError,
      refreshUser,
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
