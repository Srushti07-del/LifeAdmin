/**
 * LifeAdmin Mobile — Calendar Calculations & Date Engine
 * Pure domain logic for date formatting, month grid generation, week schedule calculations,
 * time range formatting, local timezone safety, and duplicate prevention.
 */

import {
  CalendarDateRange,
  CalendarDayCell,
  CalendarEventItem,
  CalendarItemType,
  CalendarViewType,
} from '../types';

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Returns YYYY-MM-DD in local device time
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Strictly parses a YYYY-MM-DD string into a local-midnight Date.
 * Returns null for malformed strings or invalid calendar dates (e.g. Feb 31).
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
 * Sets time to 00:00:00.000 in local timezone
 */
export function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const startOfDay = startOfCalendarDay;

/**
 * Sets time to 23:59:59.999 in local timezone
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Adds N days to a date preserving local time
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns Sunday (day 0) as start of week for the given date
 */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/**
 * Checks if two dates represent the same calendar day in local time
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Extracts local YYYY-MM-DD from an event item date
 */
export function eventLocalDate(item: CalendarEventItem): string {
  if (!item.date) return '';
  // If already YYYY-MM-DD without timestamp
  if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    return item.date;
  }
  const d = new Date(item.date);
  if (isNaN(d.getTime())) return '';
  return toLocalISODate(d);
}

/**
 * Formats time range or 'All day'
 */
export function formatTimeRange(item: CalendarEventItem): string {
  if (item.allDay || (!item.startTime && !item.endTime)) {
    return 'All day';
  }
  if (item.startTime && item.endTime) {
    return `${item.startTime} – ${item.endTime}`;
  }
  return item.startTime || item.endTime || 'All day';
}

/**
 * Generates cells for a 7-column month calendar grid.
 * Fills previous month pad days, current month days, and next month pad days.
 * Always produces a 35 or 42 cell grid (complete weeks).
 */
export function getMonthGridCells(
  currentDate: Date,
  selectedDate?: Date | null
): CalendarDayCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // 1. Previous month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    cells.push({
      date: d,
      dateString: toLocalISODate(d),
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
    });
  }

  // 2. Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    cells.push({
      date: d,
      dateString: toLocalISODate(d),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
    });
  }

  // 3. Next month filler days to complete weeks (35 or 42 cells)
  const targetTotal = cells.length > 35 ? 42 : 35;
  const remaining = targetTotal - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: d,
      dateString: toLocalISODate(d),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
    });
  }

  return cells;
}

/**
 * Generates 7 cells for a week view starting from Sunday
 */
export function getWeekDays(
  currentDate: Date,
  selectedDate?: Date | null
): CalendarDayCell[] {
  const start = startOfWeek(currentDate);
  const today = new Date();
  const days: CalendarDayCell[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push({
      date: d,
      dateString: toLocalISODate(d),
      dayNumber: d.getDate(),
      isCurrentMonth: d.getMonth() === currentDate.getMonth(),
      isToday: isSameDay(d, today),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
    });
  }

  return days;
}

/**
 * Calculates start and end ISO dates needed for querying the API
 */
export function getDateRangeForView(
  view: CalendarViewType,
  currentDate: Date
): CalendarDateRange {
  if (view === 'month') {
    // Current month +/- 10 days buffer to cover all grid pad days
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    start.setDate(start.getDate() - 10);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (view === 'week') {
    const start = startOfWeek(currentDate);
    const end = addDays(start, 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Day view
  const start = startOfDay(currentDate);
  const end = endOfDay(currentDate);
  return { start, end };
}

/**
 * Deduplicates events by unique id
 */
export function deduplicateEvents(events: CalendarEventItem[]): CalendarEventItem[] {
  const map = new Map<string, CalendarEventItem>();
  for (const evt of events) {
    if (!map.has(evt.id)) {
      map.set(evt.id, evt);
    }
  }
  return Array.from(map.values());
}

/**
 * Filters events by entity type and search term
 */
export function filterEvents(
  events: CalendarEventItem[],
  selectedType: string = 'all',
  searchQuery: string = ''
): CalendarEventItem[] {
  let list = deduplicateEvents(events);

  if (selectedType && selectedType !== 'all') {
    list = list.filter((e) => e.type === selectedType);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.details || '').toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Groups events by their local date key (YYYY-MM-DD)
 */
export function groupEventsByDate(
  events: CalendarEventItem[]
): Record<string, CalendarEventItem[]> {
  const groups: Record<string, CalendarEventItem[]> = {};

  for (const evt of events) {
    const key = eventLocalDate(evt);
    if (!key) continue;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(evt);
  }

  // Sort each day's events chronologically (all-day first, then by startTime, then title)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      const timeCompare = (a.startTime || '').localeCompare(b.startTime || '');
      if (timeCompare !== 0) return timeCompare;
      return a.title.localeCompare(b.title);
    });
  }

  return groups;
}

/**
 * Returns header title for the calendar view navigation
 */
export function formatCalendarHeader(
  view: CalendarViewType,
  currentDate: Date
): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (view === 'month') {
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  if (view === 'week') {
    const start = startOfWeek(currentDate);
    const end = addDays(start, 6);
    const shortMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    if (start.getMonth() === end.getMonth()) {
      return `${shortMonths[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${shortMonths[start.getMonth()]} ${start.getDate()} – ${shortMonths[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  // Day view
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[currentDate.getDay()]}, ${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
}
