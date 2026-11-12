/**
 * Pure URL Query Parameter Parsers for Module Filters
 * Normalizes incoming Expo Router search params cleanly without letting unknown
 * query values corrupt local filter state.
 */

import { AppointmentFilterKey } from '@/features/appointments/types';
import { BillFilterKey } from '@/features/bills/types';
import { ReminderSectionKey } from '@/features/reminders/types';
import { TaskFilterMode } from '@/features/tasks/types';

function unwrapParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

const VALID_TASK_FILTERS: ReadonlySet<TaskFilterMode> = new Set([
  'all',
  'todo',
  'in_progress',
  'overdue',
  'completed',
]);

export function parseTaskFilterParam(value?: string | string[]): TaskFilterMode | null {
  const normalized = unwrapParam(value);
  if (!normalized) return null;
  if (VALID_TASK_FILTERS.has(normalized as TaskFilterMode)) {
    return normalized as TaskFilterMode;
  }
  return null;
}

const VALID_BILL_FILTERS: ReadonlySet<BillFilterKey> = new Set([
  'all',
  'upcoming',
  'paid',
  'overdue',
]);

export function parseBillFilterParam(value?: string | string[]): BillFilterKey | null {
  const normalized = unwrapParam(value);
  if (!normalized) return null;
  if (VALID_BILL_FILTERS.has(normalized as BillFilterKey)) {
    return normalized as BillFilterKey;
  }
  return null;
}

export type ReminderFilterSelection = 'all' | ReminderSectionKey;

const VALID_REMINDER_SECTIONS: ReadonlySet<ReminderFilterSelection> = new Set([
  'all',
  'today',
  'upcoming',
  'overdue',
  'completed',
]);

export function parseReminderSectionParam(
  value?: string | string[],
): ReminderFilterSelection | null {
  const normalized = unwrapParam(value);
  if (!normalized) return null;
  if (VALID_REMINDER_SECTIONS.has(normalized as ReminderFilterSelection)) {
    return normalized as ReminderFilterSelection;
  }
  return null;
}

const VALID_APPOINTMENT_FILTERS: ReadonlySet<AppointmentFilterKey> = new Set([
  'all',
  'upcoming',
  'today',
  'past',
]);

export function parseAppointmentFilterParam(
  value?: string | string[],
): AppointmentFilterKey | null {
  const normalized = unwrapParam(value);
  if (!normalized) return null;
  if (VALID_APPOINTMENT_FILTERS.has(normalized as AppointmentFilterKey)) {
    return normalized as AppointmentFilterKey;
  }
  return null;
}

