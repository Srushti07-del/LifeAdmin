/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Settings & Profile Feature
 * Covers per-user & guest storage isolation, theme persistence & offline unsynced preservation,
 * profile/category validation, onboarding/settings merging, currency search,
 * Guest vs Registered capabilities, and export payload summaries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CURRENCY_OPTIONS,
  ALERT_TIMING_OPTIONS,
  DEFAULT_SETTINGS_PREFERENCES,
  QUIET_HOURS_PRESETS,
  THEME_OPTIONS,
  canRemoveCategory,
  countExportRecords,
  filterCurrencies,
  formatMemberSince,
  getAccountModeInfo,
  getLocalSettingsStorageKey,
  getSettingsStorageScope,
  getThemeStorageKey,
  isValidThemeMode,
  mergeSettingsPreferences,
  normalizeQuietHours,
  normalizeReminderTimingDays,
  resolveScopedTheme,
  validateCategoryName,
  validateDisplayName,
} from '../features/settings/services/settingsCalculations';

describe('Settings Storage Isolation (Per-User & Guest)', () => {
  it('isolates theme and settings keys cleanly across distinct users, guests, and unauthenticated fallback', () => {
    const userATheme = getThemeStorageKey('user-123', false);
    const userBTheme = getThemeStorageKey('user-456', false);
    const guestTheme = getThemeStorageKey('user-999', true);
    const unauthTheme = getThemeStorageKey(null, false);

    assert.equal(userATheme, 'lifeadmin_theme_user-123');
    assert.equal(userBTheme, 'lifeadmin_theme_user-456');
    assert.equal(guestTheme, 'lifeadmin_theme_guest');
    assert.equal(unauthTheme, 'lifeadmin_theme_default');
    assert.notEqual(userATheme, userBTheme);
    assert.notEqual(userATheme, guestTheme);

    assert.equal(getLocalSettingsStorageKey('user-123', false), 'lifeadmin_settings_user-123');
    assert.equal(getLocalSettingsStorageKey('user-123', true), 'lifeadmin_settings_guest');
    assert.equal(getSettingsStorageScope('user:abc@1', false), 'user_abc_1');
  });
});

describe('Theme Resolution & Persistence Protection', () => {
  it('validates theme modes strictly', () => {
    assert.equal(isValidThemeMode('light'), true);
    assert.equal(isValidThemeMode('dark'), true);
    assert.equal(isValidThemeMode('system'), true);
    assert.equal(isValidThemeMode('midnight'), false);
    assert.equal(isValidThemeMode(undefined), false);
    assert.deepEqual(
      THEME_OPTIONS.map((t) => t.id),
      ['light', 'dark', 'system']
    );
  });

  it('uses server preference when synced or no local override exists', () => {
    assert.equal(resolveScopedTheme(null, 'dark', true), 'dark');
    assert.equal(resolveScopedTheme(null, null, true), 'system');
    assert.equal(
      resolveScopedTheme({ theme: 'light', synced: true }, 'dark', true),
      'dark'
    );
  });

  it('preserves unsynced offline theme changes over stale server responses', () => {
    const resolved = resolveScopedTheme({ theme: 'dark', synced: false }, 'light', true);
    assert.equal(resolved, 'dark');
  });

  it('keeps local synced record when preferServerWhenSynced is false (e.g. cold cache hydrate)', () => {
    const resolved = resolveScopedTheme({ theme: 'dark', synced: true }, 'light', false);
    assert.equal(resolved, 'dark');
  });
});

describe('Profile & Category Validation', () => {
  it('validates and normalizes display names properly', () => {
    assert.deepEqual(validateDisplayName('   '), {
      valid: false,
      normalized: '',
      error: 'Display name is required.',
    });
    assert.equal(validateDisplayName('A').valid, false);
    assert.equal(validateDisplayName('X'.repeat(61)).valid, false);

    const ok = validateDisplayName('  Sanskar   Arnale  ');
    assert.equal(ok.valid, true);
    assert.equal(ok.normalized, 'Sanskar Arnale');
  });

  it('prevents duplicate categories case-insensitively and enforces minimum of 1 category', () => {
    const existing = ['Personal', 'Work', 'Finance'];

    const dup = validateCategoryName('  work ', existing);
    assert.equal(dup.valid, false);
    assert.match(dup.error || '', /already in your workspace/i);

    const tooLong = validateCategoryName('A'.repeat(33), existing);
    assert.equal(tooLong.valid, false);

    const empty = validateCategoryName('   ', existing);
    assert.equal(empty.valid, false);

    const valid = validateCategoryName('  Travel & Trips ', existing);
    assert.equal(valid.valid, true);
    assert.equal(valid.normalized, 'Travel & Trips');

    assert.equal(canRemoveCategory(['Work']), false);
    assert.equal(canRemoveCategory([]), false);
    assert.equal(canRemoveCategory(['Work', 'Finance']), true);
  });
});

