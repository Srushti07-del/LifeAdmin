/**
 * LifeAdmin Mobile — AI Helper Functions & Utilities
 * Pure functions for message formatting, type icons, action validation, and prompts.
 */

import { ProposedAction, ActionType } from '../types';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  formatCurrency,
  resolveTransactionCurrency,
  tryNormalizeCurrencyCode,
} from '../../../utils/currency';
import { isValidLocalISODate, isValidHHMMTime } from '../../../utils/dateTimeValidation';

export const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'What deadlines are approaching this week?',
  'What bills are overdue?',
  'What do I have scheduled this week?',
  'Create a reminder to review my bills tomorrow at 10:00',
  'Help me plan my week',
] as const;

export const GOAL_TEMPLATES = [
  'Prepare for final exams',
  'Plan quarterly budget and pay upcoming bills',
  'Schedule routine doctor checkups',
  'Deep clean home and organize documents',
  'Launch side project MVP',
] as const;

export const SAMPLE_TEXT_SNIPPETS = [
  {
    title: 'Medical & Dentist Notice',
    text: 'Appointment scheduled with Dr. Sharma on 2026-11-20 at 14:30. Consultation fee is ₹1,500. Please bring past medical reports.',
  },
  {
    title: 'Apartment Rent & Utility Bill',
    text: 'Dear Resident, the broadband invoice of INR 1,299 is due by 2026-11-18. Apartment maintenance of ₹3,500 must be cleared by month end.',
  },
  {
    title: 'University Syllabus Deadline',
    text: 'Midterm paper submission due 2026-11-25. Final group presentation scheduled for 2026-12-05 at 11:00 AM.',
  },
] as const;

/**
 * Formats a message timestamp
 */
export function formatMessageTime(d?: string | Date): string {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns platform symbol icons for an action type
 */
export function getActionTypeIcon(type?: string): { ios: string; android: string } {
  switch (type) {
    case 'bill':
      return { ios: 'creditcard.fill', android: 'receipt_long' };
    case 'appointment':
      return { ios: 'calendar', android: 'event' };
    case 'reminder':
      return { ios: 'bell.fill', android: 'alarm' };
    case 'task':
    default:
      return { ios: 'checkmark.circle.fill', android: 'checklist' };
  }
}

/**
 * Returns color tokens and labels for action types
 */
export function getActionTypeBadge(type?: string, isDark: boolean = false): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (type) {
    case 'bill':
      return {
        label: 'Bill',
        color: isDark ? '#34D399' : '#059669',
        bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5',
        border: isDark ? 'rgba(5, 150, 105, 0.4)' : '#A7F3D0',
      };
    case 'appointment':
      return {
        label: 'Appointment',
        color: isDark ? '#38BDF8' : '#0284C7',
        bg: isDark ? 'rgba(2, 132, 199, 0.2)' : '#F0F9FF',
        border: isDark ? 'rgba(2, 132, 199, 0.4)' : '#BAE6FD',
      };
    case 'reminder':
      return {
        label: 'Reminder',
        color: isDark ? '#FBBF24' : '#D97706',
        bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
        border: isDark ? 'rgba(217, 119, 6, 0.4)' : '#FDE68A',
      };
    case 'task':
    default:
      return {
        label: 'Task',
        color: isDark ? '#5EEAD4' : '#0D9488',
        bg: isDark ? 'rgba(13, 148, 136, 0.2)' : '#F0FDFA',
        border: isDark ? 'rgba(13, 148, 136, 0.4)' : '#99F6E4',
      };
  }
}

/**
 * Validates a proposed action before confirmation/execution
 */
