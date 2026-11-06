import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AddressInfo } from 'net';
import app from '../app';
import User from '../models/User';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Reminder from '../models/Reminder';
import { generateToken } from '../middleware/auth';

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
});
