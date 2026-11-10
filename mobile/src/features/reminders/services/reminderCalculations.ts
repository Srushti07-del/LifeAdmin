/**
 * LifeAdmin Mobile — Reminders Calculations & Helpers
 * Pure domain logic: due date normalization, offset math, timeline grouping,
 * recurrence progression, search, and notification payload generation.
 */

import {
  Reminder,
  ReminderSectionKey,
  GroupedReminders,
  ReminderTotals,
  ReminderRecurrenceType,
} from '../types';

export const ALLOWED_OFFSETS = [0, 5, 15, 30, 60] as const;

export const OFFSET_LABELS: Record<number, string> = {
  0: 'At time of event',
  5: '5 min before',
  15: '15 min before',
  30: '30 min before',
  60: '1 hour before',
};

/**
 * Returns a normalized Date object representing the precise reminder due time.
 * If no dueTime is provided, defaults to 09:00:00 local time matching server convention.
 */
export function getDueAt(dueDate: string | Date, dueTime?: string): Date {
  const base = new Date(dueDate);
  if (isNaN(base.getTime())) return new Date();

  if (dueTime && /^\d{1,2}:\d{2}$/.test(dueTime)) {
    const [h, m] = dueTime.split(':').map((v) => parseInt(v, 10));
    base.setHours(h || 0, m || 0, 0, 0);
  } else {
    // If only date is specified, use 09:00:00 local morning time
    base.setHours(9, 0, 0, 0);
  }
  return base;
}

/**
 * Calculates the exact trigger timestamp for a notification given an offset in minutes.
 */
export function getAlertTime(dueAt: Date, offsetMinutes: number): Date {
  return new Date(dueAt.getTime() - offsetMinutes * 60 * 1000);
}

/**
 * Formats offset minutes into a human-readable label
 */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'At scheduled time';
  if (offsetMinutes === 60) return '1 hour before';
  return `${offsetMinutes} min before`;
}

/**
 * Checks if two dates fall on the exact same local calendar day
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Normalizes date to 00:00:00.000 local time
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Determines which timeline section a reminder belongs to:
 * - 'completed': status is 'completed'
 * - 'overdue': due date/time has passed and not completed
 * - 'today': due today in local time and not completed
 * - 'upcoming': due on future dates
 */
export function getReminderSection(
  reminder: Reminder,
  now: Date = new Date()
): ReminderSectionKey {
  if (reminder.status === 'completed') {
    return 'completed';
  }

  const due = getDueAt(reminder.dueDate, reminder.dueTime);

  if (due.getTime() < now.getTime()) {
    return 'overdue';
  }

  if (isSameDay(due, now)) {
    return 'today';
  }

  return 'upcoming';
}

/**
 * Aggregates dashboard counts across all sections
 */
export function calculateReminderTotals(
  reminders: Reminder[],
  now: Date = new Date()
): ReminderTotals {
  let activeCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let completedCount = 0;

  for (const r of reminders) {
    const sec = getReminderSection(r, now);
    if (sec === 'completed') {
      completedCount++;
    } else {
      activeCount++;
      if (sec === 'today') todayCount++;
      else if (sec === 'upcoming') upcomingCount++;
      else if (sec === 'overdue') overdueCount++;
    }
  }

  return {
    totalCount: reminders.length,
    activeCount,
    todayCount,
    upcomingCount,
    overdueCount,
    completedCount,
  };
}

/**
 * Groups reminders into sectioned timeline arrays
 */
export function groupRemindersBySection(
  reminders: Reminder[],
  now: Date = new Date()
): GroupedReminders {
  const grouped: GroupedReminders = {
    today: [],
    upcoming: [],
    overdue: [],
    completed: [],
  };

  for (const r of reminders) {
    const section = getReminderSection(r, now);
    grouped[section].push(r);
  }

  // Sort today & upcoming by earliest due date first
  const sortByEarliest = (a: Reminder, b: Reminder) =>
    getDueAt(a.dueDate, a.dueTime).getTime() - getDueAt(b.dueDate, b.dueTime).getTime();

  grouped.today.sort(sortByEarliest);
  grouped.upcoming.sort(sortByEarliest);

  // Sort overdue by most recently overdue first
  grouped.overdue.sort(
    (a, b) =>
      getDueAt(b.dueDate, b.dueTime).getTime() - getDueAt(a.dueDate, a.dueTime).getTime()
  );

  // Sort completed by completion date or due date descending
  grouped.completed.sort((a, b) => {
    const tA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.updatedAt || a.createdAt).getTime();
    const tB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.updatedAt || b.createdAt).getTime();
    return tB - tA;
  });

  return grouped;
}

/**
 * Filters and sorts reminders collection
 */
