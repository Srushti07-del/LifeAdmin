import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import User from '../models/User';
import { calculateNextOccurrence, handleBillRecurrence } from '../services/recurrence';

describe('Recurrence Service Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testUser = await User.create({
      name: 'Recurrence Tester',
      email: 'recurrence@test.com',
      password: 'password123',
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('calculateNextOccurrence calculations', () => {
    it('returns null for type none or missing', () => {
      const result = calculateNextOccurrence(new Date('2026-01-15'), { type: 'none' });
      assert.equal(result, null);
    });

    it('calculates daily recurrence', () => {
      const base = new Date('2026-03-01T10:00:00Z');
      const next = calculateNextOccurrence(base, { type: 'daily', interval: 2 });
      assert.ok(next);
      assert.equal(next.toISOString().split('T')[0], '2026-03-03');
    });

    it('calculates weekly recurrence', () => {
      const base = new Date('2026-03-01T10:00:00Z');
      const next = calculateNextOccurrence(base, { type: 'weekly', interval: 1 });
      assert.ok(next);
      assert.equal(next.toISOString().split('T')[0], '2026-03-08');
    });

    it('calculates monthly recurrence with month-end roll-over preservation', () => {
      // Jan 31 + 1 month should roll to Feb 28 in a non-leap year (e.g. 2026)
      const base = new Date(Date.UTC(2026, 0, 31)); // Jan 31, 2026
      const next = calculateNextOccurrence(base, { type: 'monthly', interval: 1 });
      assert.ok(next);
      assert.equal(next.getUTCFullYear(), 2026);
      assert.equal(next.getUTCMonth(), 1); // February
      assert.equal(next.getUTCDate(), 28);
    });

    it('calculates yearly recurrence', () => {
      const base = new Date('2026-05-15T00:00:00Z');
      const next = calculateNextOccurrence(base, { type: 'yearly', interval: 1 });
      assert.ok(next);
      assert.equal(next.toISOString().split('T')[0], '2027-05-15');
    });

    it('calculates custom recurrence intervals with units', () => {
      const base = new Date('2026-01-10T00:00:00Z');
      const nextWeeks = calculateNextOccurrence(base, { type: 'custom', interval: 3, unit: 'weeks' });
      assert.ok(nextWeeks);
      assert.equal(nextWeeks.toISOString().split('T')[0], '2026-01-31');
    });

    it('enforces hard endDate stop', () => {
      const base = new Date('2026-04-01T00:00:00Z');
      const endDate = new Date('2026-04-15T00:00:00Z');
      // Next monthly occurrence would be 2026-05-01, which exceeds endDate
      const next = calculateNextOccurrence(base, { type: 'monthly', interval: 1, endDate });
      assert.equal(next, null);
    });

    it('enforces separate durationMonths limit from start date', () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const currentDueDate = new Date('2026-03-01T00:00:00Z');
      // 3-month duration membership: ends 2026-04-01. Next monthly from March 1 is April 1 (within).
      const next1 = calculateNextOccurrence(currentDueDate, { type: 'monthly', interval: 1, durationMonths: 3 }, startDate);
      assert.ok(next1);

      // Now at April 1: next occurrence May 1 would exceed 3 months duration
      const next2 = calculateNextOccurrence(new Date('2026-04-01T00:00:00Z'), { type: 'monthly', interval: 1, durationMonths: 3 }, startDate);
      assert.equal(next2, null);
    });
  });

  describe('handleBillRecurrence execution & duplicate prevention', () => {
    it('creates next occurrence and preserves original bill when marked paid', async () => {
      const bill = await Bill.create({
        userId: testUser._id,
        name: 'Internet Fiber',
        provider: 'SpeedNet',
        amount: 50,
        currency: '₹',
        dueDate: new Date('2026-04-01T00:00:00Z'),
        paymentStatus: 'paid',
        category: 'Utilities',
        recurrence: {
          type: 'monthly',
          interval: 1,
        },
      });

      const nextBill = await handleBillRecurrence(bill);
      assert.ok(nextBill);
      assert.notEqual(nextBill._id.toString(), bill._id.toString());
      assert.equal(nextBill.paymentStatus, 'pending');
      assert.equal(new Date(nextBill.dueDate).toISOString().split('T')[0], '2026-05-01');

      // Verify original bill remains unchanged
      const original = await Bill.findById(bill._id);
      assert.equal(original?.paymentStatus, 'paid');

      // Verify duplicate prevention: calling again returns the existing occurrence without creating another
      const duplicateAttempt = await handleBillRecurrence(bill);
      assert.ok(duplicateAttempt);
      assert.equal(duplicateAttempt._id.toString(), nextBill._id.toString());

      const count = await Bill.countDocuments({ userId: testUser._id, name: 'Internet Fiber' });
      assert.equal(count, 2); // exactly 1 original + 1 next occurrence
    });
  });
});
