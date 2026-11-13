/**
 * Production Readiness & Stability Unit Tests (Milestone 5.1)
 * Validates root error boundary, single splash screen lifecycle,
 * Android release configuration, and package scripts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeErrorMessage, getUserFriendlyErrorSummary } from '../utils/errorHandling';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, '../..');

describe('Milestone 5.1: Root Error Boundary & Sanitization', () => {
  it('implements +error-boundary.tsx exporting ErrorBoundary and sanitizeErrorMessage', () => {
    const errorBoundaryPath = path.join(MOBILE_ROOT, 'src/app/+error-boundary.tsx');
    assert.ok(fs.existsSync(errorBoundaryPath), '+error-boundary.tsx must exist in app root');

    const content = fs.readFileSync(errorBoundaryPath, 'utf8');
    assert.ok(content.includes('export function ErrorBoundary'), 'Must export ErrorBoundary component');
    assert.ok(content.includes('ErrorBoundaryProps'), 'Must import and use ErrorBoundaryProps from expo-router');
    assert.ok(content.includes('retry()'), 'Must wire retry action');
    assert.ok(content.includes('Return to Dashboard') || content.includes('handleReturnHome'), 'Must provide safe return home navigation');
    assert.ok(content.includes('Something Went Wrong'), 'Must provide friendly editorial heading');
  });

  it('sanitizes tokens, passwords, authorization headers, and secrets from error text', () => {
    const leakedTokenError = 'Network failure while requesting with token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz and Bearer abc123def456';
    const sanitized = sanitizeErrorMessage(leakedTokenError);

    assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Must redact raw JWT token');
    assert.ok(!sanitized.includes('abc123def456'), 'Must redact Bearer token');
    assert.ok(sanitized.includes('Bearer [REDACTED]'), 'Must replace with safe token placeholder');
    assert.ok(sanitized.includes('token=[REDACTED]'), 'Must replace query token parameter');

    const leakedPasswordError = 'Validation failed on password=super_secret_pw123 for user test@example.com';
    const sanitizedPw = sanitizeErrorMessage(leakedPasswordError);
    assert.ok(!sanitizedPw.includes('super_secret_pw123'), 'Must redact raw password');
    assert.ok(sanitizedPw.includes('password=[REDACTED]'), 'Must replace password parameter');

    const emptySanitized = sanitizeErrorMessage('');
    assert.equal(emptySanitized, 'An unexpected rendering error occurred.');
  });
});

describe('Milestone 5.1: Splash Screen Single Lifecycle', () => {
  it('mounts AnimatedSplashOverlay exactly once in _layout.tsx with isReady prop', () => {
    const layoutPath = path.join(MOBILE_ROOT, 'src/app/_layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    // Count occurrences of <AnimatedSplashOverlay in _layout.tsx
    const matches = layoutContent.match(/<AnimatedSplashOverlay\b/g);
    assert.ok(matches, 'AnimatedSplashOverlay must be present in _layout.tsx');
    assert.equal(matches.length, 1, 'AnimatedSplashOverlay must be mounted exactly once (single lifecycle)');

    // Verify it passes isReady derived from fontsLoaded and !isLoading
    assert.ok(
      layoutContent.includes('isReady={isAppReady}') || layoutContent.includes('isReady={Boolean(fontsLoaded && !isLoading)}'),
      'AnimatedSplashOverlay must receive isReady prop to prevent premature animation'
    );
    assert.ok(
      layoutContent.includes('const isAppReady = Boolean(fontsLoaded && !isLoading);'),
      'isAppReady must synchronize font loading and session restoration'
    );
  });

  it('defines isReady prop on AnimatedSplashOverlay without premature layout dismissal', () => {
    const animatedIconPath = path.join(MOBILE_ROOT, 'src/components/animated-icon.tsx');
    const content = fs.readFileSync(animatedIconPath, 'utf8');

    assert.ok(content.includes('isReady?: boolean'), 'AnimatedSplashOverlayProps must declare isReady prop');
    assert.ok(
      content.includes('useEffect(() => {') && content.includes('if (isReady && visible && !animate)'),
      'Must wait for isReady before invoking SplashScreen.hideAsync'
    );
    assert.ok(!content.includes('onLayout={() => {'), 'Must remove premature onLayout SplashScreen.hideAsync call');
  });
});

describe('Milestone 5.1: Android Release Configuration & EAS Profiles', () => {
  it('declares explicit android.versionCode and preserves package identity in app.json', () => {
    const appJsonPath = path.join(MOBILE_ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    assert.ok(appJson.expo.android, 'expo.android configuration must exist');
    assert.equal(appJson.expo.android.package, 'com.lifeadmin.app', 'Preserves package identity');
    assert.ok(
      typeof appJson.expo.android.versionCode === 'number' && appJson.expo.android.versionCode >= 1,
      'android.versionCode must be an integer >= 1 for Google Play Store compatibility'
    );
    assert.equal(appJson.expo.android.predictiveBackGestureEnabled, true);
  });

  it('maintains valid EAS build profiles in eas.json compatible with versioning', () => {
    const easJsonPath = path.join(MOBILE_ROOT, 'eas.json');
    assert.ok(fs.existsSync(easJsonPath), 'eas.json must exist');

    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    assert.equal(easJson.cli.appVersionSource, 'remote');
    assert.ok(easJson.build.production.autoIncrement === true);
    assert.ok(easJson.build.preview);
    assert.ok(easJson.build.development);
  });
});

describe('Milestone 5.1: Mobile Package Scripts', () => {
  it('declares reliable test and typecheck scripts in mobile/package.json', () => {
    const pkgPath = path.join(MOBILE_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.scripts.test, 'package.json must contain test script');
    assert.ok(pkg.scripts.test.includes('tsx --test'), 'test script must use tsx --test runner');
    assert.ok(pkg.scripts.typecheck, 'package.json must contain typecheck script');
    assert.equal(pkg.scripts.typecheck, 'tsc --noEmit', 'typecheck script must run tsc --noEmit');
  });
});
