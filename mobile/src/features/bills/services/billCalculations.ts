/**
 * LifeAdmin Mobile Bills Calculations & Utilities
 * Pure domain logic: urgency status, monthly workload totals, currency conversions,
 * category/search filtering, and sorting.
 */

import { CurrencyCode, convertAmountTo } from '../../../utils/currency';
import {
  Bill,
  BillDisplayStatus,
  BillFilterKey,
  BillSortKey,
  BillTotals,
} from '../types';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Computes human-friendly urgency & display status for a bill
 * Matching client/src/pages/BillsPage.tsx
 */
export function displayStatus(bill: Bill): BillDisplayStatus {
  if (bill.paymentStatus === 'paid' || bill.status === 'paid') {
    return { key: 'paid', label: 'Paid' };
  }

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(bill.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: 'overdue', label: 'Overdue' };
  }
  if (diffDays <= 3) {
    return { key: 'due_soon', label: 'Due Soon' };
  }
  if (bill.paymentStatus === 'upcoming' || bill.status === 'upcoming') {
    return { key: 'upcoming', label: 'Upcoming' };
  }
  return { key: 'unpaid', label: 'Unpaid' };
}

/**
 * Calculates summary metrics for the bills dashboard in user's preferred currency
 */
export function calculateBillTotals(
  bills: Bill[],
  preferredCurrency: CurrencyCode = 'INR',
  rates: Record<string, number> = {}
): BillTotals {
  const now = new Date();

  const convert = (amount: number, from: string) =>
    convertAmountTo(amount, from, preferredCurrency, rates);

  const overdue = bills.filter(
    (b) => (b.paymentStatus !== 'paid' && b.status !== 'paid') && displayStatus(b).key === 'overdue'
  );
  const paid = bills.filter(
    (b) => b.paymentStatus === 'paid' || b.status === 'paid'
  );
  const upcoming = bills.filter(
    (b) => (b.paymentStatus !== 'paid' && b.status !== 'paid') && displayStatus(b).key !== 'overdue'
  );
  const dueThisMonth = bills.filter(
    (b) => (b.paymentStatus !== 'paid' && b.status !== 'paid') && sameMonth(new Date(b.dueDate), now)
  );
  const dueSoon = bills.filter(
    (b) => (b.paymentStatus !== 'paid' && b.status !== 'paid') && displayStatus(b).key === 'due_soon'
  );

  const overdueAmount = overdue.reduce((sum, b) => sum + convert(b.amount || 0, b.currency), 0);
  const paidAmount = paid.reduce((sum, b) => sum + convert(b.amount || 0, b.currency), 0);
  const dueThisMonthAmount = dueThisMonth.reduce(
    (sum, b) => sum + convert(b.amount || 0, b.currency),
    0
  );
  const pendingDueSoonAmount = dueSoon.reduce(
    (sum, b) => sum + convert(b.amount || 0, b.currency),
    0
  );

  const totalMonthlyWorkload = paidAmount + dueThisMonthAmount;
  const paymentProgress =
    totalMonthlyWorkload > 0
      ? Math.min(1, Math.max(0, paidAmount / totalMonthlyWorkload))
      : paid.length > 0
      ? 1
      : 0;

  return {
    dueThisMonthAmount,
    paidAmount,
    pendingDueSoonAmount,
    overdueAmount,
    totalBillsCount: bills.length,
    paidCount: paid.length,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    paymentProgress,
  };
}

/**
 * Filter, search, and sort bills collection locally
 */
export function filterAndSortBills(
  bills: Bill[],
  filter: BillFilterKey = 'all',
  searchQuery: string = '',
  sort: BillSortKey = 'dueDate',
  selectedCategory?: string
): Bill[] {
  const q = searchQuery.trim().toLowerCase();

  let list = bills.filter((b) => {
    const ds = displayStatus(b);

    if (filter === 'paid') {
      if (b.paymentStatus !== 'paid' && b.status !== 'paid') return false;
    } else if (filter === 'overdue') {
      if (ds.key !== 'overdue') return false;
    } else if (filter === 'upcoming') {
      if (b.paymentStatus === 'paid' || b.status === 'paid' || ds.key === 'overdue') return false;
    }

    if (selectedCategory && selectedCategory !== 'All') {
      if ((b.category || 'Finance').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  if (q) {
    list = list.filter(
      (b) =>
        (b.name || b.title || '').toLowerCase().includes(q) ||
        (b.provider || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
    );
  }

  list = [...list].sort((a, b) => {
    if (sort === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sort === '-dueDate') {
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    }
    if (sort === 'amount') {
      return (a.amount || 0) - (b.amount || 0);
    }
    if (sort === '-amount') {
      return (b.amount || 0) - (a.amount || 0);
    }
    return 0;
  });

  return list;
}

