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
import CalendarEvent from '../models/CalendarEvent';
import { generateToken } from '../middleware/auth';

describe('Core Entity End-to-End CRUD Flows Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: any;
  let baseUrl: string;
  let testUser: any;
  let authToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    testUser = await User.create({
      name: 'CRUD Tester',
      email: 'crud@test.com',
      password: 'hashedpassword123',
    });

    authToken = generateToken(testUser._id.toString());
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Tasks CRUD Flow', () => {
    let createdTaskId: string;

    it('creates a task via POST /api/tasks', async () => {
      const res = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Review Quarterly Taxes',
          description: 'Gather invoices and submit',
          dueDate: '2026-04-15',
          priority: 'high',
          status: 'todo',
          category: 'Finance',
        }),
      });

      assert.equal(res.status, 201);
      const data: any = await res.json();
      assert.ok(data.task);
      assert.equal(data.task.title, 'Review Quarterly Taxes');
      assert.equal(data.task.priority, 'high');
      createdTaskId = data.task._id;
    });

    it('reads the task via GET /api/tasks/:id', async () => {
      const res = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.task._id, createdTaskId);
      assert.equal(data.task.title, 'Review Quarterly Taxes');
    });

    it('updates and marks task complete via PUT /api/tasks/:id', async () => {
      const res = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: 'completed',
          priority: 'urgent',
        }),
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.task.status, 'completed');
      assert.equal(data.task.priority, 'urgent');
      assert.ok(data.task.completedAt, 'completedAt should be set');
    });

    it('deletes the task via DELETE /api/tasks/:id', async () => {
      const res = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);

      const check = await Task.findById(createdTaskId);
      assert.equal(check, null);
    });
  });

  describe('Bills CRUD & Payment Recurrence Flow', () => {
    let createdBillId: string;

    it('creates a bill via POST /api/bills', async () => {
      const res = await fetch(`${baseUrl}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Home Broadband',
          provider: 'Airtel',
          amount: 899,
          currency: '₹',
          dueDate: '2026-05-01',
          category: 'Utilities',
          recurrence: {
            type: 'monthly',
            interval: 1,
          },
        }),
      });

      assert.equal(res.status, 201);
      const data: any = await res.json();
      assert.ok(data.bill);
      assert.equal(data.bill.amount, 899);
      createdBillId = data.bill._id;
    });

    it('updates bill amount via PUT /api/bills/:id', async () => {
      const res = await fetch(`${baseUrl}/bills/${createdBillId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: 999,
          notes: 'Upgraded plan to 300 Mbps',
        }),
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.bill.amount, 999);
      assert.equal(data.bill.notes, 'Upgraded plan to 300 Mbps');
    });

    it('pays bill via PATCH /api/bills/:id/pay and generates next recurrence', async () => {
      const res = await fetch(`${baseUrl}/bills/${createdBillId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.bill.paymentStatus, 'paid');
      assert.ok(data.nextOccurrence, 'Next occurrence should be returned');
      assert.equal(data.nextOccurrence.name, 'Home Broadband');
      assert.equal(data.nextOccurrence.paymentStatus, 'pending');

      const nextDate = new Date(data.nextOccurrence.dueDate).toISOString().split('T')[0];
      assert.equal(nextDate, '2026-06-01');
    });

    it('deletes bill via DELETE /api/bills/:id', async () => {
      const res = await fetch(`${baseUrl}/bills/${createdBillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const check = await Bill.findById(createdBillId);
      assert.equal(check, null);
    });
  });

  describe('Appointments CRUD Flow', () => {
    let createdApptId: string;

    it('creates appointment via POST /api/appointments', async () => {
      const res = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Dr. Sharma Cardiology Consult',
          date: '2026-04-20',
          time: '11:00',
          location: 'Apollo Clinic Room 204',
          category: 'Health',
          relatedPerson: 'Dr. Sharma',
        }),
      });

      assert.equal(res.status, 201);
      const data: any = await res.json();
      assert.ok(data.appointment);
      assert.equal(data.appointment.title, 'Dr. Sharma Cardiology Consult');
      createdApptId = data.appointment._id;
    });

    it('reads appointment via GET /api/appointments/:id', async () => {
      const res = await fetch(`${baseUrl}/appointments/${createdApptId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.appointment.location, 'Apollo Clinic Room 204');
    });

    it('updates appointment via PUT /api/appointments/:id', async () => {
      const res = await fetch(`${baseUrl}/appointments/${createdApptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          time: '11:30',
          notes: 'Bring previous ECG report',
        }),
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.appointment.time, '11:30');
      assert.equal(data.appointment.notes, 'Bring previous ECG report');
    });

    it('deletes appointment via DELETE /api/appointments/:id', async () => {
      const res = await fetch(`${baseUrl}/appointments/${createdApptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const check = await Appointment.findById(createdApptId);
      assert.equal(check, null);
    });
  });

  describe('Reminders CRUD Flow', () => {
    let createdReminderId: string;

    it('creates reminder via POST /api/reminders', async () => {
      const res = await fetch(`${baseUrl}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Submit Expense Receipts',
          dueDate: '2026-04-25',
          dueTime: '17:00',
          priority: 'high',
          category: 'Work',
        }),
      });

      assert.equal(res.status, 201);
      const data: any = await res.json();
      assert.ok(data.reminder);
      assert.equal(data.reminder.title, 'Submit Expense Receipts');
      createdReminderId = data.reminder._id;
    });

    it('acknowledges reminder via PATCH /api/reminders/:id/acknowledge', async () => {
      const res = await fetch(`${baseUrl}/reminders/${createdReminderId}/acknowledge`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.reminder.status, 'acknowledged');
    });

    it('updates reminder via PUT /api/reminders/:id', async () => {
      const res = await fetch(`${baseUrl}/reminders/${createdReminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Submit Expense Receipts (Verified)',
          priority: 'urgent',
        }),
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.reminder.title, 'Submit Expense Receipts (Verified)');
    });

    it('deletes reminder via DELETE /api/reminders/:id', async () => {
      const res = await fetch(`${baseUrl}/reminders/${createdReminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const check = await Reminder.findById(createdReminderId);
      assert.equal(check, null);
    });
  });

  describe('Calendar Events & Unified Feed Flow', () => {
    let createdEventId: string;

    it('creates manual calendar event via POST /api/calendar/events', async () => {
      const res = await fetch(`${baseUrl}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Apartment Lease Renewal Meeting',
          startDate: '2026-04-28',
          startTime: '10:00',
          location: 'Leasing Office',
          category: 'Housing',
          color: '#10b981',
        }),
      });

      assert.equal(res.status, 201);
      const data: any = await res.json();
      assert.ok(data.event);
      assert.equal(data.event.title, 'Apartment Lease Renewal Meeting');
      createdEventId = data.event._id;
    });

    it('updates manual calendar event via PUT /api/calendar/events/:id', async () => {
      const res = await fetch(`${baseUrl}/calendar/events/${createdEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          startTime: '10:30',
          description: 'Confirmed with landlord',
        }),
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.event.startTime, '10:30');
      assert.equal(data.event.description, 'Confirmed with landlord');
    });

    it('aggregates events in unified feed GET /api/calendar/events', async () => {
      const res = await fetch(`${baseUrl}/calendar/events?start=2026-04-01T00:00:00Z&end=2026-04-30T23:59:59Z`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.ok(Array.isArray(data.events));

      const found = data.events.find((e: any) => e.title === 'Apartment Lease Renewal Meeting');
      assert.ok(found, 'Manual event should appear in calendar feed');
      assert.equal(found.type, 'event');
      assert.equal(found.source, 'manual');
    });

    it('deletes manual calendar event via DELETE /api/calendar/events/:id', async () => {
      const res = await fetch(`${baseUrl}/calendar/events/${createdEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const check = await CalendarEvent.findById(createdEventId);
      assert.equal(check, null);
    });
  });
});
