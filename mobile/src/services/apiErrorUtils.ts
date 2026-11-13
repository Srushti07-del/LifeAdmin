/**
 * Pure API error message normalization utilities.
 * Extracts meaningful validation/server errors and prevents exposing raw HTTP status strings.
 */

interface ExpressValidationIssue {
  msg?: unknown;
  message?: unknown;
}

interface StructuredErrorBody {
  message?: unknown;
  error?: unknown;
  errors?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHtmlPayload(value: string): boolean {
  const trimmed = value.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

function extractFirstValidationMessage(errors: unknown): string | null {
  if (!Array.isArray(errors)) {
    return null;
  }

  for (const item of errors) {
    if (isNonEmptyString(item)) {
      return item.trim();
    }
    if (typeof item === 'object' && item !== null) {
      const issue = item as ExpressValidationIssue;
      if (isNonEmptyString(issue.msg)) {
        return issue.msg.trim();
      }
      if (isNonEmptyString(issue.message)) {
        return issue.message.trim();
      }
    }
  }

  return null;
}

export function getFriendlyStatusMessage(status: number): string {
  if (status === 400 || status === 422) {
    return 'The request could not be processed. Please check your input and try again.';
  }
  if (status === 401) {
    return 'Your session has expired or is invalid. Please sign in again.';
  }
  if (status === 403) {
    return 'Access is restricted or onboarding setup is incomplete.';
  }
  if (status === 404) {
    return 'The requested resource could not be found.';
  }
  if (status === 408) {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (status === 429) {
    return 'Too many requests right now. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }
  return 'Unexpected request failure. Please try again.';
}

/**
 * Extracts a clean user-facing error message from an HTTP error payload.
 * Never returns raw "HTTP Error <status>" placeholders.
 */
export function extractServerErrorMessage(
  responseData: unknown,
  status: number,
  statusText?: string
): string {
  if (typeof responseData === 'object' && responseData !== null) {
    const body = responseData as StructuredErrorBody;
    if (isNonEmptyString(body.message)) {
      return body.message.trim();
    }
    const validationMsg = extractFirstValidationMessage(body.errors);
    if (validationMsg) {
      return validationMsg;
    }
    if (isNonEmptyString(body.error)) {
      return body.error.trim();
    }
  }

  if (isNonEmptyString(responseData) && !isHtmlPayload(responseData)) {
    return responseData.trim();
  }

  if (isNonEmptyString(statusText) && !/^http\s+error\b/i.test(statusText.trim())) {
    return statusText.trim();
  }

  return getFriendlyStatusMessage(status);
}

export const DEFAULT_GET_RETRY_DELAYS = [300, 1000];

/**
 * Determines if an error is transient and eligible for automatic retry.
 * Only network failures, timeouts, and 5xx server errors qualify.
 * Client errors (4xx) and explicit user cancellations are never retried.
 */
export function isRetryableApiError(error: any): boolean {
  if (!error) return false;

  // Explicit user cancellation
  if (error.name === 'AbortError' && error.code !== 'TIMEOUT') {
    return false;
  }

  // Network offline / connection drops
  if (error.code === 'NETWORK_ERROR' || error.status === 0) {
    return true;
  }

  // Request timeouts
  if (error.code === 'TIMEOUT' || error.status === 408) {
    return true;
  }

  // Transient server errors: 500, 502, 503, 504
  if (typeof error.status === 'number' && [500, 502, 503, 504].includes(error.status)) {
    return true;
  }

  return false;
}

/**
 * Asynchronously waits for `ms` milliseconds while listening to an abort signal.
 */
export function waitWithAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
  }

  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onAbort = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('The user aborted a request.', 'AbortError'));
    };

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort);
  });
}

