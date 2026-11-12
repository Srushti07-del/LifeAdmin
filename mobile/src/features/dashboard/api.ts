/**
 * Dashboard API Services
 * Handles data fetching, automatic guest session initialization, and quick actions.
 */

import apiClient from '@/services/apiClient';
import Endpoints from '@/services/endpoints';
import apiConfig from '@/services/config';
import type { Bill } from '@/features/bills/types';
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from '../../utils/currency';
import { DashboardOverview } from './types';

/**
 * Ensures an active session exists. If unauthenticated, connects to guest session.
 */
export async function ensureAuthenticatedSession(): Promise<string> {
  const currentToken = apiConfig.getAuthToken();
  if (currentToken) {
    return currentToken;
  }

  // Initialize guest session with seeded responsibilities
  const guestRes = await apiClient.post<{ token: string }>(Endpoints.auth.guest);
  if (guestRes && guestRes.token) {
    apiConfig.setAuthToken(guestRes.token);
    return guestRes.token;
  }

  throw new Error('Could not establish an authenticated session');
}

/**
 * Fetch the prioritized dashboard overview from backend
 */
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  try {
    await ensureAuthenticatedSession();
    return await apiClient.get<DashboardOverview>(Endpoints.dashboard.overview);
  } catch (error: any) {
    // If token was invalid, try resetting and fetching guest session once
    if (error?.status === 401) {
      apiConfig.setAuthToken(null);
      await ensureAuthenticatedSession();
      return await apiClient.get<DashboardOverview>(Endpoints.dashboard.overview);
    }
    throw error;
  }
}

/**
 * Quick Action: Create a task
 */
export async function quickCreateTask(data: {
  title: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
}) {
  return await apiClient.post(Endpoints.tasks.create, {
    title: data.title,
    dueDate: data.dueDate || new Date().toISOString(),
    priority: data.priority || 'medium',
    category: data.category || 'General',
    status: 'todo',
  });
}

/**
 * Quick Action: Create a bill
 */
export async function quickCreateBill(data: {
  name: string;
  amount: number;
  dueDate?: string;
  currency?: string;
  category?: string;
}) {
  return await apiClient.post(Endpoints.bills.create, {
    name: data.name,
    amount: data.amount,
    currency: normalizeCurrencyCode(data.currency || DEFAULT_CURRENCY),
    dueDate: data.dueDate || new Date().toISOString(),
    category: data.category || 'Utilities',
    paymentStatus: 'pending',
  });
}

/**
 * Quick Action: Create a reminder
 */
export async function quickCreateReminder(data: {
  title: string;
  dueDate?: string;
  category?: string;
}) {
  return await apiClient.post(Endpoints.reminders.create, {
    title: data.title,
    dueDate: data.dueDate || new Date().toISOString(),
    category: data.category || 'General',
    priority: 'medium',
    status: 'active',
  });
}

/**
 * Quick Action: Create an appointment
 */
export async function quickCreateAppointment(data: {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
}) {
  return await apiClient.post(Endpoints.appointments.create, {
    title: data.title,
    date: data.date || new Date().toISOString(),
    time: data.time || '10:00 AM',
    location: data.location || '',
    category: data.category || 'General',
  });
}

/**
 * Quick Action: Mark task completed
 */
export async function markTaskCompleted(id: string) {
  return await apiClient.put(Endpoints.tasks.update(id), { status: 'completed' });
}

/**
 * Quick Action: Mark bill paid
 */
export async function markBillPaid(
  id: string
): Promise<{ message: string; bill: Bill; nextOccurrence?: Bill | null }> {
  return await apiClient.patch<{ message: string; bill: Bill; nextOccurrence?: Bill | null }>(
    Endpoints.bills.pay(id)
  );
}
