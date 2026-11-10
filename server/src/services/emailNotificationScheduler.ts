import EmailNotification, { IEmailNotification } from '../models/EmailNotification';
import User from '../models/User';
import { sendNotificationEmail, isEmailConfigured } from './notificationEmail';
import config from '../config';

const POLL_MS = 60 * 1000; // Poll every minute
const BATCH_SIZE = 50;

let timer: NodeJS.Timeout | null = null;
let running = false;
let started = false;

/**
 * Check if the given time falls within the user's quiet hours.
 * quietHoursStart/quietHoursEnd are "HH:MM" strings in the user's local time.
 */
function isInQuietHours(user: any, nowUtc: Date): boolean {
  if (!user.quietHoursStart || !user.quietHoursEnd) return false;

  // Convert now UTC to user's local time using their timezone
  let localNow: Date;
  try {
    localNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: user.timezone || 'UTC' }));
  } catch {
    localNow = nowUtc;
  }

  const [startH, startM] = user.quietHoursStart.split(':').map(Number);
  const [endH, endM] = user.quietHoursEnd.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();

  if (startMinutes <= endMinutes) {
    // Normal range: e.g., 22:00 to 07:00 means 22:00-07:00 next day (wraps midnight)
    // Actually if start <= end, it's same-day range like 09:00-17:00
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  } else {
    // Wraps midnight: e.g., 22:00 to 07:00
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }
}

/**
 * Check if the user wants email notifications of this type.
 */
function isTypeEnabled(user: any, type: IEmailNotification['type']): boolean {
  if (!user.notificationsEnabled) return false;

  const typeToField: Record<string, keyof any> = {
    task_deadline: 'tasks',
    overdue_task: 'tasks',
    bill_payment: 'bills',
    appointment: 'appointments',
    reminder: 'reminders',
    document_deadline: 'tasks',
  };

  const field = typeToField[type];
  if (!field) return true;

  const notificationTypes = user.notificationTypes || {};
  return Boolean(notificationTypes[field]);
}

/**
 * Format a date into the user's local timezone for display.
 */
function formatInUserTimezone(date: Date, timezone: string | undefined): string {
  try {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone || 'UTC' })).toLocaleString(
      'en-IN',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      }
    );
  } catch {
    return date.toISOString();
  }
}

export async function processPendingEmailNotifications(now = new Date()): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  scanned: number;
}> {
  if (running) return { sent: 0, failed: 0, skipped: 0, scanned: 0 };
  running = true;

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let scanned = 0;

  try {
    // Scan pending email notifications due now or earlier
    const pending = await EmailNotification.find({
      status: 'pending',
      scheduledFor: { $lte: now },
    })
      .sort({ scheduledFor: 1 })
      .limit(BATCH_SIZE)
      .lean();

    scanned = pending.length;

    for (const item of pending as unknown as IEmailNotification[]) {
      try {
        const user = await User.findById(item.userId).lean();

        if (!user) {
          // User no longer exists — mark as skipped
          await EmailNotification.updateOne(
            { _id: item._id },
            { $set: { status: 'skipped', errorMessage: 'User not found' } }
          );
          skipped += 1;
          continue;
        }

        // Respect global email notification preference
        if (!user.notificationsEnabled) {
          await EmailNotification.updateOne(
            { _id: item._id },
            { $set: { status: 'skipped', errorMessage: 'Email notifications disabled globally' } }
          );
          skipped += 1;
          continue;
        }

        // Respect per-type preference
        if (!isTypeEnabled(user, item.type)) {
          await EmailNotification.updateOne(
            { _id: item._id },
            { $set: { status: 'skipped', errorMessage: `${item.type} notifications disabled` } }
          );
          skipped += 1;
          continue;
        }

        // Respect quiet hours
        if (isInQuietHours(user, now)) {
          // Leave as pending; will be retried on next poll cycle
          // Don't count as scanned failure — just skip this cycle
          skipped += 1;
          continue;
        }

        // Build the email action URL based on entity type
        const baseUrl = config.appUrl || 'http://localhost:5173';
        const actionUrl = item.entityType
          ? `${baseUrl}/${item.entityType === 'task' ? 'tasks' : item.entityType === 'bill' ? 'bills' : item.entityType === 'appointment' ? 'appointments' : item.entityType === 'document' ? 'documents' : 'reminders'}`
          : baseUrl;

        const emailData = {
          to: user.email,
          userName: user.name || 'there',
          type: item.type,
          title: item.title,
          dueDate: item.scheduledFor ? formatInUserTimezone(item.scheduledFor, user.timezone) : undefined,
          dueTime: undefined,
          message: item.message,
          actionUrl,
          actionLabel: 'View in LifeAdmin',
        };

        try {
          await sendNotificationEmail(emailData);
          await EmailNotification.updateOne(
            { _id: item._id },
            {
              $set: {
                status: 'sent',
                sentAt: now,
                errorMessage: undefined,
              },
              $inc: { retryCount: 1 },
            }
          );
          sent += 1;
        } catch (emailErr: any) {
          const retryCount = (item.retryCount || 0) + 1;
          const maxRetries = item.maxRetries || 3;

          if (retryCount >= maxRetries) {
            await EmailNotification.updateOne(
              { _id: item._id },
              {
                $set: {
                  status: 'failed',
                  errorMessage: emailErr?.message || 'Unknown email delivery error',
                  retryCount,
                },
              }
            );
            failed += 1;
          } else {
            // Retry later — keep as pending, increment retry count
            await EmailNotification.updateOne(
              { _id: item._id },
              {
                $set: { retryCount },
                $inc: { retryCount: 1 },
              }
            );
            failed += 1;
          }
        }
      } catch (itemErr: any) {
        console.error('Email notification item error:', itemErr);
        failed += 1;
      }
    }
  } catch (err) {
    console.error('Email notification scheduler error:', err);
  } finally {
    running = false;
  }

  return { sent, failed, skipped, scanned };
}

export function startEmailNotificationScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL_NOTIFICATION_SCHEDULER === '1') {
    console.log('📧 Email notification scheduler disabled (test mode or env flag)');
    return;
  }

  if (!isEmailConfigured()) {
    console.warn(
      '⚠️  Email notification scheduler started but SMTP is not configured. ' +
        'Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email delivery.'
    );
  }

  // Run shortly after startup, then poll.
  setTimeout(() => { void processPendingEmailNotifications(); }, 5000);
  timer = setInterval(() => { void processPendingEmailNotifications(); }, POLL_MS);
  timer.unref?.();
  started = true;
  console.log('📧 Email notification scheduler started (server-running only)');
}

export function stopEmailNotificationScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

export function isEmailNotificationSchedulerRunning(): boolean {
  return started;
}
