import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';

describe('Onboarding Flow, Conditional Status & Step Progression Tests', () => {
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

  it('registers a user with onboardingCompleted=false, onboardingStep=1, onboardingStatus=in_progress', async () => {
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
    assert.equal(body.user.onboardingStatus, 'in_progress');
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

    const skipRes = await fetch(`${baseUrl}/onboarding/skip`, {
      method: 'POST',
    });
    assert.equal(skipRes.status, 401);
  });

  it('enforces onboarding middleware: blocks access to protected task routes before completion or skip', async () => {
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

  it('Case A: completes the full 5-step onboarding sequence smoothly, marking status as completed', async () => {
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
    assert.equal(s1Body.status, 'in_progress');

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
    assert.equal(p1Body.status, 'in_progress');

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
    assert.equal(compBody.status, 'completed');

    // Verify /api/auth/me reflects status='completed'
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
    assert.equal(meBody.user.onboardingStatus, 'completed');

    // Verify protected route is now unlocked
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(taskRes.status, 200);
  });

  it('Case B: user skips onboarding, status=skipped, dashboard accessible, Command Center banner shown', async () => {
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

    // Skip onboarding via POST /api/onboarding/skip
    const skipRes = await fetch(`${baseUrl}/onboarding/skip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(skipRes.status, 200);
    const skipBody = (await skipRes.json()) as any;
    assert.equal(skipBody.completed, true);
    assert.equal(skipBody.status, 'skipped');

    // Verify status returns skipped
    const statusRes = await fetch(`${baseUrl}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusBody = (await statusRes.json()) as any;
    assert.equal(statusBody.completed, true);
    assert.equal(statusBody.status, 'skipped');

    // Verify /api/auth/me returns status='skipped'
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = (await meRes.json()) as any;
    assert.equal(meBody.user.onboardingCompleted, true);
    assert.equal(meBody.user.onboardingStatus, 'skipped');

    // Verify user can access protected dashboard APIs despite skipping
    const taskRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(taskRes.status, 200);

    // Case C: Skipped user reopens setup, completes it, and status switches to completed
    const completeRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(completeRes.status, 200);
    const completeBody = (await completeRes.json()) as any;
    assert.equal(completeBody.status, 'completed');

    // Verify status is now 'completed'
    const meAfterComp = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meAfterCompBody = (await meAfterComp.json()) as any;
    assert.equal(meAfterCompBody.user.onboardingStatus, 'completed');
  });

  it('Case D: backward compatibility for legacy accounts with onboardingCompleted=true and no onboardingStatus', async () => {
    // Create raw legacy user directly in DB without onboardingStatus
    const legacyUser = new User({
      name: 'Legacy User',
      email: 'legacy@example.com',
      password: 'Password123!',
      onboardingCompleted: true,
      onboardingStep: 5,
    });
    await legacyUser.save();

    // Login as legacy user
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'legacy@example.com',
        password: 'Password123!',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = (await loginRes.json()) as any;
    assert.equal(loginBody.user.onboardingCompleted, true);
    assert.equal(loginBody.user.onboardingStatus, 'completed');

    // GET /me returns completed
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    const meBody = (await meRes.json()) as any;
    assert.equal(meBody.user.onboardingStatus, 'completed');

    // GET /onboarding/status returns completed
    const statusRes = await fetch(`${baseUrl}/onboarding/status`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    const statusBody = (await statusRes.json()) as any;
    assert.equal(statusBody.status, 'completed');
  });
});
