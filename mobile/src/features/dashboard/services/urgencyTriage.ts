/**
 * Single Source of Truth for Dashboard Overdue / Due Soon Triage
 * Keeps StatsOverview counts and UrgencyTriageModal items synchronized with the exact
 * `needsAttention` dataset returned by `/dashboard/overview`, plus builds filtered module routes.
 */

import { AttentionItem, DashboardOverview, DashboardStats } from '../types';

export type TriageMode = 'overdue' | 'soon';
export type TriageEntityType = AttentionItem['type'];

export interface TriageModuleShortcut {
  type: TriageEntityType;
  label: string;
  count: number;
  route: string;
}

const ENTITY_LABELS: Record<TriageEntityType, string> = {
  task: 'Tasks',
  bill: 'Bills',
  reminder: 'Reminders',
  appointment: 'Appointments',
  document: 'Documents',
};

const TRIAGE_ENTITY_ORDER: TriageEntityType[] = [
  'task',
  'bill',
  'reminder',
  'appointment',
  'document',
];

/**
 * Filters `needsAttention` using the exact severity rules used by the server aggregation layer:
 * - `overdue`: `severity === 'overdue'`
 * - `soon`: `severity === 'urgent' || severity === 'soon'`
 */
export function getTriageItems(
  needsAttention: AttentionItem[] | undefined | null,
  mode: TriageMode,
): AttentionItem[] {
  if (!Array.isArray(needsAttention) || needsAttention.length === 0) {
    return [];
  }

  if (mode === 'overdue') {
    return needsAttention.filter((item) => item.severity === 'overdue');
  }

  return needsAttention.filter(
    (item) => item.severity === 'urgent' || item.severity === 'soon',
  );
}

/**
 * Ensures Overdue & Due Soon dashboard card counters always match `getTriageItems(...)`
 * rather than drifting from a separate stale or inconsistently computed field.
 */
export function deriveStatsFromOverview(
  overview: DashboardOverview | null | undefined,
): DashboardStats | null {
  if (!overview) return null;

  const needsAttention = overview.needsAttention ?? [];
  return {
    overdueCount: getTriageItems(needsAttention, 'overdue').length,
    dueSoonCount: getTriageItems(needsAttention, 'soon').length,
    upcomingCount: overview.stats?.upcomingCount ?? overview.upcoming?.length ?? 0,
    activeReminders:
      overview.stats?.activeReminders ?? overview.reminders?.length ?? 0,
  };
}

/**
 * Returns the filtered destination URL for a module entity type under the given triage mode.
 */
export function getFilteredModuleRoute(
  type: TriageEntityType,
  mode: TriageMode,
): string {
  switch (type) {
    case 'task':
      return mode === 'overdue' ? '/tasks?filter=overdue' : '/tasks?filter=todo';
    case 'bill':
      return mode === 'overdue' ? '/bills?filter=overdue' : '/bills?filter=upcoming';
    case 'reminder':
      return mode === 'overdue'
        ? '/reminders?section=overdue'
        : '/reminders?section=upcoming';
    case 'appointment':
      return mode === 'overdue'
        ? '/appointments?filter=past'
        : '/appointments?filter=upcoming';
    case 'document':
    default:
      return '/documents';
  }
}

/**
 * Summarizes the modules represented in a triage slice so users can jump straight to
 * the filtered module list with one tap.
 */
export function summarizeTriageByModule(
  items: AttentionItem[],
  mode: TriageMode,
): TriageModuleShortcut[] {
  const counts = new Map<TriageEntityType, number>();

  for (const item of items) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }

  return TRIAGE_ENTITY_ORDER.filter((type) => (counts.get(type) ?? 0) > 0).map(
    (type) => ({
      type,
      label: ENTITY_LABELS[type],
      count: counts.get(type) ?? 0,
      route: getFilteredModuleRoute(type, mode),
    }),
  );
}

