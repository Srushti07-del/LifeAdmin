import { Router, Request, Response } from 'express';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import CalendarEvent from '../models/CalendarEvent';
import Notification from '../models/Notification';
import AIInteraction from '../models/AIInteraction';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/users/profile — Get full profile
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile — Update name or profile picture
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, profilePicture } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (name) user.name = name.trim();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// PUT /api/users/settings — Update settings & preferences
router.put('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      theme,
      notificationsEnabled,
      defaultReminderTiming,
      categories,
      aiPreferences,
      subscriptionTier,
    } = req.body;

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (theme && ['light', 'dark', 'system'].includes(theme)) user.theme = theme;
    if (typeof notificationsEnabled === 'boolean') user.notificationsEnabled = notificationsEnabled;
    if (Array.isArray(defaultReminderTiming)) user.defaultReminderTiming = defaultReminderTiming;
    if (Array.isArray(categories)) user.categories = categories;
    if (aiPreferences) {
      user.aiPreferences = {
        ...user.aiPreferences,
        ...aiPreferences,
      };
    }
    if (subscriptionTier && ['free', 'premium', 'premium_ai'].includes(subscriptionTier)) {
      user.subscriptionTier = subscriptionTier;
    }

    await user.save();
    res.json({ message: 'Settings saved successfully', user });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// GET /api/users/export — Export all user data as JSON (Data portability)
router.get('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const [tasks, bills, appointments, reminders, documents, events, aiInteractions] = await Promise.all([
      Task.find({ userId }),
      Bill.find({ userId }),
      Appointment.find({ userId }),
      Reminder.find({ userId }),
      DocumentModel.find({ userId }),
      CalendarEvent.find({ userId }),
      AIInteraction.find({ userId }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: req.user!._id,
        name: req.user!.name,
        email: req.user!.email,
      },
      tasks,
      bills,
      appointments,
      reminders,
      documents,
      calendarEvents: events,
      aiInteractions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=lifeadmin-export-${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Failed to export user data' });
  }
});

// DELETE /api/users/account — Delete user account and cascade delete all associated data
router.delete('/account', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    await Promise.all([
      Task.deleteMany({ userId }),
      Bill.deleteMany({ userId }),
      Appointment.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
      DocumentModel.deleteMany({ userId }),
      CalendarEvent.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      AIInteraction.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ message: 'Account and all associated data permanently deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router;
