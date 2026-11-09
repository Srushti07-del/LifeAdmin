import mongoose from 'mongoose';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import CalendarEvent from '../models/CalendarEvent';

export interface AttentionItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document';
  title: string;
  subtitle: string;
  reason: string;
  severity: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  urgencyLabel: string;
  dueDate: Date;
  destination: string;
  amount?: number;
  currency?: string;
}

export interface UpcomingItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'event';
  title: string;
  subtitle: string;
  date: Date;
  time?: string;
  destination: string;
  amount?: number;
  currency?: string;
}

/**
 * Canonical attention and upcoming aggregation layer.
 * Derives actionable insights from real database records across all modules.
 */
export async function calculateDashboardOverview(userId: mongoose.Types.ObjectId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const in1Day = new Date(today);
  in1Day.setDate(in1Day.getDate() + 1);
  in1Day.setHours(23, 59, 59, 999);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  in3Days.setHours(23, 59, 59, 999);

  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  in7Days.setHours(23, 59, 59, 999);

  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  in30Days.setHours(23, 59, 59, 999);

  // Fetch all user records across entities
  const [
    allTasks,
    allBills,
    allAppointments,
    allReminders,
    allDocsWithExpiry,
    allEvents,
  ] = await Promise.all([
    Task.find({
      userId,
      status: { $ne: 'completed' },
      dueDate: { $exists: true, $ne: null },
    }),
    Bill.find({
      userId,
      paymentStatus: { $ne: 'paid' },
    }),
    Appointment.find({
      userId,
      date: { $gte: today, $lte: in30Days },
    }),
    Reminder.find({
      userId,
      status: 'active',
    }),
    DocumentModel.find({
      userId,
      'aiExtracted.expiryDate': { $exists: true, $ne: null },
    }),
    CalendarEvent.find({
      userId,
      startDate: { $gte: today, $lte: in30Days },
    }),
  ]);

  const needsAttention: AttentionItem[] = [];
  const upcoming: UpcomingItem[] = [];

function getDaysDiff(targetDate: Date, today: Date): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

  // 1. Process Tasks
  for (const task of allTasks) {
    if (!task.dueDate) continue;
    const taskDueDate = new Date(task.dueDate);
    const daysDiff = getDaysDiff(taskDueDate, today);

    if (daysDiff < 0) {
      const daysOverdue = Math.abs(daysDiff);
      needsAttention.push({
        id: task._id.toString(),
        type: 'task',
        title: task.title,
        subtitle: task.category || 'Personal Task',
        reason: `Task overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        severity: 'overdue',
        urgencyLabel: `Overdue by ${daysOverdue}d`,
        dueDate: taskDueDate,
        destination: `/tasks/${task._id}`,
      });
    } else if (daysDiff <= 3) {
      const severity = daysDiff <= 1 ? 'urgent' : 'soon';
      const label = daysDiff === 0 ? 'Due today' : daysDiff === 1 ? 'Due tomorrow' : `Due in ${daysDiff} days`;
      needsAttention.push({
        id: task._id.toString(),
        type: 'task',
        title: task.title,
        subtitle: task.category || 'Personal Task',
        reason: label,
        severity,
        urgencyLabel: label,
        dueDate: taskDueDate,
        destination: `/tasks/${task._id}`,
      });
    }

    if (daysDiff >= 0 && daysDiff <= 30) {
      upcoming.push({
        id: task._id.toString(),
        type: 'task',
        title: task.title,
        subtitle: task.category || 'Task',
        date: taskDueDate,
        time: task.dueTime,
        destination: `/tasks/${task._id}`,
      });
    }
  }

  // 2. Process Bills
  for (const bill of allBills) {
    const billDueDate = new Date(bill.dueDate);
    const daysDiff = getDaysDiff(billDueDate, today);

    if (daysDiff < 0) {
      const daysOverdue = Math.abs(daysDiff);
      needsAttention.push({
        id: bill._id.toString(),
        type: 'bill',
        title: bill.name,
        subtitle: bill.provider || bill.category || 'Bill',
        reason: `Bill overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        severity: 'overdue',
        urgencyLabel: `Overdue by ${daysOverdue}d`,
        dueDate: billDueDate,
        destination: `/bills/${bill._id}`,
        amount: bill.amount,
        currency: bill.currency || 'INR',
      });
    } else if (daysDiff <= 3) {
      const severity = daysDiff <= 1 ? 'urgent' : 'soon';
      const label = daysDiff === 0 ? 'Due today' : daysDiff === 1 ? 'Due tomorrow' : `Due in ${daysDiff} days`;
      needsAttention.push({
        id: bill._id.toString(),
        type: 'bill',
        title: bill.name,
        subtitle: bill.provider || bill.category || 'Bill',
        reason: label,
        severity,
        urgencyLabel: label,
        dueDate: billDueDate,
        destination: `/bills/${bill._id}`,
        amount: bill.amount,
        currency: bill.currency || 'INR',
      });
    }

    if (daysDiff >= 0 && daysDiff <= 30) {
      upcoming.push({
        id: bill._id.toString(),
        type: 'bill',
        title: bill.name,
        subtitle: bill.provider ? `${bill.provider} · ${bill.currency || 'INR'} ${bill.amount}` : `${bill.currency || 'INR'} ${bill.amount}`,
        date: billDueDate,
        destination: `/bills/${bill._id}`,
        amount: bill.amount,
        currency: bill.currency || 'INR',
      });
    }
  }

  // 3. Process Appointments
  for (const appt of allAppointments) {
    const apptDate = new Date(appt.date);
    const daysDiff = getDaysDiff(apptDate, today);

    // Appointments today or tomorrow need attention
    if (daysDiff <= 1) {
      const label = daysDiff === 0 ? `Today at ${appt.time || 'scheduled time'}` : `Tomorrow at ${appt.time || 'scheduled time'}`;
      needsAttention.push({
        id: appt._id.toString(),
        type: 'appointment',
        title: appt.title,
        subtitle: appt.location || appt.relatedPerson || appt.category || 'Appointment',
        reason: label,
        severity: daysDiff === 0 ? 'urgent' : 'soon',
        urgencyLabel: daysDiff === 0 ? 'Today' : 'Tomorrow',
        dueDate: apptDate,
        destination: `/appointments/${appt._id}`,
      });
    }

    upcoming.push({
      id: appt._id.toString(),
      type: 'appointment',
      title: appt.title,
      subtitle: appt.location || appt.relatedPerson || appt.category || 'Appointment',
      date: apptDate,
      time: appt.time,
      destination: `/appointments/${appt._id}`,
    });
  }

  // 4. Process Reminders
  for (const rem of allReminders) {
    const remDate = new Date(rem.dueDate);
    const daysDiff = getDaysDiff(remDate, today);

    if (daysDiff <= 0) {
      const daysOverdue = Math.abs(daysDiff);
      needsAttention.push({
        id: rem._id.toString(),
        type: 'reminder',
        title: rem.title,
        subtitle: rem.category || 'Reminder',
        reason: daysDiff === 0 ? 'Reminder due today' : `Reminder past due by ${daysOverdue}d`,
        severity: daysDiff < 0 ? 'overdue' : 'urgent',
        urgencyLabel: daysDiff === 0 ? 'Due today' : `Overdue by ${daysOverdue}d`,
        dueDate: remDate,
        destination: `/reminders/${rem._id}`,
      });
    } else if (daysDiff <= 3) {
      needsAttention.push({
        id: rem._id.toString(),
        type: 'reminder',
        title: rem.title,
        subtitle: rem.category || 'Reminder',
        reason: `Reminder in ${daysDiff} days`,
        severity: 'soon',
        urgencyLabel: daysDiff === 1 ? 'Tomorrow' : `In ${daysDiff}d`,
        dueDate: remDate,
        destination: `/reminders/${rem._id}`,
      });
    }

    if (daysDiff >= 0 && daysDiff <= 30) {
      upcoming.push({
        id: rem._id.toString(),
        type: 'reminder',
        title: rem.title,
        subtitle: rem.category || 'Reminder',
        date: remDate,
        time: rem.dueTime,
        destination: `/reminders/${rem._id}`,
      });
    }
  }

  // 5. Process Documents with Expiry
  for (const doc of allDocsWithExpiry) {
    if (!doc.aiExtracted?.expiryDate) continue;
    const expiry = new Date(doc.aiExtracted.expiryDate);
    const daysDiff = getDaysDiff(expiry, today);

    if (daysDiff < 0) {
      needsAttention.push({
        id: doc._id.toString(),
        type: 'document',
        title: doc.originalName,
        subtitle: doc.documentType || 'Expiring Document',
        reason: `Document expired ${Math.abs(daysDiff)} days ago`,
        severity: 'overdue',
        urgencyLabel: 'Expired',
        dueDate: expiry,
        destination: `/documents`,
      });
    } else if (daysDiff <= 30) {
      const severity = daysDiff <= 7 ? 'urgent' : 'soon';
      needsAttention.push({
        id: doc._id.toString(),
        type: 'document',
        title: doc.originalName,
        subtitle: doc.documentType || 'Expiring Document',
        reason: `Document expires in ${daysDiff} days`,
        severity,
        urgencyLabel: `Expires in ${daysDiff}d`,
        dueDate: expiry,
        destination: `/documents`,
      });
    }

    if (daysDiff >= 0 && daysDiff <= 30) {
      upcoming.push({
        id: doc._id.toString(),
        type: 'document',
        title: `Expiry: ${doc.originalName}`,
        subtitle: doc.documentType || 'Document Expiry',
        date: expiry,
        destination: `/documents`,
      });
    }
  }

  // 6. Process Calendar Events
  for (const evt of allEvents) {
    const evtDate = new Date(evt.startDate);
    upcoming.push({
      id: evt._id.toString(),
      type: 'event',
      title: evt.title,
      subtitle: evt.location || evt.category || 'Calendar Event',
      date: evtDate,
      time: evt.startTime,
      destination: `/calendar`,
    });
  }

  // Sort needsAttention by severity, then chronological dueDate
  const severityWeight: Record<string, number> = {
    overdue: 0,
    urgent: 1,
    soon: 2,
    upcoming: 3,
  };

  needsAttention.sort((a, b) => {
    const diff = severityWeight[a.severity] - severityWeight[b.severity];
    if (diff !== 0) return diff;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  // Sort upcoming chronologically
  upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Aggregate stats
  const overdueCount = needsAttention.filter(i => i.severity === 'overdue').length;
  const dueSoonCount = needsAttention.filter(i => i.severity === 'urgent' || i.severity === 'soon').length;

  return {
    needsAttention,
    upcoming: upcoming.slice(0, 20),
    reminders: allReminders.filter(r => new Date(r.dueDate) <= in7Days).slice(0, 10),
    stats: {
      overdueCount,
      dueSoonCount,
      upcomingCount: upcoming.length,
      activeReminders: allReminders.length,
    },
  };
}
