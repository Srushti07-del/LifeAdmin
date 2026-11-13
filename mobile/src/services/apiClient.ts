/**
 * LifeAdmin Mobile Centralized API Client
 * Built on native fetch with timeout support, auth injection, error normalization,
 * and resilient automatic retries for idempotent GET requests.
 */

import { ApiError } from '@/types/api';
import apiConfig from './config';
import {
  extractServerErrorMessage,
  DEFAULT_GET_RETRY_DELAYS,
  isRetryableApiError,
  waitWithAbort,
} from './apiErrorUtils';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  skipRetry?: boolean;
  maxRetries?: number;
}

export {
  DEFAULT_GET_RETRY_DELAYS,
  isRetryableApiError,
  waitWithAbort,
};

type NetworkSuccessListener = (url: string) => void;
type NetworkFailureListener = (error: ApiError, url: string) => void;

class ApiClient {
  private successListeners: NetworkSuccessListener[] = [];
  private failureListeners: NetworkFailureListener[] = [];

  /**
   * Subscribe to successful network requests
   */
  public onNetworkSuccess(listener: NetworkSuccessListener): () => void {
    this.successListeners.push(listener);
    return () => {
      this.successListeners = this.successListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribe to network failure events
   */
  public onNetworkFailure(listener: NetworkFailureListener): () => void {
    this.failureListeners.push(listener);
    return () => {
      this.failureListeners = this.failureListeners.filter((l) => l !== listener);
    };
  }

  private notifySuccess(url: string): void {
    this.successListeners.forEach((l) => {
      try {
        l(url);
      } catch (err) {
        console.warn('Error in onNetworkSuccess listener:', err);
      }
    });
  }

  private notifyFailure(error: ApiError, url: string): void {
    this.failureListeners.forEach((l) => {
      try {
        l(error, url);
      } catch (err) {
        console.warn('Error in onNetworkFailure listener:', err);
      }
    });
  }

  /**
   * Helper to format query string parameters
   */
  public buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
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
   * Single attempt dispatcher
   */
  private async executeSingleAttempt<T = any>(
    url: string,
    options: RequestOptions
  ): Promise<T> {
    const { timeoutMs = apiConfig.getTimeout(), headers: customHeaders, signal: callerSignal, ...restOptions } = options;

    if (callerSignal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }

    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    const onCallerAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };

    if (callerSignal) {
      callerSignal.addEventListener('abort', onCallerAbort);
    }

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
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }

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
          message: extractServerErrorMessage(responseData, response.status, response.statusText),
          details: responseData,
        };
        throw error;
      }

      return responseData as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }

      // Check user-initiated cancellation first
      if (callerSignal?.aborted && !isTimedOut) {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }

      // Normalize Abort / Timeout errors
      if (err.name === 'AbortError' || isTimedOut) {
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

  /**
   * Standardized request dispatcher with automatic idempotent GET retries
   */
  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, skipRetry, maxRetries: customMaxRetries, ...restOptions } = options;
    const url = this.buildUrl(path, params);
    const method = (restOptions.method || 'GET').toUpperCase();

    // Only safe, idempotent GET requests are eligible for automatic retries
    const isIdempotentGet = method === 'GET';
    const maxRetries = isIdempotentGet && !skipRetry
      ? (typeof customMaxRetries === 'number' ? customMaxRetries : DEFAULT_GET_RETRY_DELAYS.length)
      : 0;

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeSingleAttempt<T>(url, { ...restOptions, params });
        this.notifySuccess(url);
        return result;
      } catch (err: any) {
        lastError = err;

        // If caller cancelled, abort immediately without retrying
        if (options.signal?.aborted) {
          throw err;
        }

        // Notify failure listeners for connectivity tracking
        if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT' || err.status >= 500) {
          this.notifyFailure(err, url);
        }

        const canRetry = attempt < maxRetries && isRetryableApiError(err);
        if (!canRetry) {
          throw err;
        }

        // Exponential backoff delay (300ms, then 1000ms)
        const delayMs = DEFAULT_GET_RETRY_DELAYS[attempt] ?? 1000;
        await waitWithAbort(delayMs, options.signal);
      }
    }

    throw lastError;
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
