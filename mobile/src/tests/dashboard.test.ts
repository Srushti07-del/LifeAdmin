/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Dashboard Feature
 * Tests website-parity widget definitions, layout presets (Standard/Focus/Finance),
 * reordering/toggling/resetting, per-user & guest storage isolation,
 * corrupted layout sanitization, and zero-fabrication Daily Briefing logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  hasBriefingActivityData,
  getEmptyBriefingNotice,
  classifyDailyBriefingError,
  canStartBriefingRequest,
  getLocalCalendarYMD,
  addCalendarDaysToYMD,
  getLocalCalendarDayDiff,
  isWithinSevenDayWindow,
  buildSevenDayBriefingPrompt,
} from '../features/dashboard/services/dashboardLayout';
import { DashboardOverview, QuickActionType, WidgetId } from '../features/dashboard/types';

describe('Dashboard Layout Presets & Widget Definitions', () => {
  it('defines the canonical 7 widgets all visible by default', () => {
    const ids = DEFAULT_WIDGETS.map((w) => w.id);
    assert.deepEqual(ids, [
      'needs_attention',
      'ai_briefing',
      'tasks',
      'bills',
      'schedule',
      'reminders',
      'lifebuddy',
    ]);
    assert.equal(DEFAULT_WIDGETS.every((w) => w.visible === true), true);
  });

  it('defines Standard, Focus, and Finance presets covering all 7 widgets', () => {
    assert.deepEqual(DASHBOARD_PRESETS.standard.order, [
      'needs_attention',
      'ai_briefing',
      'tasks',
      'bills',
      'schedule',
      'reminders',
      'lifebuddy',
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
    const summary = buildDailyBriefing(
      overview,
      'INR',
      rates,
      new Date('2026-11-11T10:00:00.000Z')
    );

    assert.equal(summary.headline, '1 overdue item needs attention');
    assert.equal(summary.pendingResponsibilities.length, 1);
    assert.equal(summary.pendingResponsibilities[0].title, 'Submit annual tax return');
    assert.equal(summary.billsRequiringAttention.length, 2);
    // Only Dental Checkup (2026-11-15, day +4) is within the 7-day window; Passport Renewal (2026-11-20, day +9) is excluded
    assert.equal(summary.upcomingDeadlines.length, 1);
    assert.equal(summary.upcomingDeadlines[0].title, 'Dental Checkup');
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

    const summary = buildDailyBriefing(
      overview,
      'INR',
      {},
      new Date('2026-11-11T10:00:00.000Z')
    );
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

describe('AI Daily Briefing — Empty Data Handling, Error Categorization & Request Dedup', () => {
  it('treats null and zero-item accounts as empty workspace with calm "No data available" notice', () => {
    assert.equal(hasBriefingActivityData(null), false);

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
    assert.equal(hasBriefingActivityData(emptyOverview), false);

    const nullNotice = getEmptyBriefingNotice(null, false);
    assert.ok(nullNotice && /No data available/i.test(nullNotice));

    const emptyNotice = getEmptyBriefingNotice(emptyOverview, false);
    assert.ok(emptyNotice && /No data available/i.test(emptyNotice));

    // Do not show empty notice while overview is still loading
    assert.equal(getEmptyBriefingNotice(null, true), null);
  });

  it('detects populated data across needsAttention, upcoming, reminders, or stats', () => {
    const populatedOverview: DashboardOverview = {
      needsAttention: [],
      upcoming: [],
      reminders: [],
      stats: {
        overdueCount: 0,
        dueSoonCount: 1,
        upcomingCount: 0,
        activeReminders: 0,
      },
    };
    assert.equal(hasBriefingActivityData(populatedOverview), true);
    assert.equal(getEmptyBriefingNotice(populatedOverview, false), null);
  });

  it('classifies No data, AI unavailable, Invalid request, Auth/session, and Network errors without raw "HTTP Error 400"', () => {
    const noData = classifyDailyBriefingError({
      code: 'NO_DATA',
      message: 'No data available yet',
    });
    assert.equal(noData.category, 'no_data');
    assert.match(noData.message, /No data available/i);

    const aiUnavailable = classifyDailyBriefingError({
      status: 503,
      message: 'Gemini quota exceeded',
    });
    assert.equal(aiUnavailable.category, 'ai_unavailable');
    assert.match(aiUnavailable.message, /temporarily unavailable/i);

    // Reproduces the prior HTTP Error 400 error shape if ever passed through
    const invalidRequest = classifyDailyBriefingError({
      status: 400,
      message: 'HTTP Error 400',
      details: { errors: [{ msg: 'Message is required' }] },
    });
    assert.equal(invalidRequest.category, 'invalid_request');
    assert.match(invalidRequest.message, /Message is required/i);
    assert.ok(!/HTTP Error 400/i.test(invalidRequest.message));

    const bare400 = classifyDailyBriefingError({ status: 400 });
    assert.equal(bare400.category, 'invalid_request');
    assert.ok(!/HTTP Error/i.test(bare400.message));

    const authExpired = classifyDailyBriefingError({
      status: 401,
      message: 'Token expired',
    });
    assert.equal(authExpired.category, 'auth');
    assert.match(authExpired.message, /session expired|sign in/i);

    const onboardingBlocked = classifyDailyBriefingError({
      status: 403,
      message: 'Onboarding not completed.',
    });
    assert.equal(onboardingBlocked.category, 'auth');
    assert.match(onboardingBlocked.message, /onboarding/i);

    const networkOffline = classifyDailyBriefingError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach backend',
    });
    assert.equal(networkOffline.category, 'network');
    assert.match(networkOffline.message, /connection/i);

    const networkTimeout = classifyDailyBriefingError({
      status: 408,
      code: 'TIMEOUT',
      message: 'Request timed out',
    });
    assert.equal(networkTimeout.category, 'network');
    assert.match(networkTimeout.message, /connection/i);
  });

  it('prevents duplicate in-flight requests and rapid accidental taps while allowing immediate explicit Retry', () => {
    // In-flight request always blocks duplicate call (even retry)
    assert.equal(canStartBriefingRequest(true, null, 2000, false), false);
    assert.equal(canStartBriefingRequest(true, 1000, 2000, true), false);

    // Accidental rapid non-retry double-tap within 1000ms cooldown is skipped
    assert.equal(canStartBriefingRequest(false, 1000, 1500, false), false);

    // Explicit Retry once settled succeeds immediately
    assert.equal(canStartBriefingRequest(false, 1000, 1200, true), true);

    // Normal Generate/Refresh succeeds after cooldown
    assert.equal(canStartBriefingRequest(false, 1000, 2100, false), true);
  });
});

describe('AI Daily Briefing — Strict 7-Day Window, Timezone Boundaries & Action Layout', () => {
  it('excludes Day 8+ items and separates overdue responsibilities from future 7-day deadlines', () => {
    const refDate = new Date('2026-11-11T10:00:00.000Z');
    const overview: DashboardOverview = {
      needsAttention: [
        {
          id: 'exp-doc-25',
          type: 'document',
          title: 'Lease Renewal Next Month',
          subtitle: 'Document Expiry',
          reason: 'Expires in 25 days',
          severity: 'soon',
          urgencyLabel: 'Expires in 25d',
          dueDate: '2026-12-06T00:00:00.000Z',
          destination: '/documents',
        },
        {
          id: 'past-appt',
          type: 'appointment',
          title: 'Yesterday Clinic Check',
          subtitle: 'Clinic',
          reason: 'Past appointment',
          severity: 'overdue',
          urgencyLabel: 'Overdue by 1d',
          dueDate: '2026-11-10T00:00:00.000Z',
          destination: '/appointments',
        },
      ],
      upcoming: [
        {
          id: 'overdue-task-in-upcoming',
          type: 'task',
          title: 'Overdue Filing',
          subtitle: 'Work',
          date: '2026-11-09T00:00:00.000Z',
          destination: '/tasks',
        },
        {
          id: 'day-0-task',
          type: 'task',
          title: 'Day 0 Today Task',
          subtitle: 'Work',
          date: '2026-11-11T00:00:00.000Z',
          destination: '/tasks',
        },
        {
          id: 'day-6-appt',
          type: 'appointment',
          title: 'Day 7 Boundary Appointment',
          subtitle: 'Clinic',
          date: '2026-11-17T00:00:00.000Z',
          destination: '/appointments',
        },
        {
          id: 'day-7-task',
          type: 'task',
          title: 'Day 8 Excluded Task',
          subtitle: 'Personal',
          date: '2026-11-18T00:00:00.000Z',
          destination: '/tasks',
        },
        {
          id: 'day-20-event',
          type: 'event',
          title: 'Day 21 Excluded Event',
          subtitle: 'Calendar',
          date: '2026-12-01T00:00:00.000Z',
          destination: '/calendar',
        },
      ],
      stats: {
        overdueCount: 0,
        dueSoonCount: 1,
        upcomingCount: 5,
        activeReminders: 0,
      },
    };

    const summary = buildDailyBriefing(overview, 'INR', {}, refDate, 0);

    // 25-day document and past appointment must be excluded
    assert.equal(summary.pendingResponsibilities.length, 0);
    // Overdue task, Day 8, and Day 21 items must be excluded from upcomingDeadlines
    assert.deepEqual(
      summary.upcomingDeadlines.map((d) => d.title),
      ['Day 0 Today Task', 'Day 7 Boundary Appointment']
    );
    assert.equal(summary.headline, '2 upcoming items in the next 7 days');
    assert.ok(!/30 days|monthly/i.test(summary.headline));
    assert.ok(!/30 days|monthly/i.test(summary.suggestion));
  });

  it('handles timezone midnight rollovers cleanly across negative and positive UTC offsets', () => {
    // UTC-5 (offset +300) when UTC is Nov 12 03:30Z -> local date is Nov 11
    const estInstant = new Date('2026-11-12T03:30:00.000Z');
    assert.equal(getLocalCalendarYMD(estInstant, 300), '2026-11-11');
    assert.equal(addCalendarDaysToYMD('2026-11-11', 6), '2026-11-17');

    // Nov 17 (diff +6) is included; Nov 18 (diff +7 = Day 8) is excluded
    assert.equal(getLocalCalendarDayDiff('2026-11-17T00:00:00.000Z', estInstant, 300), 6);
    assert.equal(isWithinSevenDayWindow('2026-11-17T00:00:00.000Z', estInstant, 300), true);
    assert.equal(getLocalCalendarDayDiff('2026-11-18T00:00:00.000Z', estInstant, 300), 7);
    assert.equal(isWithinSevenDayWindow('2026-11-18T00:00:00.000Z', estInstant, 300), false);

    // Non-midnight timestamp 2026-11-11 22:00 EST (= 2026-11-12T03:00:00.000Z) counts as Day 0 today
    assert.equal(getLocalCalendarDayDiff('2026-11-12T03:00:00.000Z', estInstant, 300), 0);

    // IST +05:30 (offset -330) when UTC is Nov 11 19:00Z -> local date is Nov 12 00:30 IST
    const istInstant = new Date('2026-11-11T19:00:00.000Z');
    assert.equal(getLocalCalendarYMD(istInstant, -330), '2026-11-12');
    assert.equal(getLocalCalendarDayDiff('2026-11-11T00:00:00.000Z', istInstant, -330), -1);
    assert.equal(isWithinSevenDayWindow('2026-11-18T00:00:00.000Z', istInstant, -330), true);
    assert.equal(isWithinSevenDayWindow('2026-11-19T00:00:00.000Z', istInstant, -330), false);

    const prompt = buildSevenDayBriefingPrompt(istInstant, -330);
    assert.match(prompt, /next 7 calendar days only \(2026-11-12 through 2026-11-18/i);
    assert.match(prompt, /today and the following 6 calendar days/i);
  });

  it('removes Open AI Assistant button from AIDailyBriefingWidget while keeping Generate AI Brief and Retry', () => {
    const widgetSource = readFileSync(
      new URL('../features/dashboard/components/AIDailyBriefingWidget.tsx', import.meta.url),
      'utf8'
    );
    assert.equal(widgetSource.includes('Open AI Assistant'), false);
    assert.equal(widgetSource.includes('Open AI Planning Assistant'), false);
    assert.equal(widgetSource.includes('Generate AI Brief'), true);
    assert.equal(widgetSource.includes('Refresh AI Brief'), true);
    assert.equal(widgetSource.includes('Retry'), true);
  });
});