/**
 * LifeAdmin Mobile Authentication Types
 * Strictly aligned with backend Express auth routes and MongoDB User schema.
 */

import { RegisterCredentials } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  defaultReminderTiming?: number[];
  categories?: string[];
  aiPreferences?: {
    autoExtract: boolean;
    suggestionsEnabled: boolean;
  };
  subscriptionTier?: 'free' | 'premium' | 'premium_ai';
  isDemo?: boolean;
  createdAt?: string;
}

export type RegisterPayload = RegisterCredentials;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  exitGuest: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<{ message: string }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}
