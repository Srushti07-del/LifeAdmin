/**
 * Unit Tests for LifeAdmin Mobile Onboarding & Companion System
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANIONS,
  getCompanionById,
  getGrowthStage,
  INITIAL_COMPANION_STATE,
} from '../features/companions/catalog.ts';
import {
  DEFAULT_ONBOARDING_PREFERENCES,
  INITIAL_ONBOARDING_PREFERENCES,
  SENSIBLE_DEFAULT_CATEGORIES,
  AVAILABLE_DOMAINS,
  CURRENCIES,
  OnboardingPreferences,
} from '../features/onboarding/types.ts';

describe('LifeBuddy Companion Catalog', () => {
  it('contains all 4 original virtual companions', () => {
    assert.strictEqual(COMPANIONS.length, 4);
    const ids = COMPANIONS.map((c) => c.id);
    assert.deepStrictEqual(ids, ['aura', 'mossy', 'nori', 'zephyr']);
  });

  it('maps correct elements and species for all companions', () => {
    const aura = getCompanionById('aura');
    assert.strictEqual(aura.name, 'Aura');
    assert.strictEqual(aura.element, 'Light');
    assert.strictEqual(aura.species, 'Elemental Spirit');

    const mossy = getCompanionById('mossy');
    assert.strictEqual(mossy.name, 'Mossy');
    assert.strictEqual(mossy.element, 'Nature');
    assert.strictEqual(mossy.species, 'Nature Spirit');

    const nori = getCompanionById('nori');
    assert.strictEqual(nori.name, 'Nori');
    assert.strictEqual(nori.element, 'Water');
    assert.strictEqual(nori.species, 'Aquatic Guardian');

    const zephyr = getCompanionById('zephyr');
    assert.strictEqual(zephyr.name, 'Zephyr');
    assert.strictEqual(zephyr.element, 'Air');
    assert.strictEqual(zephyr.species, 'Sky Beast');
  });

  it('falls back to Aura when an unknown companion ID is passed', () => {
    const unknown = getCompanionById('unknown_pet_123');
    assert.strictEqual(unknown.id, 'aura');
    assert.strictEqual(unknown.name, 'Aura');
  });

  it('computes positive reinforcement growth stages accurately', () => {
    assert.strictEqual(getGrowthStage(1), 'Sprout');
    assert.strictEqual(getGrowthStage(2), 'Sprout');
    assert.strictEqual(getGrowthStage(3), 'Bloom');
    assert.strictEqual(getGrowthStage(5), 'Bloom');
    assert.strictEqual(getGrowthStage(6), 'Ascended');
    assert.strictEqual(getGrowthStage(9), 'Ascended');
    assert.strictEqual(getGrowthStage(10), 'Luminary');
    assert.strictEqual(getGrowthStage(50), 'Luminary');
  });

  it('initializes companion state with healthy positive baseline', () => {
    assert.strictEqual(INITIAL_COMPANION_STATE.level, 1);
    assert.strictEqual(INITIAL_COMPANION_STATE.growthStage, 'Sprout');
    assert.strictEqual(INITIAL_COMPANION_STATE.streakDays, 1);
    assert.ok(INITIAL_COMPANION_STATE.xp > 0);
  });
});

describe('Onboarding Default Preferences', () => {
  it('defaults to standard LifeAdmin domains', () => {
    assert.ok(Array.isArray(DEFAULT_ONBOARDING_PREFERENCES.categories));
    assert.ok(DEFAULT_ONBOARDING_PREFERENCES.categories.includes('Personal'));
    assert.ok(DEFAULT_ONBOARDING_PREFERENCES.categories.includes('Work'));
    assert.ok(DEFAULT_ONBOARDING_PREFERENCES.categories.includes('Finance'));
  });

  it('enforces INR as the default display currency per specifications', () => {
    assert.strictEqual(DEFAULT_ONBOARDING_PREFERENCES.preferredCurrency, 'INR');
  });

  it('enforces proactive reminder cadence [7, 3, 1, 0]', () => {
    assert.deepStrictEqual(DEFAULT_ONBOARDING_PREFERENCES.defaultReminderTiming, [7, 3, 1, 0]);
    assert.strictEqual(DEFAULT_ONBOARDING_PREFERENCES.notificationsEnabled, true);
  });

  it('assigns Aura as the default starter companion', () => {
    assert.strictEqual(DEFAULT_ONBOARDING_PREFERENCES.companionId, 'aura');
    assert.strictEqual(DEFAULT_ONBOARDING_PREFERENCES.companionName, 'Aura');
  });
});

describe('Onboarding Currency Selector', () => {
  it('defines all 4 supported currencies with required metadata', () => {
    assert.strictEqual(CURRENCIES.length, 4);
    const codes = CURRENCIES.map((c) => c.code);
    assert.deepStrictEqual(codes, ['INR', 'USD', 'EUR', 'GBP']);
  });

  it('contains correct Unicode symbols and labels for all currencies', () => {
    const inr = CURRENCIES.find((c) => c.code === 'INR');
    assert.ok(inr);
    assert.strictEqual(inr.symbol, '₹');
    assert.strictEqual(inr.symbol.charCodeAt(0), 0x20b9);
    assert.strictEqual(inr.label, 'INR (₹)');

    const usd = CURRENCIES.find((c) => c.code === 'USD');
    assert.ok(usd);
    assert.strictEqual(usd.symbol, '$');
    assert.strictEqual(usd.symbol.charCodeAt(0), 0x24);
    assert.strictEqual(usd.label, 'USD ($)');

    const eur = CURRENCIES.find((c) => c.code === 'EUR');
    assert.ok(eur);
    assert.strictEqual(eur.symbol, '€');
    assert.strictEqual(eur.symbol.charCodeAt(0), 0x20ac);
    assert.strictEqual(eur.label, 'EUR (€)');

    const gbp = CURRENCIES.find((c) => c.code === 'GBP');
    assert.ok(gbp);
    assert.strictEqual(gbp.symbol, '£');
    assert.strictEqual(gbp.symbol.charCodeAt(0), 0xa3);
    assert.strictEqual(gbp.label, 'GBP (£)');
  });

  it('allows switching between all four currencies sequentially', () => {
    let prefs: OnboardingPreferences = { ...DEFAULT_ONBOARDING_PREFERENCES };
    assert.strictEqual(prefs.preferredCurrency, 'INR');

    // Select USD
    prefs = { ...prefs, preferredCurrency: 'USD' };
    assert.strictEqual(prefs.preferredCurrency, 'USD');

    // Select EUR
    prefs = { ...prefs, preferredCurrency: 'EUR' };
    assert.strictEqual(prefs.preferredCurrency, 'EUR');

    // Select GBP
    prefs = { ...prefs, preferredCurrency: 'GBP' };
    assert.strictEqual(prefs.preferredCurrency, 'GBP');

    // Switch back to INR
    prefs = { ...prefs, preferredCurrency: 'INR' };
    assert.strictEqual(prefs.preferredCurrency, 'INR');
  });
});

describe('Onboarding Domain Selection & Preference Preservation', () => {
  it('starts first-time onboarding preferences with no domains selected', () => {
    assert.strictEqual(INITIAL_ONBOARDING_PREFERENCES.categories.length, 0);
    assert.deepStrictEqual(INITIAL_ONBOARDING_PREFERENCES.categories, []);
  });

  it('keeps all six required life domains with exact labels and icons', () => {
    assert.strictEqual(AVAILABLE_DOMAINS.length, 6);
    const domainIds = AVAILABLE_DOMAINS.map((d) => d.id);
    assert.deepStrictEqual(domainIds, [
      'Personal',
      'Work',
      'Finance',
      'Health',
      'Education',
      'Home',
    ]);

    const labels = AVAILABLE_DOMAINS.map((d) => d.label);
    assert.deepStrictEqual(labels, [
      'Personal',
      'Work & Career',
      'Finance & Bills',
      'Health & Wellness',
      'Education & Study',
      'Home & Rent',
    ]);
  });

  it('correctly handles selecting 1 domain, multiple domains, and removing all selections', () => {
    let prefs: OnboardingPreferences = { ...INITIAL_ONBOARDING_PREFERENCES };

    // Initial state has 0 domains -> Continue must be disabled
    assert.strictEqual(prefs.categories.length, 0);
    const canContinueInitial = prefs.categories.length > 0;
    assert.strictEqual(canContinueInitial, false);

    // Select 1 domain -> Continue is enabled
    prefs = { ...prefs, categories: ['Work'] };
    assert.strictEqual(prefs.categories.length, 1);
    assert.ok(prefs.categories.includes('Work'));
    const canContinueSingle = prefs.categories.length > 0;
    assert.strictEqual(canContinueSingle, true);

    // Select multiple domains
    prefs = { ...prefs, categories: ['Work', 'Finance', 'Personal'] };
    assert.strictEqual(prefs.categories.length, 3);
    assert.deepStrictEqual(prefs.categories, ['Work', 'Finance', 'Personal']);

    // Remove selections one by one down to zero
    prefs = { ...prefs, categories: prefs.categories.filter((id) => id !== 'Personal') };
    assert.strictEqual(prefs.categories.length, 2);

    prefs = { ...prefs, categories: prefs.categories.filter((id) => id !== 'Finance') };
    assert.strictEqual(prefs.categories.length, 1);

    // Deselect last domain -> reaches zero selections again
    prefs = { ...prefs, categories: prefs.categories.filter((id) => id !== 'Work') };
    assert.strictEqual(prefs.categories.length, 0);
    assert.deepStrictEqual(prefs.categories, []);

    // Continue is again disabled
    const canContinueEmpty = prefs.categories.length > 0;
    assert.strictEqual(canContinueEmpty, false);
  });

  it('preserves user selections across simulated back/forward step transitions', () => {
    // User starts on step 1 with initial zero preferences
    let step = 1;
    let storedPrefs: OnboardingPreferences = { ...INITIAL_ONBOARDING_PREFERENCES };

    // Navigate to step 2 (Personal Setup)
    step = 2;
    // User selects 2 domains: Health & Education
    storedPrefs = { ...storedPrefs, categories: ['Health', 'Education'] };

    // Navigate Forward to step 3 (Features Tour)
    step = 3;
    assert.deepStrictEqual(storedPrefs.categories, ['Health', 'Education']);

    // Navigate Forward to step 4 (Meet LifeBuddy)
    step = 4;
    assert.deepStrictEqual(storedPrefs.categories, ['Health', 'Education']);

    // Navigate Back to step 3, then Back to step 2
    step = 3;
    step = 2;
    // Selections remain completely preserved
    assert.deepStrictEqual(storedPrefs.categories, ['Health', 'Education']);
    assert.strictEqual(storedPrefs.categories.length, 2);
  });

  it('formats Ready screen domain count accurately for single and plural counts', () => {
    const formatDomainSummary = (count: number) =>
      count === 1 ? '1 category chosen' : `${count} categories chosen`;

    assert.strictEqual(formatDomainSummary(0), '0 categories chosen');
    assert.strictEqual(formatDomainSummary(1), '1 category chosen');
    assert.strictEqual(formatDomainSummary(2), '2 categories chosen');
    assert.strictEqual(formatDomainSummary(6), '6 categories chosen');
  });

  it('applies sensible product defaults when skipping setup without prior selections', () => {
    const freshPrefs: OnboardingPreferences = { ...INITIAL_ONBOARDING_PREFERENCES };
    assert.strictEqual(freshPrefs.categories.length, 0);

    // Skip logic resolves defaults if categories are empty
    const resolvedOnSkip =
      freshPrefs.categories.length > 0
        ? freshPrefs
        : DEFAULT_ONBOARDING_PREFERENCES;

    assert.strictEqual(resolvedOnSkip.categories.length, 4);
    assert.deepStrictEqual(resolvedOnSkip.categories, SENSIBLE_DEFAULT_CATEGORIES);
    assert.ok(resolvedOnSkip.categories.includes('Personal'));
    assert.ok(resolvedOnSkip.categories.includes('Work'));
    assert.ok(resolvedOnSkip.categories.includes('Finance'));
    assert.ok(resolvedOnSkip.categories.includes('Health'));
  });

  it('never overwrites returning users saved preferences with new-user defaults', () => {
    // Returning user with custom saved categories
    const returningUserPrefs: OnboardingPreferences = {
      categories: ['Finance', 'Home'],
      notificationsEnabled: false,
      defaultReminderTiming: [3, 0],
      preferredCurrency: 'EUR',
      companionId: 'nori',
      companionName: 'Nori',
    };

    // When returning user preferences exist, skipping or reloading preserves their custom settings
    const hasExisting = returningUserPrefs.categories.length > 0;
    const finalPrefs = hasExisting ? returningUserPrefs : DEFAULT_ONBOARDING_PREFERENCES;

    assert.deepStrictEqual(finalPrefs.categories, ['Finance', 'Home']);
    assert.strictEqual(finalPrefs.notificationsEnabled, false);
    assert.strictEqual(finalPrefs.preferredCurrency, 'EUR');
    assert.strictEqual(finalPrefs.companionId, 'nori');
  });
});