describe('Notification Timing & Quiet Hours Normalization', () => {
  it('normalizes reminder timing arrays cleanly and respects explicit empty arrays', () => {
    assert.deepEqual(normalizeReminderTimingDays([0, 7, 1, 7, -1, 45, 3]), [7, 3, 1, 0]);
    assert.deepEqual(normalizeReminderTimingDays([]), []);
    assert.deepEqual(
      normalizeReminderTimingDays('invalid'),
      DEFAULT_SETTINGS_PREFERENCES.defaultReminderTiming
    );
    assert.ok(ALERT_TIMING_OPTIONS.some((o) => o.days === 0));
  });

  it('accepts valid HH:MM quiet hour ranges and resets invalid ones cleanly', () => {
    assert.deepEqual(normalizeQuietHours('22:00', '07:00'), {
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    assert.deepEqual(normalizeQuietHours('25:00', '07:00'), {
      quietHoursStart: '',
      quietHoursEnd: '',
    });
    assert.deepEqual(normalizeQuietHours('22:00', ''), {
      quietHoursStart: '',
      quietHoursEnd: '',
    });
    assert.equal(QUIET_HOURS_PRESETS[0].id, 'off');
  });
});

describe('Settings / Onboarding / Server Merging', () => {
  it('merges user profile, onboarding prefs, and local overrides cleanly without dropping currency or domains', () => {
    const merged = mergeSettingsPreferences(
      {
        theme: 'dark',
        notificationsEnabled: false,
        defaultReminderTiming: [3, 1],
        quietHoursStart: '23:00',
        quietHoursEnd: '08:00',
        preferredCurrency: 'eur',
        categories: ['Finance', 'Work'],
        aiPreferences: { autoExtract: false, suggestionsEnabled: true },
      },
      null,
      {
        preferredCurrency: 'USD',
        categories: ['Health'],
      }
    );

    assert.equal(merged.theme, 'dark');
    assert.equal(merged.notificationsEnabled, false);
    assert.deepEqual(merged.defaultReminderTiming, [3, 1]);
    assert.equal(merged.quietHoursStart, '23:00');
    assert.equal(merged.quietHoursEnd, '08:00');
    assert.equal(merged.preferredCurrency, 'EUR');
    assert.deepEqual(merged.categories, ['Finance', 'Work']);
    assert.deepEqual(merged.aiPreferences, { autoExtract: false, suggestionsEnabled: true });
  });

  it('falls back to onboarding preferences when server user lacks fields and respects local overrides', () => {
    const merged = mergeSettingsPreferences(
      { theme: 'light' },
      { preferredCurrency: 'JPY' },
      {
        categories: ['Personal', 'Education'],
        preferredCurrency: 'GBP',
        notificationsEnabled: false,
        defaultReminderTiming: [14, 7],
      }
    );

    assert.equal(merged.theme, 'light');
    assert.equal(merged.preferredCurrency, 'JPY');
    assert.deepEqual(merged.categories, ['Personal', 'Education']);
    assert.equal(merged.notificationsEnabled, false);
    assert.deepEqual(merged.defaultReminderTiming, [14, 7]);
  });

  it('normalizes unknown currency safely to INR', () => {
    const merged = mergeSettingsPreferences({ preferredCurrency: 'XYZ' }, null, null);
    assert.equal(merged.preferredCurrency, 'INR');
  });
});

describe('Currency Search & All Supported Currencies', () => {
  it('supports all 9 backend currencies and searches by code, name, or symbol', () => {
    assert.equal(ALL_CURRENCY_OPTIONS.length, 9);
    const codes = ALL_CURRENCY_OPTIONS.map((c) => c.code);
    assert.deepEqual(codes, ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'JPY', 'SGD']);

    assert.equal(filterCurrencies('inr')[0]?.code, 'INR');
    assert.equal(filterCurrencies('€')[0]?.code, 'EUR');
    assert.equal(filterCurrencies('dirham')[0]?.code, 'AED');
    assert.equal(filterCurrencies('nonexistent').length, 0);
  });
});

describe('Account Mode Capabilities & Export Summary', () => {
  it('restricts password recovery, data export, and deletion for Guest Demo sessions', () => {
    const guestViaFlag = getAccountModeInfo({ name: 'Guest User', isDemo: false }, true);
    const guestViaUser = getAccountModeInfo({ name: 'Guest User', isDemo: true }, false);

    for (const info of [guestViaFlag, guestViaUser]) {
      assert.equal(info.isGuest, true);
      assert.equal(info.canRequestPasswordReset, false);
      assert.equal(info.canExportData, false);
      assert.equal(info.canDeleteAccount, false);
      assert.equal(info.canEditProfile, true);
    }
  });

  it('enables full capabilities and formats memberSince for Registered users', () => {
    const info = getAccountModeInfo(
      {
        name: 'Alice',
        email: 'alice@example.com',
        isDemo: false,
        createdAt: '2025-03-15T10:00:00.000Z',
      },
      false
    );

    assert.equal(info.isGuest, false);
    assert.equal(info.emailLabel, 'alice@example.com');
    assert.equal(info.canRequestPasswordReset, true);
    assert.equal(info.canExportData, true);
    assert.equal(info.canDeleteAccount, true);
    assert.equal(info.memberSinceLabel, 'March 2025');
    assert.equal(formatMemberSince('invalid-date'), 'Active member');
  });

  it('counts export JSON arrays accurately across entity buckets', () => {
    const summary = countExportRecords({
      tasks: [1, 2, 3],
      bills: [1],
      appointments: [],
      reminders: [1, 2],
      documents: [1, 2, 3, 4],
      calendarEvents: [1],
      aiInteractions: [1, 2],
    });

    assert.equal(summary.tasks, 3);
    assert.equal(summary.bills, 1);
    assert.equal(summary.appointments, 0);
    assert.equal(summary.reminders, 2);
    assert.equal(summary.documents, 4);
    assert.equal(summary.calendarEvents, 1);
    assert.equal(summary.aiInteractions, 2);
    assert.equal(summary.total, 13);

    assert.equal(countExportRecords(null).total, 0);
  });
});

