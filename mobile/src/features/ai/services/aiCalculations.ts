/**
 * LifeAdmin Mobile — AI Helper Functions & Utilities
 * Pure functions for message formatting, type icons, action validation, and prompts.
 */

import { ProposedAction, ActionType } from '../types';
import { formatCurrency } from '../../../utils/currency';

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

  if (action.dueTime && !/^\d{2}:\d{2}$/.test(action.dueTime)) {
    errors.push('Time must be in HH:mm 24-hour format.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats readable subtitle summary for an action
 */
export function formatActionSubtitle(action: ProposedAction): string {
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
    parts.push(formatCurrency(action.amount, action.currency || '₹'));
  }

  if (action.priority) {
    parts.push(action.priority.charAt(0).toUpperCase() + action.priority.slice(1));
  }

  return parts.join(' · ');
}
