/**
 * Stage 4 Milestone 3 (P1 #3) Regression Tests:
 * - Cross-module Overdue / Due Soon urgency triage (single source of truth with StatsOverview)
 * - Safe URL query filter parsing for Tasks, Bills, Reminders, and Appointments
 * - StatsOverview responsive 2x2 grid & StatCard accessibility forwarding
 * - QuickActionsSection removal of hidden long-press routing + compact visible Module shortcuts
 * - Contextual FloatingActionButton layout clearance across phone tabs, tablets, rails, Stack screens, & Snackbars
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  deriveStatsFromOverview,
  getFilteredModuleRoute,
  getTriageItems,
  summarizeTriageByModule,
} from '../features/dashboard/services/urgencyTriage';
import { AttentionItem, DashboardOverview } from '../features/dashboard/types';
import {
  FAB_MARGIN,
  FAB_SCROLL_CLEARANCE,
  FAB_SNACKBAR_CLEARANCE,
  getFabBottomOffset,
  getFabScrollBottomPadding,
} from '../utils/navigationLayout';
import {
  parseAppointmentFilterParam,
  parseBillFilterParam,
  parseReminderSectionParam,
  parseTaskFilterParam,
} from '../utils/routeFilters';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

const SAMPLE_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: 'task-1',
    type: 'task',
    title: 'Submit tax form',
    subtitle: 'Finance',
    reason: 'Task overdue by 2 days',
    severity: 'overdue',
    urgencyLabel: 'Overdue by 2d',
    dueDate: '2026-11-10T00:00:00.000Z',
    destination: '/tasks/task-1',
  },
  {
    id: 'bill-1',
    type: 'bill',
    title: 'Internet Bill',
    subtitle: 'Utilities',
    reason: 'Overdue by 1 day',
    severity: 'overdue',
    urgencyLabel: 'Overdue by 1d',
    dueDate: '2026-11-11T00:00:00.000Z',
    destination: '/bills/bill-1',
    amount: 799,
    currency: 'INR',
  },
  {
    id: 'rem-1',
    type: 'reminder',
    title: 'Renew vehicle PUC',
    subtitle: 'Transport',
    reason: 'Due today',
    severity: 'overdue',
    urgencyLabel: 'Due today',
    dueDate: '2026-11-12T00:00:00.000Z',
    destination: '/reminders/rem-1',
  },
  {
    id: 'appt-1',
    type: 'appointment',
    title: 'Dental checkup',
    subtitle: 'Health',
    reason: 'Tomorrow at 10:00',
    severity: 'urgent',
    urgencyLabel: 'Tomorrow',
    dueDate: '2026-11-13T00:00:00.000Z',
    destination: '/appointments/appt-1',
  },
  {
    id: 'doc-1',
    type: 'document',
    title: 'Health Insurance Policy',
    subtitle: 'Insurance',
    reason: 'Document expires in 5 days',
    severity: 'urgent',
    urgencyLabel: 'Expires in 5d',
    dueDate: '2026-11-17T00:00:00.000Z',
    destination: '/documents',
  },
  {
    id: 'bill-2',
    type: 'bill',
    title: 'Electricity Bill',
    subtitle: 'Utilities',
    reason: 'Due in 2 days',
    severity: 'soon',
    urgencyLabel: 'Due in 2d',
    dueDate: '2026-11-14T00:00:00.000Z',
    destination: '/bills/bill-2',
    amount: 1450,
    currency: 'INR',
  },
];

describe('Cross-Module Urgency Triage Single Source of Truth', () => {
  it('filters overdue vs soon/urgent items consistently across all 5 modules', () => {
    const overdue = getTriageItems(SAMPLE_ATTENTION_ITEMS, 'overdue');
    assert.deepEqual(
      overdue.map((i) => i.id),
      ['task-1', 'bill-1', 'rem-1'],
    );

    const soon = getTriageItems(SAMPLE_ATTENTION_ITEMS, 'soon');
    assert.deepEqual(
      soon.map((i) => i.id),
      ['appt-1', 'doc-1', 'bill-2'],
    );
  });

  it('derives overdueCount and dueSoonCount directly from needsAttention so counts never drift', () => {
    const overviewWithStaleStats: DashboardOverview = {
      needsAttention: SAMPLE_ATTENTION_ITEMS,
      upcoming: [],
      reminders: [],
      stats: {
        overdueCount: 99,
        dueSoonCount: 42,
        upcomingCount: 7,
        activeReminders: 4,
      },
    };

    const derived = deriveStatsFromOverview(overviewWithStaleStats);
    assert.ok(derived);
    assert.equal(derived.overdueCount, getTriageItems(SAMPLE_ATTENTION_ITEMS, 'overdue').length);
    assert.equal(derived.dueSoonCount, getTriageItems(SAMPLE_ATTENTION_ITEMS, 'soon').length);
    assert.equal(derived.overdueCount, 3);
    assert.equal(derived.dueSoonCount, 3);
    assert.equal(derived.upcomingCount, 7);
    assert.equal(derived.activeReminders, 4);
  });

  it('generates filtered module shortcuts and routes matching each triage mode', () => {
    const overdueItems = getTriageItems(SAMPLE_ATTENTION_ITEMS, 'overdue');
    const overdueShortcuts = summarizeTriageByModule(overdueItems, 'overdue');
    assert.deepEqual(overdueShortcuts, [
      { type: 'task', label: 'Tasks', count: 1, route: '/tasks?filter=overdue' },
      { type: 'bill', label: 'Bills', count: 1, route: '/bills?filter=overdue' },
      { type: 'reminder', label: 'Reminders', count: 1, route: '/reminders?section=overdue' },
    ]);

    const soonItems = getTriageItems(SAMPLE_ATTENTION_ITEMS, 'soon');
    const soonShortcuts = summarizeTriageByModule(soonItems, 'soon');
    assert.deepEqual(soonShortcuts, [
      { type: 'bill', label: 'Bills', count: 1, route: '/bills?filter=upcoming' },
      { type: 'appointment', label: 'Appointments', count: 1, route: '/appointments?filter=upcoming' },
      { type: 'document', label: 'Documents', count: 1, route: '/documents' },
    ]);

    assert.equal(getFilteredModuleRoute('task', 'soon'), '/tasks?filter=todo');
    assert.equal(getFilteredModuleRoute('appointment', 'overdue'), '/appointments?filter=past');
    assert.equal(getFilteredModuleRoute('reminder', 'soon'), '/reminders?section=upcoming');
  });
});

describe('Route Query Filter Parsing', () => {
  it('validates and normalizes filter/section query params while rejecting unknown values', () => {
    assert.equal(parseTaskFilterParam('overdue'), 'overdue');
    assert.equal(parseTaskFilterParam(['  In_Progress ']), 'in_progress');
    assert.equal(parseTaskFilterParam('bogus'), null);
    assert.equal(parseTaskFilterParam(undefined), null);

    assert.equal(parseBillFilterParam('overdue'), 'overdue');
    assert.equal(parseBillFilterParam('UPCOMING'), 'upcoming');
    assert.equal(parseBillFilterParam('unknown'), null);

    assert.equal(parseReminderSectionParam('overdue'), 'overdue');
    assert.equal(parseReminderSectionParam(['Today']), 'today');
    assert.equal(parseReminderSectionParam('invalid'), null);

    assert.equal(parseAppointmentFilterParam('upcoming'), 'upcoming');
    assert.equal(parseAppointmentFilterParam('PAST'), 'past');
    assert.equal(parseAppointmentFilterParam(''), null);
  });
});

describe('FloatingActionButton Positioning & Clearance', () => {
  it('clears BottomTabInset on phone primary tabs and respects safe-area insets on tablets, rails, & Stack screens', () => {
    const phoneTabBottom = getFabBottomOffset({
      insetsBottom: 20,
      windowWidth: 390,
      isTabScreen: true,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: false,
    });
    assert.equal(phoneTabBottom, 80 + FAB_MARGIN);

    const tabletTabBottom = getFabBottomOffset({
      insetsBottom: 18,
      windowWidth: 834,
      isTabScreen: true,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: false,
    });
    assert.equal(tabletTabBottom, 18 + FAB_MARGIN);

    const desktopRailBottom = getFabBottomOffset({
      insetsBottom: 0,
      windowWidth: 1280,
      isTabScreen: true,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: false,
    });
    assert.equal(desktopRailBottom, FAB_MARGIN);

    const pushedStackBottom = getFabBottomOffset({
      insetsBottom: 24,
      windowWidth: 390,
      isTabScreen: false,
      bottomTabInset: 80,
      platformOS: 'ios',
      isSnackbarVisible: false,
    });
    assert.equal(pushedStackBottom, 24 + FAB_MARGIN);
  });

  it('lifts cleanly above active bottom Snackbars on both tabs and pushed Stack screens', () => {
    const phoneResting = getFabBottomOffset({
      insetsBottom: 16,
      windowWidth: 390,
      isTabScreen: true,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: false,
    });
    const phoneLifted = getFabBottomOffset({
      insetsBottom: 16,
      windowWidth: 390,
      isTabScreen: true,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: true,
    });
    assert.equal(phoneLifted, 80 + 12 + FAB_SNACKBAR_CLEARANCE);
    assert.ok(phoneLifted > phoneResting);

    const pushedLifted = getFabBottomOffset({
      insetsBottom: 20,
      windowWidth: 390,
      isTabScreen: false,
      bottomTabInset: 80,
      platformOS: 'android',
      isSnackbarVisible: true,
    });
    assert.equal(pushedLifted, 20 + 12 + FAB_SNACKBAR_CLEARANCE);

    const scrollClearance = getFabScrollBottomPadding({
      insetsBottom: 16,
      baseSpacing: 24,
      windowWidth: 390,
      isTabScreen: false,
      bottomTabInset: 80,
      platformOS: 'android',
    });
    assert.equal(scrollClearance, 16 + 24 + FAB_SCROLL_CLEARANCE);
  });
});

describe('Dashboard StatsOverview, StatCard, QuickActions & Module FAB Wiring', () => {
  it('uses wrapped 2x2 StatsOverview grid, calm Alerts icon tint, and forwarded StatCard Pressable props', () => {
    const statsOverview = readMobileFile('src/features/dashboard/components/StatsOverview.tsx');
    assert.match(statsOverview, /flexWrap:\s*'wrap'/);
    assert.match(statsOverview, /flexBasis:\s*'46%'/);
    assert.doesNotMatch(statsOverview, /Overdue<\/ThemedText>[\s\S]{0,60}numberOfLines=\{1\}/);
    assert.ok(!statsOverview.includes('Colors.urgency.dueSoon'));
    assert.match(statsOverview, /tintColor=\{colors\.primary\}/);

    const statCard = readMobileFile('src/components/ui/StatCard.tsx');
    assert.match(statCard, /const cardViewProps = onPress \? \{\} : props;/);
    assert.match(statCard, /<Pressable[\s\S]*\{\.\.\.props\}/);
  });

  it('removes hidden long-press routing from QuickActionsSection and adds compact visible Module shortcuts', () => {
    const qa = readMobileFile('src/features/dashboard/components/QuickActionsSection.tsx');
    assert.ok(!qa.includes('onLongPress'));
    assert.ok(!qa.includes('delayLongPress'));
    assert.ok(!qa.includes('hold to open'));
    assert.ok(!qa.includes('accessibilityActions'));
    assert.ok(qa.includes("'/documents'"));
    assert.ok(qa.includes("'/appointments'"));
    assert.ok(qa.includes("'/reminders'"));
    assert.ok(qa.includes("'/ai'"));

    const index = readMobileFile('src/app/(tabs)/index.tsx');
    assert.ok(index.includes('deriveStatsFromOverview'));
    assert.ok(index.includes('<UrgencyTriageModal'));
    assert.ok(index.includes("setTriageMode('overdue')"));
    assert.ok(index.includes("setTriageMode('soon')"));
  });

  it('replaces top-right header create buttons with FloatingActionButton across all 6 modules while keeping EmptyStates', () => {
    const tabModules: Array<{ file: string; label: string }> = [
      { file: 'src/app/(tabs)/tasks.tsx', label: 'New Task' },
      { file: 'src/app/(tabs)/bills.tsx', label: 'Add Bill' },
      { file: 'src/app/(tabs)/calendar.tsx', label: 'Add Event' },
    ];
    for (const mod of tabModules) {
      const content = readMobileFile(mod.file);
      assert.ok(content.includes('<FloatingActionButton'), `${mod.file} must mount FloatingActionButton`);
      assert.ok(content.includes(`label="${mod.label}"`), `${mod.file} missing contextual FAB label`);
      assert.ok(content.includes('useFabBottomPadding'), `${mod.file} must reserve FAB scroll clearance`);
      assert.ok(!content.includes('size="sm"\n              onPress={openCreateModal}'), `${mod.file} still uses old small header create CTA`);
      assert.ok(content.includes('<EmptyState'), `${mod.file} must preserve EmptyState`);
    }

    const stackModules: Array<{ file: string; label: string }> = [
      { file: 'src/app/documents.tsx', label: 'Upload' },
      { file: 'src/app/appointments.tsx', label: 'New Visit' },
      { file: 'src/app/reminders.tsx', label: 'New Alert' },
    ];
    for (const mod of stackModules) {
      const content = readMobileFile(mod.file);
      assert.ok(content.includes('<FloatingActionButton'), `${mod.file} must mount FloatingActionButton`);
      assert.ok(content.includes(`label="${mod.label}"`), `${mod.file} missing contextual FAB label`);
      assert.ok(content.includes('isTabScreen={false}'), `${mod.file} pushed Stack FAB must set isTabScreen={false}`);
      assert.ok(content.includes('useFabBottomPadding'), `${mod.file} must reserve FAB scroll clearance`);
      assert.ok(content.includes('<EmptyState'), `${mod.file} must preserve EmptyState`);
    }

    // Filtered module query-param support wired in Tasks, Bills, Appointments, Reminders
    assert.ok(readMobileFile('src/app/(tabs)/tasks.tsx').includes('parseTaskFilterParam'));
    assert.ok(readMobileFile('src/app/(tabs)/bills.tsx').includes('parseBillFilterParam'));
    assert.ok(readMobileFile('src/app/appointments.tsx').includes('parseAppointmentFilterParam'));
    assert.ok(readMobileFile('src/app/reminders.tsx').includes('parseReminderSectionParam'));
  });
});

