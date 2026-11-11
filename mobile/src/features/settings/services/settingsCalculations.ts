/**
 * LifeAdmin Mobile — Pure Settings, Profile, Validation & Isolation Logic
 * Dependency-free helper module testable directly in Node test runner.
 */

import {
  CURRENCIES,
  CurrencyCode,
  CurrencyInfo,
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
} from '../../../utils/currency';
import { OnboardingPreferences, SENSIBLE_DEFAULT_CATEGORIES } from '../../onboarding/types';
import {
  AccountModeInfo,
  AlertTimingOption,
  ExportDataSummary,
  QuietHoursPreset,
  ScopedThemeRecord,
  SettingsPreferences,
  ThemeMode,
  ValidationResult,
} from '../types';

export const LAST_THEME_STORAGE_KEY = 'lifeadmin_theme_last';

export const THEME_OPTIONS: { id: ThemeMode; label: string; description: string }[] = [
  { id: 'light', label: 'Light', description: 'Coastal seafoam daylight palette' },
  { id: 'dark', label: 'Dark', description: 'Deep ocean navy twilight palette' },
  { id: 'system', label: 'System', description: 'Follow Android device theme' },
];

export const ALERT_TIMING_OPTIONS: AlertTimingOption[] = [
  { days: 0, label: 'On due date', shortLabel: 'Due day' },
  { days: 1, label: '1 day before', shortLabel: '1d before' },
  { days: 2, label: '2 days before', shortLabel: '2d before' },
  { days: 3, label: '3 days before', shortLabel: '3d before' },
  { days: 7, label: '1 week before', shortLabel: '7d before' },
  { days: 14, label: '2 weeks before', shortLabel: '14d before' },
];

export const QUIET_HOURS_PRESETS: QuietHoursPreset[] = [
  { id: 'off', label: 'Off (Anytime)', start: '', end: '' },
  { id: '22-07', label: '10:00 PM – 7:00 AM', start: '22:00', end: '07:00' },
  { id: '23-08', label: '11:00 PM – 8:00 AM', start: '23:00', end: '08:00' },
  { id: '21-06', label: '9:00 PM – 6:00 AM', start: '21:00', end: '06:00' },
];

export const DEFAULT_SETTINGS_PREFERENCES: SettingsPreferences = {
  theme: 'system',
  notificationsEnabled: true,
  defaultReminderTiming: [7, 3, 1, 0],
  quietHoursStart: '',
  quietHoursEnd: '',
  categories: [...SENSIBLE_DEFAULT_CATEGORIES, 'Education', 'Home'],
  preferredCurrency: DEFAULT_CURRENCY,
  aiPreferences: {
    autoExtract: true,
    suggestionsEnabled: true,
  },
};

export function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Generates isolated storage scope identifier for user vs guest session.
 */
export function getSettingsStorageScope(
  userId?: string | null,
  isGuest: boolean = false
): string {
  if (isGuest) return 'guest';
  if (typeof userId === 'string' && userId.trim().length > 0) {
    return userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return 'default';
}

export function getThemeStorageKey(
  userId?: string | null,
  isGuest: boolean = false
): string {
  return `lifeadmin_theme_${getSettingsStorageScope(userId, isGuest)}`;
}

export function getLocalSettingsStorageKey(
  userId?: string | null,
  isGuest: boolean = false
): string {
  return `lifeadmin_settings_${getSettingsStorageScope(userId, isGuest)}`;
}

/**
 * Resolves the effective theme mode for a user or guest scope without letting
 * another account's preference bleed across logins. Preserves unsynced offline changes.
 */
export function resolveScopedTheme(
  savedRecord: ScopedThemeRecord | ThemeMode | null | undefined,
  serverTheme?: ThemeMode | null,
  preferServerWhenSynced: boolean = true
): ThemeMode {
  const normalizedServer = isValidThemeMode(serverTheme) ? serverTheme : null;

  if (savedRecord && typeof savedRecord === 'object') {
    const localTheme = isValidThemeMode(savedRecord.theme) ? savedRecord.theme : null;
    if (savedRecord.synced === false && localTheme) {
      return localTheme;
    }
    if (preferServerWhenSynced && normalizedServer) {
      return normalizedServer;
    }
    return localTheme ?? normalizedServer ?? 'system';
  }

  if (isValidThemeMode(savedRecord)) {
    if (preferServerWhenSynced && normalizedServer) {
      return normalizedServer;
    }
    return savedRecord;
  }

  return normalizedServer ?? 'system';
}

/**
 * Validates profile display name before submitting to /api/users/profile.
 */
export function validateDisplayName(name: string): ValidationResult {
  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { valid: false, normalized, error: 'Display name is required.' };
  }
  if (normalized.length < 2) {
    return { valid: false, normalized, error: 'Name must be at least 2 characters.' };
  }
  if (normalized.length > 60) {
    return { valid: false, normalized, error: 'Name must be 60 characters or fewer.' };
  }
  return { valid: true, normalized };
}

