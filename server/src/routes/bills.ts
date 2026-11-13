import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import { authenticate, enforceOnboarding } from '../middleware/auth';
import { handleBillRecurrence } from '../services/recurrence';
import { enqueueRecordSync } from '../services/googleCalendarSync';
import { rescheduleEntityEmailNotifications } from '../services/emailNotificationGenerator';

const router = Router();
router.use(authenticate);
router.use(enforceOnboarding);

// Helper: auto-sync a bill to Google Calendar (persists retry state on failure)
function syncBillToGoogle(userId: mongoose.Types.ObjectId, operation: 'create' | 'update' | 'delete', sourceId: mongoose.Types.ObjectId) {
  return enqueueRecordSync(userId, 'bill', sourceId, operation);
}

function sanitizeRecurrence(input: any) {
  if (!input || input.type === 'none') return { type: 'none' as const };
  const type = input.type;
  const allowed = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
  if (!allowed.includes(type)) return { type: 'none' as const };
  const rec: any = { type };
  if (input.interval !== undefined) rec.interval = Math.max(1, Number(input.interval) || 1);
  if (input.unit) rec.unit = input.unit;
  if (input.endDate) rec.endDate = new Date(input.endDate);
  if (input.durationMonths !== undefined) rec.durationMonths = Math.max(1, Number(input.durationMonths) || 1);
  return rec;
}

function pickBillData(body: any) {
  const { _id, userId, createdAt, updatedAt, paidAt, ...data } = body;
  if (data.recurrence !== undefined) data.recurrence = sanitizeRecurrence(data.recurrence);
  if (data.description === '') data.description = undefined;
  if (data.notes === '') data.notes = undefined;
  if (data.provider === '') data.provider = undefined;
  return data;
}

// GET /api/bills
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentStatus, category, search, sort = 'dueDate', limit = '200', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (category) filter.category = category;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: q, $options: 'i' } }, { provider: { $regex: q, $options: 'i' } }];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 200));
    const sortStr = typeof sort === 'string' ? sort : 'dueDate';
    const allowedSort: Record<string, any> = {
      dueDate: { dueDate: 1 },
      '-dueDate': { dueDate: -1 },
      amount: { amount: 1 },
      '-amount': { amount: -1 },
      createdAt: { createdAt: -1 },
    };
    const sortSpec = allowedSort[sortStr] || { dueDate: 1 };

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort(sortSpec)
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

      const billData = pickBillData(req.body);
      const bill = await Bill.create({ ...billData, userId: req.user!._id, currency: billData.currency || 'INR' });

      // Auto-sync to Google Calendar if connected
      void syncBillToGoogle(req.user!._id, 'create', bill._id);

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

    const updateData = pickBillData(req.body);
    if (updateData.paymentStatus === 'paid' && existingBill.paymentStatus !== 'paid') {
      updateData.paidAt = updateData.paidAt ? new Date(updateData.paidAt) : new Date();
    } else if (updateData.paymentStatus && updateData.paymentStatus !== 'paid') {
      updateData.paidAt = null;
    }

    const bill = await Bill.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after', runValidators: true });

    // Auto-sync to Google Calendar if connected
    void syncBillToGoogle(req.user!._id, 'update', existingBill._id);

    // Reschedule email notifications if the bill's due date changed
    void rescheduleEntityEmailNotifications(req.user!._id, existingBill._id, 'bill');

    let nextOccurrence = null;
    if (bill && updateData.paymentStatus === 'paid' && existingBill.paymentStatus !== 'paid') {
      nextOccurrence = await handleBillRecurrence(bill);
    }

    res.json({ message: 'Bill updated', bill, nextOccurrence });
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
    existingBill.paidAt = existingBill.paidAt || new Date();
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

// PATCH /api/bills/:id/unpay — Mark bill as unpaid (does not affect generated history)
router.patch('/:id/unpay', async (req: Request, res: Response): Promise<void> => {
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

    existingBill.paymentStatus = 'pending';
    existingBill.paidAt = undefined;
    await existingBill.save();

    res.json({ message: 'Bill marked as unpaid', bill: existingBill });
  } catch (error) {
    console.error('Unpay bill error:', error);
    res.status(500).json({ message: 'Failed to mark bill as unpaid' });
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

    // Auto-sync to Google Calendar if connected
    void syncBillToGoogle(req.user!._id, 'delete', existingBill._id);

    res.json({ message: 'Bill deleted' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ message: 'Failed to delete bill' });
  }
});

export default router;
