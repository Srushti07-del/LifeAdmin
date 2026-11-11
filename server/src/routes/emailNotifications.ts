import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import EmailNotification from '../models/EmailNotification';
import { authenticate, enforceOnboarding } from '../middleware/auth';
import { isEmailConfigured } from '../services/notificationEmail';
import { generateEmailNotifications, cleanupProcessedNotifications } from '../services/emailNotificationGenerator';

const router = Router();
router.use(authenticate);
router.use(enforceOnboarding);

// GET /api/email-notifications/status — Check email config + user preferences
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select(
      'notificationsEnabled emailReminderIntervals timezone notificationTypes email'
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      emailConfigured: isEmailConfigured(),
      emailNotificationsEnabled: user.notificationsEnabled,
      emailReminderIntervals: user.emailReminderIntervals,
      timezone: user.timezone,
      notificationTypes: user.notificationTypes,
    });
  } catch (error) {
    console.error('Email notification status error:', error);
    res.status(500).json({ message: 'Failed to fetch email notification status' });
  }
});

// GET /api/email-notifications/history — User's email notification history
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = '50' } = req.query;
    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (status) filter.status = status;

    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));

    const notifications = await EmailNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({ notifications });
  } catch (error) {
    console.error('Email notification history error:', error);
    res.status(500).json({ message: 'Failed to fetch email notification history' });
  }
});

// POST /api/email-notifications/test — Send a test email (development/verification)
router.post(
  '/test',
  [
    body('to').optional().isEmail().withMessage('Valid email address required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      if (!isEmailConfigured()) {
        res.status(503).json({ message: 'Email service is not configured' });
        return;
      }

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const { sendNotificationEmail } = await import('../services/notificationEmail');

      const result = await sendNotificationEmail({
        to: req.body.to || user.email,
        userName: user.name || 'there',
        type: 'reminder',
        title: 'Test Email from LifeAdmin',
        dueDate: new Date().toLocaleDateString('en-IN'),
        message: 'This is a test email to verify your LifeAdmin email notification delivery is working.',
        actionUrl: `${process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`,
        actionLabel: 'Go to Dashboard',
      });

      res.json({ message: 'Test email sent', result });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ message: error?.message || 'Failed to send test email' });
    }
  }
);

// POST /api/email-notifications/generate — Manually trigger email notification generation (admin/cron)
router.post('/generate', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await generateEmailNotifications();
    res.json({ message: 'Email notifications generated', ...result });
  } catch (error) {
    console.error('Generate email notifications error:', error);
    res.status(500).json({ message: 'Failed to generate email notifications' });
  }
});

// POST /api/email-notifications/cleanup — Remove old processed notifications
router.post('/cleanup', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await cleanupProcessedNotifications();
    res.json({ message: 'Cleanup complete', ...result });
  } catch (error) {
    console.error('Cleanup email notifications error:', error);
    res.status(500).json({ message: 'Failed to cleanup email notifications' });
  }
});

export default router;
