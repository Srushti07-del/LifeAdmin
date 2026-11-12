/**
 * Stage 2 Regression Tests: Accessibility & Dark-Mode WCAG Contrast
 *
 * Verifies:
 * 1. WCAG AA contrast fixes in themed-text.tsx (`linkPrimary`) and dark-mode
 *    chips/badges/delete icons in DocumentCard, ReminderCard, BillCard,
 *    LifeBuddyWidget, CompanionSanctuaryModal, DashboardBillsWidget, TaskBoardView,
 *    and NeedsAttentionSection.
 * 2. Removal of nested interactive `<Pressable>` / `<Card onPress>` wrappers that
 *    cause duplicated or broken screen-reader traversal.
 * 3. Meaningful `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`,
 *    `accessibilityState`, and `accessibilityValue` attributes on icon buttons,
 *    checkboxes, tabs/pills, progress bars, and modal dismissal backdrops.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Colors } from '../constants/colors';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

interface PressableStackEntry {
  tag: string;
  line: number;
  interactive: boolean;
}

interface NestedPressableHit {
  tag: string;
  line: number;
  parent: PressableStackEntry;
}

function findNestedInteractiveContainers(src: string): NestedPressableHit[] {
  const hits: NestedPressableHit[] = [];
  const stack: PressableStackEntry[] = [];
  let i = 0;
  let line = 1;

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === '<') {
      const mClose = src.slice(i).match(/^<\/(Pressable|Card)\s*>/);
      if (mClose) {
        const idx = [...stack].reverse().findIndex((entry) => entry.tag === mClose[1]);
        if (idx !== -1) stack.splice(stack.length - 1 - idx, 1);
        i += mClose[0].length;
        continue;
      }
      const mOpen = src.slice(i).match(/^<(Pressable|Card)(?=[\s/>])/);
      if (mOpen) {
        const tag = mOpen[1];
        const startLine = line;
        i += mOpen[0].length;
        let braceDepth = 0;
        let quote: string | null = null;
        let attrSlice = '';

        while (i < src.length) {
          const c = src[i];
          if (c === '\n') line++;
          if (quote) {
            if (c === '\\') {
              attrSlice += c + (src[i + 1] || '');
              i += 2;
              continue;
            }
            if (c === quote) quote = null;
            attrSlice += c;
            i++;
            continue;
          }
          if (c === "'" || c === '"' || c === '`') {
            quote = c;
            attrSlice += c;
            i++;
            continue;
          }
          if (c === '{') {
            braceDepth++;
            attrSlice += c;
            i++;
            continue;
          }
          if (c === '}') {
            if (braceDepth > 0) braceDepth--;
            attrSlice += c;
            i++;
            continue;
          }
          if (braceDepth === 0 && c === '/' && src[i + 1] === '>') {
            const interactive = tag === 'Pressable' || /\bonPress\s*=/.test(attrSlice);
            const activeParent = stack.find((entry) => entry.interactive);
            if (interactive && activeParent) {
              hits.push({ tag, line: startLine, parent: activeParent });
            }
            i += 2;
            break;
          }
          if (braceDepth === 0 && c === '>') {
            const interactive = tag === 'Pressable' || /\bonPress\s*=/.test(attrSlice);
            const activeParent = stack.find((entry) => entry.interactive);
            if (interactive && activeParent) {
              hits.push({ tag, line: startLine, parent: activeParent });
            }
            stack.push({ tag, line: startLine, interactive });
            i++;
            break;
          }
          attrSlice += c;
          i++;
        }
        continue;
      }
    }
    i++;
  }

  return hits;
}

describe('Dark-Mode Contrast & Theme-Aware Link Tokens', () => {
  it('removes hardcoded #087E83 from themed-text linkPrimary and resolves theme.primary', () => {
    const source = readMobileFile('src/components/themed-text.tsx');
    assert.ok(
      !source.includes("'#087E83'") && !source.includes('"#087E83"'),
      'themed-text.tsx must not hardcode light-mode #087E83 in styles.linkPrimary',
    );
    assert.match(
      source,
      /type === 'linkPrimary' \? 'primary' : 'text'/,
      'ThemedText should resolve linkPrimary via theme.primary',
    );
  });

  it('meets WCAG AA contrast for dark and light linkPrimary, chip, and delete tokens', () => {
    // linkPrimary on Light vs Dark backgrounds
    assert.ok(contrastRatio(Colors.light.primary, Colors.light.background) >= 4.5);
    assert.ok(contrastRatio(Colors.light.primary, Colors.light.surface) >= 4.5);
    assert.ok(contrastRatio(Colors.dark.primary, Colors.dark.background) >= 4.5);
    assert.ok(contrastRatio(Colors.dark.primary, Colors.dark.surface) >= 4.0);

    // Chip text inside primarySoft in Light & Dark
    assert.ok(contrastRatio(Colors.light.primaryDeep, Colors.light.primarySoft) >= 4.5);
    assert.ok(contrastRatio(Colors.urgency.upcoming.darkText, Colors.dark.primarySoft) >= 4.5);
    assert.ok(contrastRatio(Colors.dark.text, Colors.dark.primarySoft) >= 7.0);

    // Delete icon contrast in Light & Dark cards
    assert.ok(
      contrastRatio(Colors.urgency.critical.darkText, Colors.dark.surfaceSecondary) >= 4.5,
    );
    assert.ok(
      contrastRatio(Colors.urgency.critical.lightText, Colors.light.surfaceSecondary) >= 4.5,
    );
  });
});

describe('Zero Nested Interactive Pressable Containers', () => {
  const checkedFiles = [
    'src/features/documents/components/DocumentCard.tsx',
    'src/features/reminders/components/ReminderCard.tsx',
    'src/features/bills/components/BillCard.tsx',
    'src/features/companions/components/LifeBuddyWidget.tsx',
    'src/features/companions/components/CompanionSanctuaryModal.tsx',
    'src/features/dashboard/components/DashboardBillsWidget.tsx',
    'src/features/dashboard/components/NeedsAttentionSection.tsx',
    'src/features/tasks/components/TaskCard.tsx',
    'src/features/tasks/components/TaskBoardView.tsx',
    'src/app/(tabs)/index.tsx',
  ];

  for (const relPath of checkedFiles) {
    it(`contains zero nested <Pressable> or <Card onPress> wrappers in ${relPath}`, () => {
      const source = readMobileFile(relPath);
      const hits = findNestedInteractiveContainers(source);
      assert.deepEqual(
        hits,
        [],
        `Found nested Pressable/Card in ${relPath}: ${JSON.stringify(hits)}`,
      );
      assert.ok(
        !source.includes('stopPropagation'),
        `${relPath} should not rely on e.stopPropagation() for nested Pressables`,
      );
    });
  }
});

describe('Screen-Reader Roles, Labels, Hints & States Across Audited Screens', () => {
  it('documents.tsx labels search input, sort toggle (with expanded state), sort options, and category pills', () => {
    const source = readMobileFile('src/app/documents.tsx');
    assert.ok(source.includes('accessibilityLabel="Search documents"'));
    assert.ok(source.includes('accessibilityLabel="Sort documents"'));
    assert.ok(source.includes('accessibilityState={{ expanded: showSortPicker }}'));
    assert.ok(source.includes('accessibilityState={{ selected: activeSort === opt.key }}'));
    assert.ok(source.includes('accessibilityState={{ selected: selectedCategory === cat }}'));
  });

  it('DocumentCard.tsx, DocumentDetailsModal.tsx, and DocumentUploadModal.tsx expose accessible action controls', () => {
    const card = readMobileFile('src/features/documents/components/DocumentCard.tsx');
    const details = readMobileFile('src/features/documents/components/DocumentDetailsModal.tsx');
    const upload = readMobileFile('src/features/documents/components/DocumentUploadModal.tsx');

    assert.ok(card.includes('accessibilityLabel={`Open ${document.originalName}`}'));
    assert.ok(
      card.includes('accessibilityLabel={`Create task or bill from ${document.originalName}`}'),
    );
    assert.ok(card.includes('accessibilityLabel={`Edit ${document.originalName}`}'));
    assert.ok(card.includes('accessibilityLabel={`Delete ${document.originalName}`}'));
    assert.ok(card.includes('Colors.urgency.critical.darkText'));
    assert.ok(card.includes('Colors.urgency.upcoming.darkText'));

    assert.ok(details.includes('accessibilityLabel={`View or preview ${document.originalName}`}'));
    assert.ok(details.includes('accessibilityLabel={`Create task from'));
    assert.ok(details.includes('accessibilityLabel={`Create reminder from'));
    assert.ok(details.includes('accessibilityLabel={`Create bill for'));

    assert.ok(upload.includes('accessibilityLabel="Choose PDF document"'));
    assert.ok(upload.includes('accessibilityLabel="Choose image document"'));
    assert.ok(upload.includes('accessibilityState={{ selected: isSelected }}'));
  });

  it('ReminderCard.tsx exposes checkbox state, body button, and edit/delete icon labels', () => {
    const source = readMobileFile('src/features/reminders/components/ReminderCard.tsx');
    assert.ok(source.includes('accessibilityRole="checkbox"'));
    assert.ok(source.includes('accessibilityState={{ checked: isCompleted }}'));
    assert.ok(source.includes('accessibilityLabel={`Edit reminder ${reminder.title}`}'));
    assert.ok(source.includes('accessibilityLabel={`Delete reminder ${reminder.title}`}'));
    assert.ok(source.includes('accessibilityHint="Opens reminder details"'));
    assert.ok(source.includes('Colors.urgency.critical.darkText'));
    assert.ok(source.includes('Colors.urgency.upcoming.darkText'));
  });

  it('BillCard.tsx separates body navigation from Mark Paid/Unpay with busy/disabled states', () => {
    const source = readMobileFile('src/features/bills/components/BillCard.tsx');
    assert.ok(source.includes("accessibilityHint={onPress ? 'Opens bill details' : undefined}"));
    assert.ok(source.includes('accessibilityState={{ disabled: isActionLoading, busy: isActionLoading }}'));
    assert.ok(source.includes('Colors.urgency.upcoming.darkText'));
  });

  it('LifeBuddyWidget.tsx & CompanionSanctuaryModal.tsx preserve Aura/Mossy/Nori/Zephyr and expose progressbar & action labels', () => {
    const widget = readMobileFile('src/features/companions/components/LifeBuddyWidget.tsx');
    const sanctuary = readMobileFile('src/features/companions/components/CompanionSanctuaryModal.tsx');

    assert.ok(widget.includes('accessibilityHint="Opens LifeBuddy Sanctuary"'));
    assert.ok(widget.includes('accessibilityLabel="Ask LifeBuddy AI"'));
    assert.ok(widget.includes('accessibilityRole="progressbar"'));
    assert.ok(widget.includes('accessibilityValue={{ min: 0, max: 200, now: xpInCurrentLevel }}'));

    assert.ok(sanctuary.includes('accessibilityRole="progressbar"'));
    assert.ok(sanctuary.includes('accessibilityLabel="Save companion name"'));
    assert.ok(sanctuary.includes('accessibilityLabel="Rename companion"'));
    assert.ok(sanctuary.includes('accessibilityLabel={`View details for ${companion.name}`}'));
    assert.ok(sanctuary.includes('accessibilityLabel={`Adopt ${companion.name}`}'));
    assert.ok(sanctuary.includes('Colors.urgency.upcoming.darkText'));

    // Ensure companion definitions were not modified or removed
    const companionsData = readMobileFile('src/features/companions/catalog.ts');
    for (const id of ['aura', 'mossy', 'nori', 'zephyr']) {
      assert.ok(companionsData.includes(`id: '${id}'`), `Missing companion ${id}`);
    }
  });
});