export function filterAndSortReminders(
  reminders: Reminder[],
  filterSection: string = 'all',
  category: string = 'all',
  priority: string = 'all',
  searchQuery: string = '',
  sortOrder: 'dueDate' | '-dueDate' = 'dueDate',
  now: Date = new Date()
): Reminder[] {
  let list = reminders;

  // 1. Section / Status filter
  if (filterSection !== 'all') {
    list = list.filter((r) => {
      const sec = getReminderSection(r, now);
      if (filterSection === 'active') return sec !== 'completed';
      return sec === filterSection;
    });
  }

  // 2. Category filter
  if (category && category !== 'all' && category !== 'All') {
    list = list.filter(
      (r) => (r.category || 'Personal').toLowerCase() === category.toLowerCase()
    );
  }

  // 3. Priority filter
  if (priority && priority !== 'all') {
    list = list.filter((r) => r.priority === priority);
  }

  // 4. Search query
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((r) => {
      const titleMatch = (r.title || '').toLowerCase().includes(q);
      const descMatch = (r.description || '').toLowerCase().includes(q);
      const catMatch = (r.category || '').toLowerCase().includes(q);
      return titleMatch || descMatch || catMatch;
    });
  }

  // 5. Sort
  return [...list].sort((a, b) => {
    const da = getDueAt(a.dueDate, a.dueTime).getTime();
    const db = getDueAt(b.dueDate, b.dueTime).getTime();
    return sortOrder === 'dueDate' ? da - db : db - da;
  });
}

/**
 * Formats reminder due date into human readable string
 */
export function formatReminderDueDate(
  dueDate: string | Date,
  dueTime?: string,
  now: Date = new Date()
): string {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return String(dueDate);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isSameDay(d, now)) {
    return 'Today';
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) {
    return 'Tomorrow';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return 'Yesterday';
  }

  const weekday = weekdays[d.getDay()];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  if (year === now.getFullYear()) {
    return `${weekday}, ${month} ${day}`;
  }

  return `${weekday}, ${month} ${day}, ${year}`;
}

/**
 * Formats 24h due time "HH:mm" into "10:30 AM"
 */
export function formatReminderDueTime(dueTime?: string): string {
  if (!dueTime) return '';
  const parts = dueTime.split(':');
  if (parts.length < 2) return dueTime;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h)) return dueTime;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = isNaN(m) ? '00' : String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

/**
 * Computes next occurrence date for recurring reminders
 */
export function calculateNextRecurringDate(
  dueDate: string | Date,
  recurrence?: { type: ReminderRecurrenceType; interval?: number }
): Date | null {
  if (!recurrence || recurrence.type === 'none') return null;

  const interval = Math.max(1, recurrence.interval || 1);
  const next = new Date(dueDate);

  switch (recurrence.type) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      return next;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      return next;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      return next;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      return next;
    default:
      return null;
  }
}

/**
 * Builds a deterministic notification identifier to prevent duplicate schedules
 * and isolate notifications per authenticated user
 */
export function buildNotificationIdentifier(
  reminderId: string,
  offsetMinutes: number,
  userId?: string
): string {
  const safeUser = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeId = reminderId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `lifeadmin:reminder:${safeUser}:${safeId}:${offsetMinutes}`;
}

/**
 * Builds notification content (title, body, payload data)
 */
export function buildNotificationContent(
  reminder: Reminder,
  offsetMinutes: number,
  userId?: string
) {
  const isNow = offsetMinutes === 0;
  const title = isNow ? `Reminder: ${reminder.title}` : `Upcoming: ${reminder.title}`;

  let body = isNow
    ? 'This scheduled reminder is due right now.'
    : offsetMinutes === 60
    ? 'This reminder is due in 1 hour.'
    : `This reminder is due in ${offsetMinutes} minutes.`;

  if (reminder.description) {
    body += `\n${reminder.description}`;
  }

  const effectiveUserId = userId || reminder.userId || '';

  return {
    title,
    body,
    data: {
      userId: effectiveUserId,
      reminderId: reminder._id,
      entityType: reminder.entityType || 'custom',
      entityId: reminder.entityId,
      url: `/reminders?reminderId=${reminder._id}`,
    },
    sound: true,
  };
}

/**
 * Evaluates which permission banner (if any) should be displayed
 */
export function determineActivePermissionBanner(
  status: { notificationsGranted: boolean; exactAlarmGranted: boolean },
  dismissed: { notifications?: boolean; exact_alarm?: boolean } = {}
): 'notifications' | 'exact_alarm' | null {
  if (!status.notificationsGranted && !dismissed.notifications) {
    return 'notifications';
  }
  if (!status.exactAlarmGranted && !dismissed.exact_alarm) {
    return 'exact_alarm';
  }
  return null;
}

/**
 * Checks whether exact alarms require explicit user grant on the current platform
 */
export function isExactAlarmRequiredOnPlatform(
  platformOs: string,
  apiLevel?: number
): boolean {
  if (platformOs !== 'android') return false;
  // Android 14+ (API 34+) denies SCHEDULE_EXACT_ALARM by default
  if (apiLevel !== undefined) {
    return apiLevel >= 34;
  }
  return true;
}

/**
 * Evaluates whether scheduling should rely on best-effort fallback
 */
export function shouldFallbackToBestEffort(exactAlarmGranted: boolean): boolean {
  return !exactAlarmGranted;
}
