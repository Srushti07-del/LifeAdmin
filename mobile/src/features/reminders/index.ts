/**
 * LifeAdmin Mobile — Reminders Feature Module Barrel
 */

export * from './types';
export * from './services/reminderService';
export * from './services/notificationService';
export {
  getDueAt,
  getAlertTime,
  formatOffset,
  getReminderSection,
  calculateReminderTotals,
  groupRemindersBySection,
  filterAndSortReminders,
  formatReminderDueDate,
  formatReminderDueTime,
  calculateNextRecurringDate,
  buildNotificationIdentifier,
  buildNotificationContent,
  determineActivePermissionBanner,
  isExactAlarmRequiredOnPlatform,
  shouldFallbackToBestEffort,
  ALLOWED_OFFSETS,
  OFFSET_LABELS,
} from './services/reminderCalculations';
export * from './components/ReminderSummaryCard';
export * from './components/ReminderCard';
export * from './components/ReminderFormModal';
export * from './components/ReminderDetailsModal';
export * from './components/NotificationPermissionBanner';
