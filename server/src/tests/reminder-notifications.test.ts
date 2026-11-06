import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import Reminder from '../models/Reminder';
import Notification from '../models/Notification';
import { processDueReminders } from '../services/reminderScheduler';

describe('Reminder in-app notification scheduling', () => {
  let mongoServer: MongoMemoryServer;
  let user: any;

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    user = await User.create({ name: 'Reminder Tester', email: 'reminders@test.com', password: 'hashedpassword123' });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('creates deduped scheduled/overdue in-app notifications for due reminders', async () => {
    const now = new Date();
    const dueNow = new Date(now.getTime() - 2 * 60 * 1000);
    const dueSoon = new Date(now.getTime() + 15 * 60 * 1000);

    const overdue = await Reminder.create({
      userId: user._id,
      title: 'Overdue item',
      dueDate: dueNow,
      dueTime: `${String(dueNow.getHours()).padStart(2, '0')}:${String(dueNow.getMinutes()).padStart(2, '0')}`,
      reminderOffsetMinutes: [0],
      status: 'active',
      category: 'Personal',
      priority: 'medium',
    });

    const scheduled = await Reminder.create({
      userId: user._id,
      title: 'Soon item',
      dueDate: dueSoon,
      dueTime: `${String(dueSoon.getHours()).padStart(2, '0')}:${String(dueSoon.getMinutes()).padStart(2, '0')}`,
      reminderOffsetMinutes: [15],
      status: 'active',
      category: 'Work',
      priority: 'high',
    });

    const r1 = await processDueReminders(now);
    assert.ok(r1.scanned >= 2);
    assert.ok(r1.created >= 2, `expected >=2 notifications, got ${r1.created}`);

    const overdueNotifs = await Notification.find({ userId: user._id, entityId: overdue._id });
    assert.equal(overdueNotifs.length, 1);
    assert.equal(overdueNotifs[0].type, 'overdue');
    assert.ok(overdueNotifs[0].dedupeKey?.includes(':0:overdue'));

    const scheduledNotifs = await Notification.find({ userId: user._id, entityId: scheduled._id });
    assert.equal(scheduledNotifs.length, 1);
    assert.equal(scheduledNotifs[0].type, 'reminder');

    const r2 = await processDueReminders(new Date(now.getTime() + 30 * 1000));
    assert.equal(r2.created, 0, 'duplicate prevention should block second pass');

    const total = await Notification.countDocuments({ userId: user._id });
    assert.equal(total, 2);
  });
});
