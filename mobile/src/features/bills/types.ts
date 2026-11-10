/**
 * LifeAdmin Mobile Bills & Payments Types
 * Synchronized with backend models and client/src/pages/BillsPage.tsx
 */

import { PaymentStatus, RecurrenceConfig } from '@/types/entities';
import { CurrencyCode } from '@/utils/currency';

export type BillFilterKey = 'all' | 'upcoming' | 'paid' | 'overdue';
export type BillSortKey = 'dueDate' | '-dueDate' | 'amount' | '-amount';

export type BillDisplayStatusKey = 'paid' | 'overdue' | 'due_soon' | 'upcoming' | 'unpaid';

export interface BillDisplayStatus {
  key: BillDisplayStatusKey;
  label: string;
}

export interface Bill {
  _id: string;
  userId: string;
  name: string;
  title?: string;
  description?: string;
  provider?: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  paymentStatus: PaymentStatus;
  status?: PaymentStatus;
  paidAt?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  reminderDaysBefore?: number[];
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BillFormData {
  name: string;
  description: string;
  provider: string;
  amount: string;
  currency: string;
  dueDate: string; // YYYY-MM-DD
  category: string;
  recurrenceType: string;
  notes: string;
}

export interface BillTotals {
  dueThisMonthAmount: number;
  paidAmount: number;
  pendingDueSoonAmount: number;
  overdueAmount: number;
  totalBillsCount: number;
  paidCount: number;
  overdueCount: number;
  upcomingCount: number;
  paymentProgress: number; // 0 to 1
}

export interface FetchBillsParams {
  paymentStatus?: string;
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

