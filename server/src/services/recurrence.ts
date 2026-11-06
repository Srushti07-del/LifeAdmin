import Bill, { IBill } from '../models/Bill';

export interface IRecurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  interval?: number;
  unit?: 'days' | 'weeks' | 'months' | 'years';
  endDate?: Date;
  durationMonths?: number;
}

/**
 * Calculates the next occurrence date based on the current due date and recurrence settings.
 * Respects both `endDate` (hard stop date) and `durationMonths` (duration from start).
 * 
 * @param currentDueDate The due date of the current occurrence.
 * @param recurrence The recurrence configuration.
 * @param startDate Optional starting date used for calculating duration expiration.
 * @returns Next Date or null if recurrence has finished / invalid.
 */
export function calculateNextOccurrence(
  currentDueDate: Date,
  recurrence?: IRecurrence | null,
  startDate?: Date
): Date | null {
  if (!recurrence || recurrence.type === 'none') {
    return null;
  }

  const baseDate = new Date(currentDueDate);
  if (isNaN(baseDate.getTime())) {
    return null;
  }

  const interval = Math.max(1, recurrence.interval || 1);
  const nextDate = new Date(baseDate);

  switch (recurrence.type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + interval * 7);
      break;

    case 'monthly': {
      const originalDay = baseDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Handle month roll-over (e.g., Jan 31 + 1 month -> Feb 28/29, not March)
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0); // set to last day of previous month
      }
      break;
    }

    case 'quarterly': {
      const originalDay = baseDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + interval * 3);
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0);
      }
      break;
    }

    case 'yearly': {
      const originalDay = baseDate.getDate();
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0);
      }
      break;
    }

    case 'custom': {
      const unit = recurrence.unit || 'months';
      if (unit === 'days') {
        nextDate.setDate(nextDate.getDate() + interval);
      } else if (unit === 'weeks') {
        nextDate.setDate(nextDate.getDate() + interval * 7);
      } else if (unit === 'months') {
        const originalDay = baseDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + interval);
        if (nextDate.getDate() !== originalDay) {
          nextDate.setDate(0);
        }
      } else if (unit === 'years') {
        const originalDay = baseDate.getDate();
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        if (nextDate.getDate() !== originalDay) {
          nextDate.setDate(0);
        }
      }
      break;
    }

    default:
      return null;
  }

  // Check hard stop endDate
  if (recurrence.endDate) {
    const end = new Date(recurrence.endDate);
    if (!isNaN(end.getTime()) && nextDate.getTime() > end.getTime()) {
      return null;
    }
  }

  // Check durationMonths relative to startDate (or currentDueDate if startDate not provided)
  if (recurrence.durationMonths && recurrence.durationMonths > 0) {
    const start = startDate ? new Date(startDate) : new Date(currentDueDate);
    const durationEnd = new Date(start);
    durationEnd.setMonth(durationEnd.getMonth() + recurrence.durationMonths);
    if (nextDate.getTime() > durationEnd.getTime()) {
      return null;
    }
  }

  return nextDate;
}

/**
 * Handles recurrence creation when a bill is marked as paid.
 * Preserves the existing bill and creates a new pending occurrence if applicable,
 * avoiding duplicate creations.
 */
export async function handleBillRecurrence(bill: IBill): Promise<IBill | null> {
  if (!bill.recurrence || bill.recurrence.type === 'none') {
    return null;
  }

  const nextDueDate = calculateNextOccurrence(bill.dueDate, bill.recurrence, bill.startDate);
  if (!nextDueDate) {
    return null;
  }

  // Duplicate prevention check:
  // Check if a bill with the same name, user, and nextDueDate already exists
  const existingNext = await Bill.findOne({
    userId: bill.userId,
    name: bill.name,
    dueDate: nextDueDate,
  });

  if (existingNext) {
    return existingNext;
  }

  // Create next occurrence preserving all relevant metadata
  const newBill = await Bill.create({
    userId: bill.userId,
    name: bill.name,
    description: bill.description,
    provider: bill.provider,
    amount: bill.amount,
    currency: bill.currency || '₹',
    dueDate: nextDueDate,
    paymentStatus: 'pending',
    category: bill.category || 'Finance',
    startDate: bill.startDate || bill.dueDate,
    endDate: bill.endDate,
    recurrence: bill.recurrence,
    reminderDaysBefore: bill.reminderDaysBefore,
    notes: bill.notes,
    attachments: [],
    aiGenerated: false,
    aiConfirmed: true,
  });

  return newBill;
}
