/**
 * LifeAdmin Mobile Centralized API Client
 * Built on native fetch with timeout support, auth injection, and error normalization.
 */

import { ApiError } from '@/types/api';
import apiConfig from './config';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

class ApiClient {
  /**
   * Helper to format query string parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${apiConfig.getBaseUrl()}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Standardized request dispatcher
   */
  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeoutMs = apiConfig.getTimeout(), headers: customHeaders, ...restOptions } = options;
    const url = this.buildUrl(path, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = apiConfig.getHeaders(customHeaders as Record<string, string>);
    if (typeof FormData !== 'undefined' && restOptions.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const responseData = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (response.status === 401) {
          apiConfig.notifyUnauthorized();
        }

        const error: ApiError = {
          status: response.status,
          message:
            (typeof responseData === 'object' && responseData?.message) ||
            response.statusText ||
            `HTTP Error ${response.status}`,
          details: responseData,
        };
        throw error;
      }

      return responseData as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Normalize Abort / Timeout errors
      if (err.name === 'AbortError') {
        const timeoutError: ApiError = {
          status: 408,
          code: 'TIMEOUT',
          message: `Request timed out after ${timeoutMs}ms. Is the backend running on ${apiConfig.getBaseUrl()}?`,
        };
        throw timeoutError;
      }

      // Normalize Network / Failed to Fetch errors (common on Android emulator if backend is offline)
      if (err instanceof TypeError || err.message?.includes('Network request failed')) {
        const networkError: ApiError = {
          status: 0,
          code: 'NETWORK_ERROR',
          message: `Cannot reach LifeAdmin backend at ${apiConfig.getBaseUrl()}. If using Android Emulator, verify host port 5000 is running and mapped to 10.0.2.2.`,
          details: err.message,
        };
        throw networkError;
      }

      // Re-throw already normalized ApiError
      if (err.status !== undefined) {
        throw err;
      }

      const genericError: ApiError = {
        status: 500,
        message: err.message || 'An unexpected error occurred',
        details: err,
      };
      throw genericError;
    }
  }

  public get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? (typeof FormData !== 'undefined' && body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  }

  public upload<T = any>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  public put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
