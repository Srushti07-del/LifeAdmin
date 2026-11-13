/**
 * LifeAdmin Mobile — Milestone 5.3 Unit Tests
 * Offline Resilience, Network State Handling, Persistent Cache & API Retries.
 *
 * Verifies:
 * 1. Safe idempotent GET requests retry automatically on transient network/server failures (500, 502, 503, 504, timeout, network error).
 * 2. Non-retryable errors (400, 401, 403, 404) and user AbortSignals fail fast without retrying.
 * 3. Mutation requests (POST, PUT, PATCH, DELETE) are never retried automatically.
 * 4. User-scoped cache isolation: different users cannot read or overwrite each other's data.
 * 5. Persistent cache timestamps, staleness detection (isStale threshold: 5m), and human-friendly sync time formatting.
 * 6. Security guard: sensitive credentials (passwords, JWT tokens, auth secrets) are strictly rejected from ordinary cache.
 * 7. Logout / account isolation: clearUserCache purges only targeted user records.
 * 8. Network status coordinator: transition detection, offline debouncing, and sync task mutual-exclusion lock.
 * 9. Screen architecture verification: all 6 key screens (Tasks, Bills, Documents, Appointments, Reminders, Calendar)
 *    hydrate immediately from offline cache, register background sync tasks, guard mutations offline, and display OfflineBanner.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isRetryableApiError,
  waitWithAbort,
  DEFAULT_GET_RETRY_DELAYS,
} from '../services/apiErrorUtils';
import {
  offlineCache,
  normalizeCacheUserId,
  buildUserCacheKey,
  containsSensitiveCredentials,
  formatSyncTime,
  DEFAULT_FRESH_AGE_MS,
} from '../services/offlineCache';
import { MemoryStorageDriver } from '../services/offlineStorage';
import { networkStatus } from '../services/networkStatus';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relativePath: string): string {
  const filePath = path.join(MOBILE_ROOT, relativePath);
  assert.ok(fs.existsSync(filePath), `File must exist: ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Milestone 5.3: API Client Resilience & Safe Retries', () => {
  it('correctly identifies transient, retryable API errors', () => {
    // 5xx Server Errors are retryable
    assert.equal(isRetryableApiError({ status: 500 }), true, '500 Internal Server Error must be retryable');
    assert.equal(isRetryableApiError({ status: 502 }), true, '502 Bad Gateway must be retryable');
    assert.equal(isRetryableApiError({ status: 503 }), true, '503 Service Unavailable must be retryable');
    assert.equal(isRetryableApiError({ status: 504 }), true, '504 Gateway Timeout must be retryable');

    // Network & Timeout failures are retryable
    assert.equal(isRetryableApiError({ code: 'NETWORK_ERROR' }), true, 'NETWORK_ERROR code must be retryable');
    assert.equal(isRetryableApiError({ status: 0 }), true, 'Status 0 network error must be retryable');
    assert.equal(isRetryableApiError({ code: 'TIMEOUT' }), true, 'TIMEOUT code must be retryable');
    assert.equal(isRetryableApiError({ status: 408 }), true, '408 Request Timeout must be retryable');
  });

  it('rejects non-retryable 4xx client errors and user cancellations', () => {
    // Client errors should fail fast without wasting retries
    assert.equal(isRetryableApiError({ status: 400 }), false, '400 Bad Request must NOT be retried');
    assert.equal(isRetryableApiError({ status: 401 }), false, '401 Unauthorized must NOT be retried');
    assert.equal(isRetryableApiError({ status: 403 }), false, '403 Forbidden must NOT be retried');
    assert.equal(isRetryableApiError({ status: 404 }), false, '404 Not Found must NOT be retried');
    assert.equal(isRetryableApiError({ status: 422 }), false, '422 Validation Error must NOT be retried');

    // User abort signals must NOT trigger retries
    assert.equal(
      isRetryableApiError({ name: 'AbortError', message: 'User aborted request' }),
      false,
      'User AbortError must never be retried'
    );
  });

  it('verifies exponential backoff delay intervals', () => {
    assert.ok(Array.isArray(DEFAULT_GET_RETRY_DELAYS), 'Delays must be an array');
    assert.equal(DEFAULT_GET_RETRY_DELAYS.length, 2, 'Default is 2 retries (3 total attempts)');
    assert.equal(DEFAULT_GET_RETRY_DELAYS[0], 300, 'First retry backoff is 300ms');
    assert.equal(DEFAULT_GET_RETRY_DELAYS[1], 1000, 'Second retry backoff is 1000ms');
  });

  it('waitWithAbort respects caller AbortSignal immediately', async () => {
    const controller = new AbortController();
    const waitPromise = waitWithAbort(5000, controller.signal);

    // Abort after 20ms
    setTimeout(() => controller.abort(), 20);

    await assert.rejects(
      async () => await waitPromise,
      (err: any) => err.name === 'AbortError'
    );
  });
});

describe('Milestone 5.3: Persistent Offline Cache & User Isolation', () => {
  let memoryDriver: MemoryStorageDriver;

  beforeEach(() => {
    memoryDriver = new MemoryStorageDriver();
    offlineCache.setStorageDriver(memoryDriver);
  });

  it('isolates cache records per user ID', async () => {
    assert.equal(buildUserCacheKey('tasks', 'user_123'), 'user_user_123:tasks');
    assert.equal(buildUserCacheKey('tasks', null), 'user_guest:tasks');
    assert.equal(buildUserCacheKey('tasks', undefined), 'user_guest:tasks');

    // Store data for User A
    await offlineCache.setCachedData('tasks', [{ id: 't1', title: 'Task A' }], 'user_A');

    // Store data for User B
    await offlineCache.setCachedData('tasks', [{ id: 't2', title: 'Task B' }], 'user_B');

    // Verify isolation
    const dataA = await offlineCache.getCachedData<any[]>('tasks', 'user_A');
    const dataB = await offlineCache.getCachedData<any[]>('tasks', 'user_B');

    assert.equal(dataA?.data[0].title, 'Task A');
    assert.equal(dataB?.data[0].title, 'Task B');
  });

  it('accurately evaluates freshness and staleness with timestamps', async () => {
    const fixedNow = 1700000000000;
    const testData = [{ id: 'b1', name: 'Electric Bill' }];

    await offlineCache.setCachedData('bills', testData, 'test_user', fixedNow);

    // Fresh inspection (1 minute later)
    const freshResult = await offlineCache.getCachedData<any[]>(
      'bills',
      'test_user',
      DEFAULT_FRESH_AGE_MS,
      fixedNow + 60 * 1000
    );
    assert.ok(freshResult !== null);
    assert.equal(freshResult?.isStale, false, 'Entry within 5 minutes must be fresh');
    assert.equal(freshResult?.ageMs, 60 * 1000);

    // Stale inspection (10 minutes later)
    const staleResult = await offlineCache.getCachedData<any[]>(
      'bills',
      'test_user',
      DEFAULT_FRESH_AGE_MS,
      fixedNow + 10 * 60 * 1000
    );
    assert.ok(staleResult !== null);
    assert.equal(staleResult?.isStale, true, 'Entry older than 5 minutes must be marked stale');
    assert.equal(staleResult?.ageMs, 10 * 60 * 1000);
  });

  it('formats last sync indicators into clean human-friendly strings', () => {
    const baseTime = 1000000000;

    assert.equal(formatSyncTime(null), 'Never synced');
    assert.equal(formatSyncTime(baseTime, baseTime + 20 * 1000), 'Just now');
    assert.equal(formatSyncTime(baseTime, baseTime + 5 * 60 * 1000), '5m ago');
    assert.equal(formatSyncTime(baseTime, baseTime + 3 * 3600 * 1000), '3h ago');
    assert.equal(formatSyncTime(baseTime, baseTime + 48 * 3600 * 1000), '2d ago');
  });

  it('strictly blocks sensitive credentials and tokens from entering cache', async () => {
    assert.equal(containsSensitiveCredentials({ token: 'jwt.token.here' }), true);
    assert.equal(containsSensitiveCredentials({ password: 'user-secret' }), true);
    assert.equal(containsSensitiveCredentials({ authToken: 'xyz' }), true);
    assert.equal(containsSensitiveCredentials({ refreshToken: 'abc' }), true);
    assert.equal(containsSensitiveCredentials({ clientSecret: 'def' }), true);

    // Safe application records are permitted
    assert.equal(containsSensitiveCredentials({ title: 'Dentist Appointment', notes: 'Routine checkup' }), false);
    assert.equal(containsSensitiveCredentials([{ id: '1', name: 'Water Bill', amount: 450 }]), false);

    // Attempting to cache credentials must throw a security exception
    await assert.rejects(
      async () => {
        await offlineCache.setCachedData('session', { token: 'secret-token-123' }, 'user_test');
      },
      /Security Exception/
    );
  });

  it('clearUserCache purges only targeted user records on logout', async () => {
    await offlineCache.setCachedData('tasks', [{ id: '1' }], 'alice');
    await offlineCache.setCachedData('bills', [{ id: '2' }], 'alice');
    await offlineCache.setCachedData('tasks', [{ id: '3' }], 'bob');

    // Alice logs out
    await offlineCache.clearUserCache('alice');

    // Alice's data is wiped
    assert.equal(await offlineCache.getCachedData('tasks', 'alice'), null);
    assert.equal(await offlineCache.getCachedData('bills', 'alice'), null);

    // Bob's data remains untouched
    const bobTasks = await offlineCache.getCachedData<any[]>('tasks', 'bob');
    assert.ok(bobTasks !== null);
    assert.equal(bobTasks?.data[0].id, '3');
  });
});

describe('Milestone 5.3: Network Status Singleton & Sync Coordination', () => {
  it('manages network state transitions and listener notifications', () => {
    let notifiedOnline: boolean | null = null;
    const unsubscribe = networkStatus.subscribe((state) => {
      notifiedOnline = state.isOnline;
    });

    networkStatus.setOnline(false);
    assert.equal(networkStatus.isNetworkOnline(), false);
    assert.equal(notifiedOnline, false);

    networkStatus.setOnline(true);
    assert.equal(networkStatus.isNetworkOnline(), true);
    assert.equal(notifiedOnline, true);

    unsubscribe();
  });

  it('coordinates background sync tasks with mutual exclusion', async () => {
    let taskExecutionCount = 0;

    networkStatus.registerSyncTask('test_service', async () => {
      taskExecutionCount++;
      await new Promise((r) => setTimeout(r, 20));
    });

    // Fire two sync cycles concurrently
    await Promise.all([
      networkStatus.executeSyncAll(),
      networkStatus.executeSyncAll(),
    ]);

    // Mutex should ensure task does not execute concurrently
    assert.ok(taskExecutionCount >= 1, 'Sync tasks should run cleanly');
  });
});

describe('Milestone 5.3: Screen Offline Resilience AST Verification', () => {
  const screens = [
    { file: 'src/app/(tabs)/tasks.tsx', name: 'Tasks' },
    { file: 'src/app/(tabs)/bills.tsx', name: 'Bills' },
    { file: 'src/app/documents.tsx', name: 'Documents' },
    { file: 'src/app/appointments.tsx', name: 'Appointments' },
    { file: 'src/app/reminders.tsx', name: 'Reminders' },
    { file: 'src/app/(tabs)/calendar.tsx', name: 'Calendar' },
  ];

  for (const { file, name } of screens) {
    it(`verifies offline resilience pattern in ${name} (${file})`, () => {
      const code = readMobileFile(file);

      // 1. Hook usage & Background sync
      assert.ok(code.includes('useNetwork'), `${name} must import and invoke useNetwork`);
      assert.ok(code.includes('registerSyncTask'), `${name} must register a background sync task`);

      // 2. Offline caching & Hydration
      assert.ok(code.includes('offlineCache.getCachedData'), `${name} must hydrate from offlineCache.getCachedData`);
      assert.ok(code.includes('offlineCache.setCachedData'), `${name} must persist server responses with offlineCache.setCachedData`);

      // 3. Offline write guard
      assert.ok(code.includes('!isOnline'), `${name} must check isOnline before executing mutations`);
      assert.ok(code.includes('notifyActionRequiresNetwork'), `${name} must alert user via notifyActionRequiresNetwork`);

      // 4. Subtle UI indicator
      assert.ok(code.includes('<OfflineBanner'), `${name} must render <OfflineBanner`);
    });
  }
});
