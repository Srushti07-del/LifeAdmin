/**
 * LifeAdmin Mobile — Offline Cache Service
 * Provides typed, user-scoped, timestamped persistence for high-volume collections
 * (Tasks, Bills, Rates, Appointments, Reminders, Calendar events, and Document metadata).
 *
 * Security Policies:
 * 1. Tokens and credentials MUST NEVER be stored here (tokens remain in expo-secure-store).
 * 2. Document file binaries/blobs are excluded; only lightweight metadata is cached.
 * 3. Cache entries are isolated by user ID (`user_${userId}:${key}`).
 * 4. User cache is completely purged upon logout or demo exit.
 */

import { offlineStorageDriver, IStorageDriver } from './offlineStorage';

export interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  userId: string;
  key: string;
  version: number;
}

export interface CacheResult<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  ageMs: number;
}

export const DEFAULT_FRESH_AGE_MS = 5 * 60 * 1000; // 5 minutes fresh window

/**
 * Normalizes user ID to ensure cache isolation between distinct accounts.
 */
export function normalizeCacheUserId(userId?: string | null): string {
  if (!userId) return 'guest';
  const clean = userId.trim();
  return clean || 'guest';
}

/**
 * Constructs a fully qualified, user-isolated storage key.
 */
export function buildUserCacheKey(key: string, userId?: string | null): string {
  const userPrefix = normalizeCacheUserId(userId);
  return `user_${userPrefix}:${key}`;
}

/**
 * Inspects a payload to guarantee sensitive credentials are never stored in ordinary cache.
 */
export function containsSensitiveCredentials(data: any): boolean {
  if (!data) return false;
  if (typeof data === 'string') {
    // Check for raw JWT signatures or password fields
    if (/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/.test(data)) return true;
    return false;
  }
  if (typeof data === 'object') {
    if (data.token || data.authToken || data.refreshToken || data.password) return true;
    for (const key of Object.keys(data)) {
      if (['token', 'authToken', 'refreshToken', 'password', 'clientSecret'].includes(key)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Formats a timestamp into a friendly, human-readable last sync indicator.
 */
export function formatSyncTime(timestamp: number | null, now: number = Date.now()): string {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return 'Never synced';
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 45) {
    return 'Just now';
  }
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

class OfflineCacheService {
  private driver: IStorageDriver = offlineStorageDriver;

  /**
   * Override driver for isolated unit testing
   */
  public setStorageDriver(driver: IStorageDriver): void {
    this.driver = driver;
  }

  /**
   * Resets driver back to standard default
   */
  public resetStorageDriver(): void {
    this.driver = offlineStorageDriver;
  }

  /**
   * Saves a typed collection into user-scoped persistent storage.
   */
  public async setCachedData<T>(
    key: string,
    data: T,
    userId?: string | null,
    customTimestamp?: number
  ): Promise<void> {
    if (containsSensitiveCredentials(data)) {
      console.warn(`[OfflineCache] Refused to cache sensitive payload under key: ${key}`);
      throw new Error(`Security Exception: Cannot persist sensitive credentials to cache.`);
    }

    const storageKey = buildUserCacheKey(key, userId);
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: customTimestamp ?? Date.now(),
      userId: normalizeCacheUserId(userId),
      key,
      version: 1,
    };

    try {
      await this.driver.setItem(storageKey, JSON.stringify(envelope));
    } catch (err) {
      console.warn(`[OfflineCache] Failed to write cache for ${storageKey}:`, err);
    }
  }

  /**
   * Retrieves cached collection from user-scoped storage and evaluates staleness.
   */
  public async getCachedData<T>(
    key: string,
    userId?: string | null,
    maxFreshAgeMs: number = DEFAULT_FRESH_AGE_MS,
    currentTimestamp?: number
  ): Promise<CacheResult<T> | null> {
    const storageKey = buildUserCacheKey(key, userId);

    try {
      const raw = await this.driver.getItem(storageKey);
      if (!raw) return null;

      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (!envelope || !envelope.data || typeof envelope.timestamp !== 'number') {
        return null;
      }

      // Verify user isolation safety check
      const expectedUser = normalizeCacheUserId(userId);
      if (envelope.userId !== expectedUser) {
        console.warn(`[OfflineCache] Cross-user cache violation detected for ${key}. Discarding.`);
        return null;
      }

      const now = currentTimestamp ?? Date.now();
      const ageMs = Math.max(0, now - envelope.timestamp);
      const isStale = ageMs > maxFreshAgeMs;

      return {
        data: envelope.data,
        timestamp: envelope.timestamp,
        isStale,
        ageMs,
      };
    } catch (err) {
      console.warn(`[OfflineCache] Failed to read or parse cache for ${storageKey}:`, err);
      return null;
    }
  }

  /**
   * Removes a specific cached collection for a user.
   */
  public async removeCachedData(key: string, userId?: string | null): Promise<void> {
    const storageKey = buildUserCacheKey(key, userId);
    try {
      await this.driver.removeItem(storageKey);
    } catch (err) {
      console.warn(`[OfflineCache] Failed to remove ${storageKey}:`, err);
    }
  }

  /**
   * Purges all cached records for a specific user upon logout or demo cleanup.
   */
  public async clearUserCache(userId: string): Promise<void> {
    const userPrefix = `user_${normalizeCacheUserId(userId)}:`;
    try {
      const keys = await this.driver.getAllKeys();
      const userKeys = keys.filter((k) => k.startsWith(userPrefix));
      await Promise.all(userKeys.map((k) => this.driver.removeItem(k)));
    } catch (err) {
      console.warn(`[OfflineCache] clearUserCache failed for user ${userId}:`, err);
    }
  }

  /**
   * Complete cache purge (all users, all keys).
   */
  public async clearAllCache(): Promise<void> {
    try {
      await this.driver.clearAll();
    } catch (err) {
      console.warn('[OfflineCache] clearAllCache failed:', err);
    }
  }
}

export const offlineCache = new OfflineCacheService();
export default offlineCache;
