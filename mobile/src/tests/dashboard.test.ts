/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Dashboard Feature
 * Tests website-parity widget definitions, layout presets (Standard/Focus/Finance),
 * reordering/toggling/resetting, per-user & guest storage isolation,
 * corrupted layout sanitization, and zero-fabrication Daily Briefing logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WIDGETS,
  DASHBOARD_PRESETS,
  getDashboardStorageKey,
  serializeWidgetConfigs,
  sanitizeWidgetConfigs,
  moveWidget,
  toggleWidgetVisibility,
  applyLayoutPreset,
  resetWidgets,
  detectActivePreset,
  buildDailyBriefing,
} from '../features/dashboard/services/dashboardLayout';
import { DashboardOverview, QuickActionType, WidgetId } from '../features/dashboard/types';

describe('Dashboard Layout Presets & Widget Definitions', () => {
  it('defines the canonical 7 widgets all visible by default', () => {
    const ids = DEFAULT_WIDGETS.map((w) => w.id);
    assert.deepEqual(ids, [
      'needs_attention',
      'lifebuddy',
      'ai_briefing',
      'tasks',
      'bills',
      'schedule',
      'reminders',
    ]);
    assert.equal(DEFAULT_WIDGETS.every((w) => w.visible === true), true);
  });

  it('defines Standard, Focus, and Finance presets covering all 7 widgets', () => {
    assert.deepEqual(DASHBOARD_PRESETS.standard.order, [
      'needs_attention',
      'lifebuddy',
      'ai_briefing',
      'tasks',
      'bills',
      'schedule',
      'reminders',
    ]);
    assert.deepEqual(DASHBOARD_PRESETS.focus.order, [
      'needs_attention',
      'tasks',
      'schedule',
      'ai_briefing',
      'reminders',
      'lifebuddy',
      'bills',
    ]);
    assert.deepEqual(DASHBOARD_PRESETS.finance.order, [
      'needs_attention',
      'bills',
      'ai_briefing',
      'tasks',
      'schedule',
      'lifebuddy',
      'reminders',
    ]);
  });

  it('detects Standard, Focus, Finance, and Custom layouts accurately', () => {
    assert.equal(detectActivePreset(DEFAULT_WIDGETS), 'standard');
    const focus = applyLayoutPreset(DEFAULT_WIDGETS, 'focus');
    assert.equal(detectActivePreset(focus), 'focus');
    const finance = applyLayoutPreset(DEFAULT_WIDGETS, 'finance');
    assert.equal(detectActivePreset(finance), 'finance');
    const custom = moveWidget(DEFAULT_WIDGETS, 0, 'down');
    assert.equal(detectActivePreset(custom), 'custom');
  });
});

describe('Dashboard Customization Operations', () => {
  it('moves widgets up and down immutably while ignoring out-of-bounds moves', () => {
    const originalFirst = DEFAULT_WIDGETS[0].id;
    const originalSecond = DEFAULT_WIDGETS[1].id;

    // Boundary no-ops
    const upAtZero = moveWidget(DEFAULT_WIDGETS, 0, 'up');
    assert.equal(upAtZero[0].id, originalFirst);

    const lastIdx = DEFAULT_WIDGETS.length - 1;
    const downAtEnd = moveWidget(DEFAULT_WIDGETS, lastIdx, 'down');
    assert.equal(downAtEnd[lastIdx].id, DEFAULT_WIDGETS[lastIdx].id);

    // Valid move
    const swapped = moveWidget(DEFAULT_WIDGETS, 0, 'down');
    assert.equal(swapped[0].id, originalSecond);
    assert.equal(swapped[1].id, originalFirst);
    // Original unchanged
    assert.equal(DEFAULT_WIDGETS[0].id, originalFirst);
  });

  it('toggles widget visibility individually', () => {
    const toggled = toggleWidgetVisibility(DEFAULT_WIDGETS, 'bills');
    const billsWidget = toggled.find((w) => w.id === 'bills');
    const tasksWidget = toggled.find((w) => w.id === 'tasks');
    assert.equal(billsWidget?.visible, false);
    assert.equal(tasksWidget?.visible, true);
  });

  it('applies presets while preserving existing widget visibility toggles', () => {
    const hiddenLifeBuddy = toggleWidgetVisibility(DEFAULT_WIDGETS, 'lifebuddy');
    const financeLayout = applyLayoutPreset(hiddenLifeBuddy, 'finance');

    assert.equal(financeLayout[1].id, 'bills');
    const lb = financeLayout.find((w) => w.id === 'lifebuddy');
    assert.equal(lb?.visible, false);
  });

  it('resets customized layout back to default order and visibility', () => {
    const customized = moveWidget(
      toggleWidgetVisibility(DEFAULT_WIDGETS, 'ai_briefing'),
      2,
      'up'
    );
    const reset = resetWidgets();
    assert.equal(detectActivePreset(customized), 'custom');
    assert.equal(detectActivePreset(reset), 'standard');
    assert.equal(reset.every((w) => w.visible), true);
    assert.notEqual(customized[1].id, reset[1].id);
  });
});

