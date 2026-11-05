import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  defaultReminderTiming: number[];
  categories: string[];
  aiPreferences: { autoExtract: boolean; suggestionsEnabled: boolean };
  subscriptionTier: 'free' | 'premium' | 'premium_ai';
  isDemo?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  exitDemo: () => Promise<void>;
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
  return 'system';
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('lifeadmin_token', newToken);
    setToken(newToken);
    setUser(userData);
    applyTheme(userData.theme || 'system');
  }, []);

  const loginAsGuest = useCallback(async () => {
    const res = await api.post('/auth/guest');
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('lifeadmin_token', newToken);
    // Seed an engaging companion state for the guest demo
    localStorage.setItem(
      'lifeadmin_companion_state',
      JSON.stringify({
        activeId: 'aura',
        customName: 'Aura',
        xp: 380,
        level: 3,
        growthStage: 'Bloom',
        streakDays: 4,
        lastActiveDate: new Date().toISOString().split('T')[0],
      })
    );
    setToken(newToken);
    setUser(userData);
    applyTheme(userData.theme || 'system');
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('lifeadmin_token', newToken);
    setToken(newToken);
    setUser(userData);
    applyTheme(userData.theme || 'system');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lifeadmin_token');
    setToken(null);
    setUser(null);
  }, []);

  const exitDemo = useCallback(async () => {
    try {
      await api.delete('/auth/guest');
    } catch (e) {
      console.warn('Failed to clean up demo session on server:', e);
    } finally {
      localStorage.removeItem('lifeadmin_token');
      localStorage.removeItem('lifeadmin_companion_state');
      setToken(null);
      setUser(null);
    }
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
        loginAsGuest,
        register,
        logout,
        exitDemo,
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
