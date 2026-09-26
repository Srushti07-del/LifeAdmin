/**
 * LifeAdmin Shared Types & Contracts
 */

export type EntityType = 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'event';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'upcoming';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

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
}
