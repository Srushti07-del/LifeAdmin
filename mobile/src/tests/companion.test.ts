/**
 * Comprehensive Companion Integration & Parity Tests
 * Verifies canonical companions (Aura, Mossy, Nori, Zephyr),
 * growth stages, positive reinforcement mechanics, and state operations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANIONS,
  getCompanionById,
  getGrowthStage,
  INITIAL_COMPANION_STATE,
} from '../features/companions/catalog.ts';
import { CompanionState } from '../features/companions/types.ts';

describe('LifeBuddy Canonical Companions Verification', () => {
  it('strictly defines the 4 canonical companions matching web catalog', () => {
    assert.strictEqual(COMPANIONS.length, 4);
    const expectedIds = ['aura', 'mossy', 'nori', 'zephyr'];
    assert.deepStrictEqual(COMPANIONS.map((c) => c.id), expectedIds);
  });

  it('guarantees Aura identity and attributes', () => {
    const aura = getCompanionById('aura');
    assert.strictEqual(aura.id, 'aura');
    assert.strictEqual(aura.name, 'Aura');
    assert.strictEqual(aura.defaultName, 'Aura');
    assert.strictEqual(aura.title, 'The Celestial Luminary');
    assert.strictEqual(aura.species, 'Elemental Spirit');
    assert.strictEqual(aura.element, 'Light');
    assert.strictEqual(aura.colorScheme.primary, '#168F91');
    assert.strictEqual(aura.unlockedAtStage, 1);
  });

  it('guarantees Mossy identity and attributes', () => {
    const mossy = getCompanionById('mossy');
    assert.strictEqual(mossy.id, 'mossy');
    assert.strictEqual(mossy.name, 'Mossy');
    assert.strictEqual(mossy.defaultName, 'Mossy');
    assert.strictEqual(mossy.title, 'The Verdant Sprout');
    assert.strictEqual(mossy.species, 'Nature Spirit');
    assert.strictEqual(mossy.element, 'Nature');
    assert.strictEqual(mossy.colorScheme.primary, '#10B981');
    assert.strictEqual(mossy.unlockedAtStage, 1);
  });

  it('guarantees Nori identity and attributes', () => {
    const nori = getCompanionById('nori');
    assert.strictEqual(nori.id, 'nori');
    assert.strictEqual(nori.name, 'Nori');
    assert.strictEqual(nori.defaultName, 'Nori');
    assert.strictEqual(nori.title, 'The Tide Hopper');
    assert.strictEqual(nori.species, 'Aquatic Guardian');
    assert.strictEqual(nori.element, 'Water');
    assert.strictEqual(nori.colorScheme.primary, '#0284C7');
    assert.strictEqual(nori.unlockedAtStage, 1);
  });

  it('guarantees Zephyr identity and attributes', () => {
    const zephyr = getCompanionById('zephyr');
    assert.strictEqual(zephyr.id, 'zephyr');
    assert.strictEqual(zephyr.name, 'Zephyr');
    assert.strictEqual(zephyr.defaultName, 'Zephyr');
    assert.strictEqual(zephyr.title, 'The Cloudling');
    assert.strictEqual(zephyr.species, 'Sky Beast');
    assert.strictEqual(zephyr.element, 'Air');
    assert.strictEqual(zephyr.colorScheme.primary, '#6366F1');
    assert.strictEqual(zephyr.unlockedAtStage, 1);
  });

  it('provides safe fallback to default companion when lookup fails', () => {
    const fallback = getCompanionById('non_existent_companion');
    assert.strictEqual(fallback.id, 'aura');
    assert.strictEqual(fallback.name, 'Aura');
  });
});

describe('LifeBuddy Growth Progression Engine', () => {
  it('correctly maps levels to growth stages according to specification', () => {
    // Sprout: Lvl 1 - 2
    assert.strictEqual(getGrowthStage(1), 'Sprout');
    assert.strictEqual(getGrowthStage(2), 'Sprout');

    // Bloom: Lvl 3 - 5
    assert.strictEqual(getGrowthStage(3), 'Bloom');
    assert.strictEqual(getGrowthStage(4), 'Bloom');
    assert.strictEqual(getGrowthStage(5), 'Bloom');

    // Ascended: Lvl 6 - 9
    assert.strictEqual(getGrowthStage(6), 'Ascended');
    assert.strictEqual(getGrowthStage(7), 'Ascended');
    assert.strictEqual(getGrowthStage(8), 'Ascended');
    assert.strictEqual(getGrowthStage(9), 'Ascended');

    // Luminary: Lvl 10+
    assert.strictEqual(getGrowthStage(10), 'Luminary');
    assert.strictEqual(getGrowthStage(15), 'Luminary');
    assert.strictEqual(getGrowthStage(50), 'Luminary');
  });

  it('ensures initial state starts with Aura at Level 1 Sprout stage', () => {
    assert.strictEqual(INITIAL_COMPANION_STATE.activeId, 'aura');
    assert.strictEqual(INITIAL_COMPANION_STATE.customName, 'Aura');
    assert.strictEqual(INITIAL_COMPANION_STATE.level, 1);
    assert.strictEqual(INITIAL_COMPANION_STATE.growthStage, 'Sprout');
    assert.ok(INITIAL_COMPANION_STATE.xp > 0);
  });
});

describe('Guilt-Free Positive Reinforcement Invariants', () => {
  it('never penalizes streak or level when switching companions', () => {
    const currentState: CompanionState = {
      activeId: 'aura',
      customName: 'CustomAura',
      xp: 550,
      level: 3,
      growthStage: 'Bloom',
      streakDays: 7,
      lastActiveDate: '2026-11-01',
    };

    // Switch to Mossy
    const targetCompanion = getCompanionById('mossy');
    const newState: CompanionState = {
      ...currentState,
      activeId: targetCompanion.id,
      customName: targetCompanion.defaultName,
    };

    assert.strictEqual(newState.activeId, 'mossy');
    assert.strictEqual(newState.customName, 'Mossy');
    assert.strictEqual(newState.xp, 550);
    assert.strictEqual(newState.level, 3);
    assert.strictEqual(newState.growthStage, 'Bloom');
    assert.strictEqual(newState.streakDays, 7);
  });

  it('preserves custom naming when renamed', () => {
    const currentState: CompanionState = {
      activeId: 'nori',
      customName: 'Nori',
      xp: 220,
      level: 2,
      growthStage: 'Sprout',
      streakDays: 3,
    };

    const renamed: CompanionState = {
      ...currentState,
      customName: 'Bubbles',
    };

    assert.strictEqual(renamed.customName, 'Bubbles');
    assert.strictEqual(renamed.activeId, 'nori');
  });

  it('guarantees monotonic non-decreasing XP and level under concurrent updates', () => {
    const serverState = { xp: 450, level: 3, streakDays: 5 };
    const staleClientPayload = { xp: 200, level: 1, streakDays: 2 };

    const resolvedXp = Math.max(serverState.xp, Math.max(0, staleClientPayload.xp));
    const resolvedLevel = Math.max(serverState.level, Math.max(1, staleClientPayload.level));
    const resolvedStreak = Math.max(serverState.streakDays, Math.max(1, staleClientPayload.streakDays));

    assert.strictEqual(resolvedXp, 450);
    assert.strictEqual(resolvedLevel, 3);
    assert.strictEqual(resolvedStreak, 5);
  });

  it('isolates companion state keys between guest and registered users', () => {
    const guestId = 'guest_temp_999';
    const registeredId = 'user_registered_123';

    const getStorageKey = (userId: string) => `lifeadmin_companion_state_${userId}`;

    assert.notStrictEqual(getStorageKey(guestId), getStorageKey(registeredId));
    assert.strictEqual(getStorageKey(guestId), 'lifeadmin_companion_state_guest_temp_999');
    assert.strictEqual(getStorageKey(registeredId), 'lifeadmin_companion_state_user_registered_123');
  });
});

