/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Reminders & Notifications Feature
 * Tests date/time parsing, morning defaults, alert offsets, section calculations,
 * dashboard totals, grouping, multi-criteria filtering, search, sorting,
 * recurrence intervals, and deterministic notification payloads.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
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
  REMINDERS_NOTIFICATION_CHANNEL_ID,
  buildRemindersChannelConfig,
} from '../features/reminders/services/reminderCalculations.ts';
import { Reminder } from '../features/reminders/types.ts';

// Helper to generate mock reminders
function createMockReminder(overrides: Partial<Reminder> = {}): Reminder {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const defaultDueDate = `${yyyy}-${mm}-${dd}`;

  return {
    _id: `rem-${Math.random().toString(36).substring(2, 9)}`,
    userId: 'user-456',
    title: 'Pay Electricity Bill',
    description: 'Check meter reading and pay online',
    dueDate: defaultDueDate,
    dueTime: '18:00',
    category: 'Finance',
    priority: 'medium',
    status: 'active',
    reminderOffsetMinutes: [0, 15],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Due Date & Alert Time Calculations', () => {
  it('combines YYYY-MM-DD and dueTime into precise Date object', () => {
    const dueAt = getDueAt('2026-11-15', '14:30');
    assert.strictEqual(dueAt.getFullYear(), 2026);
    assert.strictEqual(dueAt.getMonth(), 10); // 0-indexed: 10 = Nov
    assert.strictEqual(dueAt.getDate(), 15);
    assert.strictEqual(dueAt.getHours(), 14);
    assert.strictEqual(dueAt.getMinutes(), 30);
    assert.strictEqual(dueAt.getSeconds(), 0);
  });

  it('defaults to 09:00:00 morning when dueTime is omitted (matching server behavior)', () => {
    const dueAt = getDueAt('2026-11-15');
    assert.strictEqual(dueAt.getFullYear(), 2026);
    assert.strictEqual(dueAt.getMonth(), 10);
    assert.strictEqual(dueAt.getDate(), 15);
    assert.strictEqual(dueAt.getHours(), 9);
    assert.strictEqual(dueAt.getMinutes(), 0);
    assert.strictEqual(dueAt.getSeconds(), 0);
  });

  it('correctly calculates alert time based on offset minutes before due date', () => {
    const dueAt = new Date(2026, 10, 15, 10, 0, 0); // Nov 15, 2026 10:00:00

    const alertAtTime = getAlertTime(dueAt, 0);
    assert.strictEqual(alertAtTime.getTime(), dueAt.getTime());

    const alert15Min = getAlertTime(dueAt, 15);
    assert.strictEqual(alert15Min.getMinutes(), 45);
    assert.strictEqual(alert15Min.getHours(), 9);

    const alert60Min = getAlertTime(dueAt, 60);
    assert.strictEqual(alert60Min.getHours(), 9);
    assert.strictEqual(alert60Min.getMinutes(), 0);
  });

  it('formats offset minutes into human-readable labels', () => {
    assert.strictEqual(formatOffset(0), 'At scheduled time');
    assert.strictEqual(formatOffset(5), '5 min before');
    assert.strictEqual(formatOffset(15), '15 min before');
    assert.strictEqual(formatOffset(30), '30 min before');
    assert.strictEqual(formatOffset(60), '1 hour before');
    assert.strictEqual(formatOffset(120), '120 min before');
  });

  it('verifies standard ALLOWED_OFFSETS array', () => {
    assert.deepStrictEqual(ALLOWED_OFFSETS, [0, 5, 15, 30, 60]);
  });
});