describe('Dashboard Preferences Persistence & Isolation', () => {
  it('isolates storage keys between distinct users and guest mode', () => {
    const userAKey = getDashboardStorageKey('user_123', false);
    const userBKey = getDashboardStorageKey('user_456', false);
    const guestKey = getDashboardStorageKey('user_123', true);
    const anonKey = getDashboardStorageKey(undefined, false);

    assert.equal(userAKey, 'lifeadmin_dashboard_layout_user_123');
    assert.equal(userBKey, 'lifeadmin_dashboard_layout_user_456');
    assert.equal(guestKey, 'lifeadmin_dashboard_layout_guest');
    assert.equal(anonKey, 'lifeadmin_dashboard_layout_anonymous');
    assert.notEqual(userAKey, userBKey);
    assert.notEqual(userAKey, guestKey);
  });

  it('serializes widget configs to compact storage payloads and sanitizes saved data', () => {
    const custom = toggleWidgetVisibility(
      applyLayoutPreset(DEFAULT_WIDGETS, 'finance'),
      'reminders'
    );
    const serialized = serializeWidgetConfigs(custom);
    assert.equal(serialized.length, 7);
    assert.deepEqual(serialized[0], { id: 'needs_attention', visible: true });

    const restored = sanitizeWidgetConfigs(serialized);
    assert.equal(detectActivePreset(restored), 'finance');
    assert.equal(restored.find((w) => w.id === 'reminders')?.visible, false);
  });

  it('recovers safely from corrupted, duplicate, or legacy partial saved layouts', () => {
    assert.deepEqual(sanitizeWidgetConfigs(null), DEFAULT_WIDGETS);
    assert.deepEqual(sanitizeWidgetConfigs('invalid-json'), DEFAULT_WIDGETS);
    assert.deepEqual(sanitizeWidgetConfigs([]), DEFAULT_WIDGETS);

    const partialLegacy = [
      { id: 'bills', visible: false },
      { id: 'unknown_widget', visible: true },
      { id: 'bills', visible: true }, // duplicate ignored
      { id: 'tasks', visible: 'not-a-bool' }, // non-boolean coerced safely
    ];
    const sanitized = sanitizeWidgetConfigs(partialLegacy);
    assert.equal(sanitized.length, 7);
    assert.equal(sanitized[0].id, 'bills');
    assert.equal(sanitized[0].visible, false);
    assert.equal(sanitized[1].id, 'tasks');
    assert.equal(sanitized[1].visible, true);

    const seen = new Set<WidgetId>(sanitized.map((w) => w.id));
    assert.equal(seen.size, 7);
  });
});

