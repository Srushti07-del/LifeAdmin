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
    applyTheme(user?.theme || 'system');
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

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const setThemeCallback = useCallback((theme: 'light' | 'dark' | 'system') => {
    applyTheme(theme);
    setUser((prev) => prev ? { ...prev, theme } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, setTheme: setThemeCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
