import mongoose from 'mongoose';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import EmailNotification from '../models/EmailNotification';
import { IEmailNotification } from '../models/EmailNotification';

export type EmailEventSource = 'task' | 'bill' | 'appointment' | 'reminder';

interface EventWithReminders {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  dueDate: Date;
  dueTime?: string;
  entityType: EmailEventSource;
  entityId: mongoose.Types.ObjectId;
  reminderIntervals: number[];
  status?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  name?: string;
  date?: Date;
  time?: string;
  notes?: string;
  paymentStatus?: string;
}

/**
 * Normalize a date+time into a UTC Date for storage/scheduling.
 * If dueTime is provided ("HH:MM"), combine with dueDate in the user's timezone.
 */
function toUtcDate(dueDate: Date, dueTime?: string, timezone: string = 'UTC'): Date {
  const base = new Date(dueDate);
  if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {
    const [h, m] = dueTime.split(':').map(Number);
    // Set the time in the user's local timezone, then convert to UTC
    const local = new Date((base as any).toLocaleString('en-US', { timeZone: timezone }));
    local.setHours(h, m, 0, 0);
    return new Date((local as any).toLocaleString('en-US', { timeZone: 'UTC' }));
  }
  // Default to 9:00 AM in user's timezone
  const local = new Date((base as any).toLocaleString('en-US', { timeZone: timezone }));
  local.setHours(9, 0, 0, 0);
  return new Date((local as any).toLocaleString('en-US', { timeZone: 'UTC' }));
}

function formatLocalTime(date: Date, timezone: string): string {
  try {
    const opts: any = { timeZone: timezone };
    return new Date((date as any).toLocaleString('en-US', opts)).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  } catch {
    return date.toISOString();
  }
}

function dedupeKey(userId: mongoose.Types.ObjectId, entityId: mongoose.Types.ObjectId, type: string, offsetMinutes: number): string {
  return `email:${userId}:${entityId}:${type}:${offsetMinutes}`;
}

/**
 * Scan upcoming/overdue events and create pending EmailNotification records
 * for each configured reminder interval. Idempotent via dedupeKey.
 */
