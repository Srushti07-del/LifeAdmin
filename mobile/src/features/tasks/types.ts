/**
 * Tasks Domain Types for LifeAdmin Mobile
 */

import { Priority, Task, TaskStatus } from '../../types/entities';

export type TaskFilterMode = 'all' | 'todo' | 'in_progress' | 'overdue' | 'completed';

export type TaskViewMode = 'list' | 'board';

export type TaskSortOption = 'dueDate' | 'priority' | 'recent';

export type TaskUrgencyTier =
  | 'completed'
  | 'critical'
  | 'urgent'
  | 'dueSoon'
  | 'upcoming'
  | 'none';

export interface TaskUrgencyMeta {
  tier: TaskUrgencyTier;
  label: string;
  diffDays: number | null;
}

export interface TaskSummaryMetrics {
  total: number;
  active: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  completionRate: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  status: TaskStatus;
  category: string;
}

export interface FetchTasksParams {
  status?: TaskStatus;
  priority?: Priority;
  category?: string;
  sort?: string;
  limit?: number;
  page?: number;
}

export type { Task, Priority, TaskStatus };
