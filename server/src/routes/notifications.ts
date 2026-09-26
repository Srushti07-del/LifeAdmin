import { Router, Request, Response } from 'express';
import Notification from '../models/Notification';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications — List notifications for user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { unreadOnly = 'false', limit = '30' } = req.query;
    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort('-createdAt')
      .limit(parseInt(limit as string, 10));

    const unreadCount = await Notification.countDocuments({ userId: req.user!._id, read: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read — Mark single notification as read
router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { read: true, readAt: new Date() },
      { new: true }
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

// PUT /api/notifications/read-all — Mark all user notifications as read
router.put('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user!._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/notifications/:id — Dismiss notification
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
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