/**
 * Validates new category/domain tag additions.
 */
export function validateCategoryName(
  name: string,
  existingCategories: string[]
): ValidationResult {
  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { valid: false, normalized, error: 'Enter a category name.' };
  }
  if (normalized.length > 32) {
    return { valid: false, normalized, error: 'Category must be 32 characters or fewer.' };
  }
  const duplicate = existingCategories.some(
    (cat) => cat.trim().toLowerCase() === normalized.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, normalized, error: `"${normalized}" is already in your workspace.` };
  }
  return { valid: true, normalized };
}

export function canRemoveCategory(categories: string[]): boolean {
  return Array.isArray(categories) && categories.length > 1;
}

export function normalizeReminderTimingDays(days: unknown): number[] {
  if (!Array.isArray(days)) {
    return [...DEFAULT_SETTINGS_PREFERENCES.defaultReminderTiming];
  }
  const valid = Array.from(
    new Set(
      days.filter(
        (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 30
      )
    )
  ).sort((a, b) => b - a);
  return valid;
}

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeQuietHours(
  start?: string | null,
  end?: string | null
): { quietHoursStart: string; quietHoursEnd: string } {
  const cleanStart = typeof start === 'string' ? start.trim() : '';
  const cleanEnd = typeof end === 'string' ? end.trim() : '';
  if (HHMM_REGEX.test(cleanStart) && HHMM_REGEX.test(cleanEnd)) {
    return { quietHoursStart: cleanStart, quietHoursEnd: cleanEnd };
  }
  return { quietHoursStart: '', quietHoursEnd: '' };
}

/**
 * Merges server User document with optional local offline overrides and onboarding prefs.
 */
export function mergeSettingsPreferences(
  user: {
    theme?: unknown;
    notificationsEnabled?: unknown;
    defaultReminderTiming?: unknown;
    quietHoursStart?: unknown;
    quietHoursEnd?: unknown;
    categories?: unknown;
    preferredCurrency?: unknown;
    aiPreferences?: { autoExtract?: unknown; suggestionsEnabled?: unknown };
  } | null,
  localOverrides?: Partial<SettingsPreferences> | null,
  onboardingPrefs?: Partial<OnboardingPreferences> | null
): SettingsPreferences {
  const theme: ThemeMode = isValidThemeMode(localOverrides?.theme)
    ? localOverrides.theme
    : isValidThemeMode(user?.theme)
    ? user.theme
    : DEFAULT_SETTINGS_PREFERENCES.theme;

  const notificationsEnabled =
    typeof localOverrides?.notificationsEnabled === 'boolean'
      ? localOverrides.notificationsEnabled
      : typeof user?.notificationsEnabled === 'boolean'
      ? user.notificationsEnabled
      : typeof onboardingPrefs?.notificationsEnabled === 'boolean'
      ? onboardingPrefs.notificationsEnabled
      : DEFAULT_SETTINGS_PREFERENCES.notificationsEnabled;

  const rawTiming =
    localOverrides?.defaultReminderTiming ??
    user?.defaultReminderTiming ??
    onboardingPrefs?.defaultReminderTiming;

  const defaultReminderTiming = Array.isArray(rawTiming)
    ? normalizeReminderTimingDays(rawTiming)
    : [...DEFAULT_SETTINGS_PREFERENCES.defaultReminderTiming];

  const quietHours = normalizeQuietHours(
    (localOverrides?.quietHoursStart ?? (user?.quietHoursStart as string | undefined)) || '',
    (localOverrides?.quietHoursEnd ?? (user?.quietHoursEnd as string | undefined)) || ''
  );

  const candidateCategories =
    Array.isArray(localOverrides?.categories) && localOverrides.categories.length > 0
      ? localOverrides.categories
      : Array.isArray(user?.categories) && user.categories.length > 0
      ? (user.categories as string[])
      : Array.isArray(onboardingPrefs?.categories) && onboardingPrefs.categories.length > 0
      ? onboardingPrefs.categories
      : [...DEFAULT_SETTINGS_PREFERENCES.categories];

  const rawCurrency =
    localOverrides?.preferredCurrency ??
    (user?.preferredCurrency as string | undefined) ??
    onboardingPrefs?.preferredCurrency;

  const preferredCurrency = normalizeCurrencyCode(rawCurrency);

  const autoExtract =
    typeof localOverrides?.aiPreferences?.autoExtract === 'boolean'
      ? localOverrides.aiPreferences.autoExtract
      : typeof user?.aiPreferences?.autoExtract === 'boolean'
      ? user.aiPreferences.autoExtract
      : DEFAULT_SETTINGS_PREFERENCES.aiPreferences.autoExtract;

  const suggestionsEnabled =
    typeof localOverrides?.aiPreferences?.suggestionsEnabled === 'boolean'
      ? localOverrides.aiPreferences.suggestionsEnabled
      : typeof user?.aiPreferences?.suggestionsEnabled === 'boolean'
      ? user.aiPreferences.suggestionsEnabled
      : DEFAULT_SETTINGS_PREFERENCES.aiPreferences.suggestionsEnabled;

  return {
    theme,
    notificationsEnabled,
    defaultReminderTiming,
    quietHoursStart: quietHours.quietHoursStart,
    quietHoursEnd: quietHours.quietHoursEnd,
    categories: Array.from(new Set(candidateCategories.map((c) => String(c).trim()).filter(Boolean))),
    preferredCurrency,
    aiPreferences: {
      autoExtract,
      suggestionsEnabled,
    },
  };
}

export const ALL_CURRENCY_OPTIONS: CurrencyInfo[] = Object.values(CURRENCIES);

export function filterCurrencies(query: string): CurrencyInfo[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return ALL_CURRENCY_OPTIONS;
  return ALL_CURRENCY_OPTIONS.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  );
}

