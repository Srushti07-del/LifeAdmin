/**
 * Stage 4 Milestone 2 Regression Tests:
 * Native Date/Time Pickers, Strict Calendar/Time Validation, Time Range Ordering,
 * Optional Clearing, and ISO Currency Consistency across Forms, Documents, AI, and Dashboard.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  toLocalISODate,
  parseLocalISODate,
  isValidLocalISODate,
  formatDisplayDate,
  resolveDatePickerSelection,
  toUtcMidnightIsoFromLocalDate,
  parseHHMMTime,
  isValidHHMMTime,
  toHHMMTime,
  parseHHMMTimeToDate,
  formatDisplayTime,
  resolveTimePickerSelection,
  validateTimeRangeOrder,
} from '../utils/dateTimeValidation.ts';
import {
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
  tryNormalizeCurrencyCode,
  resolveTransactionCurrency,
  formatCurrency,
} from '../utils/currency.ts';
import {
  validateProposedAction,
  formatActionSubtitle,
  normalizeProposedActionCurrency,
} from '../features/ai/services/aiCalculations.ts';
import { prepareEntityFromExtraction } from '../features/documents/services/documentCalculations.ts';
import type { DocumentItem } from '../features/documents/types.ts';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

describe('Milestone 2 — Strict Calendar Date Validation & Formatting', () => {
  it('rejects impossible calendar dates and malformed date strings', () => {
    const invalidDates = [
      '2026-02-30',
      '2025-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-01-00',
      '2026-2-5',
      '2026/11/20',
      'not-a-date',
      '',
      null,
      undefined,
    ];

    for (const d of invalidDates) {
      assert.strictEqual(isValidLocalISODate(d as string | null | undefined), false, `Expected invalid: ${String(d)}`);
      assert.strictEqual(parseLocalISODate(d as string | null | undefined), null);
    }
  });

  it('accepts valid leap-year and standard dates without calendar rollover', () => {
    const validDates = ['2024-02-29', '2026-02-28', '2026-11-20', '2026-12-31'];
    for (const d of validDates) {
      assert.strictEqual(isValidLocalISODate(d), true, `Expected valid: ${d}`);
      const parsed = parseLocalISODate(d);
      assert.ok(parsed instanceof Date);
      assert.strictEqual(toLocalISODate(parsed), d);
    }
  });

  it('formats local dates and converts to UTC midnight ISO without day drift', () => {
    const earlyMorning = new Date(2026, 10, 15, 0, 5, 0);
    const lateNight = new Date(2026, 10, 15, 23, 55, 0);
    assert.strictEqual(toLocalISODate(earlyMorning), '2026-11-15');
    assert.strictEqual(toLocalISODate(lateNight), '2026-11-15');

    assert.strictEqual(
      toUtcMidnightIsoFromLocalDate('2026-11-15'),
      '2026-11-15T00:00:00.000Z'
    );
    assert.strictEqual(toUtcMidnightIsoFromLocalDate('2026-02-30'), null);
    assert.strictEqual(formatDisplayDate('2026-11-15'), 'Sun, Nov 15, 2026');
    assert.strictEqual(formatDisplayDate('2026-02-30', 'No date'), 'No date');
  });

  it('preserves existing date on picker dismiss and applies newly selected date', () => {
    const picked = new Date(2026, 10, 22, 14, 0, 0);
    assert.strictEqual(resolveDatePickerSelection('2026-11-15', picked, true), '2026-11-15');
    assert.strictEqual(resolveDatePickerSelection('2026-11-15', null, false), '2026-11-15');
    assert.strictEqual(resolveDatePickerSelection('2026-11-15', picked, false), '2026-11-22');
  });
});

describe('Milestone 2 — Strict 24-Hour Time Validation & Ordering', () => {
  it('validates strict 24-hour HH:mm strings and rejects malformed times', () => {
    const validTimes = ['00:00', '09:05', '12:00', '14:30', '23:59'];
    for (const t of validTimes) {
      assert.strictEqual(isValidHHMMTime(t), true, `Expected valid time: ${t}`);
    }

    const invalidTimes = ['24:00', '23:60', '9:30', '14:5', '14:30:00', 'ab:cd', '', null, undefined];
    for (const t of invalidTimes) {
      assert.strictEqual(isValidHHMMTime(t as string | null | undefined), false, `Expected invalid time: ${String(t)}`);
      assert.strictEqual(parseHHMMTime(t as string | null | undefined), null);
    }
  });

  it('hydrates Dates, formats 12-hour display labels, and handles picker cancellation', () => {
    const hydrated = parseHHMMTimeToDate('14:30');
    assert.ok(hydrated instanceof Date);
    assert.strictEqual(toHHMMTime(hydrated), '14:30');
    assert.strictEqual(formatDisplayTime('00:00'), '12:00 AM');
    assert.strictEqual(formatDisplayTime('12:05'), '12:05 PM');
    assert.strictEqual(formatDisplayTime('14:30'), '2:30 PM');
    assert.strictEqual(formatDisplayTime('', 'Pick time'), 'Pick time');

    const picked = new Date(2026, 10, 15, 16, 45, 0);
    assert.strictEqual(resolveTimePickerSelection('09:00', picked, true), '09:00');
    assert.strictEqual(resolveTimePickerSelection('09:00', null, false), '09:00');
    assert.strictEqual(resolveTimePickerSelection('09:00', picked, false), '16:45');
  });

  it('enforces start/end time ordering while supporting optional clearing', () => {
    assert.deepEqual(validateTimeRangeOrder('', '', { requireStartWhenEndSet: true }), { valid: true });
    assert.deepEqual(validateTimeRangeOrder('09:30', '', { requireStartWhenEndSet: true }), { valid: true });
    assert.deepEqual(validateTimeRangeOrder('09:30', '10:00', { requireStartWhenEndSet: true }), { valid: true });

    const missingStart = validateTimeRangeOrder('', '10:00', { requireStartWhenEndSet: true });
    assert.strictEqual(missingStart.valid, false);
    assert.ok(missingStart.startError);

    const equalTimes = validateTimeRangeOrder('10:00', '10:00');
    assert.strictEqual(equalTimes.valid, false);
    assert.ok(equalTimes.endError);

    const invertedTimes = validateTimeRangeOrder('14:00', '13:59');
    assert.strictEqual(invertedTimes.valid, false);
    assert.ok(invertedTimes.endError);
  });
});

describe('Milestone 2 — AI Validation Safeguards & Currency Consistency', () => {
  it('rejects impossible AI proposed dates and invalid times in validateProposedAction', () => {
    const invalidDateResult = validateProposedAction({
      type: 'task',
      title: 'Check tax notice',
      dueDate: '2026-02-30',
    });
    assert.strictEqual(invalidDateResult.valid, false);
    assert.ok(invalidDateResult.errors.some((e) => /valid calendar date/i.test(e)));

    const invalidTimeResult = validateProposedAction({
      type: 'reminder',
      title: 'Take medicine',
      dueDate: '2026-11-20',
      dueTime: '25:10',
    });
    assert.strictEqual(invalidTimeResult.valid, false);
    assert.ok(invalidTimeResult.errors.some((e) => /HH:mm/i.test(e)));
  });

  it('resolves explicit currency > user preferredCurrency > INR fallback cleanly', () => {
    assert.strictEqual(resolveTransactionCurrency('USD', 'INR'), 'USD');
    assert.strictEqual(resolveTransactionCurrency('$', 'INR'), 'USD');
    assert.strictEqual(resolveTransactionCurrency(undefined, 'EUR'), 'EUR');
    assert.strictEqual(resolveTransactionCurrency('', 'USD'), 'USD');
    assert.strictEqual(resolveTransactionCurrency(undefined, undefined), DEFAULT_CURRENCY);
    assert.strictEqual(tryNormalizeCurrencyCode('invalid'), null);
    assert.strictEqual(normalizeCurrencyCode('₹'), 'INR');
  });

  it('formats AI subtitles with preferredCurrency and preserves explicit currency on actions', () => {
    const noCurrencyBill = {
      type: 'bill' as const,
      title: 'Internet bill',
      amount: 50,
    };
    assert.ok(formatActionSubtitle(noCurrencyBill, 'USD').includes('$50'));
    assert.ok(formatActionSubtitle(noCurrencyBill, 'INR').includes('₹50'));

    const explicitEurBill = {
      type: 'bill' as const,
      title: 'Hosting bill',
      amount: 20,
      currency: 'EUR',
    };
    assert.ok(formatActionSubtitle(explicitEurBill, 'USD').includes('€20'));

    const normalizedMissing = normalizeProposedActionCurrency(noCurrencyBill, 'USD');
    assert.strictEqual(normalizedMissing.currency, 'USD');

    const normalizedSymbol = normalizeProposedActionCurrency(
      { ...noCurrencyBill, currency: '₹' },
      'USD'
    );
    assert.strictEqual(normalizedSymbol.currency, 'INR');

    const nonFinancialTask = normalizeProposedActionCurrency(
      { type: 'task', title: 'Organize desk' },
      'USD'
    );
    assert.strictEqual(nonFinancialTask.currency, undefined);
  });

  it('formats currencies for distinct user preferences', () => {
    assert.strictEqual(formatCurrency(1500, 'USD'), '$1,500');
    assert.strictEqual(formatCurrency(1500, 'EUR'), '€1,500');
    assert.strictEqual(formatCurrency(1500, 'INR'), '₹1,500');
  });

  it('preserves extracted currency and calendar date when converting document extractions', () => {
    const doc = {
      _id: 'doc-1',
      originalName: 'Cloud_Invoice.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      category: 'Financial',
      aiProcessed: true,
      aiExtractionStatus: 'completed',
      aiExtracted: {
        provider: 'AWS',
        importantDates: [{ label: 'Due', date: '2026-11-25T00:00:00.000Z' }],
        amounts: [{ label: 'Total', amount: 120, currency: 'USD' }],
      },
    } as DocumentItem;

    const prepared = prepareEntityFromExtraction(doc, 'bill');
    assert.strictEqual(prepared.dueDate, '2026-11-25');
    assert.strictEqual(prepared.currency, 'USD');
    assert.strictEqual(prepared.amount, 120);
  });
});

describe('Milestone 2 — Native Picker Hardening, Optional Clear & ISO Payload Checks', () => {
  it('hardens Android native pickers for repeated opens and renders non-nested Clear buttons', () => {
    const datePickerSrc = readMobileFile('src/components/ui/DatePickerField.tsx');
    const timePickerSrc = readMobileFile('src/components/ui/TimePickerField.tsx');

    for (const src of [datePickerSrc, timePickerSrc]) {
      assert.ok(src.includes('pickerInstanceKey'), 'Expected unique picker instance key per open');
      assert.ok(src.includes('handledSessionRef'), 'Expected single-fire Android session ref guard');
      assert.ok(src.includes('allowClear'), 'Expected optional clear support');
      // Ensure Clear button is outside the trigger Pressable (accessibility / zero nested pressables)
      assert.ok(src.includes('styles.fieldRow'), 'Expected sibling trigger + Clear row layout');
      const triggerCloseIdx = src.indexOf('</Pressable>');
      const clearBtnIdx = src.indexOf('{showClearBtn');
      assert.ok(triggerCloseIdx !== -1 && clearBtnIdx > triggerCloseIdx);
    }
  });

  it('replaces raw YYYY-MM-DD / HH:mm inputs with DatePickerField / TimePickerField in all Milestone 2 forms', () => {
    const dateFormFiles = [
      'src/features/tasks/components/TaskFormModal.tsx',
      'src/features/bills/components/BillFormModal.tsx',
      'src/features/reminders/components/ReminderFormModal.tsx',
      'src/features/appointments/components/AppointmentFormModal.tsx',
      'src/features/documents/components/DocumentUploadModal.tsx',
      'src/features/documents/components/DocumentEntityConversionModal.tsx',
      'src/features/ai/components/ActionConfirmationModal.tsx',
      'src/features/ai/components/GoalPlannerView.tsx',
    ];
    for (const file of dateFormFiles) {
      const src = readMobileFile(file);
      assert.ok(src.includes('DatePickerField'), `Expected DatePickerField in ${file}`);
      assert.ok(!src.includes('placeholder="YYYY-MM-DD"'), `Raw YYYY-MM-DD input remains in ${file}`);
    }

    const timeFormFiles = [
      'src/features/tasks/components/TaskFormModal.tsx',
      'src/features/reminders/components/ReminderFormModal.tsx',
      'src/features/appointments/components/AppointmentFormModal.tsx',
      'src/features/calendar/components/EventFormModal.tsx',
      'src/features/ai/components/ActionConfirmationModal.tsx',
    ];
    for (const file of timeFormFiles) {
      const src = readMobileFile(file);
      assert.ok(src.includes('TimePickerField'), `Expected TimePickerField in ${file}`);
    }
  });

  it('sends ISO currency codes (never display symbols like ₹) in Quick Action and AI/Bill payloads', () => {
    const quickActionSrc = readMobileFile('src/features/dashboard/components/QuickActionModal.tsx');
    const dashboardApiSrc = readMobileFile('src/features/dashboard/api.ts');
    const docConversionSrc = readMobileFile('src/features/documents/components/DocumentEntityConversionModal.tsx');
    const docCardSrc = readMobileFile('src/features/documents/components/DocumentCard.tsx');
    const docDetailsSrc = readMobileFile('src/features/documents/components/DocumentDetailsModal.tsx');

    assert.ok(!quickActionSrc.includes("currency: '₹'"));
    assert.ok(!dashboardApiSrc.includes("data.currency || '₹'"));
    assert.ok(quickActionSrc.includes('preferredCurrency'));
    assert.ok(docConversionSrc.includes('resolveTransactionCurrency'));
    assert.ok(!docCardSrc.includes('₹{firstAmount'));
    assert.ok(!docDetailsSrc.includes('₹{item.amount'));
  });
});
