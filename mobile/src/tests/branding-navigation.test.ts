/**
 * Regression Tests for LifeAdmin Mobile Visual Identity & Navigation Polish
 * Verifies valid iOS SF Symbols & Android Material Symbols across Bottom Tabs and More menu,
 * active/inactive & Light/Dark Ocean Teal theme wiring, splash/app branding asset integrity,
 * and removal of unused Expo Starter route & starter assets.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Colors } from '../constants/colors';

const MOBILE_ROOT = path.resolve(__dirname, '../..');
const ANDROID_SYMBOLS_PATH = path.join(MOBILE_ROOT, 'node_modules/expo-symbols/src/android/symbols.json');
const SF_SYMBOLS_DTS_PATH = path.join(MOBILE_ROOT, 'node_modules/sf-symbols-typescript/dist/index.d.ts');

const androidSymbols: Record<string, number> = JSON.parse(
  fs.readFileSync(ANDROID_SYMBOLS_PATH, 'utf8'),
);
const sfSymbolsText = fs.readFileSync(SF_SYMBOLS_DTS_PATH, 'utf8');

function hasSfSymbol(name: string): boolean {
  return sfSymbolsText.includes(`'${name}'`) || sfSymbolsText.includes(`"${name}"`);
}

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

function walkSourceFiles(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, results);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Bottom Navigation Icons & Theme Integrity (app-tabs.tsx)', () => {
  const appTabsSource = readMobileFile('src/components/app-tabs.tsx');

  it('defines distinct route names and zero references to explore or starter tabIcons PNGs', () => {
    for (const route of ['index', 'tasks', 'calendar', 'bills', 'more']) {
      assert.match(appTabsSource, new RegExp(`<NativeTabs\\.Trigger\\s+name="${route}"`));
    }
    assert.ok(!appTabsSource.includes('explore.png'), 'app-tabs.tsx must not reuse explore.png');
    assert.ok(!appTabsSource.includes('tabIcons/'), 'app-tabs.tsx should not reference starter tabIcons PNGs');
  });

  it('uses distinct, valid Android Material Symbols and iOS SF Symbols across all 5 tabs', () => {
    const mdMatches = [...appTabsSource.matchAll(/md="([a-z0-9_]+)"/g)].map((m) => m[1]);
    assert.equal(mdMatches.length, 5, 'Expected 5 Android tab symbol names');
    assert.equal(new Set(mdMatches).size, 5, 'All 5 Android tab icons must be distinct');
    for (const mdName of mdMatches) {
      assert.ok(mdName in androidSymbols, `Invalid Android Material Symbol: ${mdName}`);
    }

    const sfSymbolsUsed: string[] = [];
    const sfDefaultSelected = [...appTabsSource.matchAll(/sf=\{\{\s*default:\s*'([^']+)',\s*selected:\s*'([^']+)'\s*\}\}/g)];
    for (const match of sfDefaultSelected) {
      sfSymbolsUsed.push(match[1], match[2]);
    }
    const sfSimple = [...appTabsSource.matchAll(/sf="([^"]+)"/g)].map((m) => m[1]);
    sfSymbolsUsed.push(...sfSimple);

    const expectedDefaults = sfDefaultSelected.map((m) => m[1]).concat(sfSimple);
    assert.equal(expectedDefaults.length, 5, 'Expected 5 iOS tab default symbol names');
    assert.equal(new Set(expectedDefaults).size, 5, 'All 5 iOS tab icons must be distinct');
    for (const sfName of sfSymbolsUsed) {
      assert.ok(hasSfSymbol(sfName), `Invalid SF Symbol: ${sfName}`);
    }
  });

  it('preserves Ocean Teal & Deep Ocean active/inactive styling tokens', () => {
    assert.ok(appTabsSource.includes('isDark ? colors.surfaceSecondary : colors.surface'));
    assert.ok(appTabsSource.includes('indicatorColor={colors.primarySoft}'));
    assert.ok(appTabsSource.includes('default: colors.textMuted'));
    assert.ok(appTabsSource.includes('selected: colors.primary'));
  });
});

describe('More Screen Icons & Grouping (more.tsx)', () => {
  const moreSource = readMobileFile('src/app/(tabs)/more.tsx');

  it('replaces circle.fill placeholder and unsafe any cast with typed individual symbols', () => {
    assert.ok(!moreSource.includes('circle.fill'), 'more.tsx must not render circle.fill placeholder');
    assert.ok(
      !/<SymbolView[\s\S]*?as any/.test(moreSource),
      'more.tsx SymbolView icon mapping should be strictly typed without `as any`',
    );
  });

  it('uses distinct valid iOS SF Symbols and Android Material Symbols for every menu item', () => {
    const iosMatches = [
      ...moreSource.matchAll(/iosIcon:\s*(?:isDark\s*\?\s*'([^']+)'\s*:\s*'([^']+)'|'([^']+)')/g),
    ].flatMap((m) => [m[1], m[2], m[3]].filter(Boolean));
    assert.ok(iosMatches.length >= 9, 'Expected iOS symbols for all 8 navigable items plus Appearance');
    for (const sf of iosMatches) {
      assert.ok(hasSfSymbol(sf), `Invalid SF Symbol in more.tsx: ${sf}`);
    }
    assert.equal(new Set(iosMatches).size, iosMatches.length, 'Every More row should have a unique SF Symbol');

    const mdMatches = [
      ...moreSource.matchAll(/^\s*icon:\s*(?:isDark\s*\?\s*'([^']+)'\s*:\s*'([^']+)'|'([^']+)')/gm),
    ].flatMap((m) => [m[1], m[2], m[3]].filter(Boolean));
    assert.ok(mdMatches.length >= 9, 'Expected Android symbols for all More menu rows');
    for (const md of mdMatches) {
      assert.ok(md in androidSymbols, `Invalid Android symbol in more.tsx: ${md}`);
    }
    assert.equal(new Set(mdMatches).size, mdMatches.length, 'Every More row should have a unique Android icon');
  });

  it('preserves existing menu items and navigation groups', () => {
    for (const label of [
      'LifeBuddy Companions',
      'AI Assistant',
      'Appointments',
      'Documents Vault',
      'Reminders Timeline',
      'Settings & Profile',
      'Appearance',
      'Setup & Onboarding',
      'Privacy, Export & Security',
    ]) {
      assert.ok(moreSource.includes(label), `Missing menu item: ${label}`);
    }
  });
});

describe('Splash Screen, App Branding & Theme Coherence', () => {
  const appJson = JSON.parse(readMobileFile('app.json'));
  const animatedIcon = readMobileFile('src/components/animated-icon.tsx');
  const animatedIconWeb = readMobileFile('src/components/animated-icon.web.tsx');
  const animatedCss = readMobileFile('src/components/animated-icon.module.css');
  const appTabsWeb = readMobileFile('src/components/app-tabs.web.tsx');

  it('removes Expo starter blue colors and expo.icon reference from app.json', () => {
    const raw = JSON.stringify(appJson);
    for (const starterHex of ['#208AEF', '#E6F4FE', '#3C9FFE', '#0274DF']) {
      assert.ok(!raw.toUpperCase().includes(starterHex), `app.json still contains starter color ${starterHex}`);
    }
    assert.notEqual(appJson.expo.ios.icon, './assets/expo.icon');
    assert.equal(appJson.expo.ios.icon, './assets/images/icon.png');
    assert.equal(appJson.expo.android.adaptiveIcon.backgroundColor, Colors.light.primary);
  });

  it('configures Ocean Teal light and Deep Ocean dark splash screens in app.json', () => {
    const splashPlugin = appJson.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen',
    );
    assert.ok(splashPlugin, 'expo-splash-screen plugin missing');
    const cfg = splashPlugin[1];
    assert.equal(cfg.backgroundColor, Colors.light.background);
    assert.equal(cfg.image, './assets/images/splash-icon.png');
    assert.equal(cfg.dark?.backgroundColor, Colors.dark.background);
    assert.equal(cfg.dark?.image, './assets/images/splash-icon-dark.png');
  });

  it('verifies all configured app icon and splash PNG assets exist on disk as valid PNGs', () => {
    const splashPlugin = appJson.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen',
    )[1];
    const notifPlugin = appJson.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications',
    )[1];

    const requiredImages = [
      appJson.expo.icon,
      appJson.expo.ios.icon,
      appJson.expo.android.adaptiveIcon.foregroundImage,
      appJson.expo.android.adaptiveIcon.backgroundImage,
      appJson.expo.android.adaptiveIcon.monochromeImage,
      appJson.expo.web.favicon,
      splashPlugin.image,
      splashPlugin.dark.image,
      notifPlugin.icon,
    ];

    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const rel of requiredImages) {
      const fullPath = path.join(MOBILE_ROOT, rel);
      assert.ok(fs.existsSync(fullPath), `Missing image asset: ${rel}`);
      const bytes = fs.readFileSync(fullPath);
      assert.ok(bytes.length > 200, `Unexpectedly small PNG asset: ${rel}`);
      assert.ok(bytes.subarray(0, 8).equals(PNG_MAGIC), `Invalid PNG signature for ${rel}`);
    }
  });

  it('updates AnimatedSplashOverlay, AnimatedIcon, and web tabs to Ocean Teal & Deep Ocean themes', () => {
    for (const content of [animatedIcon, animatedIconWeb, animatedCss, appTabsWeb]) {
      for (const forbidden of ['#208AEF', '#3C9FFE', '#0274DF', 'expo-logo.png', 'logo-glow.png', 'Expo Starter']) {
        assert.ok(
          !content.toLowerCase().includes(forbidden.toLowerCase()),
          `Unexpected starter branding token "${forbidden}" found`,
        );
      }
    }
    assert.ok(animatedIcon.includes('useAppTheme()'), 'AnimatedSplashOverlay must adapt to light/dark themes');
    assert.ok(animatedIcon.includes('splash-icon-dark.png'));
    assert.ok(animatedIcon.includes('splash-icon.png'));
    assert.ok(appTabsWeb.includes('LifeAdmin'));
  });
});

describe('Unused Expo Starter Route & Asset Cleanup', () => {
  it('removes unused explore.tsx route and orphaned starter assets with zero dangling imports', () => {
    assert.ok(!fs.existsSync(path.join(MOBILE_ROOT, 'src/app/explore.tsx')));
    assert.ok(!fs.existsSync(path.join(MOBILE_ROOT, 'assets/expo.icon')));
    assert.ok(!fs.existsSync(path.join(MOBILE_ROOT, 'assets/images/tabIcons/explore.png')));
    assert.ok(!fs.existsSync(path.join(MOBILE_ROOT, 'assets/images/expo-logo.png')));
    assert.ok(!fs.existsSync(path.join(MOBILE_ROOT, 'assets/images/logo-glow.png')));

    const srcFiles = walkSourceFiles(path.join(MOBILE_ROOT, 'src')).filter(
      (f) => !f.endsWith('branding-navigation.test.ts'),
    );
    const forbiddenRefs = [
      'tabIcons/explore',
      'expo-logo.png',
      'logo-glow.png',
      'tutorial-web.png',
      'react-logo.png',
      "'/explore'",
      '"/explore"',
    ];
    for (const file of srcFiles) {
      const text = fs.readFileSync(file, 'utf8');
      for (const ref of forbiddenRefs) {
        assert.ok(!text.includes(ref), `Dangling starter reference "${ref}" found in ${path.relative(MOBILE_ROOT, file)}`);
      }
    }
  });
});

