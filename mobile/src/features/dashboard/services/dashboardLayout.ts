/**
 * LifeAdmin Mobile — Dashboard Layout Presets, Customization & Daily Briefing Domain Logic
 * Synchronized with client/src/pages/DashboardPage.tsx.
 * Pure, dependency-free functions (testable in Node test runner).
 */

import {
  AttentionItem,
  DailyBriefingSummary,
  DashboardOverview,
  DashboardPresetDefinition,
  LayoutPresetKey,
  PersistedWidgetItem,
  WidgetConfig,
  WidgetId,
} from '../types';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  convertAmountTo,
  formatCurrency,
  normalizeCurrencyCode,
} from '../../../utils/currency';
import { extractServerErrorMessage } from '../../../services/apiErrorUtils';

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'needs_attention', label: 'Needs Attention (High Priority)', visible: true },
  { id: 'ai_briefing', label: 'AI Daily Briefing', visible: true },
  { id: 'tasks', label: 'Upcoming Tasks', visible: true },
  { id: 'bills', label: 'Upcoming Bills & Expenses', visible: true },
  { id: 'schedule', label: 'Today & Upcoming Schedule', visible: true },
  { id: 'reminders', label: 'Active Reminders', visible: true },
  { id: 'lifebuddy', label: 'LifeBuddy Companion', visible: true },
];

export const DASHBOARD_PRESETS: Record<LayoutPresetKey, DashboardPresetDefinition> = {
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Balanced workspace highlighting priorities and AI briefing, with LifeBuddy last',
    order: ['needs_attention', 'ai_briefing', 'tasks', 'bills', 'schedule', 'reminders', 'lifebuddy'],
  },
  focus: {
    key: 'focus',
    label: 'Focus',
    description: 'Prioritizes urgent tasks, daily schedule, and reminders first',
    order: ['needs_attention', 'tasks', 'schedule', 'ai_briefing', 'reminders', 'lifebuddy', 'bills'],
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    description: 'Places upcoming bills & expenses right below urgent alerts',
    order: ['needs_attention', 'bills', 'ai_briefing', 'tasks', 'schedule', 'lifebuddy', 'reminders'],
  },
};

const VALID_WIDGET_IDS = new Set<WidgetId>(DEFAULT_WIDGETS.map((w) => w.id));

/**
 * Generates an isolated storage key per authenticated user or guest workspace.
 */
export function getDashboardStorageKey(
  userId?: string | null,
  isGuest: boolean = false
): string {
  if (isGuest) {
    return 'lifeadmin_dashboard_layout_guest';
  }
  const cleanId = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';
  return `lifeadmin_dashboard_layout_${cleanId}`;
}

/**
 * Serializes widget configuration into compact storage payload.
 */
export function serializeWidgetConfigs(widgets: WidgetConfig[]): PersistedWidgetItem[] {
  return widgets.map((w) => ({
    id: w.id,
    visible: Boolean(w.visible),
  }));
}

/**
 * Reconstructs canonical WidgetConfig[] from stored/untrusted data,
 * preserving user ordering/visibility while ensuring any new default widgets are included.
 */
export function sanitizeWidgetConfigs(raw: unknown): WidgetConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_WIDGETS.map((w) => ({ ...w }));
  }

  const labelById = new Map<WidgetId, string>(
    DEFAULT_WIDGETS.map((w) => [w.id, w.label])
  );
  const seen = new Set<WidgetId>();
  const result: WidgetConfig[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidateId = (item as { id?: unknown }).id;
    if (
      typeof candidateId !== 'string' ||
      !VALID_WIDGET_IDS.has(candidateId as WidgetId)
    ) {
      continue;
    }
    const id = candidateId as WidgetId;
    if (seen.has(id)) continue;
    seen.add(id);

    const visibleVal = (item as { visible?: unknown }).visible;
    result.push({
      id,
      label: labelById.get(id) || id,
      visible: typeof visibleVal === 'boolean' ? visibleVal : true,
    });
  }

  // Append any default widgets missing from legacy saved configs
  for (const def of DEFAULT_WIDGETS) {
    if (!seen.has(def.id)) {
      result.push({ ...def });
    }
  }

  return result.length > 0 ? result : DEFAULT_WIDGETS.map((w) => ({ ...w }));
}