export async function generateEmailNotifications(now = new Date()): Promise<{
  created: number;
  scanned: number;
  skipped: number;
}> {
  let created = 0;
  let scanned = 0;
  let skipped = 0;

  // Fetch all users with email notifications enabled
  const users = await User.find({
    notificationsEnabled: true,
  }).lean();

  for (const user of users) {
    try {
      const userId = user._id;
      const timezone = user.timezone || 'UTC';
      const intervals = Array.isArray(user.emailReminderIntervals)
        ? user.emailReminderIntervals.filter((n: number) => Number.isFinite(n))
        : [1440, 60, 0];

      // Determine which notification types are enabled
      const notificationTypes = user.notificationTypes || {};
      const typesEnabled = {
        tasks: Boolean(notificationTypes.tasks),
        bills: Boolean(notificationTypes.bills),
        appointments: Boolean(notificationTypes.appointments),
        reminders: Boolean(notificationTypes.reminders),
      };

      // ── Tasks ──
      if (typesEnabled.tasks) {
        const tasks = await Task.find({
          userId,
          status: { $nin: ['completed'] },
          dueDate: { $exists: true, $ne: null },
        }).lean() as unknown as EventWithReminders[];

        for (const task of tasks) {
          scanned += 1;
          const dueAt = toUtcDate(task.dueDate, task.dueTime, timezone);
          const isOverdue = dueAt.getTime() < now.getTime();

          for (const offset of intervals) {
            const key = dedupeKey(userId, task._id, 'task', offset);
            const existing = await EmailNotification.findOne({ dedupeKey: key });
            if (existing) continue; // Already scheduled/sent

            const scheduledFor = isOverdue
              ? new Date(now.getTime()) // Send immediately for overdue
              : new Date(dueAt.getTime() - offset * 60 * 1000);

            // Skip if already past (for non-overdue, offset already passed)
            if (!isOverdue && scheduledFor.getTime() < now.getTime()) continue;

            await EmailNotification.create({
              userId,
              type: isOverdue ? 'overdue_task' : 'task_deadline',
              title: task.title,
              message: task.description,
              entityType: 'task',
              entityId: task._id,
              scheduledFor,
              status: 'pending',
              retryCount: 0,
              maxRetries: 3,
              dedupeKey: key,
            });
            created += 1;
          }
        }
      }

      // ── Bills ──
      if (typesEnabled.bills) {
        const bills = await Bill.find({
          userId,
          paymentStatus: { $nin: ['paid'] },
          dueDate: { $exists: true, $ne: null },
        }).lean() as unknown as EventWithReminders[];

        for (const bill of bills) {
          scanned += 1;
          const dueAt = toUtcDate(bill.dueDate, undefined, timezone);
          const isOverdue = bill.paymentStatus === 'overdue' || dueAt.getTime() < now.getTime();

          for (const offset of intervals) {
            const key = dedupeKey(userId, bill._id, 'bill', offset);
            const existing = await EmailNotification.findOne({ dedupeKey: key });
            if (existing) continue;

            const scheduledFor = isOverdue
              ? new Date(now.getTime())
              : new Date(dueAt.getTime() - offset * 60 * 1000);

            if (!isOverdue && scheduledFor.getTime() < now.getTime()) continue;

            await EmailNotification.create({
              userId,
              type: 'bill_payment',
              title: bill.name,
              message: bill.description,
              entityType: 'bill',
              entityId: bill._id,
              scheduledFor,
              status: 'pending',
              retryCount: 0,
              maxRetries: 3,
              dedupeKey: key,
            });
            created += 1;
          }
        }
      }

      // ── Appointments ──
      if (typesEnabled.appointments) {
        const appointments = await Appointment.find({
          userId,
          date: { $exists: true, $ne: null },
        }).lean() as unknown as EventWithReminders[];

        for (const appointment of appointments) {
          if (!appointment.date) continue;
          scanned += 1;
          const dueAt = toUtcDate(appointment.date, appointment.time, timezone);
          const isOverdue = dueAt.getTime() < now.getTime();

          for (const offset of intervals) {
            const key = dedupeKey(userId, appointment._id, 'appointment', offset);
            const existing = await EmailNotification.findOne({ dedupeKey: key });
            if (existing) continue;

            const scheduledFor = isOverdue
              ? new Date(now.getTime())
              : new Date(dueAt.getTime() - offset * 60 * 1000);

            if (!isOverdue && scheduledFor.getTime() < now.getTime()) continue;

            await EmailNotification.create({
              userId,
              type: 'appointment',
              title: appointment.title,
              message: appointment.notes,
              entityType: 'appointment',
              entityId: appointment._id,
              scheduledFor,
              status: 'pending',
              retryCount: 0,
              maxRetries: 3,
              dedupeKey: key,
            });
            created += 1;
          }
        }
      }

      // ── Reminders ──
      if (typesEnabled.reminders) {
        const reminders = await Reminder.find({
          userId,
          status: { $nin: ['completed', 'dismissed'] },
          dueDate: { $exists: true, $ne: null },
        }).lean() as unknown as EventWithReminders[];

        for (const reminder of reminders) {
          scanned += 1;
          const dueAt = toUtcDate(reminder.dueDate, reminder.dueTime, timezone);
          const isOverdue = dueAt.getTime() < now.getTime();

          for (const offset of intervals) {
            const key = dedupeKey(userId, reminder._id, 'reminder', offset);
            const existing = await EmailNotification.findOne({ dedupeKey: key });
            if (existing) continue;

            const scheduledFor = isOverdue
              ? new Date(now.getTime())
              : new Date(dueAt.getTime() - offset * 60 * 1000);

            if (!isOverdue && scheduledFor.getTime() < now.getTime()) continue;

            await EmailNotification.create({
              userId,
              type: 'reminder',
              title: reminder.title,
              message: reminder.description,
              entityType: 'reminder',
              entityId: reminder._id,
              scheduledFor,
              status: 'pending',
              retryCount: 0,
              maxRetries: 3,
              dedupeKey: key,
            });
            created += 1;
          }
        }
      }
    } catch (userErr: any) {
      console.error(`Email notification generation error for user ${user._id}:`, userErr);
      skipped += 1;
    }
  }

  return { created, scanned, skipped };
}

export async function cleanupProcessedNotifications(): Promise<{ removed: number }> {
  // Remove old sent/failed/skipped notifications older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await EmailNotification.deleteMany({
    status: { $in: ['sent', 'failed', 'skipped'] },
    updatedAt: { $lt: thirtyDaysAgo },
  });
  return { removed: result.deletedCount };
}

export function formatEventDueInUserTimezone(
  event: EventWithReminders,
  timezone: string
): { dueDate: string; dueTime?: string } {
  const dueAt = toUtcDate(event.dueDate, event.dueTime, timezone);
  return {
    dueDate: formatLocalTime(dueAt, timezone),
    dueTime: event.dueTime,
  };
}
