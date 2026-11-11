/**
 * LifeAdmin Mobile Authentication Types
 * Strictly aligned with backend Express auth routes and MongoDB User schema.
 */

import { RegisterCredentials } from './api';
import { CompanionState } from '../features/companions/types';

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  defaultReminderTiming?: number[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories?: string[];
  aiPreferences?: {
    autoExtract: boolean;
    suggestionsEnabled: boolean;
  };
  preferredCurrency?: string;
  companion?: CompanionState;
  subscriptionTier?: 'free' | 'premium' | 'premium_ai';
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  notificationTypes?: {
    tasks: boolean;
    bills: boolean;
    appointments: boolean;
    reminders: boolean;
  };
  emailReminderIntervals?: number[];
  timezone?: string;
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
  isOnboardingCompleted: boolean;
  completeOnboarding: (prefs?: any) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  restartOnboarding: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  exitGuest: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<{ message: string }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}
