/**
 * LifeAdmin Mobile — Appointment Service
 * Communicates with backend Express routes at /api/appointments
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import {
  Appointment,
  AppointmentFormData,
  FetchAppointmentsParams,
} from '../types';

export const appointmentService = {
  /**
   * Fetches appointments list from backend
   */
  async fetchAppointments(
    params?: FetchAppointmentsParams
  ): Promise<{ appointments: Appointment[]; pagination: any }> {
    return apiClient.get<{ appointments: Appointment[]; pagination: any }>(
      Endpoints.appointments.list,
      {
        params: {
          sort: params?.sort || 'date',
          limit: params?.limit || 100,
          ...params,
        },
      }
    );
  },

  /**
   * Fetches single appointment by ID
   */
  async getAppointmentById(id: string): Promise<{ appointment: Appointment }> {
    return apiClient.get<{ appointment: Appointment }>(
      Endpoints.appointments.getById(id)
    );
  },

  /**
   * Creates a new appointment
   */
  async createAppointment(
    data: Partial<AppointmentFormData>
  ): Promise<{ message: string; appointment: Appointment }> {
    return apiClient.post<{ message: string; appointment: Appointment }>(
      Endpoints.appointments.create,
      data
    );
  },

  /**
   * Updates an existing appointment
   */
  async updateAppointment(
    id: string,
    data: Partial<AppointmentFormData>
  ): Promise<{ message: string; appointment: Appointment }> {
    return apiClient.put<{ message: string; appointment: Appointment }>(
      Endpoints.appointments.update(id),
      data
    );
  },

  /**
   * Deletes an appointment by ID
   */
  async deleteAppointment(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      Endpoints.appointments.delete(id)
    );
  },
};