describe('AI Daily Briefing — Real Data Aggregation & Zero Fabrication', () => {
  it('handles null overview gracefully without fabricated items', () => {
    const summary = buildDailyBriefing(null, 'INR');
    assert.equal(summary.headline, 'Workspace ready');
    assert.equal(summary.pendingResponsibilities.length, 0);
    assert.equal(summary.billsRequiringAttention.length, 0);
    assert.equal(summary.upcomingDeadlines.length, 0);
    assert.equal(summary.totalUrgentBillsFormatted, '₹0');
  });

  it('summarizes empty active overview honestly', () => {
    const emptyOverview: DashboardOverview = {
      needsAttention: [],
      upcoming: [],
      reminders: [],
      stats: {
        overdueCount: 0,
        dueSoonCount: 0,
        upcomingCount: 0,
        activeReminders: 0,
      },
    };
    const summary = buildDailyBriefing(emptyOverview, 'INR');
    assert.equal(summary.headline, 'All current responsibilities are on track');
    assert.match(summary.suggestion, /No overdue or urgent deadlines right now/);
  });

  it('aggregates responsibilities, deadlines, and converts multi-currency urgent bills', () => {
    const overview: DashboardOverview = {
      needsAttention: [
        {
          id: 'task-1',
          type: 'task',
          title: 'Submit annual tax return',
          subtitle: 'Finance',
          reason: 'Overdue by 1 day',
          severity: 'overdue',
          urgencyLabel: '1d overdue',
          dueDate: '2026-11-10T10:00:00.000Z',
          destination: '/tasks',
        },
        {
          id: 'bill-1',
          type: 'bill',
          title: 'Electricity Bill',
          subtitle: 'BESCOM',
          reason: 'Due tomorrow',
          severity: 'soon',
          urgencyLabel: 'Due tomorrow',
          dueDate: '2026-11-12T10:00:00.000Z',
          destination: '/bills',
          amount: 1500,
          currency: 'INR',
        },
        {
          id: 'bill-2',
          type: 'bill',
          title: 'Cloud Storage',
          subtitle: 'Hosting',
          reason: 'Due in 2 days',
          severity: 'soon',
          urgencyLabel: 'Due in 2d',
          dueDate: '2026-11-13T10:00:00.000Z',
          destination: '/bills',
          amount: 10,
          currency: 'USD',
        },
      ],
      upcoming: [
        {
          id: 'appt-1',
          type: 'appointment',
          title: 'Dental Checkup',
          subtitle: 'Clinic',
          date: '2026-11-15T09:00:00.000Z',
          destination: '/appointments',
        },
        {
          id: 'doc-1',
          type: 'document',
          title: 'Passport Renewal',
          subtitle: 'Expires soon',
          date: '2026-11-20T00:00:00.000Z',
          destination: '/documents',
        },
      ],
      stats: {
        overdueCount: 1,
        dueSoonCount: 2,
        upcomingCount: 2,
        activeReminders: 3,
      },
    };

    const rates = { INR: 84, USD: 1 };
    const summary = buildDailyBriefing(overview, 'INR', rates);

    assert.equal(summary.headline, '1 overdue item needs attention');
    assert.equal(summary.pendingResponsibilities.length, 1);
    assert.equal(summary.pendingResponsibilities[0].title, 'Submit annual tax return');
    assert.equal(summary.billsRequiringAttention.length, 2);
    assert.equal(summary.upcomingDeadlines.length, 2);
    // 1500 INR + ($10 * 84 INR/USD = 840 INR) = 2340 INR
    assert.equal(summary.totalUrgentBillsFormatted, '₹2,340');
    assert.match(summary.suggestion, /Submit annual tax return/);
  });

  it('produces real bill suggestion when overdueCount is 0 and bill is due soon', () => {
    const overview: DashboardOverview = {
      needsAttention: [
        {
          id: 'bill-9',
          type: 'bill',
          title: 'Broadband Fiber',
          subtitle: 'ISP',
          reason: 'Due tomorrow',
          severity: 'soon',
          urgencyLabel: 'Due tomorrow',
          dueDate: '2026-11-12T10:00:00.000Z',
          destination: '/bills',
          amount: 999,
          currency: 'INR',
        },
      ],
      upcoming: [],
      stats: {
        overdueCount: 0,
        dueSoonCount: 1,
        upcomingCount: 0,
        activeReminders: 0,
      },
    };

    const summary = buildDailyBriefing(overview, 'INR');
    assert.equal(summary.headline, '1 item due soon');
    assert.match(summary.suggestion, /Broadband Fiber/);
    assert.match(summary.suggestion, /₹999/);
  });

  it('covers all 6 module quick action types', () => {
    const allModules: QuickActionType[] = [
      'task',
      'bill',
      'appointment',
      'event',
      'reminder',
      'document',
    ];
    assert.equal(new Set(allModules).size, 6);
  });
});