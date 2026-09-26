import { Router, Request, Response } from 'express';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — Prioritized overview of user responsibilities
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    // Fetch all relevant data in parallel
    const [
      overdueTasks,
      upcomingTasks,
      overdueBills,
      upcomingBills,
      upcomingAppointments,
      activeReminders,
    ] = await Promise.all([
      // Overdue tasks
      Task.find({
        userId,
        status: { $ne: 'completed' },
        dueDate: { $lt: today },
      }).sort({ dueDate: 1 }).limit(10),

      // Upcoming tasks (due within 30 days)
      Task.find({
        userId,
        status: { $ne: 'completed' },
        dueDate: { $gte: today, $lte: in30Days },
      }).sort({ dueDate: 1 }).limit(20),

      // Overdue bills
      Bill.find({
        userId,
        paymentStatus: { $in: ['pending', 'overdue'] },
        dueDate: { $lt: today },
      }).sort({ dueDate: 1 }).limit(10),

      // Upcoming bills
      Bill.find({
        userId,
        paymentStatus: { $in: ['pending', 'upcoming'] },
        dueDate: { $gte: today, $lte: in30Days },
      }).sort({ dueDate: 1 }).limit(20),

      // Upcoming appointments (next 30 days)
      Appointment.find({
        userId,
        date: { $gte: today, $lte: in30Days },
      }).sort({ date: 1 }).limit(20),

      // Active reminders
      Reminder.find({
        userId,
        status: 'active',
        dueDate: { $lte: in30Days },
      }).sort({ dueDate: 1 }).limit(20),
    ]);

    // Build "Needs Attention" items — prioritized by urgency
    const needsAttention: Array<{
      id: string;
      type: string;
      title: string;
      subtitle: string;
      urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming';
      urgencyLabel: string;
      dueDate: Date;
      amount?: number;
      currency?: string;
    }> = [];

    // Add overdue tasks
    for (const task of overdueTasks) {
      const daysOverdue = Math.ceil((now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24));
      needsAttention.push({
        id: task._id.toString(),
        type: 'task',
        title: task.title,
        subtitle: task.category,
        urgency: 'overdue',
        urgencyLabel: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        dueDate: task.dueDate!,
      });
    }

    // Add overdue bills
    for (const bill of overdueBills) {
      const daysOverdue = Math.ceil((now.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      needsAttention.push({
        id: bill._id.toString(),
        type: 'bill',
        title: bill.name,
        subtitle: bill.provider || bill.category,
        urgency: 'overdue',
        urgencyLabel: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        dueDate: bill.dueDate,
        amount: bill.amount,
        currency: bill.currency,
      });
    }

    // Add urgent upcoming tasks (due within 3 days)
    for (const task of upcomingTasks) {
      if (!task.dueDate) continue;
      const daysUntil = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const urgency = daysUntil <= 1 ? 'urgent' : daysUntil <= 3 ? 'soon' : 'upcoming';
      const urgencyLabel = daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;
      needsAttention.push({
        id: task._id.toString(),
        type: 'task',
        title: task.title,
        subtitle: task.category,
        urgency,
        urgencyLabel,
        dueDate: task.dueDate,
      });
    }

    // Add upcoming bills
    for (const bill of upcomingBills) {
      const daysUntil = Math.ceil((bill.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const urgency = daysUntil <= 1 ? 'urgent' : daysUntil <= 3 ? 'soon' : 'upcoming';
      const urgencyLabel = daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;
      needsAttention.push({
        id: bill._id.toString(),
        type: 'bill',
        title: bill.name,
        subtitle: bill.provider || bill.category,
        urgency,
        urgencyLabel,
        dueDate: bill.dueDate,
        amount: bill.amount,
        currency: bill.currency,
      });
    }

    // Sort needs attention by urgency priority
    const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, upcoming: 3 };
    needsAttention.sort((a, b) => {
      const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (orderDiff !== 0) return orderDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    // Build upcoming events
    const upcoming = upcomingAppointments.map((appt) => ({
      id: appt._id.toString(),
      type: 'appointment',
      title: appt.title,
      subtitle: appt.location || appt.category,
      date: appt.date,
      time: appt.time,
    }));

    // Summary stats
    const stats = {
      overdueCount: overdueTasks.length + overdueBills.length,
      dueSoonCount: needsAttention.filter((i) => i.urgency === 'urgent' || i.urgency === 'soon').length,
      upcomingCount: upcoming.length,
      activeReminders: activeReminders.length,
    };

    res.json({
      needsAttention: needsAttention.slice(0, 10), // Top 10
      upcoming: upcoming.slice(0, 10),
      reminders: activeReminders.slice(0, 5),
      stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

export default router;
