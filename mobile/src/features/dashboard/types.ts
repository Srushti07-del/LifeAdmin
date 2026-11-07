/**
 * Dashboard Types & Contracts
 * Mapped to /server/src/services/attention.ts
 */

export interface AttentionItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document';
  title: string;
  subtitle: string;
  reason: string;
  severity: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  urgencyLabel: string;
  dueDate: string;
  destination: string;
  amount?: number;
  currency?: string;
}

export interface UpcomingItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'event';
  title: string;
  subtitle: string;
  date: string;
  time?: string;
  destination: string;
  amount?: number;
  currency?: string;
}

export interface DashboardStats {
  overdueCount: number;
  dueSoonCount: number;
  upcomingCount: number;
  activeReminders: number;
}

export interface DashboardOverview {
  needsAttention: AttentionItem[];
  upcoming: UpcomingItem[];
  reminders?: any[];
  stats: DashboardStats;
}

export type QuickActionType = 'task' | 'bill' | 'reminder' | 'appointment';
