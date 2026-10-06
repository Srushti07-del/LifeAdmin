import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { AddressInfo } from 'net';
import app from '../app';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import CalendarEvent from '../models/CalendarEvent';
import Notification from '../models/Notification';
import AIInteraction from '../models/AIInteraction';
import { generateToken } from '../middleware/auth';
import config from '../config';

describe('Account Deletion & Data Cascade Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: any;
  let baseUrl: string;

  let victimUser: any;
  let bystanderUser: any;
  let victimToken: string;
  let bystanderToken: string;

  let victimFilePhysicalPath: string;
  let bystanderFilePhysicalPath: string;

  const uploadDir = path.join(process.cwd(), config.uploadDir);

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // 1. Create Victim User
    victimUser = await User.create({
      name: 'Victim User',
      email: 'victim@example.com',
      password: 'password123',
    });
    victimToken = generateToken(victimUser._id.toString());

    // 2. Create Bystander User
    bystanderUser = await User.create({
      name: 'Bystander User',
      email: 'bystander@example.com',
      password: 'password123',
    });
    bystanderToken = generateToken(bystanderUser._id.toString());

    // Populate Victim user's data across all modules
    await Task.create({
      userId: victimUser._id,
      title: 'Victim Task',
      status: 'todo',
    });

    await Bill.create({
      userId: victimUser._id,
      name: 'Victim Bill',
      amount: 100,
      dueDate: new Date(),
    });

    await Appointment.create({
      userId: victimUser._id,
      title: 'Victim Appointment',
      date: new Date(),
    });

    await Reminder.create({
      userId: victimUser._id,
      title: 'Victim Reminder',
      dueDate: new Date(),
    });

    await CalendarEvent.create({
      userId: victimUser._id,
      title: 'Victim Event',
      startDate: new Date(),
      sourceType: 'manual',
    });

    await Notification.create({
      userId: victimUser._id,
      title: 'Victim Notification',
      message: 'Hello',
    });

    await AIInteraction.create({
      userId: victimUser._id,
      type: 'chat',
      messages: [
        { role: 'user', content: 'Help me plan', timestamp: new Date() },
        { role: 'assistant', content: 'Sure', timestamp: new Date() },
      ],
    });

    // Create physical document file for victim
    const victimFileName = `victim-doc-${Date.now()}.txt`;
    victimFilePhysicalPath = path.join(uploadDir, victimFileName);
    fs.writeFileSync(victimFilePhysicalPath, 'Victim private file content');

    await DocumentModel.create({
      userId: victimUser._id,
      originalName: 'VictimDoc.txt',
      fileName: victimFileName,
      filePath: `/api/documents/placeholder/download`,
      fileSize: 28,
      mimeType: 'text/plain',
      category: 'Personal',
      aiProcessed: false,
    });

    // Populate Bystander user's data (must remain intact!)
    await Task.create({
      userId: bystanderUser._id,
      title: 'Bystander Task',
      status: 'todo',
    });

    const bystanderFileName = `bystander-doc-${Date.now()}.txt`;
    bystanderFilePhysicalPath = path.join(uploadDir, bystanderFileName);
    fs.writeFileSync(bystanderFilePhysicalPath, 'Bystander private file content');

    await DocumentModel.create({
      userId: bystanderUser._id,
      originalName: 'BystanderDoc.txt',
      fileName: bystanderFileName,
      filePath: `/api/documents/placeholder/download`,
      fileSize: 31,
      mimeType: 'text/plain',
      category: 'Work',
      aiProcessed: false,
    });
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();

    try {
      if (fs.existsSync(victimFilePhysicalPath)) fs.unlinkSync(victimFilePhysicalPath);
      if (fs.existsSync(bystanderFilePhysicalPath)) fs.unlinkSync(bystanderFilePhysicalPath);
    } catch {
      // ignore
    }
  });

  it('rejects unauthenticated DELETE /api/users/account with 401', async () => {
    const res = await fetch(`${baseUrl}/users/account`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 401);
  });

  it('confirms the duplicate DELETE /api/auth/account endpoint was removed (returns 404)', async () => {
    const res = await fetch(`${baseUrl}/auth/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${victimToken}` },
    });
    // Since /api/auth/account route was removed, express falls through to 404 handler
    assert.equal(res.status, 404);
  });

  it('successfully executes canonical account deletion with full data and file cascade', async () => {
    // Verify file exists before deletion
    assert.ok(fs.existsSync(victimFilePhysicalPath), 'Victim file should exist prior to deletion');

    const res = await fetch(`${baseUrl}/users/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${victimToken}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.match(body.message, /permanently deleted/i);

    // 1. Verify User record is deleted
    const deletedUser = await User.findById(victimUser._id);
    assert.equal(deletedUser, null, 'User record must be deleted');

    // 2. Verify all associated records in DB are cascaded
    const [tasks, bills, appts, reminders, docs, events, notifs, ai] = await Promise.all([
      Task.find({ userId: victimUser._id }),
      Bill.find({ userId: victimUser._id }),
      Appointment.find({ userId: victimUser._id }),
      Reminder.find({ userId: victimUser._id }),
      DocumentModel.find({ userId: victimUser._id }),
      CalendarEvent.find({ userId: victimUser._id }),
      Notification.find({ userId: victimUser._id }),
      AIInteraction.find({ userId: victimUser._id }),
    ]);

    assert.equal(tasks.length, 0, 'Tasks must be cascaded');
    assert.equal(bills.length, 0, 'Bills must be cascaded');
    assert.equal(appts.length, 0, 'Appointments must be cascaded');
    assert.equal(reminders.length, 0, 'Reminders must be cascaded');
    assert.equal(docs.length, 0, 'Documents must be cascaded');
    assert.equal(events.length, 0, 'Events must be cascaded');
    assert.equal(notifs.length, 0, 'Notifications must be cascaded');
    assert.equal(ai.length, 0, 'AI interactions must be cascaded');

    // 3. Verify physical document file on disk is securely removed
    assert.equal(fs.existsSync(victimFilePhysicalPath), false, 'Physical file on disk must be removed');

    // 4. Verify Bystander user and data are completely untouched
    const bystander = await User.findById(bystanderUser._id);
    assert.ok(bystander, 'Bystander user must remain intact');
    const bystanderTasks = await Task.find({ userId: bystanderUser._id });
    assert.equal(bystanderTasks.length, 1, 'Bystander tasks must remain intact');
    assert.ok(fs.existsSync(bystanderFilePhysicalPath), 'Bystander physical file must remain intact');
  });
});