export function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return 'Active member';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 'Active member';
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getAccountModeInfo(
  user: {
    name?: string;
    email?: string;
    isDemo?: boolean;
    createdAt?: string;
  } | null,
  isGuest: boolean
): AccountModeInfo {
  const effectiveGuest = Boolean(isGuest || user?.isDemo);

  if (effectiveGuest) {
    return {
      isGuest: true,
      accountTypeLabel: 'Guest Demo Session (2h Temporary)',
      emailLabel: 'Ephemeral demo workspace — not linked to an email',
      canEditProfile: true,
      canRequestPasswordReset: false,
      canDeleteAccount: false,
      canExportData: false,
      memberSinceLabel: 'Temporary session',
      securityNote:
        'Demo data is isolated and automatically purged when you exit the guest session. Create a free account to keep your records permanently.',
    };
  }

  return {
    isGuest: false,
    accountTypeLabel: 'Free Standard Account (Full Access)',
    emailLabel: user?.email || 'No email available',
    canEditProfile: true,
    canRequestPasswordReset: true,
    canDeleteAccount: true,
    canExportData: true,
    memberSinceLabel: formatMemberSince(user?.createdAt),
    securityNote:
      'Your session token is stored in encrypted device storage (Android Keystore / SecureStore) and isolated per account.',
  };
}

export function countExportRecords(payload: unknown): ExportDataSummary {
  const empty: ExportDataSummary = {
    tasks: 0,
    bills: 0,
    appointments: 0,
    reminders: 0,
    documents: 0,
    calendarEvents: 0,
    aiInteractions: 0,
    total: 0,
  };
  if (!payload || typeof payload !== 'object') return empty;
  const obj = payload as Record<string, unknown>;
  const len = (key: string) => (Array.isArray(obj[key]) ? obj[key].length : 0);

  const summary: ExportDataSummary = {
    tasks: len('tasks'),
    bills: len('bills'),
    appointments: len('appointments'),
    reminders: len('reminders'),
    documents: len('documents'),
    calendarEvents: len('calendarEvents'),
    aiInteractions: len('aiInteractions'),
    total: 0,
  };
  summary.total =
    summary.tasks +
    summary.bills +
    summary.appointments +
    summary.reminders +
    summary.documents +
    summary.calendarEvents +
    summary.aiInteractions;
  return summary;
}

