/**
 * LifeAdmin Mobile — Reminders Feature Types & Contracts
 */

export type ReminderStatus = 'active' | 'acknowledged' | 'dismissed' | 'completed';

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReminderRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReminderRecurrence {
  type: ReminderRecurrenceType;
  interval?: number;
}

export interface Reminder {
  _id: string;
  userId?: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  entityType?: 'task' | 'bill' | 'appointment' | 'document' | 'custom';
  entityId?: string;
  reminderDaysBefore?: number[];
  reminderOffsetMinutes?: number[];
  recurrence?: ReminderRecurrence;
  status: ReminderStatus;
  acknowledgedAt?: string;
  completedAt?: string;
  category: string;
  priority: ReminderPriority;
  notificationCount?: number;
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReminderFormData {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  category: string;
  priority: ReminderPriority;
  reminderOffsetMinutes: number[];
  recurrenceType: ReminderRecurrenceType;
  recurrenceInterval: number;
  entityType?: 'task' | 'bill' | 'appointment' | 'document' | 'custom';
  entityId?: string;
}

export type ReminderSectionKey = 'today' | 'upcoming' | 'overdue' | 'completed';

export interface GroupedReminders {
  today: Reminder[];
  upcoming: Reminder[];
  overdue: Reminder[];
  completed: Reminder[];
}

export interface ReminderTotals {
  totalCount: number;
  activeCount: number;
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
  completedCount: number;
}

export interface NotificationScheduleRecord {
  reminderId: string;
  offsetMinutes: number;
  scheduledTime: Date;
  notificationId: string;
}

export interface NotificationSyncResult {
  scheduledCount: number;
  cancelledCount: number;
  skippedCount: number;
}

export type PermissionBannerType = 'notifications' | 'exact_alarm';

export interface ReminderPermissionStatus {
  notificationsGranted: boolean;
  exactAlarmGranted: boolean;
  canAskNotifications: boolean;
  canAskExactAlarm: boolean;
}

