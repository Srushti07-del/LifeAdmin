import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { authenticate, enforceOnboarding } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(enforceOnboarding);

function asId(value: unknown): string | null {
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && mongoose.Types.ObjectId.isValid(value[0])) return value[0];
  return null;
}

// GET /api/notifications — List notifications for user (in-app center)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { unreadOnly = 'false', limit = '50', includeDismissed = 'false' } = req.query;
    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (includeDismissed !== 'true') {
      filter.$or = [{ dismissedAt: { $exists: false } }, { dismissedAt: null }];
    }
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user!._id,
      read: false,
      $or: [{ dismissedAt: { $exists: false } }, { dismissedAt: null }],
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user!._id,
      read: false,
      $or: [{ dismissedAt: { $exists: false } }, { dismissedAt: null }],
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/read-all — Mark all user notifications as read
router.put('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user!._id, read: false, $or: [{ dismissedAt: { $exists: false } }, { dismissedAt: null }] },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// PUT /api/notifications/:id/read — Mark single notification as read
router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = asId(req.params.id);
    if (!id) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user!._id },
      { $set: { read: true, readAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// PUT /api/notifications/:id/dismiss — Dismiss without deleting (kept for audit; hidden from default list)
router.put('/:id/dismiss', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = asId(req.params.id);
    if (!id) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user!._id },
      { $set: { read: true, readAt: new Date(), dismissedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification dismissed', notification: notif });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({ message: 'Failed to dismiss notification' });
  }
});

// DELETE /api/notifications/:id — Remove notification
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = asId(req.params.id);
    if (!id) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    const notif = await Notification.findOneAndDelete({ _id: id, userId: req.user!._id });
    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

export default router;
