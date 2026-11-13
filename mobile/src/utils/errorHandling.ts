/**
 * LifeAdmin Mobile — Error Handling & Sanitization Utilities
 * Pure TypeScript helpers for error boundaries, crash diagnostics,
 * and safe credential redaction.
 */

/**
 * Strips tokens, passwords, authorization headers, and internal query params
 * to prevent leaking credentials in error screens or logs.
 */
export function sanitizeErrorMessage(rawMessage?: string): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'An unexpected rendering error occurred.';
  }

  return rawMessage
    .replace(/Bearer\s+[A-Za-z0-9\-_.+/=]+/gi, 'Bearer [REDACTED]')
    .replace(/token=[A-Za-z0-9\-_.+/=]+/gi, 'token=[REDACTED]')
    .replace(/password=[^\s&]+/gi, 'password=[REDACTED]')
    .replace(/key=[A-Za-z0-9\-_.+/=]+/gi, 'key=[REDACTED]')
    .replace(/secret=[A-Za-z0-9\-_.+/=]+/gi, 'secret=[REDACTED]')
    .slice(0, 240);
}

/**
 * Derives a user-friendly message from an unhandled Error object.
 */
export function getUserFriendlyErrorSummary(error?: Error | null): string {
  if (!error) {
    return 'LifeAdmin encountered an unexpected issue while displaying this screen.';
  }

  const name = error.name || 'Error';
  const cleanMsg = sanitizeErrorMessage(error.message);

  if (name === 'TypeError') {
    return 'A display formatting error interrupted this view. Your saved data is intact.';
  }

  if (name === 'ReferenceError' || name === 'SyntaxError') {
    return 'A user-interface rendering error occurred. Your saved data is intact.';
  }

  return cleanMsg;
}

