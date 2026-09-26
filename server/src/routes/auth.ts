import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate, generateToken } from '../middleware/auth';
import config from '../config';

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

// DELETE /api/auth/account — Delete account
router.delete('/account', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await User.findByIdAndDelete(req.user!._id);
    // TODO: Delete all user's data (tasks, bills, etc.)
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router;
