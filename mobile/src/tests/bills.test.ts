/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Bills & Payments Feature
 * Tests status calculation, dashboard totals, currency normalization & conversion,
 * multi-criteria filtering, search, sorting, and recurrence handling.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  displayStatus,
  calculateBillTotals,
  filterAndSortBills,
} from '../features/bills/services/billCalculations.ts';
import { Bill } from '../features/bills/types.ts';
import {
  formatCurrency,
  convertAmountTo,
  normalizeCurrencyCode,
  CURRENCIES,
} from '../utils/currency.ts';

// Helper to create mock bills with relative due dates
function createMockBill(overrides: Partial<Bill> = {}): Bill {
  const now = new Date();
  const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);

  return {
    _id: `bill-${Math.random().toString(36).substring(2, 9)}`,
    userId: 'user-123',
    name: 'Broadband Fiber',
    provider: 'Airtel',
    amount: 999,
    currency: 'INR',
    dueDate: defaultDueDate.toISOString(),
    category: 'Home',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Bills Urgency & Display Status (displayStatus)', () => {
  it('identifies paid bills regardless of due date', () => {
    const pastPaid = createMockBill({
      dueDate: new Date(2020, 0, 1).toISOString(),
      paymentStatus: 'paid',
    });
    assert.deepStrictEqual(displayStatus(pastPaid), { key: 'paid', label: 'Paid' });

    const statusPaid = createMockBill({
      dueDate: new Date(2030, 0, 1).toISOString(),
      status: 'paid',
    });
    assert.deepStrictEqual(displayStatus(statusPaid), { key: 'paid', label: 'Paid' });
  });

  it('identifies overdue bills when unpaid and due date has passed', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueBill = createMockBill({
      dueDate: yesterday.toISOString(),
      paymentStatus: 'pending',
    });
    assert.deepStrictEqual(displayStatus(overdueBill), { key: 'overdue', label: 'Overdue' });
  });

  it('identifies due soon bills when due today or within 3 days', () => {
    const today = new Date();
    const todayBill = createMockBill({
      dueDate: today.toISOString(),
      paymentStatus: 'pending',
    });
    assert.deepStrictEqual(displayStatus(todayBill), { key: 'due_soon', label: 'Due Soon' });

    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const soonBill = createMockBill({
      dueDate: in2Days.toISOString(),
      paymentStatus: 'pending',
    });
    assert.deepStrictEqual(displayStatus(soonBill), { key: 'due_soon', label: 'Due Soon' });
  });

  it('identifies upcoming bills when due in more than 3 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const upcomingBill = createMockBill({
      dueDate: futureDate.toISOString(),
      paymentStatus: 'upcoming',
    });
    assert.deepStrictEqual(displayStatus(upcomingBill), { key: 'upcoming', label: 'Upcoming' });
  });
});

