/**
 * LifeAdmin Mobile — Dashboard Layout Presets, Customization & Daily Briefing Domain Logic
 * Synchronized with client/src/pages/DashboardPage.tsx.
 * Pure, dependency-free functions (testable in Node test runner).
 */

import {
  AttentionItem,
  DailyBriefingSummary,
  DashboardOverview,
  DashboardPresetDefinition,
  LayoutPresetKey,
  PersistedWidgetItem,
  WidgetConfig,
  WidgetId,
} from '../types';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  convertAmountTo,
  formatCurrency,
  normalizeCurrencyCode,
} from '../../../utils/currency';

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'needs_attention', label: 'Needs Attention (High Priority)', visible: true },
  { id: 'ai_briefing', label: 'AI Daily Briefing', visible: true },
  { id: 'tasks', label: 'Upcoming Tasks', visible: true },
  { id: 'bills', label: 'Upcoming Bills & Expenses', visible: true },
  { id: 'schedule', label: 'Today & Upcoming Schedule', visible: true },
  { id: 'reminders', label: 'Active Reminders', visible: true },
  { id: 'lifebuddy', label: 'LifeBuddy Companion', visible: true },
];

export const DASHBOARD_PRESETS: Record<LayoutPresetKey, DashboardPresetDefinition> = {
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Balanced workspace highlighting priorities and AI briefing, with LifeBuddy last',
    order: ['needs_attention', 'ai_briefing', 'tasks', 'bills', 'schedule', 'reminders', 'lifebuddy'],
  },
  focus: {
    key: 'focus',
    label: 'Focus',
    description: 'Prioritizes urgent tasks, daily schedule, and reminders first',
    order: ['needs_attention', 'tasks', 'schedule', 'ai_briefing', 'reminders', 'lifebuddy', 'bills'],
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    description: 'Places upcoming bills & expenses right below urgent alerts',
    order: ['needs_attention', 'bills', 'ai_briefing', 'tasks', 'schedule', 'lifebuddy', 'reminders'],
  },
};

const VALID_WIDGET_IDS = new Set<WidgetId>(DEFAULT_WIDGETS.map((w) => w.id));

/**
 * Generates an isolated storage key per authenticated user or guest workspace.
 */
export function getDashboardStorageKey(
  userId?: string | null,
  isGuest: boolean = false
): string {
  if (isGuest) {
    return 'lifeadmin_dashboard_layout_guest';
  }
  const cleanId = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';
  return `lifeadmin_dashboard_layout_${cleanId}`;
}

/**
 * Serializes widget configuration into compact storage payload.
 */
export function serializeWidgetConfigs(widgets: WidgetConfig[]): PersistedWidgetItem[] {
  return widgets.map((w) => ({
    id: w.id,
    visible: Boolean(w.visible),
  }));
}

/**
 * Reconstructs canonical WidgetConfig[] from stored/untrusted data,
 * preserving user ordering/visibility while ensuring any new default widgets are included.
 */
export function sanitizeWidgetConfigs(raw: unknown): WidgetConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_WIDGETS.map((w) => ({ ...w }));
  }

  const labelById = new Map<WidgetId, string>(
    DEFAULT_WIDGETS.map((w) => [w.id, w.label])
  );
  const seen = new Set<WidgetId>();
  const result: WidgetConfig[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidateId = (item as { id?: unknown }).id;
    if (
      typeof candidateId !== 'string' ||
      !VALID_WIDGET_IDS.has(candidateId as WidgetId)
    ) {
      continue;
    }
    const id = candidateId as WidgetId;
    if (seen.has(id)) continue;
    seen.add(id);

    const visibleVal = (item as { visible?: unknown }).visible;
    result.push({
      id,
      label: labelById.get(id) || id,
      visible: typeof visibleVal === 'boolean' ? visibleVal : true,
    });
  }

  // Append any default widgets missing from legacy saved configs
  for (const def of DEFAULT_WIDGETS) {
    if (!seen.has(def.id)) {
      result.push({ ...def });
    }
  }

  return result.length > 0 ? result : DEFAULT_WIDGETS.map((w) => ({ ...w }));
}

/**
 * Moves a widget one step up or down in the layout order.
 */
export function moveWidget(
  widgets: WidgetConfig[],
  index: number,
  direction: 'up' | 'down'
): WidgetConfig[] {
  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= widgets.length ||
    targetIdx < 0 ||
    targetIdx >= widgets.length
  ) {
    return widgets;
  }

  const reordered = widgets.map((w) => ({ ...w }));
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIdx, 0, moved);
  return reordered;
}

/**
 * Toggles visibility of a single dashboard widget.
 */
export function toggleWidgetVisibility(
  widgets: WidgetConfig[],
  id: WidgetId
): WidgetConfig[] {
  return widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : { ...w }));
}

/**
 * Reorders widgets to match a canonical preset while retaining existing visibility preferences.
 */
