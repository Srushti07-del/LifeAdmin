/**
 * LifeAdmin Mobile — Unified Calendar Types
 * Synchronized with server/src/routes/calendar.ts and client/src/pages/CalendarPage.tsx
 */

export type CalendarItemType = 'event' | 'task' | 'bill' | 'appointment' | 'reminder';

export type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarEventItem {
  id: string;
  originalId?: string;
  title: string;
  date: string; // ISO date string or YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: CalendarItemType;
  source: string; // 'manual', 'task', 'bill', 'appointment', 'reminder', 'document'
  status: string; // 'scheduled', 'todo', 'completed', 'paid', 'due', 'acknowledged', 'pending'
  priority?: string;
  category: string;
  color?: string;
  details?: string;
  location?: string;
  relatedPerson?: string;
  isOriginalEvent?: boolean;
}

export interface EventFormData {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay: boolean;
  location: string;
  category: string;
  description: string;
  color: string;
}

export interface CalendarDayCell {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

export interface FetchEventsParams {
  start?: string; // ISO date string
  end?: string; // ISO date string
}

