import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import CalendarEvent from '../models/CalendarEvent';
import { calculateDashboardOverview } from '../services/attention';

describe('Dashboard Canonical Attention & Upcoming Calculation Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testUser = await User.create({
      name: 'Attention Tester',
      email: 'attention@test.com',
      password: 'password123',
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('correctly categorizes overdue, soon, and upcoming responsibilities into needsAttention and upcoming', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // 1. Overdue task
    await Task.create({
      userId: testUser._id,
      title: 'Submit Lab Report',
      dueDate: yesterday,
      priority: 'high',
      status: 'todo',
      category: 'Education',
    });

    // 2. Bill due in 2 days
    await Bill.create({
      userId: testUser._id,
      name: 'Electric Utility',
      amount: 75,
      dueDate: in2Days,
      paymentStatus: 'pending',
      category: 'Utilities',
    });

    // 3. Appointment tomorrow/in 1 day
    await Appointment.create({
      userId: testUser._id,
      title: 'Dentist Checkup',
      date: in2Days,
      time: '14:00',
      category: 'Health',
    });

    // 4. Overdue reminder
    await Reminder.create({
      userId: testUser._id,
      title: 'Water Plants',
      dueDate: yesterday,
      status: 'active',
    });

    // 5. Expiring document
    await DocumentModel.create({
      userId: testUser._id,
      originalName: 'Lease_Agreement.pdf',
      fileName: 'lease.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      filePath: '/api/documents/placeholder/download',
      category: 'Housing',
      aiExtracted: {
        expiryDate: in5Days,
      },
    });

    // 6. Manual Calendar Event
    await CalendarEvent.create({
      userId: testUser._id,
      title: 'Quarterly Planning',
      startDate: in2Days,
      category: 'Work/Study',
      sourceType: 'manual',
    });

    const overview = await calculateDashboardOverview(testUser._id);

    // Check needsAttention
    assert.ok(overview.needsAttention.length >= 4);
    const overdueTaskItem = overview.needsAttention.find((i) => i.title === 'Submit Lab Report');
    assert.ok(overdueTaskItem);
    assert.equal(overdueTaskItem?.severity, 'overdue');
    assert.equal(overdueTaskItem?.type, 'task');

    const billItem = overview.needsAttention.find((i) => i.title === 'Electric Utility');
    assert.ok(billItem);
    assert.equal(billItem?.severity, 'soon');
    assert.equal(billItem?.amount, 75);

    const docItem = overview.needsAttention.find((i) => i.title === 'Lease_Agreement.pdf');
    assert.ok(docItem);
    assert.equal(docItem?.type, 'document');

    // Check upcoming items are present and chronologically ordered
    assert.ok(overview.upcoming.length >= 4);
    const eventItem = overview.upcoming.find((i) => i.title === 'Quarterly Planning');
    assert.ok(eventItem);
    assert.equal(eventItem?.type, 'event');

    for (let i = 0; i < overview.upcoming.length - 1; i++) {
      const current = new Date(overview.upcoming[i].date).getTime();
      const next = new Date(overview.upcoming[i + 1].date).getTime();
      assert.ok(current <= next, 'Upcoming items must be sorted chronologically');
    }

    // Check summary statistics
    assert.ok(overview.stats.overdueCount >= 2);
    assert.ok(overview.stats.dueSoonCount >= 1);
  });
});
