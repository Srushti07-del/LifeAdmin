import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Reminder from '../models/Reminder';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/reminders
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, sort = 'dueDate', limit = '50', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [reminders, total] = await Promise.all([
      Reminder.find(filter)
        .sort(sort as string)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Reminder.countDocuments(filter),
    ]);

    res.json({
      reminders,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!reminder) { res.status(404).json({ message: 'Reminder not found' }); return; }
    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reminder' });
  }
});

// POST /api/reminders
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }
      const reminder = await Reminder.create({ ...req.body, userId: req.user!._id });
      res.status(201).json({ message: 'Reminder created', reminder });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create reminder' });
    }
  }
);

// PUT /api/reminders/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!reminder) { res.status(404).json({ message: 'Reminder not found' }); return; }
    res.json({ message: 'Reminder updated', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

// PATCH /api/reminders/:id/acknowledge
router.patch('/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: { status: 'acknowledged', acknowledgedAt: new Date() } },
      { new: true }
    );
    if (!reminder) { res.status(404).json({ message: 'Reminder not found' }); return; }
    res.json({ message: 'Reminder acknowledged', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to acknowledge reminder' });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!reminder) { res.status(404).json({ message: 'Reminder not found' }); return; }
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete reminder' });
  }
});

export default router;
