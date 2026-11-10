/**
 * LifeAdmin Shared Password Reset URL Generation Service
 * Provides centralized, environment-aware public URL resolution for password resets.
 *
 * Rules:
 * - Uses explicit environment variables: APP_URL or CLIENT_URL.
 * - In production: rejects localhost/loopback, enforces HTTPS, and requires explicit configuration.
 * - In development/test: allows localhost with port, falling back to http://localhost:5173.
 * - Never derives URLs from arbitrary or unverified request headers (prevents Host Header Poisoning).
 * - Extensible for future native mobile channels while keeping web reset flow default.
 */

import config from '../config';

export interface PasswordResetUrlOptions {
  token: string;
  channel?: 'web' | 'mobile'; // Extensible for mobile universal/app links
  baseUrl?: string;
  nodeEnv?: string;
}

/**
 * Validates and resolves the public web application base URL.
 * 
 * In production:
 * - Requires an explicitly defined APP_URL or CLIENT_URL.
 * - Enforces HTTPS protocol.
 * - Rejects localhost or loopback addresses.
 * 
 * In development / test:
 * - Falls back to CLIENT_URL or http://localhost:5173 if unspecified.
 */
export function getPublicWebBaseUrl(options?: { nodeEnv?: string; rawUrl?: string }): string {
  const nodeEnv = options?.nodeEnv ?? config.nodeEnv;
  const isProduction = nodeEnv === 'production';
  const rawUrl = (
    options?.rawUrl ??
    (process.env.APP_URL || process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173'))
  ).trim();

  if (!rawUrl) {
    if (isProduction) {
      throw new Error(
        'Production configuration error: APP_URL (or CLIENT_URL) must be set to the deployed public HTTPS domain (e.g. https://lifeadmin.app).'
      );
    }
    return 'http://localhost:5173';
  }

  // Parse URL to validate format
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid application URL: "${rawUrl}". Must be a valid absolute URL.`);
  }

  if (isProduction) {
    // 1. Must use HTTPS
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `Production configuration error: Public application URL must use HTTPS in production (received "${parsed.protocol}").`
      );
    }

    // 2. Reject localhost / loopback addresses
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
    ) {
      throw new Error(
        `Production configuration error: Public application URL cannot be localhost or loopback in production ("${hostname}"). Configure the actual deployed domain.`
      );
    }
  }

  // Strip trailing slashes for clean path concatenation
  return rawUrl.replace(/\/+$/, '');
}

/**
 * Generates the full password reset URL embedded in emails.
 */
export function generatePasswordResetUrl(options: PasswordResetUrlOptions | string): string {
  const token = typeof options === 'string' ? options : options.token;
  const channel = typeof options === 'string' ? 'web' : options.channel || 'web';
  const customBaseUrl = typeof options === 'string' ? undefined : options.baseUrl;
  const nodeEnv = typeof options === 'string' ? undefined : options.nodeEnv;

  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('A valid reset token is required to generate a password reset URL.');
  }

  const cleanToken = token.trim();

  // Channel routing: Web reset page is the default destination
  // (Architecture is extensible for future mobile deep links without breaking the contract)
  if (channel === 'web') {
    const baseUrl = customBaseUrl ? customBaseUrl.replace(/\/+$/, '') : getPublicWebBaseUrl({ nodeEnv });
    return `${baseUrl}/reset-password?token=${encodeURIComponent(cleanToken)}`;
  }

  // Future mobile channel placeholder: falls back to web for now per spec
  const baseUrl = customBaseUrl ? customBaseUrl.replace(/\/+$/, '') : getPublicWebBaseUrl({ nodeEnv });
  return `${baseUrl}/reset-password?token=${encodeURIComponent(cleanToken)}`;
}

export default generatePasswordResetUrl;

