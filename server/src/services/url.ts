/**
 * LifeAdmin Shared Public URL Resolution
 * Centralized, environment-aware URL resolution for email action links and password resets.
 *
 * Rules:
 * - Prefers APP_URL, falls back to CLIENT_URL.
 * - In production: requires explicit configuration, enforces HTTPS, rejects localhost/loopback.
 * - In development/test: falls back to http://localhost:5173 if unspecified.
 * - Never derives URLs from arbitrary request headers (prevents Host Header Poisoning).
 */

import config from '../config';

export interface PublicUrlOptions {
  nodeEnv?: string;
  rawUrl?: string;
}

/**
 * Resolves the public web application base URL.
 *
 * In production:
 * - Requires APP_URL or CLIENT_URL to be explicitly set.
 * - Enforces HTTPS protocol.
 * - Rejects localhost or loopback addresses.
 *
 * In development / test:
 * - Falls back to CLIENT_URL or http://localhost:5173 if unspecified.
 */
export function getPublicAppUrl(options?: PublicUrlOptions): string {
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

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid application URL: "${rawUrl}". Must be a valid absolute URL.`);
  }

  if (isProduction) {
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `Production configuration error: Public application URL must use HTTPS in production (received "${parsed.protocol}").`
      );
    }

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

  return rawUrl.replace(/\/+$/, '');
}

/**
 * Returns the base URL for email action links, with production-safe defaults.
 * Never returns localhost in production.
 */
export function getEmailBaseUrl(options?: PublicUrlOptions): string {
  return getPublicAppUrl(options);
}
