import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';

describe('Onboarding Flow & Step Progression Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('registers a user with onboardingCompleted=false and onboardingStep=1', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Onboarding Tester',
        email: 'tester_onboard@example.com',
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.token);
    assert.equal(body.user.onboardingCompleted, false);
    assert.equal(body.user.onboardingStep, 1);
  });

  it('rejects unauthenticated requests to onboarding endpoints with 401', async () => {
    const statusRes = await fetch(`${baseUrl}/onboarding/status`);
    assert.equal(statusRes.status, 401);

    const progRes = await fetch(`${baseUrl}/onboarding/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 1 }),
    });
    assert.equal(progRes.status, 401);

    const compRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
    });
    assert.equal(compRes.status, 401);
  });

  it('enforces onboarding middleware: blocks access to protected task routes before completion', async () => {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Incomplete User',
        email: 'incomplete@example.com',
        password: 'Password123!',
      }),
    });
    const { token } = (await regRes.json()) as any;

    const taskRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(taskRes.status, 403);
    const taskBody = (await taskRes.json()) as any;
    assert.equal(taskBody.redirect, '/onboarding');
  });

  it('completes the full 5-step onboarding sequence smoothly', async () => {
    // 1. Register
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Flow User',
        email: 'flow_user@example.com',
        password: 'Password123!',
      }),
    });
    const { token } = (await regRes.json()) as any;

    // Check status
    const status1 = await fetch(`${baseUrl}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(status1.status, 200);
    const s1Body = (await status1.json()) as any;
    assert.equal(s1Body.completed, false);
    assert.equal(s1Body.step, 1);

    // Step 1 -> 2: Welcome -> Personal Profile
    const prog1 = await fetch(`${baseUrl}/onboarding/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        step: 1,
        data: { onboardingStep: 2 },
      }),
    });
    assert.equal(prog1.status, 200);
    const p1Body = (await prog1.json()) as any;
    assert.equal(p1Body.step, 2);

    // Step 2 -> 3: Personal Profile -> Priorities
    const prog2 = await fetch(`${baseUrl}/onboarding/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        step: 2,
        data: { name: 'Taylor Swift', onboardingStep: 3 },
      }),
    });
    assert.equal(prog2.status, 200);
    const p2Body = (await prog2.json()) as any;
    assert.equal(p2Body.step, 3);

    // Step 3 -> 4: Priorities -> Preferences
    const prog3 = await fetch(`${baseUrl}/onboarding/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        step: 3,
        data: { categories: ['tasks', 'bills', 'studies'], onboardingStep: 4 },
      }),
    });
    assert.equal(prog3.status, 200);
    const p3Body = (await prog3.json()) as any;
    assert.equal(p3Body.step, 4);

    // Step 4 -> 5: Preferences -> Completion screen
    const prog4 = await fetch(`${baseUrl}/onboarding/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        step: 4,
        data: {
          theme: 'dark',
          notificationsEnabled: true,
          notificationTypes: { tasks: true, bills: true, appointments: true, reminders: true },
          onboardingStep: 5,
        },
      }),
    });
    assert.equal(prog4.status, 200);
    const p4Body = (await prog4.json()) as any;
    assert.equal(p4Body.step, 5);

    // Step 5: Complete onboarding
    const compRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(compRes.status, 200);
    const compBody = (await compRes.json()) as any;
    assert.equal(compBody.completed, true);

    // Verify /api/auth/me reflects all saved onboarding data
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meRes.status, 200);
    const meBody = (await meRes.json()) as any;
    assert.equal(meBody.user.name, 'Taylor Swift');
    assert.deepEqual(meBody.user.categories, ['tasks', 'bills', 'studies']);
    assert.equal(meBody.user.theme, 'dark');
    assert.equal(meBody.user.onboardingCompleted, true);
    assert.equal(meBody.user.onboardingStep, 5);

    // Verify protected route is now unlocked
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(taskRes.status, 200);
  });

  it('allows skip setup to complete onboarding and unlock dashboard', async () => {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Skipper',
        email: 'skip_user@example.com',
        password: 'Password123!',
      }),
    });
    const { token } = (await regRes.json()) as any;

    // Skip directly by calling complete
    const skipRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(skipRes.status, 200);
    const skipBody = (await skipRes.json()) as any;
    assert.equal(skipBody.completed, true);

    // Verify user is unlocked
    const statusRes = await fetch(`${baseUrl}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusBody = (await statusRes.json()) as any;
    assert.equal(statusBody.completed, true);
  });
});
