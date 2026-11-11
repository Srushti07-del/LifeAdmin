/**
 * Task Calculations & Filtering Engine
 * Pure functions shared across UI and unit tests (no React Native runtime dependencies).
 */

import { Priority, Task, TaskStatus } from '../../../types/entities';
import {
  TaskFilterMode,
  TaskSortOption,
  TaskSummaryMetrics,
  TaskUrgencyMeta,
} from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses YYYY-MM-DD or ISO date string into local midnight Date without timezone shift. */
function parseTaskDueDay(dueDate?: string): Date | null {
  if (!dueDate) return null;
  const trimmed = dueDate.trim();
  if (!trimmed) return null;

  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfLocalDay(parsed);
}

/** Returns true when an incomplete task has a due date strictly before today. */
export function isTaskOverdue(
  task: Pick<Task, 'status' | 'dueDate'>,
  referenceDate: Date = new Date()
): boolean {
  if (task.status === 'completed') return false;
  const dueDay = parseTaskDueDay(task.dueDate);
  if (!dueDay) return false;
  const today = startOfLocalDay(referenceDate);
  return dueDay.getTime() < today.getTime();
}

/** Computes calibrated urgency tier and human-readable due label for a task. */
export function getTaskUrgencyMeta(
  task: Pick<Task, 'status' | 'dueDate'>,
  referenceDate: Date = new Date()
): TaskUrgencyMeta {
  if (task.status === 'completed') {
    return { tier: 'completed', label: 'Completed', diffDays: null };
  }

  const dueDay = parseTaskDueDay(task.dueDate);
  if (!dueDay) {
    return { tier: 'none', label: 'No due date', diffDays: null };
  }

  const today = startOfLocalDay(referenceDate);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / MS_PER_DAY);

  if (diffDays < 0) {
    return {
      tier: 'critical',
      label: `Overdue ${Math.abs(diffDays)}d`,
      diffDays,
    };
  }
  if (diffDays === 0) {
    return { tier: 'urgent', label: 'Due today', diffDays: 0 };
  }
  if (diffDays === 1) {
    return { tier: 'dueSoon', label: 'Due tomorrow', diffDays: 1 };
  }
  if (diffDays <= 7) {
    return { tier: 'dueSoon', label: `In ${diffDays}d`, diffDays };
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    tier: 'upcoming',
    label: `${months[dueDay.getMonth()]} ${dueDay.getDate()}`,
    diffDays,
  };
}

/** Cycles quick completion toggle: incomplete -> completed, completed -> todo. */
export function getToggledCompletionStatus(current: TaskStatus): TaskStatus {
  return current === 'completed' ? 'todo' : 'completed';
}

/** Computes dashboard summary counts across all loaded tasks. */
export function calculateTaskSummary(
  tasks: Task[],
  referenceDate: Date = new Date()
): TaskSummaryMetrics {
  let todo = 0;
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    if (task.status === 'completed') {
      completed += 1;
      continue;
    }

    if (task.status === 'in_progress') {
      inProgress += 1;
    } else {
      todo += 1;
    }

    const meta = getTaskUrgencyMeta(task, referenceDate);
    if (meta.tier === 'critical') {
      overdue += 1;
    } else if (meta.tier === 'urgent' || meta.tier === 'dueSoon') {
      dueSoon += 1;
    }
  }

  const total = tasks.length;
  const active = todo + inProgress;
  const completionRate = total > 0 ? completed / total : 0;

  return {
    total,
    active,
    todo,
    inProgress,
    completed,
    overdue,
    dueSoon,
    completionRate,
  };
}

/** Extracts sorted unique non-empty categories from task list. */
export function extractTaskCategories(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    const cat = task.category?.trim();
    if (cat) set.add(cat);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export interface FilterTasksOptions {
  statusFilter?: TaskFilterMode;
  categoryFilter?: string;
  searchQuery?: string;
  sortBy?: TaskSortOption;
  referenceDate?: Date;
}

/** Filters and sorts tasks deterministically for List and Board screens. */
export function filterAndSortTasks(
  tasks: Task[],
  options: FilterTasksOptions = {}
): Task[] {
  const {
    statusFilter = 'all',
    categoryFilter = 'all',
    searchQuery = '',
    sortBy = 'dueDate',
    referenceDate = new Date(),
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    if (statusFilter === 'overdue') {
      if (!isTaskOverdue(task, referenceDate)) return false;
    } else if (statusFilter !== 'all') {
      if (task.status !== statusFilter) return false;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      if ((task.category || 'Personal').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    if (normalizedQuery) {
      const titleMatch = task.title.toLowerCase().includes(normalizedQuery);
      const descMatch = task.description?.toLowerCase().includes(normalizedQuery) ?? false;
      const catMatch = task.category?.toLowerCase().includes(normalizedQuery) ?? false;
      if (!titleMatch && !descMatch && !catMatch) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    // Keep active tasks ahead of completed ones unless specifically filtering completed
    if (statusFilter !== 'completed') {
      const aDone = a.status === 'completed';
      const bDone = b.status === 'completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
    }

    if (sortBy === 'priority') {
      const pDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pDiff !== 0) return pDiff;
    }

    if (sortBy === 'recent') {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      if (aTime !== bTime) return bTime - aTime;
    }

    // Default / tie-breaker: due date ascending (undated tasks after dated)
    const aDue = parseTaskDueDay(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = parseTaskDueDay(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;

    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}
