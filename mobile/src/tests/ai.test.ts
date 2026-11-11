/**
 * Comprehensive Unit Tests for LifeAdmin Mobile AI Assistant Feature
 * Tests action validation, format helpers, confirmation safeguards,
 * goal templates, and prompt calculations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProposedAction,
  formatMessageTime,
  getActionTypeIcon,
  getActionTypeBadge,
  formatActionSubtitle,
  SUGGESTED_PROMPTS,
  GOAL_TEMPLATES,
  SAMPLE_TEXT_SNIPPETS,
  buildAIChatPayload,
} from '../features/ai/services/aiCalculations.ts';
import { extractServerErrorMessage } from '../services/apiErrorUtils.ts';
import { ProposedAction } from '../features/ai/types.ts';

describe('LifeBuddy AI — Action Validation Safeguards (validateProposedAction)', () => {
  it('validates a valid task action', () => {
    const action: ProposedAction = {
      type: 'task',
      title: 'Submit tax return',
      dueDate: '2026-04-15',
      priority: 'high',
      category: 'Finance',
      description: 'Prepare forms and submit online',
    };

    const result = validateProposedAction(action);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('rejects an action with an empty or whitespace title', () => {
    const emptyTitle: ProposedAction = {
      type: 'task',
      title: '   ',
    };
    const resEmpty = validateProposedAction(emptyTitle);
    assert.strictEqual(resEmpty.valid, false);
    assert.ok(resEmpty.errors.some((e) => /title is required/i.test(e)));

    const missingTitle: ProposedAction = {
      type: 'task',
      title: '',
    };
    const resMissing = validateProposedAction(missingTitle);
    assert.strictEqual(resMissing.valid, false);
  });

  it('rejects an unsupported action type', () => {
    const invalidTypeAction = {
      type: 'unknown_type' as any,
      title: 'Do something',
    };
    const result = validateProposedAction(invalidTypeAction);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => /must be task, bill, appointment, or reminder/i.test(e)));
  });

  it('validates bill actions and rejects negative amounts', () => {
    const negativeBill: ProposedAction = {
      type: 'bill',
      title: 'Electricity Bill',
      amount: -50,
      dueDate: '2026-05-01',
    };
    const resNegative = validateProposedAction(negativeBill);
    assert.strictEqual(resNegative.valid, false);
    assert.ok(resNegative.errors.some((e) => /non-negative number/i.test(e)));

    const validBill: ProposedAction = {
      type: 'bill',
      title: 'Electricity Bill',
      amount: 1450,
      currency: 'INR',
      dueDate: '2026-05-01',
    };
    const resValid = validateProposedAction(validBill);
    assert.strictEqual(resValid.valid, true);
  });

  it('rejects invalid time formats', () => {
    const invalidTime: ProposedAction = {
      type: 'appointment',
      title: 'Dental Checkup',
      dueTime: '25:999',
    };
    const resInvalid = validateProposedAction(invalidTime);
    assert.strictEqual(resInvalid.valid, false);
    assert.ok(resInvalid.errors.some((e) => /hh:mm 24-hour/i.test(e)));

    const validTime: ProposedAction = {
      type: 'appointment',
      title: 'Dental Checkup',
      dueTime: '14:30',
      dueDate: '2026-06-10',
    };
    const resValid = validateProposedAction(validTime);
    assert.strictEqual(resValid.valid, true);
  });

  it('rejects titles longer than 120 characters', () => {
    const tooLongTitle: ProposedAction = {
      type: 'task',
      title: 'A'.repeat(125),
    };
    const res = validateProposedAction(tooLongTitle);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => /120 characters/i.test(e)));
  });
});

describe('LifeBuddy AI — Message Time Formatter (formatMessageTime)', () => {
  it('formats current time cleanly without crashing', () => {
    const formatted = formatMessageTime();
    assert.strictEqual(typeof formatted, 'string');
    assert.match(formatted, /\d{1,2}:\d{2}\s?(AM|PM)/i);
  });

  it('formats specific ISO date string into 12-hour time', () => {
    const iso = '2026-04-15T09:30:00.000Z';
    const formatted = formatMessageTime(iso);
    assert.strictEqual(typeof formatted, 'string');
    assert.match(formatted, /\d{1,2}:\d{2}/);
  });
});

describe('LifeBuddy AI — Type Badges and Icons', () => {
  it('provides appropriate icons for each action type', () => {
    const taskIcon = getActionTypeIcon('task');
    assert.strictEqual(taskIcon.ios, 'checkmark.circle.fill');
    assert.strictEqual(taskIcon.android, 'checklist');

    const billIcon = getActionTypeIcon('bill');
    assert.strictEqual(billIcon.ios, 'creditcard.fill');
    assert.strictEqual(billIcon.android, 'receipt_long');

    const appointmentIcon = getActionTypeIcon('appointment');
    assert.strictEqual(appointmentIcon.ios, 'calendar');
    assert.strictEqual(appointmentIcon.android, 'event');

    const reminderIcon = getActionTypeIcon('reminder');
    assert.strictEqual(reminderIcon.ios, 'bell.fill');
    assert.strictEqual(reminderIcon.android, 'alarm');
  });

  it('provides distinct badge styling and color coding', () => {
    const taskBadge = getActionTypeBadge('task');
    assert.strictEqual(taskBadge.label, 'Task');
    assert.strictEqual(taskBadge.color, '#0D9488');

    const billBadge = getActionTypeBadge('bill');
    assert.strictEqual(billBadge.label, 'Bill');
    assert.strictEqual(billBadge.color, '#059669');

    const appointmentBadge = getActionTypeBadge('appointment');
    assert.strictEqual(appointmentBadge.label, 'Appointment');
    assert.strictEqual(appointmentBadge.color, '#0284C7');

    const reminderBadge = getActionTypeBadge('reminder');
    assert.strictEqual(reminderBadge.label, 'Reminder');
    assert.strictEqual(reminderBadge.color, '#D97706');
  });
});

describe('LifeBuddy AI — Subtitle Formatting (formatActionSubtitle)', () => {
  it('formats bill subtitles with currency symbol and amount', () => {
    const bill: ProposedAction = {
      type: 'bill',
      title: 'Internet Fiber',
      amount: 1199,
      currency: 'INR',
      dueDate: '2026-05-10',
    };
    const sub = formatActionSubtitle(bill);
    assert.match(sub, /₹1,199|1199/);
    assert.match(sub, /2026-05-10/);
  });

  it('formats appointment subtitles with date and time', () => {
    const apt: ProposedAction = {
      type: 'appointment',
      title: 'Dentist',
      dueDate: '2026-06-15',
      dueTime: '10:00',
    };
    const sub = formatActionSubtitle(apt);
    assert.match(sub, /10:00/);
    assert.match(sub, /2026-06-15/);
  });

  it('formats task subtitles with date and priority', () => {
    const task: ProposedAction = {
      type: 'task',
      title: 'File GST',
      dueDate: '2026-07-20',
      priority: 'urgent',
      category: 'Finance',
    };
    const sub = formatActionSubtitle(task);
    assert.match(sub, /Urgent/);
    assert.match(sub, /2026-07-20/);
  });
});

describe('LifeBuddy AI — Prompt & Template Integrity', () => {
  it('contains diverse suggested questions', () => {
    assert.ok(Array.isArray(SUGGESTED_PROMPTS));
    assert.ok(SUGGESTED_PROMPTS.length >= 4);
    assert.ok(SUGGESTED_PROMPTS.some((p) => p.includes('focus')));
    assert.ok(SUGGESTED_PROMPTS.some((p) => p.includes('deadlines') || p.includes('bills')));
  });

  it('contains structured goal templates', () => {
    assert.ok(Array.isArray(GOAL_TEMPLATES));
    assert.ok(GOAL_TEMPLATES.length >= 4);
    assert.ok(GOAL_TEMPLATES.some((g) => g.includes('exams') || g.includes('budget')));
    assert.ok(GOAL_TEMPLATES.some((g) => g.includes('doctor') || g.includes('project')));
  });

  it('contains realistic sample text snippets for responsibility detection', () => {
    assert.ok(Array.isArray(SAMPLE_TEXT_SNIPPETS));
    assert.ok(SAMPLE_TEXT_SNIPPETS.length >= 3);
    assert.ok(SAMPLE_TEXT_SNIPPETS.some((s) => s.title.includes('Medical') || s.text.includes('Dr.')));
    assert.ok(SAMPLE_TEXT_SNIPPETS.some((s) => s.title.includes('Bill') || s.text.includes('Rent')));
  });
});

describe('LifeBuddy AI — HTTP 400 Serialization Regression & Server Error Parsing', () => {
  it('reproduces why the legacy double-wrapped body failed backend validation and verifies plain payload fix', () => {
    // Legacy bug serialized `{ body: JSON.stringify({ message }) }` inside ApiClient.post JSON.stringify
    const legacyWireBody = JSON.parse(
      JSON.stringify({ body: JSON.stringify({ message: 'What should I focus on today?' }) })
    );
    assert.strictEqual(legacyWireBody.message, undefined);
    assert.strictEqual(typeof legacyWireBody.body, 'string');

    // Fixed contract builds a plain object passed directly to ApiClient.post
    const payload = buildAIChatPayload('  What should I focus on today?  ', '  conv-123  ');
    const fixedWireBody = JSON.parse(JSON.stringify(payload));
    assert.strictEqual(fixedWireBody.message, 'What should I focus on today?');
    assert.strictEqual(fixedWireBody.conversationId, 'conv-123');
    assert.strictEqual(fixedWireBody.body, undefined);
  });

  it('omits empty/null conversationId cleanly from the chat payload', () => {
    const withoutConv = buildAIChatPayload('What should I focus on today?', null);
    assert.deepStrictEqual(withoutConv, { message: 'What should I focus on today?' });

    const blankConv = buildAIChatPayload('What should I focus on today?', '   ');
    assert.deepStrictEqual(blankConv, { message: 'What should I focus on today?' });
  });

  it('rejects empty or whitespace-only chat prompts before network dispatch', () => {
    assert.throws(
      () => buildAIChatPayload('   '),
      (err: any) => err?.status === 400 && err?.code === 'INVALID_REQUEST'
    );
    assert.throws(
      () => buildAIChatPayload(''),
      (err: any) => err?.status === 400 && err?.code === 'INVALID_REQUEST'
    );
  });

  it('extracts express-validator 400 field messages instead of exposing raw "HTTP Error 400"', () => {
    const express400Payload = {
      errors: [
        {
          type: 'field',
          msg: 'Message is required',
          path: 'message',
          location: 'body',
        },
      ],
    };

    const parsed = extractServerErrorMessage(express400Payload, 400, '');
    assert.strictEqual(parsed, 'Message is required');
    assert.ok(!/HTTP Error/i.test(parsed));
  });

  it('provides human-readable status fallbacks when response body is HTML or empty', () => {
    const htmlGatewayError = extractServerErrorMessage('<html><body>502 Bad Gateway</body></html>', 502, '');
    assert.ok(!/html/i.test(htmlGatewayError));
    assert.ok(!/HTTP Error/i.test(htmlGatewayError));
    assert.match(htmlGatewayError, /unavailable/i);

    const empty400 = extractServerErrorMessage(null, 400, '');
    assert.ok(!/HTTP Error/i.test(empty400));
    assert.match(empty400, /could not be processed/i);
  });

  it('attaches strict 7-day scope and local date metadata only for daily briefing requests', () => {
    const standardChat = buildAIChatPayload('Help me plan my week', 'conv-1');
    assert.deepStrictEqual(standardChat, {
      message: 'Help me plan my week',
      conversationId: 'conv-1',
    });

    const sevenDayPayload = buildAIChatPayload(
      'Give me my daily briefing for the next 7 calendar days only.',
      undefined,
      {
        scope: 'daily_briefing_7d',
        windowDays: 7,
        localDate: '2026-11-11',
        timezoneOffsetMinutes: -330,
      }
    );
    assert.deepStrictEqual(sevenDayPayload, {
      message: 'Give me my daily briefing for the next 7 calendar days only.',
      scope: 'daily_briefing_7d',
      windowDays: 7,
      localDate: '2026-11-11',
      timezoneOffsetMinutes: -330,
    });
  });
});
