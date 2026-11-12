/**
 * Stage 4 Milestone 4 (P2 #4) Regression Tests:
 * - Inter font weight resolution without overriding DM Serif Display or monospace typography
 * - Flat-at-rest surface borders vs intentional floating/modal elevation
 * - Onboarding Ocean Teal / Deep Ocean token consistency & domain-specific SF Symbols
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_FONT_FAMILIES,
  resolveInterTypographyOverride,
  resolveSansFontFamilyForWeight,
} from '../constants/typographyHelpers';
import { AVAILABLE_DOMAINS } from '../features/onboarding/types';

const MOBILE_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(MOBILE_ROOT, 'src');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests') continue;
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('Inter typography weight resolution', () => {
  it('maps weight values onto the loaded Inter font families', () => {
    assert.strictEqual(resolveSansFontFamilyForWeight('300'), BASE_FONT_FAMILIES.sansLight);
    assert.strictEqual(resolveSansFontFamilyForWeight('light'), BASE_FONT_FAMILIES.sansLight);
    assert.strictEqual(resolveSansFontFamilyForWeight('400'), BASE_FONT_FAMILIES.sans);
    assert.strictEqual(resolveSansFontFamilyForWeight('normal'), BASE_FONT_FAMILIES.sans);
    assert.strictEqual(resolveSansFontFamilyForWeight('500'), BASE_FONT_FAMILIES.sansMedium);
    assert.strictEqual(resolveSansFontFamilyForWeight('medium'), BASE_FONT_FAMILIES.sansMedium);
    assert.strictEqual(resolveSansFontFamilyForWeight('600'), BASE_FONT_FAMILIES.sansSemiBold);
    assert.strictEqual(resolveSansFontFamilyForWeight('semibold'), BASE_FONT_FAMILIES.sansSemiBold);
    assert.strictEqual(resolveSansFontFamilyForWeight('700'), BASE_FONT_FAMILIES.sansBold);
    assert.strictEqual(resolveSansFontFamilyForWeight('bold'), BASE_FONT_FAMILIES.sansBold);
  });

  it('resolves numeric and keyword fontWeight overrides for sans text and clears fontWeight', () => {
    assert.deepStrictEqual(resolveInterTypographyOverride({ fontWeight: '600' }), {
      fontFamily: 'Inter_600SemiBold',
      fontWeight: undefined,
    });
    assert.deepStrictEqual(
      resolveInterTypographyOverride({ fontFamily: 'Inter_400Regular', fontWeight: 700 }),
      {
        fontFamily: 'Inter_700Bold',
        fontWeight: undefined,
      }
    );
  });

  it('never overrides DM Serif Display or monospace font families', () => {
    assert.strictEqual(
      resolveInterTypographyOverride({
        fontFamily: BASE_FONT_FAMILIES.editorial,
        fontWeight: '600',
      }),
      null
    );
    assert.strictEqual(
      resolveInterTypographyOverride({
        fontFamily: 'monospace',
        fontWeight: '700',
      }),
      null
    );
    assert.strictEqual(resolveInterTypographyOverride({ fontFamily: BASE_FONT_FAMILIES.sans }), null);
  });

  it('keeps DMSerifDisplay and mono intact in ThemedText while migrating raw sans fontWeight declarations', () => {
    const themedText = readMobileFile('src/components/themed-text.tsx');
    assert.match(themedText, /resolveInterTypographyOverride/);
    assert.match(themedText, /fontFamily:\s*Typography\.fontFamilies\.editorial/);
    assert.match(themedText, /fontFamily:\s*Typography\.fontFamilies\.mono/);

    const strayFontWeightFiles: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (
        rel === 'constants/typography.ts' ||
        rel === 'constants/typographyHelpers.ts' ||
        rel === 'components/themed-text.tsx'
      ) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      if (/fontWeight\s*:/.test(content)) {
        strayFontWeightFiles.push(rel);
      }
    }
    assert.deepStrictEqual(strayFontWeightFiles, []);
  });
});

describe('Flat-at-rest surface hierarchy', () => {
  it('keeps resting cards outlined with 1px borders and without resting createShadow calls', () => {
    const cardSource = readMobileFile('src/components/ui/Card.tsx');
    assert.match(cardSource, /elevated \? createShadow\(isDark, 'elevated'\) : undefined/);
    assert.match(cardSource, /borderWidth:\s*1/);

    const restingCardFiles = [
      'src/components/ui/StatCard.tsx',
      'src/app/(tabs)/more.tsx',
      'src/features/documents/components/DocumentCard.tsx',
      'src/features/documents/components/DocumentSummaryCard.tsx',
      'src/features/tasks/components/TaskCard.tsx',
      'src/features/tasks/components/TaskSummaryCard.tsx',
      'src/features/tasks/components/TaskBoardView.tsx',
      'src/features/reminders/components/ReminderCard.tsx',
      'src/features/reminders/components/ReminderSummaryCard.tsx',
      'src/features/appointments/components/AppointmentCard.tsx',
      'src/features/appointments/components/AppointmentSummaryCard.tsx',
      'src/features/bills/components/BillSummaryCard.tsx',
      'src/features/companions/components/LifeBuddyWidget.tsx',
      'src/features/dashboard/components/NeedsAttentionSection.tsx',
      'src/features/dashboard/components/StatsOverview.tsx',
      'src/features/dashboard/components/QuickActionsSection.tsx',
      'src/features/dashboard/components/UpcomingTimelineSection.tsx',
      'src/features/dashboard/components/AIDailyBriefingWidget.tsx',
    ];

    for (const relPath of restingCardFiles) {
      const content = readMobileFile(relPath);
      assert.strictEqual(
        /createShadow\(/.test(content),
        false,
        `${relPath} should be flat at rest without createShadow`
      );
    }
  });

  it('preserves elevation on floating, modal, and active control layers', () => {
    const floatingFiles = [
      'src/components/ui/FloatingActionButton.tsx',
      'src/components/ui/ModalSheet.tsx',
      'src/components/ui/Snackbar.tsx',
      'src/components/ui/SegmentedControl.tsx',
    ];

    for (const relPath of floatingFiles) {
      const content = readMobileFile(relPath);
      assert.match(content, /createShadow\(/, `${relPath} should keep intentional elevation`);
    }
  });
});

describe('Onboarding Ocean Teal & Deep Ocean consistency', () => {
  it('assigns distinct domain-specific SF Symbols while preserving canonical IDs and labels', () => {
    assert.deepStrictEqual(
      AVAILABLE_DOMAINS.map((d) => d.id),
      ['Personal', 'Work', 'Finance', 'Health', 'Education', 'Home']
    );
    const iosIcons = AVAILABLE_DOMAINS.map((d) => d.iosIcon);
    assert.strictEqual(iosIcons.includes('circle.fill'), false);
    assert.strictEqual(new Set(iosIcons).size, AVAILABLE_DOMAINS.length);
  });

  it('removes template sky/slate hex colors and welcome hero shadow', () => {
    const onboardingFiles = collectSourceFiles(path.join(SRC_ROOT, 'features', 'onboarding'));
    for (const file of onboardingFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.strictEqual(
        /#[0-9A-Fa-f]{3,8}/.test(content),
        false,
        `${path.basename(file)} should use theme/status tokens instead of hex colors`
      );
      assert.strictEqual(
        /circle\.fill/.test(content),
        false,
        `${path.basename(file)} should use domain-specific SF Symbols`
      );
    }

    const welcomeSource = readMobileFile('src/features/onboarding/components/WelcomeStep.tsx');
    assert.strictEqual(/shadowRadius|shadowOpacity|elevation/.test(welcomeSource), false);
    assert.match(welcomeSource, /colors\.primarySoft/);
  });
});

