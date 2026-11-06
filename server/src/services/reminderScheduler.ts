import Reminder, { IReminder } from '../models/Reminder';
import Notification from '../models/Notification';

const POLL_MS = 60 * 1000;
const ALLOWED_OFFSETS = new Set([0, 5, 15, 30, 60]);

let timer: NodeJS.Timeout | null = null;
let running = false;

export function getReminderDueAt(reminder: Pick<IReminder, 'dueDate' | 'dueTime'>): Date {
  const base = new Date(reminder.dueDate);
  if (Number.isNaN(base.getTime())) return new Date();
  const dueTime = reminder.dueTime;
  if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {
    const [h, m] = dueTime.split(':').map((v) => parseInt(v, 10));
    base.setHours(h || 0, m || 0, 0, 0);
  } else {
    base.setHours(9, 0, 0, 0);
  }
  return base;
}

function sanitizeOffsets(offsets: unknown): number[] {
  if (!Array.isArray(offsets)) return [0];
  const vals = offsets.map((n) => Number(n)).filter((n) => Number.isFinite(n) && ALLOWED_OFFSETS.has(n));
  return Array.from(new Set(vals.length ? vals : [0])).sort((a, b) => a - b);
}

function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'now';
  if (offsetMinutes === 60) return '1 hour before';
  return `${offsetMinutes} minutes before`;
}

async function createAlert(reminder: IReminder, offsetMinutes: number, trigger: 'scheduled' | 'overdue', dueAt: Date): Promise<boolean> {
  const dedupeKey = `reminder:${reminder._id}:${dueAt.toISOString()}:${offsetMinutes}:${trigger}`;
  const when = trigger === 'overdue'
    ? 'This reminder is overdue.'
    : offsetMinutes === 0
      ? 'This reminder is due now.'
      : `This reminder is due in ${formatOffset(offsetMinutes)}.`;
  try {
    await Notification.create({
      userId: reminder.userId,
      title: trigger === 'overdue' ? `Overdue: ${reminder.title}` : `Reminder: ${reminder.title}`,
      message: `${when}${reminder.description ? ` ${reminder.description}` : ''}`.slice(0, 500),
      type: trigger === 'overdue' ? 'overdue' : 'reminder',
      entityType: 'reminder',
      entityId: reminder._id,
      dedupeKey,
      pushSent: false,
    });
    return true;
  } catch (err: any) {
    if (err?.code === 11000) return false;
    throw err;
  }
}

export async function processDueReminders(now = new Date()): Promise<{ created: number; scanned: number }> {
  if (running) return { created: 0, scanned: 0 };
  running = true;
  let created = 0;
  let scanned = 0;
  try {
    // Scan reminders due in a reasonable window to avoid loading full history.
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const reminders = await Reminder.find({
      status: 'active',
      dueDate: { $gte: windowStart, $lte: windowEnd },
    }).lean();

    for (const reminder of reminders as unknown as IReminder[]) {
      scanned += 1;
      const dueAt = getReminderDueAt(reminder);
      const offsets = sanitizeOffsets((reminder as any).reminderOffsetMinutes);
      let changed = false;

      if (dueAt.getTime() < now.getTime()) {
        // Overdue: create one deduped alert so it appears in notification center.
        const made = await createAlert(reminder, 0, 'overdue', dueAt);
        if (made) { created += 1; changed = true; }
      }

      for (const offset of offsets) {
        const alertAt = new Date(dueAt.getTime() - offset * 60 * 1000);
        if (alertAt.getTime() <= now.getTime()) {
          // Avoid duplicating "at due time" when an overdue alert was just created.
          if (offset === 0 && dueAt.getTime() < now.getTime()) continue;
          const made = await createAlert(reminder, offset, 'scheduled', dueAt);
          if (made) { created += 1; changed = true; }
        }
      }

      if (changed) {
        await Reminder.updateOne(
          { _id: reminder._id },
          { $set: { lastNotifiedAt: now }, $inc: { notificationCount: 1 } }
        );
      }
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  } finally {
    running = false;
  }
  return { created, scanned };
}

export function startReminderScheduler(): void {
  if (timer) return;
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REMINDER_SCHEDULER === '1') return;
  // Run shortly after startup, then poll.
  setTimeout(() => { void processDueReminders(); }, 5000);
  timer = setInterval(() => { void processDueReminders(); }, POLL_MS);
  timer.unref?.();
  console.log('⏰ In-app reminder scheduler started (server-running only)');
}

export function stopReminderScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
