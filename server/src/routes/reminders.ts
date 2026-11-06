import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Reminder, { IReminder } from '../models/Reminder';
import Notification from '../models/Notification';
import { authenticate } from '../middleware/auth';
import { calculateNextOccurrence } from '../services/recurrence';

const router = Router();
router.use(authenticate);

const ALLOWED_OFFSETS = new Set([0, 5, 15, 30, 60]);
const ALLOWED_RECURRENCE = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const ALLOWED_STATUS = new Set(['active', 'acknowledged', 'dismissed', 'completed', 'pending']);

function sanitizeOffsets(input: unknown): number[] {
  if (!Array.isArray(input)) return [0];
  const vals = input
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && ALLOWED_OFFSETS.has(n));
  const unique = Array.from(new Set(vals.length ? vals : [0])).sort((a, b) => a - b);
  return unique;
}

function sanitizeRecurrence(input: any): { type: string; interval: number } {
  const type = input?.type && ALLOWED_RECURRENCE.has(input.type) ? input.type : 'none';
  const interval = Math.max(1, Number(input?.interval) || 1);
  return { type, interval };
}

function getReminderDueAt(reminder: Pick<IReminder, 'dueDate' | 'dueTime'>): Date {
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

function getAlertTime(dueAt: Date, offsetMinutes: number): Date {
  return new Date(dueAt.getTime() - offsetMinutes * 60 * 1000);
}

function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'now';
  if (offsetMinutes === 60) return '1 hour before';
  return `${offsetMinutes} minutes before`;
}

async function createReminderNotification(
  reminder: IReminder,
  offsetMinutes: number,
  trigger: 'scheduled' | 'overdue',
  dueAt: Date
): Promise<boolean> {
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
    if (err?.code === 11000) return false; // duplicate prevented
    throw err;
  }
}

function pickReminderData(body: any) {
  const { _id, userId, createdAt, updatedAt, lastNotifiedAt, notificationCount, acknowledgedAt, completedAt, ...data } = body;
  if (data.reminderOffsetMinutes !== undefined) data.reminderOffsetMinutes = sanitizeOffsets(data.reminderOffsetMinutes);
  if (data.recurrence !== undefined) data.recurrence = sanitizeRecurrence(data.recurrence);
  if (data.status === 'completed') {
    data.completedAt = data.completedAt ? new Date(data.completedAt) : new Date();
  } else if (data.status === 'active') {
    data.completedAt = null;
    data.acknowledgedAt = null;
  } else if (data.status && ALLOWED_STATUS.has(data.status) && data.status !== 'completed' && data.status !== 'active') {
    data.acknowledgedAt = data.acknowledgedAt ? new Date(data.acknowledgedAt) : new Date();
  }
  if (data.description === '') data.description = undefined;
  if (data.dueTime === '') data.dueTime = undefined;
  return data;
}

async function generateNextRecurringReminder(reminder: IReminder): Promise<IReminder | null> {
  if (!reminder.recurrence || reminder.recurrence.type === 'none') return null;
  const nextDue = calculateNextOccurrence(reminder.dueDate, reminder.recurrence as any);
  if (!nextDue) return null;
  const existing = await Reminder.findOne({ userId: reminder.userId, title: reminder.title, dueDate: nextDue });
  if (existing) return existing;
  return Reminder.create({
    userId: reminder.userId,
    title: reminder.title,
    description: reminder.description,
    dueDate: nextDue,
    dueTime: reminder.dueTime,
    entityType: reminder.entityType,
    entityId: reminder.entityId,
    reminderDaysBefore: reminder.reminderDaysBefore,
    reminderOffsetMinutes: reminder.reminderOffsetMinutes?.length ? reminder.reminderOffsetMinutes : [0],
    recurrence: reminder.recurrence,
    status: 'active',
    category: reminder.category,
    priority: reminder.priority,
    notificationCount: 0,
    aiGenerated: false,
    aiConfirmed: true,
  });
}

// GET /api/reminders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, priority, sort = 'dueDate', limit = '200', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (status && status !== 'all') filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 200));
    const sortStr = typeof sort === 'string' ? sort : 'dueDate';
    const allowedSort: Record<string, any> = {
      dueDate: { dueDate: 1, dueTime: 1 },
      '-dueDate': { dueDate: -1, dueTime: -1 },
      priority: { priority: -1, dueDate: 1 },
      createdAt: { createdAt: -1 },
    };

    const [reminders, total] = await Promise.all([
      Reminder.find(filter)
        .sort(allowedSort[sortStr] || { dueDate: 1, dueTime: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Reminder.countDocuments(filter),
    ]);

    res.json({
      reminders,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('List reminders error:', error);
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (reminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ reminder });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({ message: 'Failed to fetch reminder' });
  }
});

// POST /api/reminders
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const reminderData = pickReminderData(req.body);
      const reminder = await Reminder.create({
        ...reminderData,
        userId: req.user!._id,
        reminderOffsetMinutes: reminderData.reminderOffsetMinutes || [0],
        recurrence: reminderData.recurrence || { type: 'none', interval: 1 },
      });

      res.status(201).json({ message: 'Reminder created', reminder });
    } catch (error) {
      console.error('Create reminder error:', error);
      res.status(500).json({ message: 'Failed to create reminder' });
    }
  }
);

// PUT /api/reminders/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (existingReminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const updateData = pickReminderData(req.body);
    const reminder = await Reminder.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after', runValidators: true });

    let nextOccurrence = null;
    if (reminder && updateData.status === 'completed' && existingReminder.status !== 'completed') {
      nextOccurrence = await generateNextRecurringReminder(reminder);
    }

    res.json({ message: 'Reminder updated', reminder, nextOccurrence });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

// PATCH /api/reminders/:id/acknowledge
router.patch('/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (existingReminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const reminder = await Reminder.findByIdAndUpdate(
      id,
      { $set: { status: 'acknowledged', acknowledgedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({ message: 'Reminder acknowledged', reminder });
  } catch (error) {
    console.error('Acknowledge reminder error:', error);
    res.status(500).json({ message: 'Failed to acknowledge reminder' });
  }
});

// PATCH /api/reminders/:id/complete
router.patch('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (existingReminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const wasComplete = existingReminder.status === 'completed';
    existingReminder.status = 'completed';
    existingReminder.completedAt = existingReminder.completedAt || new Date();
    existingReminder.acknowledgedAt = existingReminder.acknowledgedAt || new Date();
    await existingReminder.save();

    const nextOccurrence = !wasComplete ? await generateNextRecurringReminder(existingReminder) : null;
    res.json({ message: 'Reminder completed', reminder: existingReminder, nextOccurrence });
  } catch (error) {
    console.error('Complete reminder error:', error);
    res.status(500).json({ message: 'Failed to complete reminder' });
  }
});

// PATCH /api/reminders/:id/pending
router.patch('/:id/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (existingReminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    existingReminder.status = 'active';
    existingReminder.completedAt = undefined;
    existingReminder.acknowledgedAt = undefined;
    await existingReminder.save();
    res.json({ message: 'Reminder marked pending', reminder: existingReminder });
  } catch (error) {
    console.error('Pending reminder error:', error);
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    const existingReminder = await Reminder.findById(id);
    if (!existingReminder) {
      res.status(404).json({ message: 'Reminder not found' });
      return;
    }

    if (existingReminder.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    await Reminder.findByIdAndDelete(id);
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ message: 'Failed to delete reminder' });
  }
});

export { getReminderDueAt, getAlertTime, createReminderNotification };
export default router;
