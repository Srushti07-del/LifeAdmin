import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

/**
 * Middleware to enforce onboarding completion for protected API routes.
 * Allows access to auth and onboarding endpoints regardless of onboarding status.
 * Requires onboardingCompleted === true for all other API routes.
 */
export const enforceOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = req.path;

  // Always allow auth and onboarding endpoints
  if (path.startsWith('/api/auth/') || path.startsWith('/api/onboarding/')) {
    return next();
  }

  // Health check is always allowed
  if (path === '/api/health') {
    return next();
  }

  try {
    const user = await User.findById((req as any).user?._id);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (!user.isDemo && !user.onboardingCompleted) {
      res.status(403).json({
        message: 'Onboarding not completed. Please complete onboarding before accessing the dashboard.',
        redirect: '/onboarding',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Onboarding enforcement error:', error);
    res.status(500).json({ message: 'Onboarding verification failed' });
  }
};
