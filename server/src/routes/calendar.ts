import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import CalendarEvent from '../models/CalendarEvent';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/calendar/events — Unified calendar feed across all LifeAdmin modules
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end } = req.query;
    const userId = req.user!._id;

    // Default range: current month +/- 1 month if not specified
    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const [customEvents, tasks, bills, appointments, reminders] = await Promise.all([
      // 1. Custom calendar events
      CalendarEvent.find({
        userId,
        startDate: { $gte: startDate, $lte: endDate },
      }),
      // 2. Tasks with due dates
      Task.find({
        userId,
        dueDate: { $gte: startDate, $lte: endDate },
      }),
      // 3. Bills with due dates
      Bill.find({
        userId,
        dueDate: { $gte: startDate, $lte: endDate },
      }),
      // 4. Appointments
      Appointment.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
      }),
      // 5. Reminders
      Reminder.find({
        userId,
        dueDate: { $gte: startDate, $lte: endDate },
      }),
    ]);

    // Normalize all into a unified event format
    const unifiedEvents = [
      ...customEvents.map((evt) => ({
        id: evt._id.toString(),
        title: evt.title,
        date: evt.startDate,
        startTime: evt.startTime,
        endTime: evt.endTime,
        allDay: evt.allDay,
        type: 'event' as const,
        source: 'manual',
        status: 'scheduled',
        category: evt.category || 'Personal',
        color: evt.color || '#4c6ef5',
        details: evt.description,
        location: evt.location,
        isOriginalEvent: true,
      })),
      ...tasks.map((task) => ({
        id: `task-${task._id}`,
        originalId: task._id.toString(),
        title: `Task: ${task.title}`,
        date: task.dueDate!,
        startTime: task.dueTime,
        allDay: !task.dueTime,
        type: 'task' as const,
        source: 'task',
        status: task.status,
        priority: task.priority,
        category: task.category || 'Work/Study',
        color: task.priority === 'urgent' ? '#fa5252' : task.priority === 'high' ? '#fd7e14' : '#4c6ef5',
        details: task.description,
      })),
      ...bills.map((bill) => ({
        id: `bill-${bill._id}`,
        originalId: bill._id.toString(),
        title: `Bill: ${bill.name} ($${bill.amount})`,
        date: bill.dueDate,
        allDay: true,
        type: 'bill' as const,
        source: 'bill',
        status: bill.paymentStatus === 'paid' ? 'paid' : 'due',
        category: bill.category || 'Utilities',
        color: bill.paymentStatus === 'paid' ? '#40c057' : '#fd7e14',
        details: `Provider: ${bill.provider || ''} | Amount: $${bill.amount}`,
      })),
      ...appointments.map((appt) => ({
        id: `appt-${appt._id}`,
        originalId: appt._id.toString(),
        title: `Appt: ${appt.title}`,
        date: appt.date,
        startTime: appt.time,
        allDay: !appt.time,
        type: 'appointment' as const,
        source: 'appointment',
        status: 'scheduled',
        category: appt.category || 'Health',
        color: '#be4bdb',
        details: appt.notes,
        location: appt.location,
        relatedPerson: appt.relatedPerson,
      })),
      ...reminders.map((rem) => ({
        id: `rem-${rem._id}`,
        originalId: rem._id.toString(),
        title: `Reminder: ${rem.title}`,
        date: rem.dueDate,
        allDay: true,
        type: 'reminder' as const,
        source: 'reminder',
        status: rem.status === 'acknowledged' ? 'acknowledged' : 'pending',
        category: rem.category || 'Personal',
        color: rem.status === 'acknowledged' ? '#868e96' : '#fab005',
        details: rem.description,
      })),
    ];

    // Sort chronologically
    unifiedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ events: unifiedEvents });
  } catch (error) {
    console.error('Unified calendar error:', error);
    res.status(500).json({ message: 'Failed to fetch calendar events' });
  }
});

// POST /api/calendar/events — Create manual calendar event
router.post(
  '/events',
  [body('title').notEmpty().withMessage('Title is required'), body('startDate').isISO8601().withMessage('Valid start date is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { title, description, startDate, endDate, startTime, endTime, allDay = false, location, category = 'Personal', color } = req.body;

      const event = new CalendarEvent({
        userId: req.user!._id,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        startTime,
        endTime,
        allDay,
        location,
        category,
        color: color || '#4c6ef5',
        sourceType: 'manual',
      });

      await event.save();
      res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
      console.error('Create calendar event error:', error);
      res.status(500).json({ message: 'Failed to create calendar event' });
    }
  }
);

// PUT /api/calendar/events/:id — Update manual event
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!event) {
      res.status(404).json({ message: 'Calendar event not found' });
      return;
    }

    res.json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ message: 'Failed to update calendar event' });
  }
});

// DELETE /api/calendar/events/:id — Delete manual event
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!event) {
      res.status(404).json({ message: 'Calendar event not found' });
      return;
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ message: 'Failed to delete calendar event' });
  }
});

export default router;
