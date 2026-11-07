/**
 * LifeAdmin Mobile API Configuration Constants
 */

import { Platform } from 'react-native';

export const API_DEFAULTS = {
  // Default base URLs by platform for local development
  // Android Emulator uses 10.0.2.2 to reach host machine localhost
  androidEmulatorUrl: 'http://10.0.2.2:5000/api',
  localhostUrl: 'http://localhost:5000/api',

  // Timeout in milliseconds
  defaultTimeoutMs: 10000,

  // Default headers
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
} as const;

/**
 * Resolves the default API base URL based on platform and environment
 */
export function getDefaultApiBaseUrl(): string {
  // 1. Explicit environment variable override via Expo
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Platform-aware local development default
  if (Platform.OS === 'android') {
    return API_DEFAULTS.androidEmulatorUrl;
  }

  return API_DEFAULTS.localhostUrl;
}
