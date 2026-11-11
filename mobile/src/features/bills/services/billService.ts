/**
 * Bill Service & Business Logic Engine
 * Communicates with backend endpoints at /api/bills and /api/currency/rates.
 * Implements CRUD operations, status transitions, and re-exports domain calculations.
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { normalizeCurrencyCode } from '@/utils/currency';
import { Bill, FetchBillsParams } from '../types';

export * from './billCalculations';

export const billService = {
  /**
   * Fetches bills list from backend
   */
  async fetchBills(params?: FetchBillsParams): Promise<{ bills: Bill[]; pagination: any }> {
    return apiClient.get<{ bills: Bill[]; pagination: any }>(Endpoints.bills.list, {
      params: {
        sort: params?.sort || 'dueDate',
        limit: params?.limit || 300,
        ...params,
      },
    });
  },

  /**
   * Fetches single bill by ID
   */
  async getBillById(id: string): Promise<{ bill: Bill }> {
    return apiClient.get<{ bill: Bill }>(Endpoints.bills.getById(id));
  },

  /**
   * Creates a new bill
   */
  async createBill(data: Partial<Bill>): Promise<{ message: string; bill: Bill }> {
    return apiClient.post<{ message: string; bill: Bill }>(Endpoints.bills.create, data);
  },

  /**
   * Updates an existing bill
   */
  async updateBill(id: string, data: Partial<Bill>): Promise<{ message: string; bill: Bill }> {
    return apiClient.put<{ message: string; bill: Bill }>(Endpoints.bills.update(id), data);
  },

  /**
   * Deletes a bill by ID
   */
  async deleteBill(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(Endpoints.bills.delete(id));
  },

  /**
   * Marks a bill as paid (triggers backend recurrence generation if recurring)
   */
  async markBillPaid(id: string): Promise<{ message: string; bill: Bill }> {
    return apiClient.patch<{ message: string; bill: Bill }>(Endpoints.bills.pay(id));
  },

  /**
   * Marks a bill as unpaid (reverts status to pending)
   */
  async markBillUnpaid(id: string): Promise<{ message: string; bill: Bill }> {
    return apiClient.patch<{ message: string; bill: Bill }>(Endpoints.bills.unpay(id));
  },

  /**
   * Fetches latest exchange rates table
   */
  async fetchRates(): Promise<{ rates: Record<string, number> }> {
    try {
      const res = await apiClient.get<{ rates: Record<string, number> }>(Endpoints.currency.rates);
      return { rates: res?.rates || {} };
    } catch {
      return { rates: {} };
    }
  },

  /**
   * Fetches exchange rate between two currencies
   */
  async fetchRate(from: string, to: string): Promise<number | null> {
    const fromNorm = normalizeCurrencyCode(from);
    const toNorm = normalizeCurrencyCode(to);
    if (fromNorm === toNorm) return 1;

    try {
      const res = await apiClient.get<{ rates?: Record<string, number> }>(
        Endpoints.currency.rates,
        {
          params: { from: fromNorm, to: toNorm },
        }
      );
      return res?.rates?.[toNorm] ?? null;
    } catch {
      return null;
    }
  },
};
