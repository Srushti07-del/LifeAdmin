import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AddressInfo } from 'net';
import app from '../app';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import { generateToken } from '../middleware/auth';
import {
  addDaysToYMD,
  buildStrictSevenDayContext,
  buildStrictSevenDayGeminiPrompt,
  resolveLocalTodayYMD,
} from '../services/aiBriefingWindow';

describe('AI assistant routes', () => {
  let mongoServer: MongoMemoryServer;
  let server: any;
  let baseUrl: string;
  let authToken: string;
  let otherToken: string;
  let user: any;

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    user = await User.create({ name: 'AI User', email: 'ai@test.com', password: 'hashedpassword123' });
    const other = await User.create({ name: 'Other', email: 'other-ai@test.com', password: 'hashedpassword123' });
    authToken = generateToken(user._id.toString());
    otherToken = generateToken(other._id.toString());
    await Task.create({ userId: user._id, title: 'Submit assignment', dueDate: new Date(Date.now() - 86400000), priority: 'high', status: 'todo', category: 'Study' });
    await Bill.create({ userId: user._id, name: 'Internet bill', amount: 899, currency: '₹', dueDate: new Date(Date.now() + 86400000), paymentStatus: 'pending', category: 'Utilities' });
    await Task.create({ userId: other._id, title: 'Other user secret task', dueDate: new Date(), priority: 'urgent', status: 'todo', category: 'Private' });
  });

  after(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('answers from authenticated user data and does not leak other user data', async () => {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ message: 'What is overdue and what bills are due soon?' }),
    });
    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(typeof data.reply === 'string' && data.reply.length > 0);
    assert.ok(/Submit assignment|overdue/i.test(data.reply));
    assert.ok(/Internet bill|INR|899|due soon/i.test(data.reply), data.reply);
    assert.ok(!/Other user secret task/.test(data.reply));
    assert.ok(data.conversationId);
  });

  it('proposes natural-language create action with confirmation and does not create without confirm', async () => {
    const before = await Reminder.countDocuments({ userId: user._id });
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ message: 'Create a reminder to call the dentist tomorrow at 10:00' }),
    });
    assert.equal(res.status, 200);
    const data: any = await res.json();
    const actions = data.proposedActions || data.suggestions || [];
    assert.ok(actions.length >= 1, 'expected a proposed action');
    assert.equal(actions[0].type, 'reminder');
    assert.equal(actions[0].requiresConfirmation, true);
    const after = await Reminder.countDocuments({ userId: user._id });
    assert.equal(after, before, 'must not create without explicit confirmation');
  });

  it('requires explicit confirmation for action execution', async () => {
    const noConfirm = await fetch(`${baseUrl}/ai/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ action: { type: 'task', title: 'Confirmed task', dueDate: new Date().toISOString().split('T')[0] } }),
    });
    assert.equal(noConfirm.status, 400);

    const ok = await fetch(`${baseUrl}/ai/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ confirmed: true, action: { type: 'task', title: 'Confirmed task', dueDate: new Date().toISOString().split('T')[0], priority: 'medium' } }),
    });
    assert.equal(ok.status, 201);
    const created = await Task.findOne({ userId: user._id, title: 'Confirmed task' });
    assert.ok(created);
  });

  it('enforces a strict 7-day window on /api/ai/chat (excludes day 8+ tasks, bills, appointments, reminders and separates overdue)', async () => {
    const scopedUser = await User.create({
      name: 'Seven Day User',
      email: 'sevenday@test.com',
      password: 'hashedpassword123',
      onboardingCompleted: true,
    });
    const scopedToken = generateToken(scopedUser._id.toString());
    const localDate = '2026-11-11';
    const timezoneOffsetMinutes = -330;

    await Promise.all([
      Task.create({
        userId: scopedUser._id,
        title: 'Overdue Task Day -2',
        dueDate: new Date('2026-11-09T00:00:00.000Z'),
        priority: 'high',
        status: 'todo',
        category: 'Work',
      }),
      Task.create({
        userId: scopedUser._id,
        title: 'Window Task Today',
        dueDate: new Date('2026-11-11T00:00:00.000Z'),
        priority: 'medium',
        status: 'todo',
        category: 'Work',
      }),
      Task.create({
        userId: scopedUser._id,
        title: 'Excluded Task Day 8',
        dueDate: new Date('2026-11-18T00:00:00.000Z'),
        priority: 'urgent',
        status: 'todo',
        category: 'Work',
      }),
      Bill.create({
        userId: scopedUser._id,
        name: 'Window Bill Day 7 Boundary',
        amount: 1200,
        currency: '₹',
        dueDate: new Date('2026-11-17T00:00:00.000Z'),
        paymentStatus: 'pending',
        category: 'Utilities',
      }),
      Bill.create({
        userId: scopedUser._id,
        name: 'Excluded Bill Day 12',
        amount: 4500,
        currency: '₹',
        dueDate: new Date('2026-11-22T00:00:00.000Z'),
        paymentStatus: 'pending',
        category: 'Finance',
      }),
      Appointment.create({
        userId: scopedUser._id,
        title: 'Past Appointment Yesterday',
        date: new Date('2026-11-10T00:00:00.000Z'),
        time: '09:00',
        category: 'Personal',
      }),
      Appointment.create({
        userId: scopedUser._id,
        title: 'Window Appointment Day 4',
        date: new Date('2026-11-14T00:00:00.000Z'),
        time: '15:00',
        category: 'Health',
      }),
      Appointment.create({
        userId: scopedUser._id,
        title: 'Excluded Appointment Day 8',
        date: new Date('2026-11-18T00:00:00.000Z'),
        time: '11:00',
        category: 'Health',
      }),
      Reminder.create({
        userId: scopedUser._id,
        title: 'Window Reminder Day 5',
        dueDate: new Date('2026-11-15T00:00:00.000Z'),
        status: 'active',
        priority: 'medium',
        category: 'Personal',
      }),
      Reminder.create({
        userId: scopedUser._id,
        title: 'Excluded Reminder Day 15',
        dueDate: new Date('2026-11-25T00:00:00.000Z'),
        status: 'active',
        priority: 'high',
        category: 'Personal',
      }),
    ]);

    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scopedToken}` },
      body: JSON.stringify({
        message: 'Give me my daily briefing for the next 7 calendar days only.',
        scope: 'daily_briefing_7d',
        windowDays: 7,
        localDate,
        timezoneOffsetMinutes,
      }),
    });

    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(typeof data.reply === 'string' && data.reply.length > 0);
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.some((i: any) => i.title === 'Window Task Today'));
    assert.ok(data.items.some((i: any) => i.title === 'Window Bill Day 7 Boundary'));
    assert.ok(data.items.some((i: any) => i.title === 'Window Appointment Day 4'));
    assert.ok(data.items.some((i: any) => i.title === 'Window Reminder Day 5'));

    // Excluded / out-of-window items must not appear in structured items
    assert.ok(!data.items.some((i: any) => i.title === 'Excluded Task Day 8'));
    assert.ok(!data.items.some((i: any) => i.title === 'Excluded Bill Day 12'));
    assert.ok(!data.items.some((i: any) => i.title === 'Excluded Appointment Day 8'));
    assert.ok(!data.items.some((i: any) => i.title === 'Excluded Reminder Day 15'));
    assert.ok(!data.items.some((i: any) => i.title === 'Overdue Task Day -2'));
    assert.ok(!data.items.some((i: any) => i.title === 'Past Appointment Yesterday'));

    // No 30-day/monthly outlook in the overview text
    assert.ok(!/30 day|monthly/i.test(data.reply));
  });

  it('handles timezone rollovers cleanly for 7-day AI context and prompt construction', () => {
    // EST (UTC-5, offset +300): UTC clock is already Nov 12 03:30Z, local date is Nov 11
    const estNow = new Date('2026-11-12T03:30:00.000Z');
    const resolvedEst = resolveLocalTodayYMD({ now: estNow, timezoneOffsetMinutes: 300 });
    assert.equal(resolvedEst.localDate, '2026-11-11');
    assert.equal(addDaysToYMD(resolvedEst.localDate, 6), '2026-11-17');

    const estContext = buildStrictSevenDayContext(
      {
        tasks: [
          { _id: '1', title: 'Late Night Local Today', dueDate: '2026-11-12T03:00:00.000Z', status: 'todo', priority: 'high' },
          { _id: '2', title: 'Seventh Day EST Included', dueDate: '2026-11-17T00:00:00.000Z', status: 'todo', priority: 'medium' },
          { _id: '3', title: 'Eighth Day EST Excluded', dueDate: '2026-11-18T00:00:00.000Z', status: 'todo', priority: 'urgent' },
        ],
        bills: [],
        appointments: [],
        reminders: [],
      },
      { now: estNow, timezoneOffsetMinutes: 300 }
    );

    assert.equal(estContext.scheduled.tasks.length, 2);
    assert.equal(estContext.scheduled.tasks[0].daysFromToday, 0);
    assert.equal(estContext.scheduled.tasks[1].daysFromToday, 6);

    const prompt = buildStrictSevenDayGeminiPrompt(estContext, 'Daily briefing');
    assert.ok(/2026-11-11 through 2026-11-17/.test(prompt));
    assert.ok(!/Eighth Day EST Excluded/.test(prompt));

    // IST (UTC+5:30, offset -330): UTC clock is Nov 11 19:00Z, local date is Nov 12 00:30 IST
    const istNow = new Date('2026-11-11T19:00:00.000Z');
    const resolvedIst = resolveLocalTodayYMD({ now: istNow, timezoneOffsetMinutes: -330 });
    assert.equal(resolvedIst.localDate, '2026-11-12');
    const istContext = buildStrictSevenDayContext(
      {
        tasks: [
          { _id: '1', title: 'Yesterday IST Overdue', dueDate: '2026-11-11T00:00:00.000Z', status: 'todo', priority: 'high' },
          { _id: '2', title: 'Eighth Day IST Excluded', dueDate: '2026-11-19T00:00:00.000Z', status: 'todo', priority: 'high' },
        ],
        bills: [],
        appointments: [],
        reminders: [],
      },
      { now: istNow, timezoneOffsetMinutes: -330 }
    );
    assert.equal(istContext.overdue.tasks.length, 1);
    assert.equal(istContext.scheduled.tasks.length, 0);
  });
});
