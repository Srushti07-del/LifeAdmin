import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { calculateDashboardOverview } from '../services/attention';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — Prioritized overview of user responsibilities
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const overview = await calculateDashboardOverview(userId);
    res.json(overview);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

export default router;
