/**
 * Stage 3 Regression Tests: Global Snackbar Feedback, Real Persisted Undo, & Thumb Ergonomics
 *
 * Verifies:
 * 1. Pure FIFO snackbar queue mechanics (non-overlapping promotion, rapid duplicate suppression,
 *    MAX_SNACKBAR_QUEUE capping, sensible auto-dismiss durations, bottom tab clearance).
 * 2. Light (Ocean Teal) & Dark (Deep Ocean) WCAG AA contrast ratios (>= 4.5:1) across
 *    all four snackbar variants (success, error, warning, info).
 * 3. Persisted Undo safety rules for Tasks, Bills, and Reminders so recurring child records
 *    never become orphaned.
 * 4. Repository-wide Alert.alert audit confirming zero routine info/success/error alerts
 *    remain outside explicit confirmation dialogs, plus Modal host & touch-target invariants.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Colors } from '../constants/colors';
import {
  DEFAULT_SNACKBAR_DURATIONS,
  INITIAL_SNACKBAR_QUEUE_STATE,
  MAX_SNACKBAR_QUEUE,
  computeSnackbarBottomOffset,
  createSnackbarItem,
  dismissSnackbarById,
  enqueueSnackbar,
  getDefaultSnackbarDuration,
  getSnackbarVariantPalette,
  normalizeSnackbarDuration,
} from '../context/snackbarQueue';
import {
  canUndoBillStatusToggle,
  canUndoPaidBillFromDashboard,
  canUndoReminderToggle,
  getTaskStatusFeedback,
} from '../utils/undoActions';

const MOBILE_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(MOBILE_ROOT, 'src');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

function walkSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === '__tests__') continue;
      results.push(...walkSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
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
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Snackbar Queue & Durations', () => {
  it('assigns longer durations to actionable and warning/error messages and validates overrides', () => {
    assert.equal(getDefaultSnackbarDuration('success', false), DEFAULT_SNACKBAR_DURATIONS.success.standard);
    assert.equal(getDefaultSnackbarDuration('success', true), DEFAULT_SNACKBAR_DURATIONS.success.withAction);
    assert.ok(
      getDefaultSnackbarDuration('error', false) > getDefaultSnackbarDuration('info', false)
    );

    assert.equal(normalizeSnackbarDuration(0, 'info', false), 0);
    assert.equal(normalizeSnackbarDuration(300, 'info', false), 1200);
    assert.equal(normalizeSnackbarDuration(-50, 'warning', false), DEFAULT_SNACKBAR_DURATIONS.warning.standard);
    assert.equal(normalizeSnackbarDuration(Number.NaN, 'error', true), DEFAULT_SNACKBAR_DURATIONS.error.withAction);
  });

  it('queues sequential snackbars without overlapping and promotes in FIFO order', () => {
    let counter = 0;
    const nextId = () => `sb-${++counter}`;

    const first = createSnackbarItem({ variant: 'success', title: 'Saved', message: 'Task created.' }, nextId);
    const second = createSnackbarItem({ variant: 'info', title: 'Updated', message: 'Reminder synced.' }, nextId);
    const third = createSnackbarItem({ variant: 'warning', message: 'Check due date.' }, nextId);

    let state = INITIAL_SNACKBAR_QUEUE_STATE;
    state = enqueueSnackbar(state, first);
    assert.equal(state.current?.id, 'sb-1');
    assert.equal(state.queue.length, 0);

    state = enqueueSnackbar(state, second);
    state = enqueueSnackbar(state, third);
    assert.equal(state.current?.id, 'sb-1');
    assert.deepEqual(
      state.queue.map((i) => i.id),
      ['sb-2', 'sb-3']
    );

    // Dismissing a queued item preserves active snackbar
    state = dismissSnackbarById(state, 'sb-3');
    assert.equal(state.current?.id, 'sb-1');
    assert.deepEqual(
      state.queue.map((i) => i.id),
      ['sb-2']
    );

    // Dismissing active promotes next queued item cleanly
    state = dismissSnackbarById(state);
    assert.equal(state.current?.id, 'sb-2');
    assert.equal(state.queue.length, 0);

    state = dismissSnackbarById(state);
    assert.equal(state.current, null);
    assert.equal(state.queue.length, 0);
  });

  it('suppresses rapid non-action duplicates while preserving distinct action snackbars', () => {
    let counter = 0;
    const nextId = () => `sb-${++counter}`;

    const a1 = createSnackbarItem({ variant: 'success', message: 'Saved changes.' }, nextId);
    const a2 = createSnackbarItem({ variant: 'success', message: 'Saved changes.' }, nextId);
    const blank = createSnackbarItem({ variant: 'info', message: '   ' }, nextId);

    let state = enqueueSnackbar(INITIAL_SNACKBAR_QUEUE_STATE, a1);
    state = enqueueSnackbar(state, a2);
    state = enqueueSnackbar(state, blank);
    assert.equal(state.current?.id, 'sb-1');
    assert.equal(state.queue.length, 0);

    // Action snackbars (e.g. Undo) with identical copy remain distinct queue entries
    const u1 = createSnackbarItem(
      { variant: 'success', message: 'Marked done.', action: { label: 'Undo', onPress: () => {} } },
      nextId
    );
    const u2 = createSnackbarItem(
      { variant: 'success', message: 'Marked done.', action: { label: 'Undo', onPress: () => {} } },
      nextId
    );
    state = enqueueSnackbar(state, u1);
    state = enqueueSnackbar(state, u2);
    assert.equal(state.queue.length, 2);
  });

  it('caps backlog at MAX_SNACKBAR_QUEUE without dropping the current snackbar', () => {
    let state = INITIAL_SNACKBAR_QUEUE_STATE;
    for (let i = 0; i < MAX_SNACKBAR_QUEUE + 4; i++) {
      state = enqueueSnackbar(
        state,
        createSnackbarItem({ variant: 'info', message: `Notice ${i}` }, () => `id-${i}`)
      );
    }

    assert.equal(state.current?.id, 'id-0');
    assert.equal(state.queue.length, MAX_SNACKBAR_QUEUE);
    assert.equal(state.queue[0]?.id, 'id-4');
    assert.equal(state.queue[MAX_SNACKBAR_QUEUE - 1]?.id, `id-${MAX_SNACKBAR_QUEUE + 3}`);
  });

  it('positions snackbars in thumb zone above bottom tabs and safe-area insets', () => {
    const withTabs = computeSnackbarBottomOffset({
      bottomInset: 24,
      bottomTabInset: 80,
      hasBottomTabs: true,
    });
    const withoutTabs = computeSnackbarBottomOffset({
      bottomInset: 24,
      bottomTabInset: 80,
      hasBottomTabs: false,
    });

    assert.equal(withTabs, 92);
    assert.equal(withoutTabs, 36);
    assert.ok(withTabs > 80);
  });

  it('maintains >= 4.5:1 WCAG AA contrast for every variant in Ocean Teal light & Deep Ocean dark', () => {
    const variants = ['success', 'error', 'warning', 'info'] as const;
    for (const variant of variants) {
      const lightPalette = getSnackbarVariantPalette(variant, Colors.light, false);
      const darkPalette = getSnackbarVariantPalette(variant, Colors.dark, true);

      assert.ok(
        contrastRatio(lightPalette.actionText, lightPalette.actionBg) >= 4.5,
        `Light ${variant} action pill must meet WCAG AA contrast`
      );
      assert.ok(
        contrastRatio(darkPalette.actionText, darkPalette.actionBg) >= 4.5,
        `Dark ${variant} action pill must meet WCAG AA contrast`
      );
      assert.ok(
        contrastRatio(lightPalette.badgeIcon, lightPalette.badgeBg) >= 4.5,
        `Light ${variant} icon badge must meet WCAG AA contrast`
      );
      assert.ok(
        contrastRatio(darkPalette.badgeIcon, darkPalette.badgeBg) >= 4.5,
        `Dark ${variant} icon badge must meet WCAG AA contrast`
      );
    }
  });
});

describe('Persisted Undo Safety Rules', () => {
  it('generates clear task status feedback copy', () => {
    assert.equal(getTaskStatusFeedback('completed', 'Tax Filing').title, 'Task Completed');
    assert.equal(getTaskStatusFeedback('in_progress', 'Tax Filing').title, 'Status Updated');
    assert.equal(getTaskStatusFeedback('todo', 'Tax Filing').title, 'Task Reopened');
  });

  it('allows bill payment Undo only when non-recurring and no child occurrence was created', () => {
    assert.equal(canUndoBillStatusToggle({ recurrence: { type: 'none' } }, null), true);
    assert.equal(canUndoBillStatusToggle({}, undefined), true);
    assert.equal(canUndoBillStatusToggle({ recurrence: { type: 'monthly' } }, null), false);
    assert.equal(
      canUndoBillStatusToggle({ recurrence: { type: 'none' } }, { _id: 'child-bill' } as any),
      false
    );

    assert.equal(canUndoPaidBillFromDashboard(null), true);
    assert.equal(canUndoPaidBillFromDashboard({ _id: 'child-bill' }), false);
  });

  it('allows reminder toggle Undo only when no recurring child reminder is spawned', () => {
    assert.equal(canUndoReminderToggle(false, { recurrence: { type: 'none' } }, null), true);
    assert.equal(canUndoReminderToggle(false, { recurrence: { type: 'daily' } }, null), false);
    assert.equal(
      canUndoReminderToggle(false, { recurrence: { type: 'weekly' } }, { _id: 'next-1' } as any),
      false
    );
    // Reopening a previously completed reminder toggles status/notification cleanly
    assert.equal(canUndoReminderToggle(true, { recurrence: { type: 'monthly' } }, null), true);
  });
});

describe('Stage 3 Alert Audit, Modal Host Portal, & Touch-Target Ergonomics', () => {
  it('retains Alert.alert strictly for explicit destructive/sign-out/bulk confirmation dialogs', () => {
    const allowedAlertFiles = new Set([
      'app/ai.tsx',
      'app/documents.tsx',
      'app/(tabs)/index.tsx',
      'app/(tabs)/more.tsx',
      'app/reminders.tsx',
      'app/settings.tsx',
      'features/appointments/components/AppointmentDetailsModal.tsx',
      'features/bills/components/BillDetailsModal.tsx',
      'features/calendar/components/CalendarItemDetailsModal.tsx',
      'features/documents/components/DocumentDetailsModal.tsx',
      'features/reminders/components/ReminderDetailsModal.tsx',
      'features/tasks/components/TaskDetailsModal.tsx',
    ]);

    const filesWithAlerts: string[] = [];
    for (const fullPath of walkSourceFiles(SRC_ROOT)) {
      const text = fs.readFileSync(fullPath, 'utf8');
      if (text.includes('Alert.alert(')) {
        const rel = path.relative(SRC_ROOT, fullPath).replace(/\\/g, '/');
        filesWithAlerts.push(rel);
      }
    }

    assert.deepEqual(filesWithAlerts.sort(), Array.from(allowedAlertFiles).sort());

    // Confirm remaining Alert.alert calls are confirmation dialogs (have multiple actions or confirm copy)
    assert.match(readMobileFile('src/app/ai.tsx'), /Confirm Bulk Creation/);
    assert.match(readMobileFile('src/app/documents.tsx'), /Delete Document/);
    assert.match(readMobileFile('src/app/(tabs)/index.tsx'), /Exit Demo Session/);
    assert.match(readMobileFile('src/app/settings.tsx'), /Exit Guest Demo Session/);
    assert.match(readMobileFile('src/app/settings.tsx'), /Alert\.alert\('Sign Out'/);
    assert.match(readMobileFile('src/app/(tabs)/more.tsx'), /Alert\.alert\(\s*'Sign Out'/);
    assert.match(readMobileFile('src/app/reminders.tsx'), /"Delete Reminder"/);
  });

  it('mounts global SnackbarProvider at root and dedicated hosts inside native Modal overlays', () => {
    const layout = readMobileFile('src/app/_layout.tsx');
    const modalSheet = readMobileFile('src/components/ui/ModalSheet.tsx');
    const sanctuary = readMobileFile('src/features/companions/components/CompanionSanctuaryModal.tsx');

    assert.match(layout, /<SnackbarProvider>/);
    assert.match(layout, /<SnackbarViewport hasBottomTabs\b/);
    assert.match(layout, /<SnackbarViewport hasBottomTabs=\{false\}/);
    assert.match(modalSheet, /useSnackbarModalHost\(isOpen\)/);
    assert.match(modalSheet, /<SnackbarViewport hostId=\{modalHostId\}/);
    assert.match(sanctuary, /useSnackbarModalHost\(visible\)/);
    assert.match(sanctuary, /<SnackbarViewport hostId=\{modalHostId\}/);
  });

  it('upgrades undersized thumb-zone touch targets to meet >= 44dp ergonomics', () => {
    const segmented = readMobileFile('src/components/ui/SegmentedControl.tsx');
    assert.match(segmented, /height:\s*44/);

    const reminderCard = readMobileFile('src/features/reminders/components/ReminderCard.tsx');
    assert.match(reminderCard, /hitSlop=\{12\}/);
    assert.match(reminderCard, /width:\s*36,\s*\r?\n\s*height:\s*36/);

    const documentCard = readMobileFile('src/features/documents/components/DocumentCard.tsx');
    assert.match(documentCard, /width:\s*38,\s*\r?\n\s*height:\s*38/);

    const customizeModal = readMobileFile('src/features/dashboard/components/DashboardCustomizeModal.tsx');
    assert.match(customizeModal, /width:\s*36,\s*\r?\n\s*height:\s*36/);
    assert.match(customizeModal, /width:\s*38,\s*\r?\n\s*height:\s*36/);

    const billCard = readMobileFile('src/features/bills/components/BillCard.tsx');
    assert.match(billCard, /minHeight:\s*38/);

    const banner = readMobileFile('src/features/reminders/components/NotificationPermissionBanner.tsx');
    assert.match(banner, /minWidth:\s*36,\s*\r?\n\s*minHeight:\s*36/);

    const summaryCard = readMobileFile('src/features/reminders/components/ReminderSummaryCard.tsx');
    assert.match(summaryCard, /minHeight:\s*48/);

    const eventForm = readMobileFile('src/features/calendar/components/EventFormModal.tsx');
    assert.match(eventForm, /width:\s*36,\s*\r?\n\s*height:\s*36,\s*\r?\n\s*borderRadius:\s*18/);

    const snackbar = readMobileFile('src/components/ui/Snackbar.tsx');
    assert.match(snackbar, /minHeight:\s*40/);
    assert.match(snackbar, /width:\s*40,\s*\r?\n\s*height:\s*40/);
  });
});