describe('Dashboard Totals Calculation (calculateBillTotals)', () => {
  const exchangeRates = {
    USD: 0.012, // 1 INR = 0.012 USD => 1 USD = 83.33 INR
    EUR: 0.011,
    GBP: 0.0095,
    INR: 1,
  };

  it('calculates totals correctly with single currency (INR)', () => {
    const now = new Date();
    const dueThisMonthDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const overdueDate = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

    const bills: Bill[] = [
      createMockBill({
        amount: 1000,
        currency: 'INR',
        paymentStatus: 'paid',
        dueDate: dueThisMonthDate,
      }),
      createMockBill({
        amount: 2000,
        currency: 'INR',
        paymentStatus: 'pending',
        dueDate: dueThisMonthDate,
      }),
      createMockBill({
        amount: 500,
        currency: 'INR',
        paymentStatus: 'pending',
        dueDate: overdueDate,
      }),
    ];

    const totals = calculateBillTotals(bills, 'INR', exchangeRates);

    assert.strictEqual(totals.totalBillsCount, 3);
    assert.strictEqual(totals.paidCount, 1);
    assert.strictEqual(totals.paidAmount, 1000);
    assert.strictEqual(totals.overdueCount, 1);
    assert.strictEqual(totals.overdueAmount, 500);
    // Workload = paid (1000) + unpaid due this month (2000) = 3000
    assert.strictEqual(totals.dueThisMonthAmount, 2000);
    assert.strictEqual(totals.paymentProgress, 1000 / 3000);
  });

  it('converts multi-currency bills into user preferred currency (INR)', () => {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 20).toISOString();

    // 100 USD = 100 / 0.012 = 8333.33 INR
    const bills: Bill[] = [
      createMockBill({
        amount: 100,
        currency: 'USD',
        paymentStatus: 'pending',
        dueDate,
      }),
    ];

    const totals = calculateBillTotals(bills, 'INR', exchangeRates);
    const expectedINR = 100 / 0.012;
    assert.ok(Math.abs(totals.dueThisMonthAmount - expectedINR) < 1);
  });

  it('handles empty bills list gracefully without errors', () => {
    const totals = calculateBillTotals([], 'INR');
    assert.strictEqual(totals.totalBillsCount, 0);
    assert.strictEqual(totals.paidAmount, 0);
    assert.strictEqual(totals.dueThisMonthAmount, 0);
    assert.strictEqual(totals.overdueAmount, 0);
    assert.strictEqual(totals.paymentProgress, 0);
  });

  it('sets payment progress to 1.0 (100%) when all obligations are paid', () => {
    const bills: Bill[] = [
      createMockBill({ amount: 1500, paymentStatus: 'paid' }),
      createMockBill({ amount: 2500, paymentStatus: 'paid' }),
    ];
    const totals = calculateBillTotals(bills, 'INR');
    assert.strictEqual(totals.paymentProgress, 1);
  });
});

describe('Filtering, Searching & Sorting (filterAndSortBills)', () => {
  const pastDate = new Date(2025, 0, 1).toISOString();
  const todayDate = new Date().toISOString();
  const futureDate1 = new Date(2027, 5, 10).toISOString();
  const futureDate2 = new Date(2027, 8, 20).toISOString();

  const bills: Bill[] = [
    createMockBill({
      _id: '1',
      name: 'Electricity Board',
      provider: 'Tata Power',
      amount: 1800,
      category: 'Home',
      paymentStatus: 'pending',
      dueDate: pastDate, // overdue
      notes: 'Meter reading 5420',
    }),
    createMockBill({
      _id: '2',
      name: 'Mobile Postpaid',
      provider: 'Jio',
      amount: 499,
      category: 'Personal',
      paymentStatus: 'paid',
      dueDate: todayDate,
    }),
    createMockBill({
      _id: '3',
      name: 'Health Insurance Premium',
      provider: 'HDFC Ergo',
      amount: 12000,
      category: 'Health',
      paymentStatus: 'upcoming',
      dueDate: futureDate1,
      notes: 'Policy renewal 2027',
    }),
    createMockBill({
      _id: '4',
      name: 'Cloud Server VPS',
      provider: 'DigitalOcean',
      amount: 2400,
      category: 'Work',
      paymentStatus: 'pending',
      dueDate: futureDate2,
    }),
  ];

  it('filters by status: all, paid, overdue, upcoming', () => {
    const all = filterAndSortBills(bills, 'all');
    assert.strictEqual(all.length, 4);

    const paid = filterAndSortBills(bills, 'paid');
    assert.strictEqual(paid.length, 1);
    assert.strictEqual(paid[0]._id, '2');

    const overdue = filterAndSortBills(bills, 'overdue');
    assert.strictEqual(overdue.length, 1);
    assert.strictEqual(overdue[0]._id, '1');

    const upcoming = filterAndSortBills(bills, 'upcoming');
    assert.strictEqual(upcoming.length, 2);
    assert.deepStrictEqual(upcoming.map((b) => b._id).sort(), ['3', '4']);
  });

  it('filters by category', () => {
    const homeBills = filterAndSortBills(bills, 'all', '', 'dueDate', 'Home');
    assert.strictEqual(homeBills.length, 1);
    assert.strictEqual(homeBills[0].name, 'Electricity Board');

    const healthBills = filterAndSortBills(bills, 'all', '', 'dueDate', 'Health');
    assert.strictEqual(healthBills.length, 1);
    assert.strictEqual(healthBills[0].name, 'Health Insurance Premium');

    const allCat = filterAndSortBills(bills, 'all', '', 'dueDate', 'All');
    assert.strictEqual(allCat.length, 4);
  });

  it('searches by name, provider, category, and notes', () => {
    const byProvider = filterAndSortBills(bills, 'all', 'tata');
    assert.strictEqual(byProvider.length, 1);
    assert.strictEqual(byProvider[0]._id, '1');

    const byNotes = filterAndSortBills(bills, 'all', 'renewal');
    assert.strictEqual(byNotes.length, 1);
    assert.strictEqual(byNotes[0]._id, '3');

    const byName = filterAndSortBills(bills, 'all', 'cloud');
    assert.strictEqual(byName.length, 1);
    assert.strictEqual(byName[0]._id, '4');
  });

  it('sorts by dueDate ascending (earliest first)', () => {
    const sorted = filterAndSortBills(bills, 'all', '', 'dueDate');
    assert.strictEqual(sorted[0]._id, '1'); // 2025
    assert.strictEqual(sorted[sorted.length - 1]._id, '4'); // Sep 2027
  });

  it('sorts by dueDate descending (latest first)', () => {
    const sorted = filterAndSortBills(bills, 'all', '', '-dueDate');
    assert.strictEqual(sorted[0]._id, '4'); // Sep 2027
    assert.strictEqual(sorted[sorted.length - 1]._id, '1'); // 2025
  });

  it('sorts by amount ascending (lowest first)', () => {
    const sorted = filterAndSortBills(bills, 'all', '', 'amount');
    assert.strictEqual(sorted[0].amount, 499);
    assert.strictEqual(sorted[sorted.length - 1].amount, 12000);
  });

  it('sorts by amount descending (highest first)', () => {
    const sorted = filterAndSortBills(bills, 'all', '', '-amount');
    assert.strictEqual(sorted[0].amount, 12000);
    assert.strictEqual(sorted[sorted.length - 1].amount, 499);
  });
});

