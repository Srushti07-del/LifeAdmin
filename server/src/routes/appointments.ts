import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment';
import { authenticate, enforceOnboarding } from '../middleware/auth';
import { rescheduleEntityEmailNotifications } from '../services/emailNotificationGenerator';

const router = Router();
router.use(authenticate);
router.use(enforceOnboarding);

// GET /api/appointments
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, dateBefore, dateAfter, sort = 'date', limit = '50', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (category) filter.category = category;
    if (dateBefore || dateAfter) {
      filter.date = {};
      if (dateBefore) (filter.date as Record<string, unknown>).$lte = new Date(dateBefore as string);
      if (dateAfter) (filter.date as Record<string, unknown>).$gte = new Date(dateAfter as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort(sort as string)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Appointment.countDocuments(filter),
    ]);

    res.json({
      appointments,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('List appointments error:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    if (appointment.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Failed to fetch appointment' });
  }
});

// POST /api/appointments
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const { _id, userId, createdAt, updatedAt, ...appointmentData } = req.body;
      const appointment = await Appointment.create({
        ...appointmentData,
        userId: req.user!._id,
      });

      res.status(201).json({ message: 'Appointment created', appointment });
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ message: 'Failed to create appointment' });
    }
  }
);

// PUT /api/appointments/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    const existingAppointment = await Appointment.findById(id);
    if (!existingAppointment) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    if (existingAppointment.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { _id, userId, createdAt, updatedAt, ...updateData } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Reschedule email notifications if the appointment's date/time changed
    void rescheduleEntityEmailNotifications(req.user!._id, existingAppointment._id, 'appointment');

    res.json({ message: 'Appointment updated', appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    const existingAppointment = await Appointment.findById(id);
    if (!existingAppointment) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }

    if (existingAppointment.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    await Appointment.findByIdAndDelete(id);

    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Failed to delete appointment' });
  }
});

export default router;
