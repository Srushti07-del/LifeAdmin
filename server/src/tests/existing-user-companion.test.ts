/**
 * Existing-User Mongoose Defaults & Migration Verification Test
 * Uses MongoMemoryServer to test raw un-migrated MongoDB user documents
 * that lack the companion field completely.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import { generateToken } from '../middleware/auth';

describe('Existing-User Mongoose Defaults & Companion Migration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let server: http.Server;
  let baseUrl: string;
  let legacyUserId: string;
  let legacyToken: string;

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

    // Insert an existing legacy user directly via the raw MongoDB driver,
    // ensuring NO companion field exists in the document storage.
    const result = await mongoose.connection.collection('users').insertOne({
      name: 'Legacy User',
      email: 'legacy.user@example.com',
      authProvider: 'local',
      theme: 'system',
      notificationsEnabled: true,
      defaultReminderTiming: [7, 3, 1, 0],
      categories: ['Personal', 'Work', 'Finance'],
      aiPreferences: { autoExtract: true, suggestionsEnabled: true },
      preferredCurrency: 'INR',
      subscriptionTier: 'free',
      isDemo: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });

    legacyUserId = result.insertedId.toString();
    legacyToken = generateToken(legacyUserId);
  });

  after(async () => {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('verifies the raw MongoDB document contains no companion field in storage', async () => {
    const raw = await mongoose.connection.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(legacyUserId),
    });

    assert.ok(raw, 'Raw document must exist');
    assert.strictEqual(raw.companion, undefined, 'Raw document must have no companion field');
    assert.strictEqual(raw.name, 'Legacy User');
    assert.strictEqual(raw.email, 'legacy.user@example.com');
  });

  it('hydrates legacy document with default companion without producing undefined', async () => {
    const hydratedUser = await User.findById(legacyUserId);

    assert.ok(hydratedUser, 'User must be found by Mongoose');
    assert.ok(hydratedUser.companion, 'Hydrated user must have companion defined');
    assert.strictEqual(hydratedUser.companion.activeId, 'aura');
    assert.strictEqual(hydratedUser.companion.customName, 'Aura');
    assert.strictEqual(hydratedUser.companion.xp, 150);
    assert.strictEqual(hydratedUser.companion.level, 1);
    assert.strictEqual(hydratedUser.companion.growthStage, 'Sprout');
    assert.strictEqual(hydratedUser.companion.streakDays, 1);

    // Verify existing user data is completely preserved
    assert.strictEqual(hydratedUser.name, 'Legacy User');
    assert.strictEqual(hydratedUser.email, 'legacy.user@example.com');
    assert.strictEqual(hydratedUser.preferredCurrency, 'INR');
  });

  it('returns valid companion state via GET /api/auth/me for legacy user', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${legacyToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.ok(data.user, 'Must return user');
    assert.ok(data.user.companion, 'Must return companion');
    assert.strictEqual(data.user.companion.activeId, 'aura');
    assert.strictEqual(data.user.companion.customName, 'Aura');
    assert.strictEqual(data.user.name, 'Legacy User');
  });

  it('updates companion without overwriting existing unrelated user fields', async () => {
    const res = await fetch(`${baseUrl}/users/companion`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${legacyToken}`,
      },
      body: JSON.stringify({
        activeId: 'mossy',
        customName: 'ForestBuddy',
        xp: 400,
        level: 3,
        growthStage: 'Bloom',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.companion.activeId, 'mossy');
    assert.strictEqual(data.companion.customName, 'ForestBuddy');
    assert.strictEqual(data.companion.xp, 400);
    assert.strictEqual(data.companion.level, 3);
    assert.strictEqual(data.companion.growthStage, 'Bloom');

    // Re-query database to verify unrelated fields are preserved
    const reloaded = await User.findById(legacyUserId);
    assert.ok(reloaded);
    assert.strictEqual(reloaded.name, 'Legacy User');
    assert.strictEqual(reloaded.email, 'legacy.user@example.com');
    assert.strictEqual(reloaded.preferredCurrency, 'INR');
    assert.deepStrictEqual(reloaded.categories, ['Personal', 'Work', 'Finance']);
  });

  it('preserves companion state when updating other settings via PUT /api/users/settings', async () => {
    const res = await fetch(`${baseUrl}/users/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${legacyToken}`,
      },
      body: JSON.stringify({
        theme: 'dark',
        preferredCurrency: 'USD',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    assert.strictEqual(data.user.theme, 'dark');
    assert.strictEqual(data.user.preferredCurrency, 'USD');

    // Verify companion was NOT reset or overwritten
    assert.strictEqual(data.user.companion.activeId, 'mossy');
    assert.strictEqual(data.user.companion.customName, 'ForestBuddy');
    assert.strictEqual(data.user.companion.xp, 400);
    assert.strictEqual(data.user.companion.level, 3);
  });

  it('guarantees monotonic XP protection when a stale client attempts an update', async () => {
    const res = await fetch(`${baseUrl}/users/companion`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${legacyToken}`,
      },
      body: JSON.stringify({
        customName: 'ForestBuddy Renamed',
        xp: 100, // Stale client value, lower than current 400
        level: 1, // Stale client value, lower than current 3
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as any;

    // Custom name was updated
    assert.strictEqual(data.companion.customName, 'ForestBuddy Renamed');
    // XP and level were protected against regression
    assert.strictEqual(data.companion.xp, 400);
    assert.strictEqual(data.companion.level, 3);
    assert.strictEqual(data.companion.growthStage, 'Bloom');
  });

  describe('Growth Stage Consistency & Anti-Desynchronization Tests', () => {
    it('corrects Level 5 with Sprout submitted to Bloom', async () => {
      const res = await fetch(`${baseUrl}/users/companion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          level: 5,
          xp: 850,
          growthStage: 'Sprout', // Inconsistent with Level 5
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.companion.level, 5);
      assert.strictEqual(data.companion.growthStage, 'Bloom');
    });

    it('corrects Level 6 with Bloom submitted to Ascended', async () => {
      const res = await fetch(`${baseUrl}/users/companion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          level: 6,
          xp: 1100,
          growthStage: 'Bloom', // Inconsistent with Level 6
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.companion.level, 6);
      assert.strictEqual(data.companion.growthStage, 'Ascended');
    });

    it('corrects Level 10 with Ascended submitted to Luminary', async () => {
      const res = await fetch(`${baseUrl}/users/companion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          level: 10,
          xp: 2000,
          growthStage: 'Ascended', // Inconsistent with Level 10
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.companion.level, 10);
      assert.strictEqual(data.companion.growthStage, 'Luminary');
    });

    it('handles a valid progression update via PUT /api/users/settings', async () => {
      const res = await fetch(`${baseUrl}/users/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          companion: {
            level: 11,
            xp: 2200,
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.user.companion.level, 11);
      assert.strictEqual(data.user.companion.xp, 2200);
      assert.strictEqual(data.user.companion.growthStage, 'Luminary');
    });

    it('preserves level, XP and growth stage on rename-only update', async () => {
      const res = await fetch(`${baseUrl}/users/companion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          customName: 'Luminescent Aura',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      assert.strictEqual(data.companion.customName, 'Luminescent Aura');
      assert.strictEqual(data.companion.level, 11);
      assert.strictEqual(data.companion.xp, 2200);
      assert.strictEqual(data.companion.growthStage, 'Luminary');
    });

    it('prevents stale update from regressing Level 11 Luminary back to Level 2 Sprout', async () => {
      const res = await fetch(`${baseUrl}/users/companion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          level: 2,
          xp: 200,
          growthStage: 'Sprout',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as any;
      // Protected against regression
      assert.strictEqual(data.companion.level, 11);
      assert.strictEqual(data.companion.xp, 2200);
      assert.strictEqual(data.companion.growthStage, 'Luminary');
    });
  });
});

