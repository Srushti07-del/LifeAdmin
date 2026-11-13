export interface SevenDayWindowOptions {
  now?: Date;
  localDate?: string;
  timezoneOffsetMinutes?: number;
}

export interface SevenDayWindowMeta {
  localDate: string;
  startDate: string;
  endDate: string;
  totalDays: 7;
  timezoneOffsetMinutes: number;
}

export interface ScopedTaskItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority: string;
  status: string;
  category: string;
  daysFromToday: number;
}

export interface ScopedBillItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  provider?: string;
  paymentStatus: string;
  daysFromToday: number;
}

export interface ScopedAppointmentItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  daysFromToday: number;
}

export interface ScopedReminderItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority: string;
  status: string;
  daysFromToday: number;
}

export interface StrictSevenDayContext {
  window: SevenDayWindowMeta;
  overdue: {
    tasks: ScopedTaskItem[];
    bills: ScopedBillItem[];
    reminders: ScopedReminderItem[];
  };
  scheduled: {
    tasks: ScopedTaskItem[];
    bills: ScopedBillItem[];
    appointments: ScopedAppointmentItem[];
    reminders: ScopedReminderItem[];
  };
  summary: {
    overdueCount: number;
    overdueTaskCount: number;
    overdueBillCount: number;
    overdueReminderCount: number;
    scheduledCount: number;
    scheduledTaskCount: number;
    scheduledBillCount: number;
    scheduledAppointmentCount: number;
    scheduledReminderCount: number;
    dueTodayCount: number;
  };
}

const MS_PER_DAY = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatYMDParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYMD(value: unknown): { year: number; month: number; day: number } | null {
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

export function ymdToDayNumber(ymd: string): number | null {
  const parts = parseYMD(ymd);
  if (!parts) return null;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

export function addDaysToYMD(ymd: string, deltaDays: number): string {
  const parts = parseYMD(ymd);
  if (!parts) return ymd;
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays));
  return formatYMDParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Resolves the user's local current calendar date ("YYYY-MM-DD").
 */
export function resolveLocalTodayYMD(options: SevenDayWindowOptions = {}): {
  localDate: string;
  timezoneOffsetMinutes: number;
} {
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime())
    ? options.now
    : new Date();
  const tzOffset =
    typeof options.timezoneOffsetMinutes === 'number' &&
    Number.isFinite(options.timezoneOffsetMinutes)
      ? Math.trunc(options.timezoneOffsetMinutes)
      : now.getTimezoneOffset();

  const parsedClientDate = parseYMD(options.localDate);
  if (parsedClientDate) {
    return {
      localDate: formatYMDParts(
        parsedClientDate.year,
        parsedClientDate.month,
        parsedClientDate.day
      ),
      timezoneOffsetMinutes: tzOffset,
    };
  }

  // Convert UTC instant to client's local wall-clock calendar date
  const shifted = new Date(now.getTime() - tzOffset * 60_000);
  return {
    localDate: formatYMDParts(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate()
    ),
    timezoneOffsetMinutes: tzOffset,
  };
}

/**
 * Converts a stored Date or date string into its calendar YYYY-MM-DD respecting timezone boundaries.
 * Pure YYYY-MM-DD strings and UTC midnight timestamps (stored date-only fields) preserve their date,
 * while non-midnight instant timestamps shift by timezoneOffsetMinutes.
 */
