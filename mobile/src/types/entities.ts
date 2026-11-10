/**
 * LifeAdmin Mobile Entity Types
 * Synchronized with /shared/types.ts and LifeAdmin backend models
 */

import type { CompanionState } from '@/features/companions/types';

export type EntityType = 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'event';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'upcoming';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval?: number;
  unit?: 'days' | 'weeks' | 'months' | 'years';
  endDate?: string;
  durationMonths?: number;
}

export interface UrgencyBadge {
  level: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  color: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  theme: 'light' | 'dark' | 'system';
  subscriptionTier: 'free' | 'premium' | 'premium_ai';
  isDemo?: boolean;
  companion?: CompanionState;
}

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  category?: string;
  tags?: string[];
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  status: PaymentStatus;
  isRecurring: boolean;
  recurrence?: RecurrenceConfig;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  userId: string;
  title: string;
  provider?: string;
  dateTime: string;
  location?: string;
  category?: string;
  notes?: string;
  reminders?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  userId: string;
  title: string;
  dueDate: string;
  priority: Priority;
  acknowledged: boolean;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  _id: string;
  userId: string;
  title: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  expiryDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventItem {
  _id: string;
  userId: string;
  title: string;
  date: string;
  sourceType: EntityType;
  sourceId?: string;
  priority?: Priority;
  completed?: boolean;
}
