/**
 * LifeAdmin Mobile — Native Android Notification Service
 * Manages notification channels, permissions, local scheduling,
 * cancellation, reconciliation, and user isolation via expo-notifications.
 */

import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Reminder, NotificationSyncResult, ReminderPermissionStatus } from '../types';
import {
  getDueAt,
  getAlertTime,
  buildNotificationIdentifier,
  buildNotificationContent,
  ALLOWED_OFFSETS,
} from './reminderCalculations';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

class NotificationService {
  private isInitialized = false;

  /**
   * Initializes Android notification channels and base configurations
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders & Alerts',
          description: 'Time-sensitive notifications for tasks, bills, appointments, and personal reminders.',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#087E83',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('Failed to configure notification channel:', err);
    }
  }

  /**
   * Checks current device notification permission status
   */
  public async checkPermissionsAsync(): Promise<Notifications.NotificationPermissionsStatus> {
    return Notifications.getPermissionsAsync();
  }

  /**
   * Requests device notification permissions with explanation
   */
  public async requestPermissionsAsync(): Promise<boolean> {
    try {
      await this.initialize();
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;

      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {},
      });

      return requested.granted;
    } catch (err) {
      console.warn('Error requesting notification permissions:', err);
      return false;
    }
  }

  /**
   * Checks whether exact alarm permissions are granted on Android (SCHEDULE_EXACT_ALARM).
   * On iOS, web, or Android < 12, exact alarms do not require special permissions and resolve true.
   */
  public async checkExactAlarmPermissionAsync(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (typeof Notifications.getExactAlarmPermissionsAsync === 'function') {
        const res = await Notifications.getExactAlarmPermissionsAsync();
        return res.granted;
      }
      return true;
    } catch (err) {
      console.warn('Error checking exact alarm permission:', err);
      return true;
    }
  }

  /**
   * Requests exact alarm permission by directing user to Android's Alarms & Reminders system screen.
   * If expo-notifications requestExactAlarmPermissionsAsync throws or fails, falls back to Linking.openSettings().
   */
  public async requestExactAlarmPermissionAsync(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (typeof Notifications.requestExactAlarmPermissionsAsync === 'function') {
        const res = await Notifications.requestExactAlarmPermissionsAsync();
        return res.granted;
      }
      return true;
    } catch (err) {
      console.warn('Failed to open exact alarm screen, falling back to system settings:', err);
      try {
        await Linking.openSettings();
      } catch {
        // ignore
      }
      return false;
    }
  }

  /**
   * Retrieves combined status distinguishing notification display permission from exact-alarm permission.
   */
  public async getCombinedPermissionsAsync(): Promise<ReminderPermissionStatus> {
    try {
      const notifStatus = await Notifications.getPermissionsAsync();
      const exactGranted = await this.checkExactAlarmPermissionAsync();

      return {
        notificationsGranted: notifStatus.granted,
        exactAlarmGranted: exactGranted,
        canAskNotifications: notifStatus.canAskAgain,
        canAskExactAlarm: true,
      };
    } catch (err) {
      console.warn('Error retrieving combined permissions:', err);
      return {
        notificationsGranted: true,
        exactAlarmGranted: true,
        canAskNotifications: false,
        canAskExactAlarm: false,
      };
    }
  }

  /**
   * Schedules device local notification(s) for a single reminder
   */
  public async scheduleReminderNotification(
    reminder: Reminder,
    userId: string
  ): Promise<number> {
    // If reminder is completed, never schedule alerts
    if (reminder.status === 'completed') {
      await this.cancelReminderNotification(reminder._id, userId);
      return 0;
    }

    await this.initialize();

    // Cleanly cancel any previous offsets for this reminder to prevent orphaned schedules
    await this.cancelReminderNotification(reminder._id, userId);

    const dueAt = getDueAt(reminder.dueDate, reminder.dueTime);
    const offsets = reminder.reminderOffsetMinutes?.length
      ? reminder.reminderOffsetMinutes
      : [0];

    let scheduledCount = 0;
    const now = Date.now();

    for (const offset of offsets) {
      const alertTime = getAlertTime(dueAt, offset);

      // Only schedule notifications that trigger in the future
      if (alertTime.getTime() > now) {
        const identifier = buildNotificationIdentifier(reminder._id, offset, userId);
        const content = buildNotificationContent(reminder, offset, userId);

        try {
          await Notifications.scheduleNotificationAsync({
            identifier,
            content,
            trigger: {
              date: alertTime,
              channelId: 'reminders',
            } as any,
          });
          scheduledCount++;
        } catch (err) {
          console.warn(`Exact alarm scheduling failed for reminder ${reminder._id}, attempting best-effort fallback:`, err);
          try {
            // Best-effort inexact fallback if exact alarm permission is denied
            await Notifications.scheduleNotificationAsync({
              identifier,
              content,
              trigger: {
                date: alertTime,
              } as any,
            });
            scheduledCount++;
          } catch (fallbackErr) {
            console.warn(`Best-effort notification fallback also failed for reminder ${reminder._id}:`, fallbackErr);
          }
        }
      } else {
        // If this specific offset is in the past, ensure no stale notification identifier exists
        const identifier = buildNotificationIdentifier(reminder._id, offset, userId);
        try {
          await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch {
          // ignore
        }
      }
    }

    return scheduledCount;
  }

  /**
   * Cancels all scheduled notification offsets for a given reminder
   */
  public async cancelReminderNotification(
    reminderId: string,
    userId?: string
  ): Promise<void> {
    try {
      for (const offset of ALLOWED_OFFSETS) {
        const identifier = buildNotificationIdentifier(reminderId, offset, userId);
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }
    } catch (err) {
      console.warn(`Error cancelling notification for reminder ${reminderId}:`, err);
    }
  }

  /**
   * Reconciles device scheduled notifications with the backend state.
   * Cancels outdated/completed schedules and registers active upcoming reminders.
   */
  public async reconcileUserReminders(
    reminders: Reminder[],
    userId: string
  ): Promise<NotificationSyncResult> {
    let scheduledCount = 0;
    let cancelledCount = 0;
    let skippedCount = 0;

    try {
      await this.initialize();

      // Retrieve all currently scheduled notifications on the device
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const safeUser = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
      const userPrefix = `lifeadmin:reminder:${safeUser}:`;

      // Identify active upcoming reminder IDs
      const activeReminders = reminders.filter((r) => r.status === 'active');
      const activeIds = new Set(activeReminders.map((r) => r._id));

      // 1. Cancel device notifications that belong to this user but are no longer active
      for (const item of scheduled) {
        if (item.identifier.startsWith(userPrefix)) {
          // Extract reminder ID from identifier
          const parts = item.identifier.split(':');
          const remId = parts[3];
          if (!activeIds.has(remId)) {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
            cancelledCount++;
          }
        }
      }

      // 2. Schedule notifications for each active reminder
      for (const reminder of activeReminders) {
        const count = await this.scheduleReminderNotification(reminder, userId);
        if (count > 0) {
          scheduledCount += count;
        } else {
          skippedCount++;
        }
      }
    } catch (err) {
      console.warn('Error during notification reconciliation:', err);
    }

    return { scheduledCount, cancelledCount, skippedCount };
  }

  /**
   * Clears all scheduled notifications on the device on user sign-out or session exit.
   */
  public async clearAllUserSchedules(userId?: string): Promise<void> {
    try {
      if (userId) {
        const safeUser = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const prefix = `lifeadmin:reminder:${safeUser}:`;
        for (const item of scheduled) {
          if (item.identifier.startsWith(prefix)) {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          }
        }
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (err) {
      console.warn('Error clearing notification schedules:', err);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
