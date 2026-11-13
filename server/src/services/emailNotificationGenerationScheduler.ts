/**
 * LifeAdmin Email Notification Generation Scheduler
 *
 * Automatically invokes generateEmailNotifications() on a periodic interval
 * so that pending EmailNotification records are created for upcoming and
 * overdue tasks, bills, appointments, and reminders without requiring an
 * external cron service.
 *
 * Runs independently of the delivery scheduler (emailNotificationScheduler.ts)
 * which only processes already-created pending records.
 */

import { generateEmailNotifications } from './emailNotificationGenerator';
import config from '../config';

const POLL_MS = 60 * 1000; // Poll every minute (within the 1-5 minute requirement)

let timer: NodeJS.Timeout | null = null;
let running = false;
let started = false;

/**
 * Run a single generation pass. Failures are caught and logged so the
 * scheduler never crashes the server.
 */
export async function runEmailNotificationGeneration(now = new Date()): Promise<{
  created: number;
  scanned: number;
  skipped: number;
}> {
  if (running) return { created: 0, scanned: 0, skipped: 0 };
  running = true;

  try {
    const result = await generateEmailNotifications(now);
    return result;
  } catch (err) {
    console.error('Email notification generation scheduler error:', err);
    return { created: 0, scanned: 0, skipped: 0 };
  } finally {
    running = false;
  }
}

export function startEmailNotificationGenerationScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL_NOTIFICATION_GENERATION === '1') {
    console.log('📧 Email notification generation scheduler disabled (test mode or env flag)');
    return;
  }

  // Run shortly after startup, then poll.
  setTimeout(() => { void runEmailNotificationGeneration(); }, 5000);
  timer = setInterval(() => { void runEmailNotificationGeneration(); }, POLL_MS);
  timer.unref?.();
  started = true;
  console.log('📧 Email notification generation scheduler started (server-running only)');
}

export function stopEmailNotificationGenerationScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

export function isEmailNotificationGenerationSchedulerRunning(): boolean {
  return started;
}
