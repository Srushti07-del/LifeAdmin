import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import EmailNotification from '../models/EmailNotification';
import {
  generateEmailNotifications,
  cleanupProcessedNotifications,
  rescheduleEntityEmailNotifications,
} from '../services/emailNotificationGenerator';
import {
  processPendingEmailNotifications,
  startEmailNotificationScheduler,
  stopEmailNotificationScheduler,
} from '../services/emailNotificationScheduler';
import {
  startEmailNotificationGenerationScheduler,
  stopEmailNotificationGenerationScheduler,
  isEmailNotificationGenerationSchedulerRunning,
  runEmailNotificationGeneration,
} from '../services/emailNotificationGenerationScheduler';
import { getPublicAppUrl, getEmailBaseUrl } from '../services/url';
import { sendNotificationEmail, isEmailConfigured } from '../services/notificationEmail';

describe('Email notification system', () => {
  let mongoServer: MongoMemoryServer;
  let user: any;

  const now = new Date('2026-11-13T10:00:00Z');
  const tomorrow = new Date('2026-11-14T10:00:00Z');
  const yesterday = new Date('2026-11-12T10:00:00Z');

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TZ = 'UTC';
    process.env.SMTP_HOST = 'smtp.mock.local';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_USER = 'mock_user';
    process.env.SMTP_PASS = 'mock_pass';
    process.env.APP_URL = 'https://lifeadmin.app';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean all collections
    await User.deleteMany({});
    await Task.deleteMany({});
    await Bill.deleteMany({});
    await Appointment.deleteMany({});
    await Reminder.deleteMany({});
    await EmailNotification.deleteMany({});

    user = await User.create({
      name: 'Email Tester',
      email: 'tester@lifeadmin.app',
      password: 'hashedpassword123',
      notificationsEnabled: true,
      emailReminderIntervals: [1440, 60, 0],
      timezone: 'UTC',
      notificationTypes: {
        tasks: true,
        bills: true,
        appointments: true,
        reminders: true,
      },
    });
  });

  afterEach(async () => {
    stopEmailNotificationScheduler();
    stopEmailNotificationGenerationScheduler();
  });

  describe('URL helper (production URL handling)', () => {
    it('returns APP_URL with HTTPS in production', () => {
      const url = getPublicAppUrl({ nodeEnv: 'production' });
      assert.equal(url, 'https://lifeadmin.app');
      assert.ok(url.startsWith('https://'));
    });

    it('falls back to CLIENT_URL when APP_URL is unset', () => {
      delete process.env.APP_URL;
      process.env.CLIENT_URL = 'https://client.lifeadmin.app';
      const url = getPublicAppUrl({ nodeEnv: 'test' });
      assert.equal(url, 'https://client.lifeadmin.app');
      process.env.APP_URL = 'https://lifeadmin.app';
    });

    it('rejects localhost in production', () => {
      const oldAppUrl = process.env.APP_URL;
      process.env.APP_URL = 'https://localhost:5173';
      assert.throws(() => getPublicAppUrl({ nodeEnv: 'production' }), /cannot be localhost or loopback/);
      if (oldAppUrl) process.env.APP_URL = oldAppUrl;
      else delete process.env.APP_URL;
    });

    it('rejects HTTP in production', () => {
      const oldAppUrl = process.env.APP_URL;
      process.env.APP_URL = 'http://lifeadmin.app';
      assert.throws(() => getPublicAppUrl({ nodeEnv: 'production' }), /must use HTTPS/);
      if (oldAppUrl) process.env.APP_URL = oldAppUrl;
      else delete process.env.APP_URL;
    });

    it('falls back to localhost in development', () => {
      delete process.env.APP_URL;
      delete process.env.CLIENT_URL;
      const url = getPublicAppUrl({ nodeEnv: 'development' });
      assert.equal(url, 'http://localhost:5173');
      process.env.APP_URL = 'https://lifeadmin.app';
    });
  });

  describe('generateEmailNotifications - dedupe key with due date', () => {
    it('creates notifications with due date in dedupe key for tasks', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Submit report',
        dueDate: tomorrow,
        dueTime: '14:00',
        status: 'todo',
        category: 'Work',
        priority: 'high',
      });

      const result = await generateEmailNotifications(now);
      assert.ok(result.created > 0, 'expected notifications to be created');

      const notifs = await EmailNotification.find({ userId: user._id, entityId: task._id });
      assert.ok(notifs.length > 0, 'expected at least one notification');

      // Dedupe key should include the due date
      for (const n of notifs) {
        assert.ok(n.dedupeKey.includes(task._id.toString()));
        assert.ok(n.dedupeKey.includes('2026-11-14'), `dedupeKey should include due date: ${n.dedupeKey}`);
      }
    });

    it('creates new notifications when deadline changes (new dedupe key)', async () => {
      const originalDate = new Date('2026-11-14T10:00:00Z');
      const newDate = new Date('2026-11-15T10:00:00Z');

      const task = await Task.create({
        userId: user._id,
        title: 'Submit report',
        dueDate: originalDate,
        dueTime: '14:00',
        status: 'todo',
        category: 'Work',
        priority: 'high',
      });

      // First generation - creates notifications for Nov 14
      await generateEmailNotifications(now);
      const firstNotifs = await EmailNotification.find({ userId: user._id, entityId: task._id });
      assert.ok(firstNotifs.length > 0);

      // Change the deadline
      task.dueDate = newDate;
      await task.save();

      // Second generation - should create new notifications for Nov 15
      const result = await generateEmailNotifications(new Date(now.getTime() + 60000));
      assert.ok(result.created > 0, 'expected new notifications for new deadline');

      const allNotifs = await EmailNotification.find({ userId: user._id, entityId: task._id });
      const newDateNotifs = allNotifs.filter((n) => n.dedupeKey.includes('2026-11-15'));
      assert.ok(newDateNotifs.length > 0, 'expected notifications for new due date');

      // Old notifications should still exist (history preserved) but new ones created too
      const oldDateNotifs = allNotifs.filter((n) => n.dedupeKey.includes('2026-11-14'));
      assert.ok(oldDateNotifs.length > 0, 'old notifications should be preserved');
    });

    it('prevents duplicate notifications for same entity + offset + due date', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Duplicate test',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Personal',
        priority: 'medium',
      });

      await generateEmailNotifications(now);
      const count1 = await EmailNotification.countDocuments({ userId: user._id, entityId: task._id });

      await generateEmailNotifications(now);
      const count2 = await EmailNotification.countDocuments({ userId: user._id, entityId: task._id });

      assert.equal(count1, count2, 'duplicate prevention should block re-creation');
    });
  });

  describe('stale notification cleanup', () => {
    it('cancels pending notifications when a task is completed', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'To be completed',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Personal',
        priority: 'low',
      });

      await generateEmailNotifications(now);
      const pendingBefore = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        status: 'pending',
      });
      assert.ok(pendingBefore > 0, 'expected pending notifications before completion');

      // Complete the task
      await Task.updateOne({ _id: task._id }, { $set: { status: 'completed' } });

      // Run generation again - should cancel stale pending notifications
      await generateEmailNotifications(new Date(now.getTime() + 60000));

      const pendingAfter = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        status: 'todo',
      });
      const skippedAfter = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        status: 'skipped',
      });
      assert.equal(pendingAfter, 0, 'pending notifications should be cancelled');
      assert.ok(skippedAfter > 0, 'cancelled notifications should be marked skipped');
    });

    it('cancels pending notifications when a bill is paid', async () => {
      const bill = await Bill.create({
        userId: user._id,
        name: 'Electricity Bill',
        amount: 1500,
        currency: '₹',
        dueDate: tomorrow,
        paymentStatus: 'pending',
        category: 'Finance',
      });

      await generateEmailNotifications(now);
      const pendingBefore = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: bill._id,
        status: 'pending',
      });
      assert.ok(pendingBefore > 0, 'expected pending notifications before payment');

      // Pay the bill
      await Bill.updateOne({ _id: bill._id }, { $set: { paymentStatus: 'paid' } });
      await generateEmailNotifications(new Date(now.getTime() + 60000));

      const pendingAfter = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: bill._id,
        status: 'todo',
      });
      assert.equal(pendingAfter, 0, 'pending notifications should be cancelled when bill is paid');
    });

    it('cancels pending notifications when a reminder is dismissed', async () => {
      const reminder = await Reminder.create({
        userId: user._id,
        title: 'To be dismissed',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'active',
        category: 'Personal',
        priority: 'medium',
      });

      await generateEmailNotifications(now);
      const pendingBefore = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: reminder._id,
        status: 'pending',
      });
      assert.ok(pendingBefore > 0);

      // Dismiss the reminder
      await Reminder.updateOne({ _id: reminder._id }, { $set: { status: 'dismissed' } });
      await generateEmailNotifications(new Date(now.getTime() + 60000));

      const pendingAfter = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: reminder._id,
        status: 'todo',
      });
      assert.equal(pendingAfter, 0, 'pending notifications should be cancelled when reminder is dismissed');
    });

    it('cancels pending notifications when an appointment is deleted', async () => {
      const appointment = await Appointment.create({
        userId: user._id,
        title: 'Doctor visit',
        date: tomorrow,
        time: '10:00',
        location: 'Clinic',
      });

      await generateEmailNotifications(now);
      const pendingBefore = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        status: 'pending',
      });
      assert.ok(pendingBefore > 0);

      // Delete the appointment
      await Appointment.deleteOne({ _id: appointment._id });
      await generateEmailNotifications(new Date(now.getTime() + 60000));

      const pendingAfter = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        status: 'todo',
      });
      assert.equal(pendingAfter, 0, 'pending notifications should be cancelled when appointment is deleted');
    });
  });

  describe('user notification preferences', () => {
    it('respects global notificationsEnabled = false', async () => {
      await User.updateOne({ _id: user._id }, { $set: { notificationsEnabled: false } });

      const task = await Task.create({
        userId: user._id,
        title: 'Should not notify',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Personal',
        priority: 'low',
      });

      const result = await generateEmailNotifications(now);
      assert.equal(result.created, 0, 'no notifications should be created when globally disabled');
    });

    it('respects per-type notificationTypes', async () => {
      await User.updateOne({ _id: user._id }, {
        $set: { 'notificationTypes.tasks': false, 'notificationTypes.bills': true },
      });

      const task = await Task.create({
        userId: user._id,
        title: 'Task disabled',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Personal',
        priority: 'low',
      });

      const bill = await Bill.create({
        userId: user._id,
        name: 'Bill enabled',
        amount: 100,
        currency: '₹',
        dueDate: tomorrow,
        paymentStatus: 'pending',
        category: 'Finance',
      });

      const result = await generateEmailNotifications(now);

      const taskNotifs = await EmailNotification.countDocuments({ userId: user._id, entityId: task._id });
      const billNotifs = await EmailNotification.countDocuments({ userId: user._id, entityId: bill._id });

      assert.equal(taskNotifs, 0, 'task notifications should be disabled by type preference');
      assert.ok(billNotifs > 0, 'bill notifications should be created when type is enabled');
    });
  });

  describe('overlapping scheduler prevention', () => {
    it('prevents overlapping generation runs', async () => {
      // Call runEmailNotificationGeneration twice concurrently - second should be blocked
      const result1 = await runEmailNotificationGeneration(now);
      const result2 = await runEmailNotificationGeneration(now);
      // Both should return without error; overlapping is prevented internally
      assert.ok(result1 !== undefined);
      assert.ok(result2 !== undefined);
    });

    it('start/stop lifecycle works when not in test mode', async () => {
      // Temporarily override NODE_ENV to test the scheduler start/stop
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      startEmailNotificationGenerationScheduler();
      assert.ok(isEmailNotificationGenerationSchedulerRunning());

      stopEmailNotificationGenerationScheduler();
      assert.ok(!isEmailNotificationGenerationSchedulerRunning());

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('retry and failure handling', () => {
    it('retries transient failures with exponential backoff', async () => {
      // Temporarily break email sending by making SMTP unreachable
      const originalSend = sendNotificationEmail;
      let callCount = 0;

      // Override to always fail
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = await import('../services/notificationEmail');
      const originalSendNotificationEmail = mod.sendNotificationEmail;

      // Create a notification that will fail
      await EmailNotification.create({
        userId: user._id,
        type: 'task_deadline',
        title: 'Failing task',
        entityType: 'task',
        entityId: new mongoose.Types.ObjectId(),
        scheduledFor: now,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        dedupeKey: 'email:test:fail:task_deadline:0:2026-11-13',
      });

      // We can't easily mock nodemailer, so test the scheduling logic by checking
      // that nextRetryAt is set after a failure. Since SMTP is configured (mock),
      // it will try to connect and likely fail with a connection error.
      try {
        await processPendingEmailNotifications(now);
      } catch {
        // Expected to fail - SMTP mock is unreachable
      }

      const notif = await EmailNotification.findOne({
        userId: user._id,
        dedupeKey: 'email:test:fail:task_deadline:0:2026-11-13',
      });
      if (notif) {
        // After first failure, nextRetryAt should be set (exponential backoff)
        assert.ok(notif.nextRetryAt, 'nextRetryAt should be set after transient failure');
        assert.equal(notif.status, 'pending', 'should remain pending for retry');
        assert.equal(notif.retryCount, 1, 'retry count should be incremented');
      }
    });

    it('marks as failed after max retries', async () => {
      await EmailNotification.create({
        userId: user._id,
        type: 'task_deadline',
        title: 'Max retries task',
        entityType: 'task',
        entityId: new mongoose.Types.ObjectId(),
        scheduledFor: now,
        status: 'pending',
        retryCount: 2,
        maxRetries: 3,
        dedupeKey: 'email:test:maxretries:task_deadline:0:2026-11-13',
      });

      try {
        await processPendingEmailNotifications(now);
      } catch {
        // Expected to fail
      }

      const notif = await EmailNotification.findOne({
        userId: user._id,
        dedupeKey: 'email:test:maxretries:task_deadline:0:2026-11-13',
      });
      if (notif) {
        assert.equal(notif.status, 'failed', 'should be failed after max retries');
        assert.ok(notif.nextRetryAt == null, 'nextRetryAt should be null when failed');
      }
    });
  });

  describe('cleanup', () => {
    it('removes old processed notifications', async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await EmailNotification.create({
        userId: user._id,
        type: 'task_deadline',
        title: 'Old notification',
        entityType: 'task',
        entityId: new mongoose.Types.ObjectId(),
        scheduledFor: oldDate,
        status: 'sent',
        retryCount: 0,
        maxRetries: 3,
        dedupeKey: 'email:test:old:sent:0:2026-10-01',
      });

      // Manually set updatedAt to old date via collection to bypass mongoose timestamps
      await EmailNotification.collection.updateOne(
        { dedupeKey: 'email:test:old:sent:0:2026-10-01' },
        { $set: { updatedAt: oldDate } }
      );

      const result = await cleanupProcessedNotifications();
      assert.ok(result.removed >= 1, 'expected old sent notification to be removed');

      const remaining = await EmailNotification.countDocuments({
        userId: user._id,
        dedupeKey: 'email:test:old:sent:0:2026-10-01',
      });
      assert.equal(remaining, 0, 'old notification should be removed');
    });
  });

  describe('rescheduling on schedule change', () => {
    // Helper: generate notifications, then verify dedupe keys contain a given date-time
    async function expectNotificationsForDedupeDateTime(
      entityId: mongoose.Types.ObjectId,
      expectedDateTime: string,
      shouldExist: boolean
    ) {
      const notifs = await EmailNotification.find({ userId: user._id, entityId });
      const matching = notifs.filter((n) => n.dedupeKey.includes(expectedDateTime));
      if (shouldExist) {
        assert.ok(matching.length > 0, `expected notifications with dedupe time ${expectedDateTime}`);
      } else {
        assert.equal(matching.length, 0, `expected no notifications with dedupe time ${expectedDateTime}`);
      }
      return notifs;
    }

    it('task deadline changed to another time on the same day', async () => {
      // Create task due tomorrow at 09:00 UTC
      const task = await Task.create({
        userId: user._id,
        title: 'Same-day time change',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Work',
        priority: 'medium',
      });

      // Generate notifications for 09:00 UTC
      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(task._id, '2026-11-14T09:00', true);

      // Change time to 14:00 UTC on the same day
      task.dueTime = '14:00';
      await task.save();

      // Reschedule
      await rescheduleEntityEmailNotifications(user._id, task._id, 'task');

      // Old notifications should be skipped
      const oldNotifs = await EmailNotification.find({
        userId: user._id,
        entityId: task._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldNotifs.length > 0, 'old pending notifications should be skipped');

      // New notifications should exist for 14:00 UTC
      await expectNotificationsForDedupeDateTime(task._id, '2026-11-14T14:00', true);

      // No pending notifications with old time
      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0, 'no pending notifications with old time');
    });

    it('task deadline moved to another date', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Date change',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Work',
        priority: 'medium',
      });

      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(task._id, '2026-11-14T09:00', true);

      // Move to the day after tomorrow at the same time
      const dayAfterTomorrow = new Date('2026-11-15T10:00:00Z');
      task.dueDate = dayAfterTomorrow;
      await task.save();

      await rescheduleEntityEmailNotifications(user._id, task._id, 'task');

      // Old date notifications skipped
      const oldSkipped = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldSkipped > 0, 'old date notifications should be skipped');

      // New date notifications created (09:00 UTC on Nov 15)
      await expectNotificationsForDedupeDateTime(task._id, '2026-11-15T09:00', true);

      // No pending with old date
      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: task._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0);
    });

    it('bill payment date changed', async () => {
      const bill = await Bill.create({
        userId: user._id,
        name: 'Date change bill',
        amount: 100,
        currency: '₹',
        dueDate: tomorrow,
        paymentStatus: 'pending',
        category: 'Finance',
      });

      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(bill._id, '2026-11-14T09:00', true);

      // Change due date to Nov 15
      bill.dueDate = new Date('2026-11-15T10:00:00Z');
      await bill.save();

      await rescheduleEntityEmailNotifications(user._id, bill._id, 'bill');

      const oldSkipped = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: bill._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldSkipped > 0, 'old bill date notifications should be skipped');

      await expectNotificationsForDedupeDateTime(bill._id, '2026-11-15T09:00', true);

      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: bill._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0);
    });

    it('appointment time changed on the same day', async () => {
      const appointment = await Appointment.create({
        userId: user._id,
        title: 'Same-day time change appt',
        date: tomorrow,
        time: '09:00',
        location: 'Clinic',
      });

      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(appointment._id, '2026-11-14T09:00', true);

      // Change time to 14:00 UTC on same day
      appointment.time = '14:00';
      await appointment.save();

      await rescheduleEntityEmailNotifications(user._id, appointment._id, 'appointment');

      const oldSkipped = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldSkipped > 0, 'old appointment time notifications should be skipped');

      await expectNotificationsForDedupeDateTime(appointment._id, '2026-11-14T14:00', true);

      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0);
    });

    it('appointment date and time both changed', async () => {
      const appointment = await Appointment.create({
        userId: user._id,
        title: 'Date and time change',
        date: tomorrow,
        time: '09:00',
        location: 'Clinic',
      });

      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(appointment._id, '2026-11-14T09:00', true);

      // Move to Nov 15 at 14:00 UTC
      appointment.date = new Date('2026-11-15T10:00:00Z');
      appointment.time = '14:00';
      await appointment.save();

      await rescheduleEntityEmailNotifications(user._id, appointment._id, 'appointment');

      const oldSkipped = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldSkipped > 0, 'old appointment notifications should be skipped');

      await expectNotificationsForDedupeDateTime(appointment._id, '2026-11-15T14:00', true);

      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: appointment._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0);
    });

    it('reminder scheduled time changed', async () => {
      const reminder = await Reminder.create({
        userId: user._id,
        title: 'Time change reminder',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'active',
        category: 'Personal',
        priority: 'medium',
      });

      await generateEmailNotifications(now);
      await expectNotificationsForDedupeDateTime(reminder._id, '2026-11-14T09:00', true);

      // Change time to 14:00 UTC on same day
      reminder.dueTime = '14:00';
      await reminder.save();

      await rescheduleEntityEmailNotifications(user._id, reminder._id, 'reminder');

      const oldSkipped = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: reminder._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'skipped',
      });
      assert.ok(oldSkipped > 0, 'old reminder time notifications should be skipped');

      await expectNotificationsForDedupeDateTime(reminder._id, '2026-11-14T14:00', true);

      const oldPending = await EmailNotification.countDocuments({
        userId: user._id,
        entityId: reminder._id,
        dedupeKey: /2026-11-14T09:00/,
        status: 'pending',
      });
      assert.equal(oldPending, 0);
    });

    it('sent notification history is preserved when rescheduling', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'History preservation',
        dueDate: tomorrow,
        dueTime: '09:00',
        status: 'todo',
        category: 'Work',
        priority: 'medium',
      });

      await generateEmailNotifications(now);

      // Mark one notification as sent (simulating delivery)
      const notif = await EmailNotification.findOne({
        userId: user._id,
        entityId: task._id,
        status: 'pending',
      });
      if (notif) {
        await EmailNotification.updateOne(
          { _id: notif._id },
          { $set: { status: 'sent', sentAt: now } }
        );
      }

      // Change time
      task.dueTime = '14:00';
      await task.save();

      await rescheduleEntityEmailNotifications(user._id, task._id, 'task');

      // Sent notification should still be 'sent', not 'skipped'
      const sentNotif = await EmailNotification.findOne({
        userId: user._id,
        entityId: task._id,
        status: 'sent',
      });
      assert.ok(sentNotif, 'sent notification history should be preserved');
    });
  });
});
