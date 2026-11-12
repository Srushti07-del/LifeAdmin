/**
 * LifeAdmin Mobile — Pure Snackbar Queue & Layout Calculations
 * Manages FIFO message queuing, rapid-duplicate suppression, sensible auto-dismiss
 * durations, theme variant tokens, and bottom thumb-zone placement.
 */

import { Colors, ThemeColors } from '@/constants/colors';

export type SnackbarVariant = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarAction {
  label: string;
  onPress: () => void | Promise<void>;
  accessibilityLabel?: string;
}

export interface SnackbarOptions {
  id?: string;
  title?: string;
  message: string;
  variant?: SnackbarVariant;
  duration?: number;
  action?: SnackbarAction;
}

export interface SnackbarItem {
  id: string;
  title?: string;
  message: string;
  variant: SnackbarVariant;
  duration: number;
  action?: SnackbarAction;
}

export interface SnackbarQueueState {
  current: SnackbarItem | null;
  queue: SnackbarItem[];
}

export interface SnackbarVariantPalette {
  accent: string;
  badgeBg: string;
  badgeIcon: string;
  actionBg: string;
  actionText: string;
  iosIcon: string;
  androidIcon: string;
}

export const MAX_SNACKBAR_QUEUE = 5;

export const DEFAULT_SNACKBAR_DURATIONS: Record<
  SnackbarVariant,
  { standard: number; withAction: number }
> = {
  info: { standard: 3200, withAction: 4800 },
  success: { standard: 3200, withAction: 5000 },
  warning: { standard: 4200, withAction: 5200 },
  error: { standard: 4600, withAction: 5600 },
};

export const INITIAL_SNACKBAR_QUEUE_STATE: SnackbarQueueState = {
  current: null,
  queue: [],
};

export function getDefaultSnackbarDuration(
  variant: SnackbarVariant,
  hasAction: boolean
): number {
  const entry = DEFAULT_SNACKBAR_DURATIONS[variant] || DEFAULT_SNACKBAR_DURATIONS.info;
  return hasAction ? entry.withAction : entry.standard;
}

export function normalizeSnackbarDuration(
  duration: number | undefined,
  variant: SnackbarVariant,
  hasAction: boolean
): number {
  if (typeof duration !== 'number' || Number.isNaN(duration) || !Number.isFinite(duration)) {
    return getDefaultSnackbarDuration(variant, hasAction);
  }
  if (duration === 0) {
    return 0;
  }
  if (duration < 0) {
    return getDefaultSnackbarDuration(variant, hasAction);
  }
  return Math.max(1200, Math.round(duration));
}

export function createSnackbarItem(
  options: SnackbarOptions,
  idFactory: () => string
): SnackbarItem {
  const variant: SnackbarVariant = options.variant ?? 'info';
  const hasAction = Boolean(options.action);
  return {
    id: options.id || idFactory(),
    title: options.title?.trim() || undefined,
    message: options.message.trim(),
    variant,
    duration: normalizeSnackbarDuration(options.duration, variant, hasAction),
    action: options.action,
  };
}

function isDuplicateNonActionMessage(a: SnackbarItem, b: SnackbarItem): boolean {
  return (
    !a.action &&
    !b.action &&
    a.variant === b.variant &&
    a.title === b.title &&
    a.message === b.message
  );
}

/**
 * Adds a snackbar to the queue cleanly without overlapping the active item.
 * Suppresses accidental duplicate spam while preserving distinct sequential feedback.
 */
export function enqueueSnackbar(
  state: SnackbarQueueState,
  item: SnackbarItem
): SnackbarQueueState {
  if (!item.message) {
    return state;
  }

  if (!state.current) {
    return {
      current: item,
      queue: [],
    };
  }

  if (isDuplicateNonActionMessage(state.current, item)) {
    return state;
  }

  const lastQueued = state.queue[state.queue.length - 1];
  if (lastQueued && isDuplicateNonActionMessage(lastQueued, item)) {
    return state;
  }

  const nextQueue = [...state.queue, item];
  if (nextQueue.length > MAX_SNACKBAR_QUEUE) {
    nextQueue.splice(0, nextQueue.length - MAX_SNACKBAR_QUEUE);
  }

  return {
    current: state.current,
    queue: nextQueue,
  };
}

/**
 * Dismisses the active snackbar (or removes a specific queued ID) and promotes the next item.
 */
export function dismissSnackbarById(
  state: SnackbarQueueState,
  targetId?: string
): SnackbarQueueState {
  if (!state.current) {
    return state;
  }

  if (targetId && state.current.id !== targetId) {
    return {
      current: state.current,
      queue: state.queue.filter((item) => item.id !== targetId),
    };
  }

  if (state.queue.length === 0) {
    return INITIAL_SNACKBAR_QUEUE_STATE;
  }

  const [next, ...rest] = state.queue;
  return {
    current: next,
    queue: rest,
  };
}

/**
 * Computes consistent bottom thumb-zone offset that clears bottom tabs and safe-area insets.
 */
export function computeSnackbarBottomOffset(options: {
  bottomInset: number;
  bottomTabInset: number;
  hasBottomTabs: boolean;
  extraOffset?: number;
}): number {
  const extra = options.extraOffset ?? 12;
  if (options.hasBottomTabs) {
    return Math.max(options.bottomInset, options.bottomTabInset) + extra;
  }
  return Math.max(options.bottomInset, 12) + extra;
}

/**
 * Returns WCAG-aware theme tokens and native icon identifiers for each Snackbar variant.
 */
export function getSnackbarVariantPalette(
  variant: SnackbarVariant,
  colors: ThemeColors,
  isDark: boolean
): SnackbarVariantPalette {
  switch (variant) {
    case 'success':
      return {
        accent: Colors.urgency.completed.accent,
        badgeBg: isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg,
        badgeIcon: isDark ? Colors.urgency.completed.darkText : Colors.urgency.completed.lightText,
        actionBg: isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg,
        actionText: isDark ? Colors.urgency.completed.darkText : Colors.urgency.completed.lightText,
        iosIcon: 'checkmark.circle.fill',
        androidIcon: 'check_circle',
      };
    case 'error':
      return {
        accent: Colors.urgency.critical.accent,
        badgeBg: isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg,
        badgeIcon: isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText,
        actionBg: isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg,
        actionText: isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText,
        iosIcon: 'exclamationmark.triangle.fill',
        androidIcon: 'error',
      };
    case 'warning':
      return {
        accent: Colors.urgency.dueSoon.accent,
        badgeBg: isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg,
        badgeIcon: isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText,
        actionBg: isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg,
        actionText: isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText,
        iosIcon: 'exclamationmark.circle.fill',
        androidIcon: 'warning',
      };
    case 'info':
    default:
      return {
        accent: colors.primary,
        badgeBg: colors.primarySoft,
        badgeIcon: isDark ? Colors.urgency.upcoming.darkText : colors.primaryDeep,
        actionBg: colors.primarySoft,
        actionText: isDark ? Colors.urgency.upcoming.darkText : colors.primaryDeep,
        iosIcon: 'info.circle.fill',
        androidIcon: 'info',
      };
  }
}

