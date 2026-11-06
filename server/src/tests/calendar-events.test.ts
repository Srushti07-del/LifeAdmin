import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AddressInfo } from 'net';
import app from '../app';
import User from '../models/User';
import CalendarEvent from '../models/CalendarEvent';
import { generateToken } from '../middleware/auth';

describe('Calendar Manual Event CRUD', () => {
  let mongoServer: MongoMemoryServer;
  let server: any;
  let baseUrl: string;
  let authToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    const user = await User.create({ name: 'Calendar Tester', email: 'cal@test.com', password: 'hashedpassword123' });
    authToken = generateToken(user._id.toString());
  });

  after(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('creates, reads, updates, and deletes a manual calendar event', async () => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

    const createRes = await fetch(`${baseUrl}/calendar/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Lease Renewal',
        startDate: '2026-11-10',
        startTime: '10:00',
        endTime: '11:00',
        location: 'Home office',
        category: 'Household',
        description: 'Review terms',
        color: '#087E83',
      }),
    });
    assert.equal(createRes.status, 201);
    const created: any = await createRes.json();
    assert.equal(created.event.title, 'Lease Renewal');
    assert.equal(created.event.sourceType, 'manual');
    const id = created.event._id;

    const listRes = await fetch(`${baseUrl}/calendar/events?start=2026-11-01T00:00:00.000Z&end=2026-11-30T23:59:59.999Z`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(listRes.status, 200);
    const listed: any = await listRes.json();
    const found = listed.events.find((e: any) => e.id === id || e.originalId === id);
    assert.ok(found, 'created event should appear in unified feed');
    assert.equal(found.isOriginalEvent, true);
    assert.equal(found.startTime, '10:00');
    assert.equal(found.endTime, '11:00');

    const updateRes = await fetch(`${baseUrl}/calendar/events/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title: 'Lease Renewal Call', startTime: '10:30', location: 'Zoom' }),
    });
    assert.equal(updateRes.status, 200);
    const updated: any = await updateRes.json();
    assert.equal(updated.event.title, 'Lease Renewal Call');
    assert.equal(updated.event.startTime, '10:30');
    assert.equal(updated.event.location, 'Zoom');

    const deleteRes = await fetch(`${baseUrl}/calendar/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(await CalendarEvent.findById(id), null);
  });

  it('rejects unauthenticated access and cross-user updates/deletes', async () => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };
    const createRes = await fetch(`${baseUrl}/calendar/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Private Event', startDate: '2026-11-12' }),
    });
    const created: any = await createRes.json();
    const id = created.event._id;

    const unauth = await fetch(`${baseUrl}/calendar/events?start=2026-11-01T00:00:00.000Z&end=2026-11-30T23:59:59.999Z`);
    assert.equal(unauth.status, 401);

    const other = await User.create({ name: 'Other', email: 'other-cal@test.com', password: 'hashedpassword123' });
    const otherToken = generateToken(other._id.toString());
    const otherHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` };

    const crossUpdate = await fetch(`${baseUrl}/calendar/events/${id}`, { method: 'PUT', headers: otherHeaders, body: JSON.stringify({ title: 'Nope' }) });
    assert.equal(crossUpdate.status, 403);

    const crossDelete = await fetch(`${baseUrl}/calendar/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${otherToken}` } });
    assert.equal(crossDelete.status, 403);

    await CalendarEvent.findByIdAndDelete(id);
  });
});