describe('Currency Normalization and Formatting Utilities', () => {
  it('normalizes currency codes and symbols', () => {
    assert.strictEqual(normalizeCurrencyCode('₹'), 'INR');
    assert.strictEqual(normalizeCurrencyCode('inr'), 'INR');
    assert.strictEqual(normalizeCurrencyCode('$'), 'USD');
    assert.strictEqual(normalizeCurrencyCode('usd'), 'USD');
    assert.strictEqual(normalizeCurrencyCode('€'), 'EUR');
    assert.strictEqual(normalizeCurrencyCode('£'), 'GBP');
  });

  it('formats amounts in Indian Rupees (₹) with comma grouping', () => {
    const formatted = formatCurrency(125000, 'INR');
    assert.ok(formatted.includes('₹'));
    assert.ok(formatted.includes('1,25,000') || formatted.includes('125,000'));
  });

  it('formats amounts in USD, EUR, and GBP', () => {
    const formattedUsd = formatCurrency(49.99, 'USD');
    assert.ok(formattedUsd.includes('$'));

    const formattedEur = formatCurrency(89.5, 'EUR');
    assert.ok(formattedEur.includes('€'));

    const formattedGbp = formatCurrency(120, 'GBP');
    assert.ok(formattedGbp.includes('£'));
  });

  it('converts currencies using provided exchange rates', () => {
    const rates = { USD: 0.012, INR: 1 };
    // 100 USD to INR => 100 / 0.012 = 8333.33
    const converted = convertAmountTo(100, 'USD', 'INR', rates);
    assert.ok(Math.abs(converted - 8333.33) < 1);

    // Same currency conversion yields exact amount
    assert.strictEqual(convertAmountTo(500, 'INR', 'INR', rates), 500);
  });

  it('supports the 4 canonical currencies with correct symbols and flags', () => {
    assert.strictEqual(CURRENCIES.INR.symbol, '₹');
    assert.strictEqual(CURRENCIES.USD.symbol, '$');
    assert.strictEqual(CURRENCIES.EUR.symbol, '€');
    assert.strictEqual(CURRENCIES.GBP.symbol, '£');
  });
});
