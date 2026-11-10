/**
 * LifeAdmin Mobile — Appointments Feature Types
 * Synchronized with server/src/models/Appointment.ts and client/src/pages/AppointmentsPage.tsx
 */

export type AppointmentFilterKey = 'all' | 'upcoming' | 'today' | 'past';

export type AppointmentSortKey = 'date' | '-date' | 'title';

export interface Appointment {
  _id: string;
  userId: string;
  title: string;
  date: string; // ISO date string or YYYY-MM-DD
  time?: string; // "14:30"
  endTime?: string;
  location?: string;
  notes?: string;
  relatedPerson?: string;
  relatedOrganization?: string;
  category: string;
  reminderDaysBefore?: number[];
  attachments?: string[];
  aiGenerated?: boolean;
  aiConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentFormData {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  relatedPerson: string;
  relatedOrganization: string;
  category: string;
  notes: string;
}

export interface AppointmentTotals {
  totalCount: number;
  upcomingCount: number;
  todayCount: number;
  pastCount: number;
}

export interface FetchAppointmentsParams {
  category?: string;
  dateBefore?: string;
  dateAfter?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