export function applyLayoutPreset(
  widgets: WidgetConfig[],
  presetKey: LayoutPresetKey
): WidgetConfig[] {
  const preset = DASHBOARD_PRESETS[presetKey] || DASHBOARD_PRESETS.standard;
  const currentMap = new Map<WidgetId, WidgetConfig>(
    widgets.map((w) => [w.id, w])
  );
  const defaultMap = new Map<WidgetId, WidgetConfig>(
    DEFAULT_WIDGETS.map((w) => [w.id, w])
  );

  return preset.order.map((id) => {
    const existing = currentMap.get(id);
    if (existing) {
      return { ...existing };
    }
    const def = defaultMap.get(id);
    return def ? { ...def } : { id, label: id, visible: true };
  });
}

/**
 * Returns a fresh copy of the default widget configuration.
 */
export function resetWidgets(): WidgetConfig[] {
  return DEFAULT_WIDGETS.map((w) => ({ ...w }));
}

/**
 * Identifies whether current widget order matches Standard, Focus, Finance, or Custom.
 */
export function detectActivePreset(
  widgets: WidgetConfig[]
): LayoutPresetKey | 'custom' {
  const ids = widgets.map((w) => w.id);
  const presetKeys: LayoutPresetKey[] = ['standard', 'focus', 'finance'];

  for (const key of presetKeys) {
    const order = DASHBOARD_PRESETS[key].order;
    if (
      ids.length === order.length &&
      ids.every((id, index) => id === order[index])
    ) {
      return key;
    }
  }

  return 'custom';
}

/**
 * Builds a structured Daily Briefing strictly from real dashboard API records
 * (never fabricates personal items or hardcoded deadlines).
 */
export function buildDailyBriefing(
  overview: DashboardOverview | null,
  preferredCurrency: string = DEFAULT_CURRENCY,
  exchangeRates: Record<string, number> = {}
): DailyBriefingSummary {
  const targetCurrency: CurrencyCode = normalizeCurrencyCode(preferredCurrency);

  if (!overview) {
    return {
      headline: 'Workspace ready',
      pendingResponsibilities: [],
      upcomingDeadlines: [],
      billsRequiringAttention: [],
      totalUrgentBillsFormatted: formatCurrency(0, targetCurrency),
      suggestion: 'Add your first task, bill, or reminder to see real-time priorities.',
    };
  }

  const allAttention = overview.needsAttention || [];
  const allUpcoming = overview.upcoming || [];
  const stats = overview.stats || {
    overdueCount: 0,
    dueSoonCount: 0,
    upcomingCount: 0,
    activeReminders: 0,
  };

  const pendingResponsibilities: AttentionItem[] = allAttention
    .filter((item) => item.type !== 'bill')
    .slice(0, 3);

  const billsRequiringAttention: AttentionItem[] = allAttention
    .filter((item) => item.type === 'bill')
    .slice(0, 3);

  const upcomingDeadlines = allUpcoming
    .filter(
      (item) =>
        item.type === 'task' ||
        item.type === 'appointment' ||
        item.type === 'event' ||
        item.type === 'document'
    )
    .slice(0, 3);

  const urgentBillsTotal = allAttention
    .filter((item) => item.type === 'bill')
    .reduce((sum, bill) => {
      const converted = convertAmountTo(
        bill.amount || 0,
        bill.currency,
        targetCurrency,
        exchangeRates
      );
      return sum + (Number.isFinite(converted) ? converted : 0);
    }, 0);

  const totalUrgentBillsFormatted = formatCurrency(urgentBillsTotal, targetCurrency);

  let headline = 'All current responsibilities are on track';
  let suggestion =
    'No overdue or urgent deadlines right now. Review your upcoming schedule when ready.';

  if (stats.overdueCount > 0) {
    headline = `${stats.overdueCount} overdue item${stats.overdueCount === 1 ? ' needs' : 's need'} attention`;
    const firstOverdue = allAttention[0];
    suggestion = firstOverdue
      ? `Prioritize clearing "${firstOverdue.title}" (${firstOverdue.urgencyLabel || 'overdue'}) before starting lower-priority items.`
      : 'Clear your overdue items first before taking on new commitments.';
  } else if (stats.dueSoonCount > 0) {
    headline = `${stats.dueSoonCount} item${stats.dueSoonCount === 1 ? '' : 's'} due soon`;
    const firstSoon = allAttention[0];
    if (billsRequiringAttention.length > 0 && firstSoon?.type === 'bill') {
      suggestion = `Upcoming bills total ${totalUrgentBillsFormatted}. Reviewing "${firstSoon.title}" (${firstSoon.urgencyLabel}) keeps payments on time.`;
    } else if (firstSoon) {
      suggestion = `Focus on "${firstSoon.title}" (${firstSoon.urgencyLabel}) to stay ahead of upcoming deadlines.`;
    }
  } else if (upcomingDeadlines.length > 0) {
    headline = `${stats.upcomingCount} upcoming item${stats.upcomingCount === 1 ? '' : 's'} in the next 30 days`;
    suggestion = `Your urgent queue is clear. Next scheduled item: "${upcomingDeadlines[0].title}".`;
  }

  return {
    headline,
    pendingResponsibilities,
    upcomingDeadlines,
    billsRequiringAttention,
    totalUrgentBillsFormatted,
    suggestion,
  };
}
