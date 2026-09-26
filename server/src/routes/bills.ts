import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Bill from '../models/Bill';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/bills
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentStatus, category, sort = '-dueDate', limit = '50', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (category) filter.category = category;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort(sort as string)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Bill.countDocuments(filter),
    ]);

    res.json({
      bills,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('List bills error:', error);
    res.status(500).json({ message: 'Failed to fetch bills' });
  }
});

// GET /api/bills/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!bill) { res.status(404).json({ message: 'Bill not found' }); return; }
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bill' });
  }
});

// POST /api/bills
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Bill name is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const bill = await Bill.create({ ...req.body, userId: req.user!._id });
      res.status(201).json({ message: 'Bill created', bill });
    } catch (error) {
      console.error('Create bill error:', error);
      res.status(500).json({ message: 'Failed to create bill' });
    }
  }
);

// PUT /api/bills/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!bill) { res.status(404).json({ message: 'Bill not found' }); return; }
    res.json({ message: 'Bill updated', bill });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update bill' });
  }
});

// DELETE /api/bills/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!bill) { res.status(404).json({ message: 'Bill not found' }); return; }
    res.json({ message: 'Bill deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete bill' });
  }
});

export default router;
