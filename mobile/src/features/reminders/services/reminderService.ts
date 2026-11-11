/**
 * LifeAdmin Mobile — Reminder API Service
 * Integrates directly with backend routes in server/src/routes/reminders.ts
 */

import apiClient from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { Reminder, ReminderFormData } from '../types';

export interface FetchRemindersParams {
  status?: string;
  category?: string;
  priority?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface FetchRemindersResponse {
  reminders: Reminder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

class ReminderService {
  /**
   * Fetches filtered and sorted reminders list
   */
  public async fetchReminders(params: FetchRemindersParams = {}): Promise<FetchRemindersResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params.status && params.status !== 'all') {
      queryParams.status = params.status;
    }
    if (params.category && params.category !== 'all') {
      queryParams.category = params.category;
    }
    if (params.priority && params.priority !== 'all') {
      queryParams.priority = params.priority;
    }
    if (params.sort) {
      queryParams.sort = params.sort;
    }
    if (params.page !== undefined) {
      queryParams.page = params.page;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }

    return apiClient.get<FetchRemindersResponse>(Endpoints.reminders.list, {
      params: queryParams,
    });
  }

  /**
   * Fetches single reminder details
   */
  public async getReminderById(id: string): Promise<Reminder> {
    const res = await apiClient.get<{ reminder: Reminder }>(Endpoints.reminders.getById(id));
    return res.reminder;
  }

  /**
   * Creates a new reminder
   */
  public async createReminder(data: Partial<ReminderFormData>): Promise<Reminder> {
    const res = await apiClient.post<{ message: string; reminder: Reminder }>(
      Endpoints.reminders.create,
      {
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate,
        dueTime: data.dueTime || undefined,
        priority: data.priority || 'medium',
        category: data.category || 'Personal',
        reminderOffsetMinutes: data.reminderOffsetMinutes || [0],
        recurrence: {
          type: data.recurrenceType || 'none',
          interval: Math.max(1, data.recurrenceInterval || 1),
        },
        entityType: data.entityType,
        entityId: data.entityId,
      }
    );
    return res.reminder;
  }

  /**
   * Updates an existing reminder
   */
  public async updateReminder(
    id: string,
    data: Partial<ReminderFormData>
  ): Promise<{ reminder: Reminder; nextOccurrence?: Reminder | null }> {
    const res = await apiClient.put<{
      message: string;
      reminder: Reminder;
      nextOccurrence?: Reminder | null;
    }>(Endpoints.reminders.update(id), {
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate,
      dueTime: data.dueTime || undefined,
      priority: data.priority,
      category: data.category,
      reminderOffsetMinutes: data.reminderOffsetMinutes,
      recurrence: {
        type: data.recurrenceType || 'none',
        interval: Math.max(1, data.recurrenceInterval || 1),
      },
      entityType: data.entityType,
      entityId: data.entityId,
    });
    return { reminder: res.reminder, nextOccurrence: res.nextOccurrence };
  }

  /**
   * Marks a reminder completed and auto-generates next recurring instance if applicable
   */
  public async completeReminder(
    id: string
  ): Promise<{ reminder: Reminder; nextOccurrence?: Reminder | null }> {
    const res = await apiClient.patch<{
      message: string;
      reminder: Reminder;
      nextOccurrence?: Reminder | null;
    }>(Endpoints.reminders.complete(id));
    return { reminder: res.reminder, nextOccurrence: res.nextOccurrence };
  }

  /**
   * Reopens a completed reminder back to active status
   */
  public async reopenReminder(id: string): Promise<Reminder> {
    const res = await apiClient.patch<{ message: string; reminder: Reminder }>(
      Endpoints.reminders.pending(id)
    );
    return res.reminder;
  }

  /**
   * Acknowledges an active reminder
   */
  public async acknowledgeReminder(id: string): Promise<Reminder> {
    const res = await apiClient.patch<{ message: string; reminder: Reminder }>(
      Endpoints.reminders.acknowledge(id)
    );
    return res.reminder;
  }

  /**
   * Deletes a reminder
   */
  public async deleteReminder(id: string): Promise<void> {
    await apiClient.delete(Endpoints.reminders.delete(id));
  }
}

export const reminderService = new ReminderService();
export default reminderService;

