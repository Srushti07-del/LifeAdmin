import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { saveCompanionStorage } from '../lib/companions';
import type { CompanionState } from '../lib/companions';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  defaultReminderTiming: number[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: string[];
  aiPreferences: { autoExtract: boolean; suggestionsEnabled: boolean };
  subscriptionTier: 'free' | 'premium' | 'premium_ai';
  preferredCurrency: string;
  companion?: CompanionState;
  isDemo?: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  notificationTypes: {
    tasks: boolean;
    bills: boolean;
    appointments: boolean;
    reminders: boolean;
  };
  emailReminderIntervals: number[];
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialTheme(): 'light' | 'dark' | 'system' {
  try {
    const saved = localStorage.getItem('lifeadmin_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'light';
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else if (theme === 'light') {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lifeadmin_token'));
  const [loading, setLoading] = useState(true);

  // Apply theme on mount and when user changes
  useEffect(() => {
    const activeTheme = user?.theme || getInitialTheme();
    applyTheme(activeTheme);
  }, [user?.theme]);

  // Listen for OS system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const activeTheme = user?.theme || getInitialTheme();
      if (activeTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user?.theme]);

  // Fetch user on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        if (res.data.user.companion) {
          saveCompanionStorage(res.data.user.companion, false);
        }
        applyTheme(res.data.user.theme || 'system');
      } catch {
        localStorage.removeItem('lifeadmin_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  // Cross-device focus synchronization: re-sync user & companion when browser tab gains focus
  useEffect(() => {
    const handleSyncOnFocus = () => {
      if (token && document.visibilityState === 'visible') {
        api.get('/auth/me').then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            if (res.data.user.companion) {
              saveCompanionStorage(res.data.user.companion, false);
            }
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', handleSyncOnFocus);

    return () => {
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('lifeadmin_token', newToken);
    if (userData.companion) {
      saveCompanionStorage(userData.companion, false);
    }
    setToken(newToken);
    setUser(userData);
    // Force light theme on login to avoid a dark-mode flash on the Dashboard.
    // Users can still switch to Dark Mode manually afterward via Settings.
    applyTheme('light');
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('lifeadmin_token', newToken);
    if (userData.companion) {
      saveCompanionStorage(userData.companion, false);
    }
    setToken(newToken);
    setUser(userData);
    // Force light theme on register to avoid a dark-mode flash on the Dashboard.
    applyTheme('light');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lifeadmin_token');
    localStorage.removeItem('lifeadmin_companion_state');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const setThemeCallback = useCallback((theme: 'light' | 'dark' | 'system') => {
    try {
      localStorage.setItem('lifeadmin_theme', theme);
    } catch {}
    applyTheme(theme);
    setUser((prev) => prev ? { ...prev, theme } : null);
    if (token) {
      api.put('/auth/profile', { theme }).catch(() => {});
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        setTheme: setThemeCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
