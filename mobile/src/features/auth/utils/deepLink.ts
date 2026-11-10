/**
 * LifeAdmin Mobile Deep Linking Utilities
 * Pure URL parser and token extraction for password reset deep links.
 * Works seamlessly across Android App Links (HTTPS), custom schemes (lifeadmin://),
 * and development URLs without platform-specific dependencies.
 */

/**
 * Extracts a password reset token from a deep link or web reset URL.
 * Supports:
 * - HTTPS Android App Links: https://lifeadmin.app/reset-password?token=<token>
 * - Custom scheme links: lifeadmin://reset-password?token=<token>
 * - Triple-slash custom scheme links: lifeadmin:///reset-password?token=<token>
 * - Expo development links: exp://.../--/reset-password?token=<token>
 * - Returns null if the URL is not a reset-password path or lacks a token.
 * 
 * Never logs or exposes the extracted token value.
 */
export function extractResetPasswordToken(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');

    // Match path "/reset-password", or custom scheme host "reset-password"
    const isResetPasswordPath =
      pathname === '/reset-password' ||
      pathname.endsWith('/reset-password') ||
      host === 'reset-password';

    if (isResetPasswordPath) {
      const rawToken = parsed.searchParams.get('token');
      const cleanToken = rawToken ? rawToken.trim() : null;
      return cleanToken && cleanToken.length > 0 ? cleanToken : null;
    }
    return null;
  } catch {
    // Fallback regex for non-standard URI formats that fail new URL()
    const isResetPassword = /reset-password/i.test(rawUrl);
    if (!isResetPassword) return null;

    const match = rawUrl.match(/[?&]token=([^&#\s]+)/i);
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]).trim();
        return decoded.length > 0 ? decoded : null;
      } catch {
        const trimmed = match[1].trim();
        return trimmed.length > 0 ? trimmed : null;
      }
    }
    return null;
  }
}
