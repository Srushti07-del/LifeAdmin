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

