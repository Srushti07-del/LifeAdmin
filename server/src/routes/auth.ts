import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { randomUUID } from 'crypto';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import CalendarEvent from '../models/CalendarEvent';
import DocumentModel from '../models/Document';
import { authenticate, generateToken } from '../middleware/auth';
import config from '../config';
import { seedDemoData } from '../utils/demoSeed';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
        return;
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'An account with this email already exists' });
        return;
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        authProvider: 'local',
      });

      const token = generateToken(user._id.toString());

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          theme: user.theme,
          subscriptionTier: user.subscriptionTier,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      // Surface actual error in development; keep production safe
      const isDev = config.nodeEnv === 'development';
      res.status(500).json({
        message: isDev
          ? (error?.message || 'Something went wrong during registration')
          : 'Something went wrong during registration',
        ...(isDev && { stack: error?.stack }),
      });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      if (user.authProvider === 'google' && !user.password) {
        res.status(401).json({
          message: 'This account uses Google sign-in. Please log in with Google.',
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      const token = generateToken(user._id.toString());

      res.json({
        message: 'Logged in successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          theme: user.theme,
          subscriptionTier: user.subscriptionTier,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      const isDev = config.nodeEnv === 'development';
      res.status(500).json({
        message: isDev
          ? (error?.message || 'Something went wrong during login')
          : 'Something went wrong during login',
        ...(isDev && { stack: error?.stack }),
      });
    }
  }
);

// GET /api/auth/me — Get current user
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        theme: user.theme,
        notificationsEnabled: user.notificationsEnabled,
        defaultReminderTiming: user.defaultReminderTiming,
        quietHoursStart: user.quietHoursStart,
        quietHoursEnd: user.quietHoursEnd,
        categories: user.categories,
        aiPreferences: user.aiPreferences,
        subscriptionTier: user.subscriptionTier,
        isDemo: user.isDemo,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user information' });
  }
});

// PUT /api/auth/profile — Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const allowedUpdates = [
        'name', 'profilePicture', 'theme', 'notificationsEnabled',
        'defaultReminderTiming', 'quietHoursStart', 'quietHoursEnd',
        'categories', 'aiPreferences',
      ];

      const updates: Record<string, unknown> = {};
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user!._id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          theme: user.theme,
          notificationsEnabled: user.notificationsEnabled,
          defaultReminderTiming: user.defaultReminderTiming,
          quietHoursStart: user.quietHoursStart,
          quietHoursEnd: user.quietHoursEnd,
          categories: user.categories,
          aiPreferences: user.aiPreferences,
          subscriptionTier: user.subscriptionTier,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);


// POST /api/auth/guest — Start a demo/guest session (ephemeral user + seeded data)
router.post('/guest', async (_req: Request, res: Response): Promise<void> => {
  try {
    const guestEmail = `guest_${randomUUID()}@lifeadmin.demo`;
    const demoExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const user = await User.create({
      name: 'Demo Guest',
      email: guestEmail,
      authProvider: 'local',
      isDemo: true,
      demoExpiresAt,
      categories: ['Personal', 'Work', 'Finance', 'Health', 'Education', 'Home'],
    });

    // Seed all demo data under this user's isolated userId
    await seedDemoData(user._id);

    // Short-lived 2-hour token — same JWT format as normal login
    const token = generateToken(user._id.toString(), '2h');

    res.status(201).json({
      message: 'Demo session started',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        theme: user.theme,
        notificationsEnabled: user.notificationsEnabled,
        defaultReminderTiming: user.defaultReminderTiming,
        categories: user.categories,
        aiPreferences: user.aiPreferences,
        subscriptionTier: user.subscriptionTier,
        isDemo: true,
      },
    });
  } catch (error: any) {
    console.error('Guest session error:', error);
    const isDev = config.nodeEnv === 'development';
    res.status(500).json({
      message: isDev
        ? (error?.message || 'Failed to start demo session')
        : 'Failed to start demo session',
    });
  }
});

// DELETE /api/auth/guest — End a demo/guest session and purge ephemeral data
router.delete('/guest', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.isDemo) {
      res.status(403).json({ message: 'Not a demo session' });
      return;
    }

    const userId = user._id;

    // Delete all data scoped to this demo user (in parallel for speed)
    await Promise.all([
      Task.deleteMany({ userId }),
      Bill.deleteMany({ userId }),
      Appointment.deleteMany({ userId }),
      Reminder.deleteMany({ userId }),
      CalendarEvent.deleteMany({ userId }),
      DocumentModel.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ message: 'Demo session ended and data purged' });
  } catch (error) {
    console.error('Guest cleanup error:', error);
    res.status(500).json({ message: 'Failed to end demo session' });
  }
});

export default router;
