/**
 * LifeAdmin Mobile API Configuration
 * Supports environment variables via EXPO_PUBLIC_* and platform-aware defaults.
 */

import { Platform } from 'react-native';
import { API_DEFAULTS, getDefaultApiBaseUrl } from '@/constants/api';

class ApiConfigService {
  private baseUrl: string;
  private timeoutMs: number;
  private authToken: string | null = null;
  private unauthorizedListeners: Array<() => void> = [];

  constructor() {
    this.baseUrl = getDefaultApiBaseUrl();
    const envTimeout = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
    this.timeoutMs = envTimeout ? parseInt(envTimeout, 10) : API_DEFAULTS.defaultTimeoutMs;
  }

  /**
   * Get the active API Base URL (e.g., http://10.0.2.2:5000/api)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Override the API Base URL at runtime (e.g. for custom LAN IP testing)
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * Get the request timeout in milliseconds
   */
  public getTimeout(): number {
    return this.timeoutMs;
  }

  /**
   * Set request timeout
   */
  public setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  /**
   * Store JWT authorization token
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current JWT authorization token
   */
  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Subscribe to 401 Unauthorized events for automated session expiration handling.
   */
  public onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.push(listener);
    return () => {
      this.unauthorizedListeners = this.unauthorizedListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Dispatch unauthorized signal to all registered subscribers.
   */
  public notifyUnauthorized(): void {
    this.unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('Error in onUnauthorized listener:', err);
      }
    });
  }

  /**
   * Build complete default headers
   */
  public getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      ...API_DEFAULTS.headers,
      ...customHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Returns diagnostic information about current network configuration
   */
  public getDiagnostics() {
    return {
      platform: Platform.OS,
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs,
      hasAuthToken: !!this.authToken,
      envConfigured: !!process.env.EXPO_PUBLIC_API_URL,
    };
  }
}

export const apiConfig = new ApiConfigService();
export default apiConfig;