export function extractCalendarYMD(
  input: unknown,
  timezoneOffsetMinutes: number
): string | null {
  if (!input) return null;

  if (typeof input === 'string') {
    const pure = parseYMD(input);
    if (pure) {
      return formatYMDParts(pure.year, pure.month, pure.day);
    }
  }

  const dt = input instanceof Date ? input : new Date(input as string | number);
  if (Number.isNaN(dt.getTime())) return null;

  if (
    dt.getUTCHours() === 0 &&
    dt.getUTCMinutes() === 0 &&
    dt.getUTCSeconds() === 0 &&
    dt.getUTCMilliseconds() === 0
  ) {
    return formatYMDParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  const shifted = new Date(dt.getTime() - timezoneOffsetMinutes * 60_000);
  return formatYMDParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
}

export function getCalendarDayDiff(
  input: unknown,
  todayYMD: string,
  timezoneOffsetMinutes: number
): number | null {
  const itemYMD = extractCalendarYMD(input, timezoneOffsetMinutes);
  if (!itemYMD) return null;
  const itemDay = ymdToDayNumber(itemYMD);
  const baseDay = ymdToDayNumber(todayYMD);
  if (itemDay === null || baseDay === null) return null;
  return itemDay - baseDay;
}

export function isSevenDayBriefingQuery(
  message: string,
  scope?: unknown,
  windowDays?: unknown
): boolean {
  if (scope === 'daily_briefing_7d' || Number(windowDays) === 7) {
    return true;
  }
  const normalized = typeof message === 'string' ? message.toLowerCase() : '';
  if (!normalized) return false;
  if (/\b(30\s*days?|next\s+month|monthly|all\s+upcoming)\b/.test(normalized)) {
    return false;
  }
  return /\b(daily\s+brief(ing)?|7[\s-]?day|next\s+(7|seven)\s+(calendar\s+)?days?|focus\s+on\s+today)\b/.test(
    normalized
  );
}

function formatScopedMoney(amount: unknown, currency: string = 'INR '): string {
  const n = Number(amount);
  const cur = currency === '₹' ? 'INR ' : currency || 'INR ';
  return `${cur}${Number.isFinite(n) ? n.toLocaleString('en-IN') : '0'}`;
}

function formatHumanYMD(ymd: string): string {
  const parts = parseYMD(ymd);
  if (!parts) return ymd;
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Filters raw MongoDB records into a strict 7-day window ([today, today + 6 calendar days]),
 * keeping genuinely overdue items separated from scheduled 7-day items and excluding day 8+ items.
 */
export function buildStrictSevenDayContext(
  records: {
    tasks?: any[];
    bills?: any[];
    appointments?: any[];
    reminders?: any[];
  },
  options: SevenDayWindowOptions = {}
): StrictSevenDayContext {
  const { localDate, timezoneOffsetMinutes } = resolveLocalTodayYMD(options);
  const endDate = addDaysToYMD(localDate, 6);

  const overdueTasks: ScopedTaskItem[] = [];
  const scheduledTasks: ScopedTaskItem[] = [];
  for (const t of records.tasks || []) {
    if (!t || t.status === 'completed' || !t.dueDate) continue;
    const itemYMD = extractCalendarYMD(t.dueDate, timezoneOffsetMinutes);
    const diff = getCalendarDayDiff(t.dueDate, localDate, timezoneOffsetMinutes);
    if (diff === null || !itemYMD) continue;

    const item: ScopedTaskItem = {
      id: String(t._id || t.id || ''),
      title: String(t.title || ''),
      dueDate: itemYMD,
      dueTime: t.dueTime || undefined,
      priority: String(t.priority || 'medium'),
      status: String(t.status || 'todo'),
      category: String(t.category || 'Personal'),
      daysFromToday: diff,
    };

    if (diff < 0) {
      overdueTasks.push(item);
    } else if (diff <= 6) {
      scheduledTasks.push(item);
    }
    // diff >= 7 (Day 8+) is strictly excluded
  }

  const overdueBills: ScopedBillItem[] = [];
  const scheduledBills: ScopedBillItem[] = [];
  for (const b of records.bills || []) {
    if (!b || b.paymentStatus === 'paid' || !b.dueDate) continue;
    const itemYMD = extractCalendarYMD(b.dueDate, timezoneOffsetMinutes);
    const diff = getCalendarDayDiff(b.dueDate, localDate, timezoneOffsetMinutes);
    if (diff === null || !itemYMD) continue;

    const item: ScopedBillItem = {
      id: String(b._id || b.id || ''),
      title: String(b.name || b.title || ''),
      amount: Number(b.amount) || 0,
      currency: String(b.currency || '₹'),
      dueDate: itemYMD,
      provider: b.provider || undefined,
      paymentStatus: String(b.paymentStatus || 'pending'),
      daysFromToday: diff,
    };

    if (diff < 0) {
      overdueBills.push(item);
    } else if (diff <= 6) {
      scheduledBills.push(item);
    }
  }

  const scheduledAppointments: ScopedAppointmentItem[] = [];
  for (const a of records.appointments || []) {
    if (!a || !a.date) continue;
    const itemYMD = extractCalendarYMD(a.date, timezoneOffsetMinutes);
    const diff = getCalendarDayDiff(a.date, localDate, timezoneOffsetMinutes);
    if (diff === null || !itemYMD) continue;
    // Appointments strictly within [today .. today+6]; past and day 8+ excluded
    if (diff >= 0 && diff <= 6) {
      scheduledAppointments.push({
        id: String(a._id || a.id || ''),
        title: String(a.title || ''),
        date: itemYMD,
        time: a.time || undefined,
        location: a.location || undefined,
        daysFromToday: diff,
      });
    }
  }

  const overdueReminders: ScopedReminderItem[] = [];
  const scheduledReminders: ScopedReminderItem[] = [];
  for (const r of records.reminders || []) {
    if (!r || r.status === 'completed' || !r.dueDate) continue;
    const itemYMD = extractCalendarYMD(r.dueDate, timezoneOffsetMinutes);
    const diff = getCalendarDayDiff(r.dueDate, localDate, timezoneOffsetMinutes);
    if (diff === null || !itemYMD) continue;

    const item: ScopedReminderItem = {
      id: String(r._id || r.id || ''),
      title: String(r.title || ''),
      dueDate: itemYMD,
      dueTime: r.dueTime || undefined,
      priority: String(r.priority || 'medium'),
      status: String(r.status || 'active'),
      daysFromToday: diff,
    };

    if (diff < 0) {
      overdueReminders.push(item);
    } else if (diff <= 6) {
      scheduledReminders.push(item);
    }
  }

  overdueTasks.sort((a, b) => a.daysFromToday - b.daysFromToday);
  overdueBills.sort((a, b) => a.daysFromToday - b.daysFromToday);
  overdueReminders.sort((a, b) => a.daysFromToday - b.daysFromToday);
  scheduledTasks.sort((a, b) => a.daysFromToday - b.daysFromToday);
  scheduledBills.sort((a, b) => a.daysFromToday - b.daysFromToday);
  scheduledAppointments.sort((a, b) => a.daysFromToday - b.daysFromToday);
  scheduledReminders.sort((a, b) => a.daysFromToday - b.daysFromToday);

  const overdueCount =
    overdueTasks.length + overdueBills.length + overdueReminders.length;
  const scheduledCount =
    scheduledTasks.length +
    scheduledBills.length +
    scheduledAppointments.length +
    scheduledReminders.length;
  const dueTodayCount =
    scheduledTasks.filter((t) => t.daysFromToday === 0).length +
    scheduledBills.filter((b) => b.daysFromToday === 0).length +
    scheduledAppointments.filter((a) => a.daysFromToday === 0).length +
    scheduledReminders.filter((r) => r.daysFromToday === 0).length;

  return {
    window: {
      localDate,
      startDate: localDate,
      endDate,
      totalDays: 7,
      timezoneOffsetMinutes,
    },
    overdue: {
      tasks: overdueTasks,
      bills: overdueBills,
      reminders: overdueReminders,
    },
    scheduled: {
      tasks: scheduledTasks,
      bills: scheduledBills,
      appointments: scheduledAppointments,
      reminders: scheduledReminders,
    },
    summary: {
      overdueCount,
      overdueTaskCount: overdueTasks.length,
      overdueBillCount: overdueBills.length,
      overdueReminderCount: overdueReminders.length,
      scheduledCount,
      scheduledTaskCount: scheduledTasks.length,
      scheduledBillCount: scheduledBills.length,
      scheduledAppointmentCount: scheduledAppointments.length,
      scheduledReminderCount: scheduledReminders.length,
      dueTodayCount,
    },
  };
}

export function buildStrictSevenDayGeminiPrompt(
  scoped: StrictSevenDayContext,
  message: string
): string {
  const scheduledCount =
    scoped.scheduled.tasks.length +
    scoped.scheduled.bills.length +
    scoped.scheduled.appointments.length +
    scoped.scheduled.reminders.length;

  return `Generate a concise 7-day briefing based on the user's scheduled data.
STRICT 7-DAY BRIEFING WINDOW:
- Current user local date: ${scoped.window.localDate}
- Included window: ${scoped.window.startDate} through ${scoped.window.endDate} ONLY (today + next 6 calendar days = 7 days total).
- Do NOT invent items, dates, amounts, or statuses.
- Do NOT mention 30-day forecasts, monthly outlooks, or anything scheduled after ${scoped.window.endDate}.
- Do NOT include overdue items, greetings, AI self-introductions, recommendations, motivational text, or any concluding filler.
- Do NOT say "Hello", "I'm LifeBuddy", or introduce yourself.
- Do NOT use markdown headings (###), bold section titles, bold text, or bullet lists.
- Respond with plain text only — no markdown syntax of any kind.
- Currency is INR unless specified otherwise.
- Respond with ONLY ONE short natural-language sentence summarizing the user's upcoming 7 days based on the scheduled items below. Mention the counts where useful. If there are no scheduled items, say exactly: "Your schedule is clear for the next 7 days. No upcoming tasks, bills, appointments or reminders."

Authenticated user 7-day scheduled data JSON:
${JSON.stringify({
  window: scoped.window,
  summary: scoped.summary,
  scheduledNext7Days: scoped.scheduled,
})}

User request:
${message}`;
}

export function buildStrictSevenDayFallbackReply(scoped: StrictSevenDayContext): string {
  const { window: win, scheduled, summary } = scoped;
  const total =
    scheduled.tasks.length +
    scheduled.bills.length +
    scheduled.appointments.length +
    scheduled.reminders.length;

  if (total === 0) {
    return 'Your schedule is clear for the next 7 days. No upcoming tasks, bills, appointments or reminders.';
  }

  const parts: string[] = [];
  if (scheduled.tasks.length) parts.push(`${scheduled.tasks.length} task${scheduled.tasks.length > 1 ? 's' : ''}`);
  if (scheduled.bills.length) parts.push(`${scheduled.bills.length} bill${scheduled.bills.length > 1 ? 's' : ''}`);
  if (scheduled.appointments.length) parts.push(`${scheduled.appointments.length} appointment${scheduled.appointments.length > 1 ? 's' : ''}`);
  if (scheduled.reminders.length) parts.push(`${scheduled.reminders.length} reminder${scheduled.reminders.length > 1 ? 's' : ''}`);

  return `Over the next 7 days (${formatHumanYMD(win.startDate)} – ${formatHumanYMD(win.endDate)}), you have ${parts.join(', ')}.`;
}