export function validateProposedAction(action: Partial<ProposedAction>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!action.type || !['task', 'bill', 'appointment', 'reminder'].includes(action.type)) {
    errors.push('Action type must be task, bill, appointment, or reminder.');
  }

  if (!action.title || !action.title.trim()) {
    errors.push('Title is required.');
  } else if (action.title.trim().length > 120) {
    errors.push('Title must be 120 characters or fewer.');
  }

  if (action.amount !== undefined && (isNaN(Number(action.amount)) || Number(action.amount) < 0)) {
    errors.push('Amount must be a non-negative number.');
  }

  const dateValue = action.dueDate || action.date;
  if (dateValue && !isValidLocalISODate(dateValue)) {
    errors.push('Date must be a valid calendar date in YYYY-MM-DD format.');
  }

  const timeValue = action.dueTime || action.time;
  if (timeValue && !isValidHHMMTime(timeValue)) {
    errors.push('Time must be in HH:mm 24-hour format.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Ensures any financial AI action carries a normalized ISO currency code (never a symbol).
 */
export function normalizeProposedActionCurrency(
  action: ProposedAction,
  preferredCurrency: string = DEFAULT_CURRENCY
): ProposedAction {
  const normalizedExplicit = action.currency
    ? tryNormalizeCurrencyCode(action.currency)
    : undefined;

  if (action.type !== 'bill' && action.amount == null && !normalizedExplicit) {
    return action;
  }

  return {
    ...action,
    currency: resolveTransactionCurrency(normalizedExplicit, preferredCurrency),
  };
}

/**
 * Formats readable subtitle summary for an action
 */
export function formatActionSubtitle(
  action: ProposedAction,
  preferredCurrency: CurrencyCode = DEFAULT_CURRENCY
): string {
  const parts: string[] = [];

  const date = action.dueDate || action.date;
  if (date) {
    parts.push(date);
  }

  const time = action.dueTime || action.time;
  if (time) {
    parts.push(time);
  }

  if (action.amount != null && !isNaN(action.amount)) {
    const currency = resolveTransactionCurrency(action.currency, preferredCurrency);
    parts.push(formatCurrency(action.amount, currency));
  }

  if (action.priority) {
    parts.push(action.priority.charAt(0).toUpperCase() + action.priority.slice(1));
  }

  return parts.join(' · ');
}

export interface AIChatRequestOptions {
  scope?: 'daily_briefing_7d';
  windowDays?: 7;
  localDate?: string;
  timezoneOffsetMinutes?: number;
  referenceDate?: Date;
}

export interface AIChatRequestPayload {
  message: string;
  conversationId?: string;
  scope?: 'daily_briefing_7d';
  windowDays?: 7;
  localDate?: string;
  timezoneOffsetMinutes?: number;
}

export interface AIClientValidationError extends Error {
  status: number;
  code: 'INVALID_REQUEST';
}

function formatCurrentLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates and constructs a plain JSON payload object for POST /api/ai/chat.
 * Note: apiClient.post serializes this object via JSON.stringify internally, so callers
 * must pass this object directly rather than wrapping it in `{ body: JSON.stringify(...) }`.
 */
export function buildAIChatPayload(
  message: string,
  conversationId?: string | null,
  options?: AIChatRequestOptions
): AIChatRequestPayload {
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage) {
    throw Object.assign(new Error('Briefing prompt cannot be empty.'), {
      status: 400,
      code: 'INVALID_REQUEST' as const,
    }) as AIClientValidationError;
  }

  const trimmedConversationId =
    typeof conversationId === 'string' && conversationId.trim().length > 0
      ? conversationId.trim()
      : undefined;

  const payload: AIChatRequestPayload = trimmedConversationId
    ? { message: trimmedMessage, conversationId: trimmedConversationId }
    : { message: trimmedMessage };

  if (options?.scope === 'daily_briefing_7d' || options?.windowDays === 7) {
    const ref =
      options.referenceDate instanceof Date && !Number.isNaN(options.referenceDate.getTime())
        ? options.referenceDate
        : new Date();
    const localDate =
      typeof options.localDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.localDate.trim())
        ? options.localDate.trim()
        : formatCurrentLocalYMD(ref);
    const timezoneOffsetMinutes =
      typeof options.timezoneOffsetMinutes === 'number' &&
      Number.isFinite(options.timezoneOffsetMinutes)
        ? Math.trunc(options.timezoneOffsetMinutes)
        : ref.getTimezoneOffset();

    payload.scope = 'daily_briefing_7d';
    payload.windowDays = 7;
    payload.localDate = localDate;
    payload.timezoneOffsetMinutes = timezoneOffsetMinutes;
  }

  return payload;
}