/**
 * Moves a widget one step up or down in the layout order.
 */
export function moveWidget(
  widgets: WidgetConfig[],
  index: number,
  direction: 'up' | 'down'
): WidgetConfig[] {
  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= widgets.length ||
    targetIdx < 0 ||
    targetIdx >= widgets.length
  ) {
    return widgets;
  }

  const reordered = widgets.map((w) => ({ ...w }));
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIdx, 0, moved);
  return reordered;
}

/**
 * Toggles visibility of a single dashboard widget.
 */
export function toggleWidgetVisibility(
  widgets: WidgetConfig[],
  id: WidgetId
): WidgetConfig[] {
  return widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : { ...w }));
}

/**
 * Reorders widgets to match a canonical preset while retaining existing visibility preferences.
 */
export function applyLayoutPreset(
  widgets: WidgetConfig[],
  presetKey: LayoutPresetKey
): WidgetConfig[] {
  const preset = DASHBOARD_PRESETS[presetKey] || DASHBOARD_PRESETS.standard;
  const currentMap = new Map<WidgetId, WidgetConfig>(
    widgets.map((w) => [w.id, w])
  );
  const defaultMap = new Map<WidgetId, WidgetConfig>(
    DEFAULT_WIDGETS.map((w) => [w.id, w])
  );

  return preset.order.map((id) => {
    const existing = currentMap.get(id);
    if (existing) {
      return { ...existing };
    }
    const def = defaultMap.get(id);
    return def ? { ...def } : { id, label: id, visible: true };
  });
}

/**
 * Returns a fresh copy of the default widget configuration.
 */
export function resetWidgets(): WidgetConfig[] {
  return DEFAULT_WIDGETS.map((w) => ({ ...w }));
}

/**
 * Identifies whether current widget order matches Standard, Focus, Finance, or Custom.
 */
export function detectActivePreset(
  widgets: WidgetConfig[]
): LayoutPresetKey | 'custom' {
  const ids = widgets.map((w) => w.id);
  const presetKeys: LayoutPresetKey[] = ['standard', 'focus', 'finance'];

  for (const key of presetKeys) {
    const order = DASHBOARD_PRESETS[key].order;
    if (
      ids.length === order.length &&
      ids.every((id, index) => id === order[index])
    ) {
      return key;
    }
  }

  return 'custom';
}

