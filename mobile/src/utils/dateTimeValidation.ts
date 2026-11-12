/**
 * LifeAdmin Mobile — Strict Date & Time Validation and Formatting Utilities
 * Pure TypeScript (zero React Native runtime imports) shared across pickers,
 * forms, domain validation, and regression tests without local timezone drift.
 */

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a Date into local calendar YYYY-MM-DD without UTC conversion drift.
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Strictly parses a YYYY-MM-DD string into a local-midnight Date.
 * Rejects malformed strings and impossible calendar dates (e.g. 2026-02-30, 2025-02-29).
 */
export function parseLocalISODate(isoDate?: string | null): Date | null {
  if (!isoDate || typeof isoDate !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

/**
 * Returns true when isoDate is a real calendar date in YYYY-MM-DD format.
 */
export function isValidLocalISODate(isoDate?: string | null): boolean {
  return parseLocalISODate(isoDate) !== null;
}

/**
 * Formats a YYYY-MM-DD date into a readable label (e.g. 'Sun, Nov 15, 2026').
 */
export function formatDisplayDate(
  isoDate?: string | null,
  fallback = 'Select a date'
): string {
  const parsed = parseLocalISODate(isoDate);
  if (!parsed) return fallback;
  return `${SHORT_WEEKDAYS[parsed.getDay()]}, ${SHORT_MONTHS[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}

/**
 * Resolves a date-picker interaction into YYYY-MM-DD, preserving currentIsoDate
 * on cancellation or invalid dates.
 */
export function resolveDatePickerSelection(
  currentIsoDate: string,
  pickedDate?: Date | null,
  cancelled = false
): string {
  if (
    cancelled ||
    !(pickedDate instanceof Date) ||
    Number.isNaN(pickedDate.getTime())
  ) {
    return currentIsoDate;
  }
  return toLocalISODate(pickedDate);
}

/**
 * Converts a validated local YYYY-MM-DD date string to a UTC-midnight ISO string
 * preserving the exact calendar date (zero timezone rollover).
 */
export function toUtcMidnightIsoFromLocalDate(localIsoDate: string): string | null {
  const parsed = parseLocalISODate(localIsoDate);
  if (!parsed) return null;
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  ).toISOString();
}

/**
 * Strictly parses a 24-hour "HH:mm" string. Rejects invalid hours/minutes
 * such as "24:00", "12:60", or single-digit hours like "9:30".
 */
export function parseHHMMTime(
  timeStr?: string | null
): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

/**
 * Returns true when timeStr strictly conforms to valid 24-hour "HH:mm".
 */
export function isValidHHMMTime(timeStr?: string | null): boolean {
  return parseHHMMTime(timeStr) !== null;
}

/**
 * Formats a Date into 24-hour "HH:mm" string using local hours and minutes.
 */
export function toHHMMTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Hydrates a Date positioned at the local hours/minutes of an "HH:mm" string.
 */
export function parseHHMMTimeToDate(
  timeStr?: string | null,
  referenceDate: Date = new Date()
): Date | null {
  const parsed = parseHHMMTime(timeStr);
  if (!parsed) return null;
  const d = new Date(referenceDate);
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
}

/**
 * Formats a 24-hour "HH:mm" time into a readable 12-hour label (e.g. "2:30 PM").
 */
export function formatDisplayTime(
  timeStr?: string | null,
  fallback = 'Choose time'
): string {
  const parsed = parseHHMMTime(timeStr);
  if (!parsed) return fallback;
  const period = parsed.hours >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hours % 12 || 12;
  const minPadded = String(parsed.minutes).padStart(2, '0');
  return `${hour12}:${minPadded} ${period}`;
}

/**
 * Resolves a time-picker interaction into 24-hour "HH:mm", preserving currentTime
 * on cancellation or invalid dates.
 */
export function resolveTimePickerSelection(
  currentTime: string,
  pickedDate?: Date | null,
  cancelled = false
): string {
  if (
    cancelled ||
    !(pickedDate instanceof Date) ||
    Number.isNaN(pickedDate.getTime())
  ) {
    return currentTime;
  }
  return toHHMMTime(pickedDate);
}

export interface TimeRangeValidationResult {
  valid: boolean;
  startError?: string;
  endError?: string;
}

/**
 * Validates optional/required 24h start & end time fields and ensures end time
 * is strictly later than start time when both are supplied.
 */
export function validateTimeRangeOrder(
  startTime?: string | null,
  endTime?: string | null,
  options: { requireStartWhenEndSet?: boolean } = {}
): TimeRangeValidationResult {
  const startTrimmed = typeof startTime === 'string' ? startTime.trim() : '';
  const endTrimmed = typeof endTime === 'string' ? endTime.trim() : '';

  if (startTrimmed && !isValidHHMMTime(startTrimmed)) {
    return { valid: false, startError: 'Start time must be valid HH:mm (24h)' };
  }

  if (endTrimmed && !isValidHHMMTime(endTrimmed)) {
    return { valid: false, endError: 'End time must be valid HH:mm (24h)' };
  }

  if (endTrimmed && !startTrimmed && options.requireStartWhenEndSet) {
    return {
      valid: false,
      startError: 'Select a start time before setting an end time',
    };
  }

  if (startTrimmed && endTrimmed) {
    const start = parseHHMMTime(startTrimmed)!;
    const end = parseHHMMTime(endTrimmed)!;
    const startMins = start.hours * 60 + start.minutes;
    const endMins = end.hours * 60 + end.minutes;

    if (endMins <= startMins) {
      return {
        valid: false,
        endError: 'End time must be after start time',
      };
    }
  }

  return { valid: true };
}

