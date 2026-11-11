/**
 * LifeAdmin Mobile — Calendar Service
 * Communicates with backend Express routes at /api/calendar/events
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import { CalendarEventItem, EventFormData, FetchEventsParams } from '../types';

export const calendarService = {
  /**
   * Fetches unified calendar items across events, tasks, bills, appointments, reminders
   */
  async fetchEvents(params?: FetchEventsParams): Promise<{ events: CalendarEventItem[] }> {
    return apiClient.get<{ events: CalendarEventItem[] }>(Endpoints.calendar.events, {
      params: {
        start: params?.start,
        end: params?.end,
      },
    });
  },

  /**
   * Creates a manual calendar event
   */
  async createEvent(data: Partial<EventFormData>): Promise<{ message: string; event: any }> {
    return apiClient.post<{ message: string; event: any }>(Endpoints.calendar.createEvent, data);
  },

  /**
   * Updates an existing manual calendar event
   */
  async updateEvent(
    id: string,
    data: Partial<EventFormData>
  ): Promise<{ message: string; event: any }> {
    return apiClient.put<{ message: string; event: any }>(Endpoints.calendar.updateEvent(id), data);
  },

  /**
   * Deletes a manual calendar event
   */
  async deleteEvent(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(Endpoints.calendar.deleteEvent(id));
  },
};
