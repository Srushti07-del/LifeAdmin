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

export const INTERVAL_OPTIONS = [
  { minutes: 1440, label: '1 day before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 15, label: '15 mins before' },
  { minutes: 0, label: 'At scheduled time' },
];

export const DEFAULT_NOTIFICATION_TYPES = {
  tasks: true,
  bills: true,
  appointments: true,
  reminders: true,
};

export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

// Convert "HH:mm" (24h) to "h:mm AM/PM" (12h)
export function format12h(time24: string): string {
  if (!time24 || typeof time24 !== 'string') return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Convert "h:mm AM/PM" (12h) to "HH:mm" (24h)
export function format24h(time12: string): string | null {
  if (!time12 || typeof time12 !== 'string') return null;
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (h < 1 || h > 12 || m > 59) return null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function isValidTime12h(time: string): boolean {
  return format24h(time) !== null;
}

export const DEFAULT_SETTINGS_PREFERENCES: SettingsPreferences = {
  theme: 'system',
  notificationsEnabled: true,
  defaultReminderTiming: [7, 3, 1, 0],
  quietHoursStart: '',
  quietHoursEnd: '',
  quietHoursEnabled: false,
  categories: [...SENSIBLE_DEFAULT_CATEGORIES, 'Education', 'Home'],
  preferredCurrency: DEFAULT_CURRENCY,
  aiPreferences: {
    autoExtract: true,
    suggestionsEnabled: true,
  },
  notificationTypes: { ...DEFAULT_NOTIFICATION_TYPES },
  emailReminderIntervals: [1440, 60],
  timezone: 'UTC',
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
    quietHoursEnabled?: unknown;
    categories?: unknown;
    preferredCurrency?: unknown;
    aiPreferences?: { autoExtract?: unknown; suggestionsEnabled?: unknown };
    notificationTypes?: {
      tasks?: boolean;
      bills?: boolean;
      appointments?: boolean;
      reminders?: boolean;
    };
    emailReminderIntervals?: unknown;
    timezone?: unknown;
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

  const notificationTypes = {
    tasks: localOverrides?.notificationTypes?.tasks ?? user?.notificationTypes?.tasks ?? DEFAULT_NOTIFICATION_TYPES.tasks,
    bills: localOverrides?.notificationTypes?.bills ?? user?.notificationTypes?.bills ?? DEFAULT_NOTIFICATION_TYPES.bills,
    appointments: localOverrides?.notificationTypes?.appointments ?? user?.notificationTypes?.appointments ?? DEFAULT_NOTIFICATION_TYPES.appointments,
    reminders: localOverrides?.notificationTypes?.reminders ?? user?.notificationTypes?.reminders ?? DEFAULT_NOTIFICATION_TYPES.reminders,
  };

  const emailReminderIntervals = Array.isArray(localOverrides?.emailReminderIntervals)
    ? localOverrides.emailReminderIntervals
    : Array.isArray(user?.emailReminderIntervals)
    ? (user.emailReminderIntervals as number[])
    : DEFAULT_SETTINGS_PREFERENCES.emailReminderIntervals || [1440, 60];

  const timezone = typeof localOverrides?.timezone === 'string' && localOverrides.timezone
    ? localOverrides.timezone
    : typeof user?.timezone === 'string' && user.timezone
    ? (user.timezone as string)
    : DEFAULT_SETTINGS_PREFERENCES.timezone || 'UTC';

  const quietHoursEnabled = typeof localOverrides?.quietHoursEnabled === 'boolean'
    ? localOverrides.quietHoursEnabled
    : typeof user?.quietHoursEnabled === 'boolean'
    ? (user.quietHoursEnabled as boolean)
    : Boolean(quietHours.quietHoursStart && quietHours.quietHoursEnd);

  return {
    theme,
    notificationsEnabled,
    defaultReminderTiming,
    quietHoursStart: quietHours.quietHoursStart,
    quietHoursEnd: quietHours.quietHoursEnd,
    quietHoursEnabled,
    categories: Array.from(new Set(candidateCategories.map((c) => String(c).trim()).filter(Boolean))),
    preferredCurrency,
    aiPreferences: {
      autoExtract,
      suggestionsEnabled,
    },
    notificationTypes,
    emailReminderIntervals,
    timezone,
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
  isGuest: boolean = false
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