const MS_PER_DAY = 86_400_000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseYMDParts(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function ymdToDayNumber(ymd: string): number | null {
  const parts = parseYMDParts(ymd);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

/**
 * Formats a Date into local calendar YYYY-MM-DD (using timezoneOffsetMinutes if provided).
 */
export function getLocalCalendarYMD(
  date: Date = new Date(),
  timezoneOffsetMinutes?: number
): string {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (typeof timezoneOffsetMinutes === 'number' && Number.isFinite(timezoneOffsetMinutes)) {
    const shifted = new Date(safeDate.getTime() - Math.trunc(timezoneOffsetMinutes) * 60_000);
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  }
  return `${safeDate.getFullYear()}-${pad2(safeDate.getMonth() + 1)}-${pad2(safeDate.getDate())}`;
}

export function addCalendarDaysToYMD(ymd: string, deltaDays: number): string {
  const parts = parseYMDParts(ymd);
  if (!parts) return ymd;
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/**
 * Extracts calendar YYYY-MM-DD cleanly across UTC-midnight date strings and instant timestamps.
 */
export function extractItemCalendarYMD(
  input: string | Date | undefined,
  timezoneOffsetMinutes?: number
): string | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const pure = parseYMDParts(input);
    if (pure) {
      return `${pure.year}-${pad2(pure.month)}-${pad2(pure.day)}`;
    }
  }
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return null;

  if (
    dt.getUTCHours() === 0 &&
    dt.getUTCMinutes() === 0 &&
    dt.getUTCSeconds() === 0 &&
    dt.getUTCMilliseconds() === 0
  ) {
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }

  return getLocalCalendarYMD(dt, timezoneOffsetMinutes);
}

/**
 * Computes signed calendar-day difference (item - local today).
 * Returns 0 for today, 1..6 for the following 6 days, <0 for past/overdue, >=7 for Day 8+.
 */
export function getLocalCalendarDayDiff(
  targetDate: string | Date | undefined,
  referenceDate: Date = new Date(),
  timezoneOffsetMinutes?: number
): number | null {
  const todayYMD = getLocalCalendarYMD(referenceDate, timezoneOffsetMinutes);
  const itemYMD = extractItemCalendarYMD(targetDate, timezoneOffsetMinutes);
  if (!itemYMD) return null;
  const todayNum = ymdToDayNumber(todayYMD);
  const itemNum = ymdToDayNumber(itemYMD);
  if (todayNum === null || itemNum === null) return null;
  return itemNum - todayNum;
}

/**
 * Returns true only when targetDate falls inside the strict 7-day window
 * (today + following 6 calendar days = day diff 0..6 inclusive).
 */
export function isWithinSevenDayWindow(
  targetDate: string | Date | undefined,
  referenceDate: Date = new Date(),
  timezoneOffsetMinutes?: number
): boolean {
  const diff = getLocalCalendarDayDiff(targetDate, referenceDate, timezoneOffsetMinutes);
  return diff !== null && diff >= 0 && diff <= 6;
}

/**
 * Builds the explicit 7-calendar-day AI briefing prompt anchored to local date.
 */
export function buildSevenDayBriefingPrompt(
  referenceDate: Date = new Date(),
  timezoneOffsetMinutes?: number
): string {
  const startYMD = getLocalCalendarYMD(referenceDate, timezoneOffsetMinutes);
  const endYMD = addCalendarDaysToYMD(startYMD, 6);
  return `Give me my daily briefing for the next 7 calendar days only (${startYMD} through ${endYMD}, local date ${startYMD}). Cover only today and the following 6 calendar days, keep any overdue responsibilities separate from scheduled items, and exclude anything after ${endYMD}.`;
}

/**
 * Builds a structured Daily Briefing strictly from real dashboard API records
 * scoped to overdue responsibilities (separate) + today and the next 6 calendar days.
 * Never fabricates personal items or includes Day 8+ / 30-day forecasts.
 */
export function buildDailyBriefing(
  overview: DashboardOverview | null,
  preferredCurrency: string = DEFAULT_CURRENCY,
  exchangeRates: Record<string, number> = {},
  referenceDate: Date = new Date(),
  timezoneOffsetMinutes?: number
): DailyBriefingSummary {
  const targetCurrency: CurrencyCode = normalizeCurrencyCode(preferredCurrency);

  if (!overview) {
    return {
      headline: 'Workspace ready',
      pendingResponsibilities: [],
      upcomingDeadlines: [],
      billsRequiringAttention: [],
      totalUrgentBillsFormatted: formatCurrency(0, targetCurrency),
      suggestion: 'Add your first task, bill, or reminder to see real-time priorities.',
    };
  }

  const allAttention = overview.needsAttention || [];
  const allUpcoming = overview.upcoming || [];

  // Keep overdue responsibilities (excluding past appointments) and items within [0..6] days; exclude Day 8+
  const scopedAttention = allAttention.filter((item) => {
    const diff = getLocalCalendarDayDiff(item.dueDate, referenceDate, timezoneOffsetMinutes);
    if (diff === null) return item.severity !== 'overdue';
    if (item.type === 'appointment' && diff < 0) return false;
    return diff <= 6;
  });

  const pendingResponsibilities: AttentionItem[] = scopedAttention
    .filter((item) => item.type !== 'bill')
    .slice(0, 3);

  const billsRequiringAttention: AttentionItem[] = scopedAttention
    .filter((item) => item.type === 'bill')
    .slice(0, 3);

  // Strictly upcoming [0..6] calendar days (excludes overdue < 0 and Day 8+ >= 7)
  const scopedUpcoming = allUpcoming.filter((item) =>
    isWithinSevenDayWindow(item.date, referenceDate, timezoneOffsetMinutes)
  );

  const upcomingDeadlines = scopedUpcoming
    .filter(
      (item) =>
        item.type === 'task' ||
        item.type === 'appointment' ||
        item.type === 'event' ||
        item.type === 'document'
    )
    .slice(0, 3);

  const urgentBillsTotal = scopedAttention
    .filter((item) => item.type === 'bill')
    .reduce((sum, bill) => {
      const converted = convertAmountTo(
        bill.amount || 0,
        bill.currency,
        targetCurrency,
        exchangeRates
      );
      return sum + (Number.isFinite(converted) ? converted : 0);
    }, 0);

  const totalUrgentBillsFormatted = formatCurrency(urgentBillsTotal, targetCurrency);

  const overdueCount = scopedAttention.filter((item) => {
    const diff = getLocalCalendarDayDiff(item.dueDate, referenceDate, timezoneOffsetMinutes);
    return item.severity === 'overdue' || (diff !== null && diff < 0);
  }).length;
  const dueSoonCount = scopedAttention.filter((item) => {
    const diff = getLocalCalendarDayDiff(item.dueDate, referenceDate, timezoneOffsetMinutes);
    return diff !== null ? diff >= 0 && diff <= 6 : item.severity !== 'overdue';
  }).length;
  const upcomingSevenDayCount = upcomingDeadlines.length;

  let headline = 'All current responsibilities are on track';
  let suggestion =
    'No overdue or urgent deadlines right now for the next 7 calendar days. Add or review items anytime.';

  if (overdueCount > 0) {
    headline = `${overdueCount} overdue item${overdueCount === 1 ? ' needs' : 's need'} attention`;
    const firstOverdue = scopedAttention.find((item) => {
      const diff = getLocalCalendarDayDiff(item.dueDate, referenceDate, timezoneOffsetMinutes);
      return item.severity === 'overdue' || (diff !== null && diff < 0);
    });
    suggestion = firstOverdue
      ? `Prioritize clearing "${firstOverdue.title}" (${firstOverdue.urgencyLabel || 'overdue'}) separately from your upcoming 7-day schedule.`
      : 'Clear your overdue items first before taking on new commitments.';
  } else if (dueSoonCount > 0) {
    headline = `${dueSoonCount} item${dueSoonCount === 1 ? '' : 's'} due soon`;
    const firstSoon = scopedAttention[0];
    if (billsRequiringAttention.length > 0 && firstSoon?.type === 'bill') {
      suggestion = `Bills due within 7 days total ${totalUrgentBillsFormatted}. Reviewing "${firstSoon.title}" (${firstSoon.urgencyLabel}) keeps payments on time.`;
    } else if (firstSoon) {
      suggestion = `Focus on "${firstSoon.title}" (${firstSoon.urgencyLabel}) within the next 7 days.`;
    }
  } else if (upcomingSevenDayCount > 0) {
    headline = `${upcomingSevenDayCount} upcoming item${upcomingSevenDayCount === 1 ? '' : 's'} in the next 7 days`;
    suggestion = `Your urgent queue is clear. Next item in this 7-day window: "${upcomingDeadlines[0].title}".`;
  }

  return {
    headline,
    pendingResponsibilities,
    upcomingDeadlines,
    billsRequiringAttention,
    totalUrgentBillsFormatted,
    suggestion,
  };
}

export type DailyBriefingErrorCategory =
  | 'no_data'
  | 'ai_unavailable'
  | 'invalid_request'
  | 'auth'
  | 'network';

export interface DailyBriefingErrorInfo {
  category: DailyBriefingErrorCategory;
  label: string;
  message: string;
  retryable: boolean;
}

const RAW_HTTP_STATUS_REGEX = /^http\s+error\s+\d+$/i;

function sanitizeErrorText(text: unknown): string {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed || RAW_HTTP_STATUS_REGEX.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Returns true if the dashboard overview contains any user activity data
 * (tasks, bills, appointments, events, documents, reminders, or non-zero stats).
 */
export function hasBriefingActivityData(overview: DashboardOverview | null | undefined): boolean {
  if (!overview) return false;
  if ((overview.needsAttention?.length || 0) > 0) return true;
  if ((overview.upcoming?.length || 0) > 0) return true;
  if ((overview.reminders?.length || 0) > 0) return true;

  const stats = overview.stats;
  if (!stats) return false;
  return (
    (stats.overdueCount || 0) > 0 ||
    (stats.dueSoonCount || 0) > 0 ||
    (stats.upcomingCount || 0) > 0 ||
    (stats.activeReminders || 0) > 0
  );
}

/**
 * Produces a calm informational notice when the user has zero responsibilities yet.
 */
export function getEmptyBriefingNotice(
  overview: DashboardOverview | null | undefined,
  isLoadingOverview: boolean = false
): string | null {
  if (isLoadingOverview || hasBriefingActivityData(overview)) {
    return null;
  }
  if (!overview) {
    return 'No data available yet. Pull to refresh or add a task, bill, or reminder.';
  }
  return 'No data available yet — add a task, bill, appointment, or reminder, or generate an AI check-in.';
}

/**
 * Prevents duplicate concurrent AI briefing requests and rapid double-taps.
 */
export function canStartBriefingRequest(
  inFlight: boolean,
  lastAttemptAt: number | null,
  now: number,
  isRetry: boolean = false,
  cooldownMs: number = 1000
): boolean {
  if (inFlight) {
    return false;
  }
  if (!isRetry && lastAttemptAt !== null && now - lastAttemptAt < cooldownMs) {
    return false;
  }
  return true;
}

/**
 * Classifies AI Daily Briefing errors into clear, actionable categories
 * without exposing raw HTTP status codes such as "HTTP Error 400".
 */
export function classifyDailyBriefingError(err: unknown): DailyBriefingErrorInfo {
  const errObj =
    typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
  const status = typeof errObj.status === 'number' ? errObj.status : undefined;
  const code = typeof errObj.code === 'string' ? errObj.code : '';
  const details = errObj.details;
  const rawMessage = sanitizeErrorText(errObj.message);

  if (
    code === 'NO_DATA' ||
    /no data available|nothing to brief|empty workspace/i.test(rawMessage)
  ) {
    return {
      category: 'no_data',
      label: 'No Data Available',
      message:
        'No data available yet. Add a task, bill, appointment, or reminder to generate a personalized briefing.',
      retryable: true,
    };
  }

  if (
    status === 0 ||
    status === 408 ||
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT' ||
    /network request failed|cannot reach|network error|timed out|timeout|offline|econnrefused|enotfound|fetch failed/i.test(
      rawMessage
    )
  ) {
    return {
      category: 'network',
      label: 'Connection Issue',
      message: 'Network connection issue. Check your internet connection and tap Retry.',
      retryable: true,
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    code === 'AUTH_REQUIRED' ||
    /authentication required|token expired|invalid token|user not found|unauthorized|session.*expired|onboarding not completed/i.test(
      rawMessage
    )
  ) {
    if (status === 403 && /onboarding/i.test(rawMessage)) {
      return {
        category: 'auth',
        label: 'Setup Required',
        message: 'Complete account onboarding to unlock AI Daily Briefing, then tap Retry.',
        retryable: true,
      };
    }
    return {
      category: 'auth',
      label: 'Session Issue',
      message: 'Your session expired or needs sign-in. Please sign in again and tap Retry.',
      retryable: true,
    };
  }

  if (
    status === 400 ||
    status === 422 ||
    code === 'INVALID_REQUEST' ||
    /message is required|validation failed|invalid request/i.test(rawMessage)
  ) {
    const serverDetail = sanitizeErrorText(
      extractServerErrorMessage(
        details ?? (rawMessage ? { message: rawMessage } : null),
        status || 400
      )
    );
    const defaultInvalidMsg = 'Briefing request could not be validated. Please tap Retry.';
    const message =
      serverDetail && serverDetail !== getDefaultStatus400Fallback()
        ? `Invalid briefing request: ${serverDetail}`
        : defaultInvalidMsg;

    return {
      category: 'invalid_request',
      label: 'Invalid Request',
      message,
      retryable: true,
    };
  }

  if (
    (status !== undefined && status >= 500) ||
    code === 'AI_UNAVAILABLE' ||
    /unavailable|quota|rate limit|ai service|gemini|overloaded|bad gateway|gateway timeout|service error/i.test(
      rawMessage
    )
  ) {
    return {
      category: 'ai_unavailable',
      label: 'AI Service Unavailable',
      message:
        'The AI briefing service is temporarily unavailable. Review your summary above or tap Retry shortly.',
      retryable: true,
    };
  }

  return {
    category: 'ai_unavailable',
    label: 'AI Service Unavailable',
    message:
      rawMessage ||
      'Unable to generate AI briefing right now. Please tap Retry in a moment.',
    retryable: true,
  };
}

function getDefaultStatus400Fallback(): string {
  return 'The request could not be processed. Please check your input and try again.';
}
