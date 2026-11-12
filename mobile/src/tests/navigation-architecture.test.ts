/**
 * Regression Tests for Stage 4 Milestone 1:
 * - Android predictive back enablement without breaking onboarding back handling, modals, or deep links
 * - Expo Router root <Stack> vs (tabs) route tree separation (unchanged public URLs)
 * - Tablet collapsible navigation drawer (768–1023px) & permanent side navigation rail (1024px+)
 * - Route-aware Snackbar bottom tab offset and pushed screen safe bottom insets + HeaderBackButton
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getNavigationLayoutMode,
  getSafeBottomInset,
  isPrimaryTabPathname,
  navigateBackSafely,
  shouldOffsetSnackbarForBottomTabs,
} from '../utils/navigationLayout';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

describe('Navigation Breakpoints & Snackbar/Inset Helpers', () => {
  it('classifies viewports accurately into phone-tabs, tablet-drawer, and desktop-rail', () => {
    assert.equal(getNavigationLayoutMode(360), 'phone-tabs');
    assert.equal(getNavigationLayoutMode(412), 'phone-tabs');
    assert.equal(getNavigationLayoutMode(767), 'phone-tabs');
    assert.equal(getNavigationLayoutMode(768), 'tablet-drawer');
    assert.equal(getNavigationLayoutMode(834), 'tablet-drawer');
    assert.equal(getNavigationLayoutMode(1023), 'tablet-drawer');
    assert.equal(getNavigationLayoutMode(1024), 'desktop-rail');
    assert.equal(getNavigationLayoutMode(1280), 'desktop-rail');
    assert.equal(getNavigationLayoutMode(Number.NaN), 'phone-tabs');
  });

  it('distinguishes primary tab paths from pushed secondary Stack routes', () => {
    assert.equal(isPrimaryTabPathname('/'), true);
    assert.equal(isPrimaryTabPathname('/tasks'), true);
    assert.equal(isPrimaryTabPathname('/calendar/'), true);
    assert.equal(isPrimaryTabPathname('/bills?filter=overdue'), true);
    assert.equal(isPrimaryTabPathname('/more#account'), true);

    assert.equal(isPrimaryTabPathname('/ai'), false);
    assert.equal(isPrimaryTabPathname('/appointments'), false);
    assert.equal(isPrimaryTabPathname('/documents'), false);
    assert.equal(isPrimaryTabPathname('/reminders?reminderId=abc'), false);
    assert.equal(isPrimaryTabPathname('/settings'), false);
  });

  it('applies Snackbar bottom-tab offset only on phone viewports viewing primary tabs', () => {
    assert.equal(shouldOffsetSnackbarForBottomTabs('/', 390, 'android'), true);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/tasks', 390, 'ios'), true);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/reminders?reminderId=1', 390, 'android'), false);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/ai', 390, 'android'), false);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/documents', 390, 'android'), false);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/', 800, 'android'), false);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/', 1100, 'android'), false);
    assert.equal(shouldOffsetSnackbarForBottomTabs('/', 390, 'web'), false);
  });

  it('computes safe bottom scroll insets across phones, tablets, and pushed Stack screens', () => {
    assert.equal(
      getSafeBottomInset({
        insetsBottom: 24,
        extraSpacing: 24,
        windowWidth: 390,
        isTabScreen: true,
        bottomTabInset: 80,
        platformOS: 'android',
      }),
      104,
    );

    // Tablet drawer/rail and pushed screens should use safe-area bottom inset rather than tab-bar inset
    assert.equal(
      getSafeBottomInset({
        insetsBottom: 16,
        extraSpacing: 24,
        windowWidth: 800,
        isTabScreen: true,
        bottomTabInset: 80,
        platformOS: 'android',
      }),
      40,
    );

    assert.equal(
      getSafeBottomInset({
        insetsBottom: 16,
        extraSpacing: 24,
        windowWidth: 390,
        isTabScreen: false,
        bottomTabInset: 80,
        platformOS: 'android',
      }),
      40,
    );
  });

  it('navigates back safely when Stack history exists and falls back cleanly on deep links', () => {
    let backed = false;
    let replacedWith: string | null = null;

    navigateBackSafely(
      {
        canGoBack: () => true,
        back: () => {
          backed = true;
        },
        replace: (href) => {
          replacedWith = String(href);
        },
      },
      '/more',
    );
    assert.equal(backed, true);
    assert.equal(replacedWith, null);

    backed = false;
    navigateBackSafely(
      {
        canGoBack: () => false,
        back: () => {
          backed = true;
        },
        replace: (href) => {
          replacedWith = String(href);
        },
      },
      '/more',
    );
    assert.equal(backed, false);
    assert.equal(replacedWith, '/more');
  });
});

describe('Stage 4 Milestone 1 — Stack/Tabs Separation, Predictive Back & Adaptive Shell', () => {
  it('enables Android predictiveBackGestureEnabled in app.json', () => {
    const appJson = JSON.parse(readMobileFile('app.json'));
    assert.equal(appJson.expo.android.predictiveBackGestureEnabled, true);
  });

  it('separates primary tabs into src/app/(tabs)/ while preserving secondary Stack routes in src/app/', () => {
    for (const tabFile of ['_layout.tsx', 'index.tsx', 'tasks.tsx', 'calendar.tsx', 'bills.tsx', 'more.tsx']) {
      assert.ok(
        fs.existsSync(path.join(MOBILE_ROOT, 'src/app/(tabs)', tabFile)),
        `Missing primary tab route file: src/app/(tabs)/${tabFile}`,
      );
      if (tabFile !== '_layout.tsx') {
        assert.ok(
          !fs.existsSync(path.join(MOBILE_ROOT, 'src/app', tabFile)),
          `Duplicate root-level tab route remains at src/app/${tabFile}`,
        );
      }
    }

    for (const pushedRoute of ['ai.tsx', 'appointments.tsx', 'documents.tsx', 'reminders.tsx', 'settings.tsx']) {
      assert.ok(
        fs.existsSync(path.join(MOBILE_ROOT, 'src/app', pushedRoute)),
        `Missing pushed Stack screen: src/app/${pushedRoute}`,
      );
    }

    const tabsLayout = readMobileFile('src/app/(tabs)/_layout.tsx');
    assert.ok(tabsLayout.includes('<AppTabs />'));

    const rootLayout = readMobileFile('src/app/_layout.tsx');
    assert.match(rootLayout, /unstable_settings\s*=\s*\{[\s\S]*anchor:\s*'\(tabs\)'/);
    assert.match(rootLayout, /<Stack\b/);
    assert.match(rootLayout, /<Stack\.Screen\s+name="\(tabs\)"/);
    for (const pushedName of ['ai', 'appointments', 'documents', 'reminders', 'settings']) {
      assert.match(rootLayout, new RegExp(`<Stack\\.Screen\\s+name="${pushedName}"`));
    }
    assert.ok(rootLayout.includes('shouldOffsetSnackbarForBottomTabs'));
    assert.ok(rootLayout.includes('OnboardingScreen'));
    assert.ok(rootLayout.includes('/reminders?reminderId='));
  });

  it('preserves NativeTabs on phones and delegates 768px+ layouts to AdaptiveTabShell', () => {
    const appTabs = readMobileFile('src/components/app-tabs.tsx');
    assert.ok(appTabs.includes('getNavigationLayoutMode'));
    assert.ok(appTabs.includes('<AdaptiveTabShell layoutMode={layoutMode} />'));
    assert.ok(appTabs.includes('<NativeTabs'));

    const adaptiveShell = readMobileFile('src/components/AdaptiveTabShell.tsx');
    assert.ok(adaptiveShell.includes("layoutMode === 'tablet-drawer'"));
    assert.ok(adaptiveShell.includes('BackHandler.addEventListener'));
    assert.ok(adaptiveShell.includes('Expand navigation drawer'));
    assert.ok(adaptiveShell.includes('Collapse navigation drawer'));
    assert.ok(adaptiveShell.includes('colors.surfaceSecondary'));
    assert.ok(adaptiveShell.includes('colors.primarySoft'));
  });

  it('equips every pushed secondary Stack screen with HeaderBackButton and removes BottomTabInset gaps', () => {
    for (const screen of ['documents.tsx', 'appointments.tsx', 'reminders.tsx', 'ai.tsx', 'settings.tsx']) {
      const content = readMobileFile(`src/app/${screen}`);
      assert.ok(content.includes('<HeaderBackButton'), `${screen} must render HeaderBackButton`);
      assert.ok(!content.includes('BottomTabInset'), `${screen} should use safe-area bottom inset rather than BottomTabInset`);
    }
  });
});