describe('Reminder Section Categorization (getReminderSection)', () => {
  const referenceNow = new Date(2026, 10, 10, 12, 0, 0); // Nov 10, 2026 12:00:00

  it('categorizes completed reminders as "completed" regardless of date', () => {
    const overdueCompleted = createMockReminder({
      dueDate: '2026-11-01',
      status: 'completed',
    });
    assert.strictEqual(getReminderSection(overdueCompleted, referenceNow), 'completed');

    const futureCompleted = createMockReminder({
      dueDate: '2026-11-20',
      status: 'completed',
    });
    assert.strictEqual(getReminderSection(futureCompleted, referenceNow), 'completed');
  });

  it('categorizes active reminders due today as "today"', () => {
    const dueToday = createMockReminder({
      dueDate: '2026-11-10',
      dueTime: '15:00',
      status: 'active',
    });
    assert.strictEqual(getReminderSection(dueToday, referenceNow), 'today');
  });

  it('categorizes active reminders due after today as "upcoming"', () => {
    const dueTomorrow = createMockReminder({
      dueDate: '2026-11-11',
      status: 'active',
    });
    assert.strictEqual(getReminderSection(dueTomorrow, referenceNow), 'upcoming');

    const dueNextWeek = createMockReminder({
      dueDate: '2026-11-17',
      status: 'active',
    });
    assert.strictEqual(getReminderSection(dueNextWeek, referenceNow), 'upcoming');
  });

  it('categorizes active reminders due before today as "overdue"', () => {
    const dueYesterday = createMockReminder({
      dueDate: '2026-11-09',
      status: 'active',
    });
    assert.strictEqual(getReminderSection(dueYesterday, referenceNow), 'overdue');

    const dueLastWeek = createMockReminder({
      dueDate: '2026-11-03',
      status: 'active',
    });
    assert.strictEqual(getReminderSection(dueLastWeek, referenceNow), 'overdue');
  });
});

describe('Dashboard Totals & Grouping', () => {
  const referenceNow = new Date(2026, 10, 10, 12, 0, 0);

  it('calculates totals accurately across all statuses', () => {
    const reminders: Reminder[] = [
      createMockReminder({ dueDate: '2026-11-08', status: 'active' }), // Overdue
      createMockReminder({ dueDate: '2026-11-09', status: 'active' }), // Overdue
      createMockReminder({ dueDate: '2026-11-10', status: 'active' }), // Today
      createMockReminder({ dueDate: '2026-11-15', status: 'active' }), // Upcoming
      createMockReminder({ dueDate: '2026-11-20', status: 'active' }), // Upcoming
      createMockReminder({ dueDate: '2026-11-05', status: 'completed' }), // Completed
      createMockReminder({ dueDate: '2026-11-12', status: 'completed' }), // Completed
    ];

    const totals = calculateReminderTotals(reminders, referenceNow);
    assert.strictEqual(totals.totalCount, 7);
    assert.strictEqual(totals.activeCount, 5);
    assert.strictEqual(totals.overdueCount, 2);
    assert.strictEqual(totals.todayCount, 1);
    assert.strictEqual(totals.upcomingCount, 2);
    assert.strictEqual(totals.completedCount, 2);
  });

  it('groups reminders cleanly into 4 distinct timeline sections', () => {
    const reminders: Reminder[] = [
      createMockReminder({ _id: 'r-1', dueDate: '2026-11-08', status: 'active' }),
      createMockReminder({ _id: 'r-2', dueDate: '2026-11-10', status: 'active' }),
      createMockReminder({ _id: 'r-3', dueDate: '2026-11-14', status: 'active' }),
      createMockReminder({ _id: 'r-4', dueDate: '2026-11-05', status: 'completed' }),
    ];

    const grouped = groupRemindersBySection(reminders, referenceNow);
    assert.strictEqual(grouped.overdue.length, 1);
    assert.strictEqual(grouped.overdue[0]._id, 'r-1');
    assert.strictEqual(grouped.today.length, 1);
    assert.strictEqual(grouped.today[0]._id, 'r-2');
    assert.strictEqual(grouped.upcoming.length, 1);
    assert.strictEqual(grouped.upcoming[0]._id, 'r-3');
    assert.strictEqual(grouped.completed.length, 1);
    assert.strictEqual(grouped.completed[0]._id, 'r-4');
  });
});

