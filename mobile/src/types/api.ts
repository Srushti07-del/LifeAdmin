/**
 * LifeAdmin Mobile API & Network Types
 */

import { UserSummary } from './entities';

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserSummary;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
