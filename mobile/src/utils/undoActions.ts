/**
 * LifeAdmin Mobile — Persisted Undo Safety & Copy Helpers
 * Ensures Undo actions are offered strictly when the underlying backend
 * mutation is cleanly reversible without leaving orphaned child records.
 */

import { Bill } from '@/features/bills/types';
import { Reminder } from '@/features/reminders/types';
import { TaskStatus } from '@/features/tasks/types';

export function getTaskStatusFeedback(
  status: TaskStatus,
  taskTitle: string
): { title: string; message: string } {
  if (status === 'completed') {
    return {
      title: 'Task Completed',
      message: `"${taskTitle}" marked as complete.`,
    };
  }
  if (status === 'in_progress') {
    return {
      title: 'Status Updated',
      message: `"${taskTitle}" moved to In Progress.`,
    };
  }
  return {
    title: 'Task Reopened',
    message: `"${taskTitle}" moved back to To Do.`,
  };
}

/**
 * Marking a non-recurring bill paid/unpaid mutates only that bill's status/paidAt.
 * Recurring bills may spawn a new child bill on `pay`, which `unpay` does not delete,
 * so Undo is restricted to non-recurring bills (or when no child was created).
 */
export function canUndoBillStatusToggle(
  bill: Pick<Bill, 'recurrence'>,
  spawnedNextOccurrence?: Bill | null
): boolean {
  if (spawnedNextOccurrence) {
    return false;
  }
  const recurrenceType = bill.recurrence?.type;
  return !recurrenceType || recurrenceType === 'none';
}

export function canUndoPaidBillFromDashboard(
  spawnedNextOccurrence?: unknown | null
): boolean {
  return !spawnedNextOccurrence;
}

/**
 * Completing a non-recurring reminder toggles only status + local device schedule.
 * Completing a recurring reminder generates a separate `nextOccurrence` on the server,
 * so Undo is reserved for non-recurring reminders (or reopening a reminder).
 */
export function canUndoReminderToggle(
  wasCompleted: boolean,
  reminder: Pick<Reminder, 'recurrence'>,
  spawnedNextOccurrence?: Reminder | null
): boolean {
  if (spawnedNextOccurrence) {
    return false;
  }
  const recurrenceType = reminder.recurrence?.type;
  if (!wasCompleted && recurrenceType && recurrenceType !== 'none') {
    return false;
  }
  return true;
}

