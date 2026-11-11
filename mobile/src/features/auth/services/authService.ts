/**
 * LifeAdmin Mobile Authentication Service
 * Communicates with backend authentication endpoints in /server/src/routes/auth.ts
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { AuthResponse, LoginCredentials } from '@/types/api';
import { RegisterPayload, User } from '@/types/auth';

import { CompanionState } from '@/features/companions/types';

export const authService = {
  /**
   * Log in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(Endpoints.auth.login, {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
  },

  /**
   * Register a new user account
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(Endpoints.auth.register, {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
  },

  /**
   * Start an isolated 2-hour guest demo session with pre-seeded data
   */
  async loginAsGuest(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(Endpoints.auth.guest);
  },

  /**
   * Terminate active guest session and purge its ephemeral database records
   */
  async exitGuestSession(): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(Endpoints.auth.exitGuest);
  },

  /**
   * Fetch currently authenticated user profile
   */
  async getCurrentUser(): Promise<{ user: User }> {
    return apiClient.get<{ user: User }>(Endpoints.auth.me);
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(Endpoints.auth.forgotPassword, {
      email: email.trim().toLowerCase(),
    });
  },

  /**
   * Reset password with a valid token
   */
  async resetPassword(token: string, payload: { password: string; confirmPassword: string }): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(Endpoints.auth.resetPassword(token), payload);
  },

  /**
   * Update user profile display name / avatar
   */
  async updateProfile(payload: {
    name?: string;
    profilePicture?: string;
  }): Promise<{ message: string; user: User }> {
    return apiClient.put<{ message: string; user: User }>(Endpoints.auth.updateProfile, payload);
  },

  /**
   * Update additional profile fields handled on /auth/profile (e.g. quietHoursStart / quietHoursEnd)
   */
  async updateAuthProfile(payload: {
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }): Promise<{ message: string; user: User }> {
    return apiClient.put<{ message: string; user: User }>(Endpoints.auth.profile, payload);
  },

  /**
   * Update user settings & preferences
   */
  async updateSettings(settings: {
    categories?: string[];
    notificationsEnabled?: boolean;
    defaultReminderTiming?: number[];
    preferredCurrency?: string;
    theme?: 'light' | 'dark' | 'system';
    aiPreferences?: {
      autoExtract?: boolean;
      suggestionsEnabled?: boolean;
    };
    companion?: Partial<CompanionState>;
  }): Promise<{ message: string; user: User }> {
    return apiClient.put<{ message: string; user: User }>(Endpoints.auth.updateSettings, settings);
  },

  /**
   * Export all authenticated user data as JSON backup
   */
  async exportUserData(): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(Endpoints.auth.exportData);
  },

  /**
   * Permanently delete user account and cascade server data
   */
  async deleteAccount(): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(Endpoints.auth.deleteAccount);
  },

  /**
   * Dedicated update for active companion state & progression
   */
  async updateCompanion(companion: Partial<CompanionState>): Promise<{ message: string; companion: CompanionState; user: User }> {
    return apiClient.put<{ message: string; companion: CompanionState; user: User }>(Endpoints.auth.updateCompanion, companion);
  },
};

export default authService;
