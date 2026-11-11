/**
 * LifeAdmin Mobile — Settings & Profile Feature Types
 */

import { CurrencyCode } from '../../utils/currency';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ScopedThemeRecord {
  theme: ThemeMode;
  synced: boolean;
  updatedAt?: string;
}

export interface SettingsPreferences {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  defaultReminderTiming: number[];
  quietHoursStart: string;
  quietHoursEnd: string;
  categories: string[];
  preferredCurrency: CurrencyCode;
  aiPreferences: {
    autoExtract: boolean;
    suggestionsEnabled: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface QuietHoursPreset {
  id: string;
  label: string;
  start: string;
  end: string;
}

export interface AlertTimingOption {
  days: number;
  label: string;
  shortLabel: string;
}

export interface AccountModeInfo {
  isGuest: boolean;
  accountTypeLabel: string;
  emailLabel: string;
  canEditProfile: boolean;
  canRequestPasswordReset: boolean;
  canDeleteAccount: boolean;
  canExportData: boolean;
  memberSinceLabel: string;
  securityNote: string;
}

export interface ExportDataSummary {
  tasks: number;
  bills: number;
  appointments: number;
  reminders: number;
  documents: number;
  calendarEvents: number;
  aiInteractions: number;
  total: number;
}

