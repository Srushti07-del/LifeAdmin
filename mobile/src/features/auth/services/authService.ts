/**
 * LifeAdmin Mobile Authentication Service
 * Communicates with backend authentication endpoints in /server/src/routes/auth.ts
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { AuthResponse, LoginCredentials } from '@/types/api';
import { RegisterPayload, User } from '@/types/auth';

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
};

export default authService;
