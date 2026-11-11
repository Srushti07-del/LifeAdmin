/**
 * Dashboard Types & Contracts
 * Mapped to /server/src/services/attention.ts and website DashboardPage.tsx widget system.
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

export interface DashboardReminderPreview {
  _id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  status?: string;
}

export interface DashboardOverview {
  needsAttention: AttentionItem[];
  upcoming: UpcomingItem[];
  reminders?: DashboardReminderPreview[];
  stats: DashboardStats;
}

export type QuickActionType =
  | 'task'
  | 'bill'
  | 'appointment'
  | 'event'
  | 'reminder'
  | 'document';

export type WidgetId =
  | 'needs_attention'
  | 'lifebuddy'
  | 'schedule'
  | 'tasks'
  | 'bills'
  | 'reminders'
  | 'ai_briefing';

export type LayoutPresetKey = 'standard' | 'focus' | 'finance';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

export interface PersistedWidgetItem {
  id: WidgetId;
  visible: boolean;
}

export interface DashboardPresetDefinition {
  key: LayoutPresetKey;
  label: string;
  description: string;
  order: WidgetId[];
}

export interface DailyBriefingSummary {
  headline: string;
  pendingResponsibilities: AttentionItem[];
  upcomingDeadlines: UpcomingItem[];
  billsRequiringAttention: AttentionItem[];
  totalUrgentBillsFormatted: string;
  suggestion: string;
}