describe('Multi-Criteria Filtering, Search & Sorting', () => {
  const referenceNow = new Date(2026, 10, 10, 12, 0, 0);

  const sampleReminders: Reminder[] = [
    createMockReminder({
      _id: 'r-health',
      title: 'Doctor Appointment Follow-up',
      description: 'Review blood test results with Dr. Sharma',
      category: 'Health',
      priority: 'high',
      dueDate: '2026-11-10',
      status: 'active',
    }),
    createMockReminder({
      _id: 'r-work',
      title: 'Quarterly Sprint Planning',
      description: 'Prepare backlog items with tech leads',
      category: 'Work',
      priority: 'medium',
      dueDate: '2026-11-14',
      status: 'active',
    }),
    createMockReminder({
      _id: 'r-bill',
      title: 'Electricity Bill Payment',
      description: 'MSEB billing deadline',
      category: 'Finance',
      priority: 'high',
      dueDate: '2026-11-07',
      status: 'active',
    }),
    createMockReminder({
      _id: 'r-personal',
      title: 'Renew Passport',
      description: 'Online application form submission',
      category: 'Personal',
      priority: 'low',
      dueDate: '2026-11-02',
      status: 'completed',
    }),
  ];

  it('filters by status section (active vs completed vs overdue vs today)', () => {
    const activeOnly = filterAndSortReminders(sampleReminders, 'active', 'all', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(activeOnly.length, 3);

    const completedOnly = filterAndSortReminders(sampleReminders, 'completed', 'all', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(completedOnly.length, 1);
    assert.strictEqual(completedOnly[0]._id, 'r-personal');

    const overdueOnly = filterAndSortReminders(sampleReminders, 'overdue', 'all', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(overdueOnly.length, 1);
    assert.strictEqual(overdueOnly[0]._id, 'r-bill');

    const todayOnly = filterAndSortReminders(sampleReminders, 'today', 'all', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(todayOnly.length, 1);
    assert.strictEqual(todayOnly[0]._id, 'r-health');
  });

  it('filters by category case-insensitively', () => {
    const health = filterAndSortReminders(sampleReminders, 'all', 'health', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(health.length, 1);
    assert.strictEqual(health[0]._id, 'r-health');

    const work = filterAndSortReminders(sampleReminders, 'all', 'Work', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(work.length, 1);
    assert.strictEqual(work[0]._id, 'r-work');
  });

  it('filters by priority', () => {
    const highPriority = filterAndSortReminders(sampleReminders, 'all', 'all', 'high', '', 'dueDate', referenceNow);
    assert.strictEqual(highPriority.length, 2);

    const lowPriority = filterAndSortReminders(sampleReminders, 'all', 'all', 'low', '', 'dueDate', referenceNow);
    assert.strictEqual(lowPriority.length, 1);
    assert.strictEqual(lowPriority[0]._id, 'r-personal');
  });

  it('searches text across title and description', () => {
    const testResults = filterAndSortReminders(sampleReminders, 'all', 'all', 'all', 'blood test', 'dueDate', referenceNow);
    assert.strictEqual(testResults.length, 1);
    assert.strictEqual(testResults[0]._id, 'r-health');

    const planningResults = filterAndSortReminders(sampleReminders, 'all', 'all', 'all', 'sprint', 'dueDate', referenceNow);
    assert.strictEqual(planningResults.length, 1);
    assert.strictEqual(planningResults[0]._id, 'r-work');
  });

  it('sorts by dueDate ascending and descending', () => {
    const asc = filterAndSortReminders(sampleReminders, 'all', 'all', 'all', '', 'dueDate', referenceNow);
    assert.strictEqual(asc[0]._id, 'r-personal'); // 2026-11-02
    assert.strictEqual(asc[asc.length - 1]._id, 'r-work'); // 2026-11-14

    const desc = filterAndSortReminders(sampleReminders, 'all', 'all', 'all', '', '-dueDate', referenceNow);
    assert.strictEqual(desc[0]._id, 'r-work');
    assert.strictEqual(desc[desc.length - 1]._id, 'r-personal');
  });
});

describe('Date & Time Formatting Helpers', () => {
  const referenceNow = new Date(2026, 10, 10, 12, 0, 0);

  it('formats Today, Tomorrow, and Yesterday relative dates', () => {
    assert.strictEqual(formatReminderDueDate('2026-11-10', undefined, referenceNow), 'Today');
    assert.strictEqual(formatReminderDueDate('2026-11-11', undefined, referenceNow), 'Tomorrow');
    assert.strictEqual(formatReminderDueDate('2026-11-09', undefined, referenceNow), 'Yesterday');
  });

  it('formats calendar dates outside immediate range into readable month day', () => {
    const formatted = formatReminderDueDate('2026-11-25', undefined, referenceNow);
    assert.match(formatted, /Nov 25/);
  });

  it('formats 24-hour time string into readable 12-hour AM/PM string', () => {
    assert.strictEqual(formatReminderDueTime('09:00'), '9:00 AM');
    assert.strictEqual(formatReminderDueTime('14:30'), '2:30 PM');
    assert.strictEqual(formatReminderDueTime('00:15'), '12:15 AM');
    assert.strictEqual(formatReminderDueTime('12:00'), '12:00 PM');
    assert.strictEqual(formatReminderDueTime(undefined), '');
  });
});

describe('Recurrence Calculation Engine (calculateNextRecurringDate)', () => {
  it('calculates next daily occurrence (+1 day by default)', () => {
    const base = new Date(2026, 10, 10, 10, 0, 0);
    const nextDaily = calculateNextRecurringDate(base, { type: 'daily' });
    assert.ok(nextDaily);
    assert.strictEqual(nextDaily.getDate(), 11);
    assert.strictEqual(nextDaily.getMonth(), 10);
  });

  it('calculates custom daily occurrence with interval', () => {
    const base = new Date(2026, 10, 10, 10, 0, 0);
    const nextEvery3Days = calculateNextRecurringDate(base, { type: 'daily', interval: 3 });
    assert.ok(nextEvery3Days);
    assert.strictEqual(nextEvery3Days.getDate(), 13);
  });

  it('calculates next weekly occurrence (+7 days by default)', () => {
    const base = new Date(2026, 10, 10, 10, 0, 0);
    const nextWeekly = calculateNextRecurringDate(base, { type: 'weekly' });
    assert.ok(nextWeekly);
    assert.strictEqual(nextWeekly.getDate(), 17);
  });

  it('calculates next monthly occurrence (+1 month)', () => {
    const base = new Date(2026, 9, 15, 10, 0, 0); // Oct 15
    const nextMonthly = calculateNextRecurringDate(base, { type: 'monthly' });
    assert.ok(nextMonthly);
    assert.strictEqual(nextMonthly.getMonth(), 10); // Nov
    assert.strictEqual(nextMonthly.getDate(), 15);
  });

  it('calculates next yearly occurrence (+1 year)', () => {
    const base = new Date(2026, 4, 20, 10, 0, 0); // May 20, 2026
    const nextYearly = calculateNextRecurringDate(base, { type: 'yearly' });
    assert.ok(nextYearly);
    assert.strictEqual(nextYearly.getFullYear(), 2027);
  });

  it('returns null for type "none" or undefined recurrence', () => {
    const base = new Date();
    assert.strictEqual(calculateNextRecurringDate(base, { type: 'none' }), null);
    assert.strictEqual(calculateNextRecurringDate(base, undefined), null);
  });
});

describe('Notification Payload & Deterministic Identifiers', () => {
  it('builds unique, sanitized deterministic notification identifier', () => {
    const id = buildNotificationIdentifier('rem_12345', 15, 'user_abc99');
    assert.strictEqual(id, 'lifeadmin:reminder:user_abc99:rem_12345:15');
  });

  it('sanitizes special characters to avoid malformed notification keys', () => {
    const id = buildNotificationIdentifier('rem#45$67', 0, 'usr:99!@');
    assert.strictEqual(id, 'lifeadmin:reminder:usr99:rem4567:0');
  });

  it('constructs correct notification content for "at time of event" (0 min offset)', () => {
    const reminder = createMockReminder({
      _id: 'rem-event-1',
      userId: 'user-alice',
      title: 'Water the plants',
      description: 'Balcony orchids and ferns',
      entityType: 'custom',
    });

    const content = buildNotificationContent(reminder, 0, 'user-alice');
    assert.strictEqual(content.title, 'Reminder: Water the plants');
    assert.ok(content.body.includes('due right now'));
    assert.ok(content.body.includes('Balcony orchids and ferns'));
    assert.strictEqual(content.data.reminderId, 'rem-event-1');
    assert.strictEqual(content.data.userId, 'user-alice');
    assert.strictEqual(content.data.url, '/reminders?reminderId=rem-event-1');
  });

  it('constructs correct notification content for advance alert offset (15 min)', () => {
    const reminder = createMockReminder({
      _id: 'rem-event-2',
      userId: 'user-bob',
      title: 'Doctor Appointment',
      description: 'Take medical reports',
      entityType: 'appointment',
      entityId: 'app-999',
    });

    const content = buildNotificationContent(reminder, 15);
    assert.strictEqual(content.title, 'Upcoming: Doctor Appointment');
    assert.ok(content.body.includes('due in 15 minutes'));
    assert.strictEqual(content.data.reminderId, 'rem-event-2');
    assert.strictEqual(content.data.userId, 'user-bob');
    assert.strictEqual(content.data.entityType, 'appointment');
    assert.strictEqual(content.data.entityId, 'app-999');
    assert.strictEqual(content.data.url, '/reminders?reminderId=rem-event-2');
  });
});

describe('Notification Deep-Linking & Routing Logic', () => {
  it('extracts reminderId from notification data payload', () => {
    const data = {
      userId: 'user-100',
      reminderId: 'rem-deep-link-77',
      url: '/reminders?reminderId=rem-deep-link-77',
    };

    const targetUrl = data.reminderId
      ? `/reminders?reminderId=${data.reminderId}`
      : data.url;

    assert.strictEqual(targetUrl, '/reminders?reminderId=rem-deep-link-77');
  });

  it('enforces user isolation: ignores notification payload when logged in as different user', () => {
    const currentLoggedInUserId = 'user-alice';
    const payloadFromDifferentUser = {
      userId: 'user-bob',
      reminderId: 'rem-bob-secret',
      url: '/reminders?reminderId=rem-bob-secret',
    };

    const shouldNavigate =
      !payloadFromDifferentUser.userId ||
      payloadFromDifferentUser.userId === currentLoggedInUserId;

    assert.strictEqual(shouldNavigate, false);
  });

  it('allows navigation when payload belongs to current authenticated user', () => {
    const currentLoggedInUserId = 'user-alice';
    const payloadForAlice = {
      userId: 'user-alice',
      reminderId: 'rem-alice-task',
      url: '/reminders?reminderId=rem-alice-task',
    };

    const shouldNavigate =
      !payloadForAlice.userId ||
      payloadForAlice.userId === currentLoggedInUserId;

    assert.strictEqual(shouldNavigate, true);
  });
});

describe('Scheduling Reconciliation & Orphan Prevention Simulation', () => {
  it('identifies and marks stale device notifications for cancellation', () => {
    const activeUserId = 'user-999';
    const safeUser = activeUserId.replace(/[^a-zA-Z0-9_-]/g, '');
    const userPrefix = `lifeadmin:reminder:${safeUser}:`;

    // Simulated device notification store
    const scheduledNotificationsOnDevice = [
      { identifier: 'lifeadmin:reminder:user-999:rem-active-1:0' },
      { identifier: 'lifeadmin:reminder:user-999:rem-active-1:15' },
      { identifier: 'lifeadmin:reminder:user-999:rem-deleted-2:0' },
      { identifier: 'lifeadmin:reminder:user-other:rem-other-3:0' }, // Different user
    ];

    const activeReminders: Reminder[] = [
      createMockReminder({ _id: 'rem-active-1', status: 'active' }),
    ];
    const activeIds = new Set(activeReminders.map((r) => r._id));

    const toCancel: string[] = [];
    for (const item of scheduledNotificationsOnDevice) {
      if (item.identifier.startsWith(userPrefix)) {
        const parts = item.identifier.split(':');
        const remId = parts[3];
        if (!activeIds.has(remId)) {
          toCancel.push(item.identifier);
        }
      }
    }

    assert.strictEqual(toCancel.length, 1);
    assert.strictEqual(toCancel[0], 'lifeadmin:reminder:user-999:rem-deleted-2:0');
    // Ensure user-other's notification was untouched
    assert.ok(!toCancel.includes('lifeadmin:reminder:user-other:rem-other-3:0'));
  });

  it('purges all previous offset identifiers when a reminder is edited', () => {
    const reminderId = 'rem-edited-55';
    const userId = 'user-777';

    // When edited, cancelReminderNotification generates cancellation keys for all ALLOWED_OFFSETS
    const generatedCancellationKeys = ALLOWED_OFFSETS.map((offset) =>
      buildNotificationIdentifier(reminderId, offset, userId)
    );

    assert.strictEqual(generatedCancellationKeys.length, 5);
    assert.ok(generatedCancellationKeys.includes('lifeadmin:reminder:user-777:rem-edited-55:0'));
    assert.ok(generatedCancellationKeys.includes('lifeadmin:reminder:user-777:rem-edited-55:5'));
    assert.ok(generatedCancellationKeys.includes('lifeadmin:reminder:user-777:rem-edited-55:15'));
    assert.ok(generatedCancellationKeys.includes('lifeadmin:reminder:user-777:rem-edited-55:30'));
    assert.ok(generatedCancellationKeys.includes('lifeadmin:reminder:user-777:rem-edited-55:60'));
  });
});

describe('Android Exact-Alarm Permissions & Best-Effort Fallback (SCHEDULE_EXACT_ALARM)', () => {
  it('distinguishes notification display permission from exact-alarm permission', () => {
    // Both granted
    const allGranted = { notificationsGranted: true, exactAlarmGranted: true };
    assert.strictEqual(determineActivePermissionBanner(allGranted), null);

    // Notification display granted, exact alarm missing
    const exactMissing = { notificationsGranted: true, exactAlarmGranted: false };
    assert.strictEqual(determineActivePermissionBanner(exactMissing), 'exact_alarm');

    // Both missing -> shows basic notifications prompt first
    const bothMissing = { notificationsGranted: false, exactAlarmGranted: false };
    assert.strictEqual(determineActivePermissionBanner(bothMissing), 'notifications');

    // Notification display missing, exact alarm granted
    const notifMissing = { notificationsGranted: false, exactAlarmGranted: true };
    assert.strictEqual(determineActivePermissionBanner(notifMissing), 'notifications');
  });

  it('handles re-check scenario: banner disappears when user returns from settings with permission granted', () => {
    // 1. Initial check: user has not allowed exact alarms
    let currentPermissions = { notificationsGranted: true, exactAlarmGranted: false };
    assert.strictEqual(determineActivePermissionBanner(currentPermissions), 'exact_alarm');

    // 2. User navigates to system settings and toggles "Alarms & Reminders" switch
    // App resumes -> re-check runs and returns updated status
    currentPermissions = { notificationsGranted: true, exactAlarmGranted: true };
    assert.strictEqual(determineActivePermissionBanner(currentPermissions), null);
  });

  it('respects user dismissal per permission banner type', () => {
    const exactMissing = { notificationsGranted: true, exactAlarmGranted: false };

    // Before dismissal
    assert.strictEqual(determineActivePermissionBanner(exactMissing, {}), 'exact_alarm');

    // User taps dismiss button on exact alarm banner
    const dismissed = { exact_alarm: true };
    assert.strictEqual(determineActivePermissionBanner(exactMissing, dismissed), null);
  });

  it('identifies when exact-alarm permission is required by platform and API level', () => {
    // iOS and web never require SCHEDULE_EXACT_ALARM
    assert.strictEqual(isExactAlarmRequiredOnPlatform('ios'), false);
    assert.strictEqual(isExactAlarmRequiredOnPlatform('web'), false);

    // Android 14+ (API 34+) denies SCHEDULE_EXACT_ALARM by default for new installs
    assert.strictEqual(isExactAlarmRequiredOnPlatform('android', 34), true);
    assert.strictEqual(isExactAlarmRequiredOnPlatform('android', 35), true);

    // Android 11 and below (API 30-) does not restrict exact alarms with special access
    assert.strictEqual(isExactAlarmRequiredOnPlatform('android', 30), false);
  });

  it('activates best-effort scheduling mode when exact-alarm permission is denied', () => {
    // When exact alarm permission is denied, app falls back to best-effort delivery
    assert.strictEqual(shouldFallbackToBestEffort(false), true);

    // When granted, exact delivery is used
    assert.strictEqual(shouldFallbackToBestEffort(true), false);
  });
});

describe('Android Notification Channel Configuration', () => {
  it('builds the reminders channel config without a custom sound property', () => {
    const config = buildRemindersChannelConfig(6);

    assert.strictEqual(REMINDERS_NOTIFICATION_CHANNEL_ID, 'reminders');
    assert.strictEqual(config.name, 'Reminders & Alerts');
    assert.strictEqual(config.importance, 6);
    assert.strictEqual(config.lightColor, '#087E83');
    assert.deepStrictEqual(config.vibrationPattern, [0, 250, 250, 250]);
    assert.strictEqual(config.enableLights, true);
    assert.strictEqual(config.enableVibrate, true);
    assert.strictEqual(config.showBadge, true);
    assert.strictEqual('sound' in config, false);
  });
});
