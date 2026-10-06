import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import { authenticate } from '../middleware/auth';
import { handleBillRecurrence } from '../services/recurrence';

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
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    if (bill.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ bill });
  } catch (error) {
    console.error('Get bill error:', error);
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

      const { _id, userId, createdAt, updatedAt, ...billData } = req.body;
      const bill = await Bill.create({ ...billData, userId: req.user!._id });
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
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const existingBill = await Bill.findById(id);
    if (!existingBill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    if (existingBill.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Prevent mass-assignment overwrite of protected fields
    const { _id, userId, createdAt, updatedAt, ...updateData } = req.body;

    const bill = await Bill.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (bill && updateData.paymentStatus === 'paid' && existingBill.paymentStatus !== 'paid') {
      await handleBillRecurrence(bill);
    }

    res.json({ message: 'Bill updated', bill });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ message: 'Failed to update bill' });
  }
});

// PATCH /api/bills/:id/pay — Mark bill as paid & trigger recurrence
router.patch('/:id/pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const existingBill = await Bill.findById(id);
    if (!existingBill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    if (existingBill.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const wasPaid = existingBill.paymentStatus === 'paid';
    existingBill.paymentStatus = 'paid';
    await existingBill.save();

    let nextOccurrence = null;
    if (!wasPaid) {
      nextOccurrence = await handleBillRecurrence(existingBill);
    }

    res.json({ message: 'Bill marked as paid', bill: existingBill, nextOccurrence });
  } catch (error) {
    console.error('Pay bill error:', error);
    res.status(500).json({ message: 'Failed to mark bill as paid' });
  }
});

// DELETE /api/bills/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    const existingBill = await Bill.findById(id);
    if (!existingBill) {
      res.status(404).json({ message: 'Bill not found' });
      return;
    }

    if (existingBill.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    await Bill.findByIdAndDelete(id);
    res.json({ message: 'Bill deleted' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ message: 'Failed to delete bill' });
  }
});

export default router;
