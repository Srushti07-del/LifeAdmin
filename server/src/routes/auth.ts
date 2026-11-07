import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { randomUUID, randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
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
import { sendPasswordResetEmail, isEmailConfigured } from '../services/email';

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
        res.status(400).json({ message: 'An account with this email already exists. Please sign in or reset your password.' });
        return;
      }

      // Create user
      let user;
      try {
        user = await User.create({
          name,
          email,
          password,
          authProvider: 'local',
        });
      } catch (createErr: any) {
        // Handle duplicate-key race condition gracefully
        if (createErr?.code === 11000) {
          res.status(400).json({ message: 'An account with this email already exists. Please sign in or reset your password.' });
          return;
        }
        throw createErr;
      }

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
      res.status(500).json({
        message: 'Something went wrong during registration. Please try again later.',
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
      res.status(500).json({
        message: 'Something went wrong during login. Please try again later.',
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

// Rate limiter for password reset requests (5 per 15 minutes per IP)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/forgot-password — Request a password reset
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      // If email delivery is not configured, do not pretend email was sent.
      // Returning 503 upfront prevents leaking whether an email exists.
      if (!isEmailConfigured()) {
        res.status(503).json({
          message: 'Email service is not configured. Password reset emails cannot be sent right now.',
        });
        return;
      }

      const { email } = req.body;

      // Look up the user without revealing whether the account exists
      const user = await User.findOne({ email }).select('+password');

      if (!user || user.authProvider !== 'local' || user.isDemo) {
        // Generic response to prevent email enumeration
        res.json({ message: 'If an account exists for this email, a password reset link has been sent.' });
        return;
      }

      // Generate a cryptographically secure, random, single-use token
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store only its SHA-256 hash and expiry
      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpires = expiresAt;
      await user.save();

      const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailErr) {
        console.error('Reset email send error:', emailErr);
        // Invalidate token since delivery failed
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(500).json({ message: 'Failed to send password reset email. Please try again later.' });
        return;
      }

      res.json({ message: 'If an account exists for this email, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process password reset request.' });
    }
  }
);

// POST /api/auth/reset-password/:token — Reset password with a valid token
router.post(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const { token } = req.params;
      const { password } = req.body;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ message: 'Invalid reset token.' });
        return;
      }

      // Hash the incoming token with SHA-256 for exact-match lookup
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // Find user with a matching token hash and unexpired token
      const user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+password +resetPasswordToken');

      if (!user) {
        res.status(400).json({ message: 'Invalid or expired reset token.' });
        return;
      }

      // Set the new password (hashed by userSchema pre-save hook) and invalidate the token
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: 'Password has been reset successfully. Please sign in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password.' });
    }
  }
);

export default router;
