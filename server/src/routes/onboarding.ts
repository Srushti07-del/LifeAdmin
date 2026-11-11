import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/onboarding/status — Check onboarding completion status
router.get('/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({
      completed: user.onboardingCompleted,
      step: user.onboardingStep,
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ message: 'Failed to get onboarding status' });
  }
});

// POST /api/onboarding/progress — Save onboarding step progress
router.post(
  '/progress',
  authenticate,
  [
    body('step').isInt({ min: 1, max: 5 }).withMessage('Step must be between 1 and 5'),
    body('data').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
        return;
      }

      const { step, data } = req.body;
      const updates: Record<string, unknown> = { onboardingStep: step };

      // Merge partial onboarding data into user fields
      if (data) {
        if (data.name !== undefined) updates.name = data.name;
        if (data.categories !== undefined) updates.categories = data.categories;
        if (data.theme !== undefined) updates.theme = data.theme;
        if (data.notificationsEnabled !== undefined) updates.notificationsEnabled = data.notificationsEnabled;
        if (data.notificationTypes !== undefined) updates.notificationTypes = data.notificationTypes;
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
        message: 'Onboarding progress saved',
        step: user.onboardingStep,
        completed: user.onboardingCompleted,
      });
    } catch (error) {
      console.error('Onboarding progress error:', error);
      res.status(500).json({ message: 'Failed to save onboarding progress' });
    }
  }
);

// POST /api/onboarding/complete — Mark onboarding as completed
router.post(
  '/complete',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user!._id,
        { $set: { onboardingCompleted: true, onboardingStep: 5 } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        message: 'Onboarding completed',
        completed: user.onboardingCompleted,
      });
    } catch (error) {
      console.error('Onboarding complete error:', error);
      res.status(500).json({ message: 'Failed to complete onboarding' });
    }
  }
);

export default router;
