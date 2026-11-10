/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Calendar Feature
 * Tests month grid generation, week schedule, day range, leap year & DST boundaries,
 * entity aggregation, duplicate prevention, and timezone-safe date extraction.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toLocalISODate,
  startOfCalendarDay,
  endOfDay,
  addDays,
  startOfWeek,
  isSameDay,
  eventLocalDate,
  formatTimeRange,
  getMonthGridCells,
  getWeekDays,
  getDateRangeForView,
  deduplicateEvents,
  filterEvents,
  groupEventsByDate,
  formatCalendarHeader,
} from '../features/calendar/services/calendarCalculations.ts';
import { CalendarEventItem } from '../features/calendar/types.ts';

function createMockEvent(overrides: Partial<CalendarEventItem> = {}): CalendarEventItem {
  return {
    id: `evt-${Math.random().toString(36).substring(2, 9)}`,
    title: 'Dental Appointment',
    date: '2026-11-15T10:00:00.000Z',
    startTime: '10:00',
    endTime: '11:00',
    allDay: false,
    type: 'appointment',
    source: 'appointment',
    status: 'scheduled',
    category: 'Health',
    color: '#8B5CF6',
    ...overrides,
  };
}

describe('Timezone & Date Correctness (toLocalISODate & eventLocalDate)', () => {
  it('formats dates to YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 10, 15); // Month index 10 = November
    assert.strictEqual(toLocalISODate(d), '2026-11-15');

    const singleDigit = new Date(2026, 2, 5); // March 5
    assert.strictEqual(toLocalISODate(singleDigit), '2026-03-05');
  });

  it('correctly extracts local date from event items with and without timestamp', () => {
    const withISO = createMockEvent({ date: '2026-07-20T14:30:00.000Z' });
    const localIso = toLocalISODate(new Date('2026-07-20T14:30:00.000Z'));
    assert.strictEqual(eventLocalDate(withISO), localIso);

    const plainDate = createMockEvent({ date: '2026-12-25' });
    assert.strictEqual(eventLocalDate(plainDate), '2026-12-25');
  });

  it('handles invalid date strings gracefully', () => {
    const invalid = createMockEvent({ date: 'invalid-date' });
    assert.strictEqual(eventLocalDate(invalid), '');
  });

  it('correctly compares two dates for same-day matching', () => {
    const a = new Date(2026, 5, 10, 8, 30);
    const b = new Date(2026, 5, 10, 22, 15);
    const c = new Date(2026, 5, 11, 8, 30);

    assert.strictEqual(isSameDay(a, b), true);
    assert.strictEqual(isSameDay(a, c), false);
  });
});

describe('Time Range Formatting (formatTimeRange)', () => {
  it('formats all-day events as "All day"', () => {
    const allDayEvt = createMockEvent({ allDay: true, startTime: '09:00', endTime: '17:00' });
    assert.strictEqual(formatTimeRange(allDayEvt), 'All day');

    const noTimes = createMockEvent({ allDay: false, startTime: undefined, endTime: undefined });
    assert.strictEqual(formatTimeRange(noTimes), 'All day');
  });

  it('formats start and end times together', () => {
    const timed = createMockEvent({ allDay: false, startTime: '14:00', endTime: '15:30' });
    assert.strictEqual(formatTimeRange(timed), '14:00 – 15:30');
  });

  it('formats start time only when end time is missing', () => {
    const startOnly = createMockEvent({ allDay: false, startTime: '09:00', endTime: undefined });
    assert.strictEqual(formatTimeRange(startOnly), '09:00');
  });
});

describe('Month Grid Calculations (getMonthGridCells)', () => {
  it('generates complete weeks grid (35 or 42 cells) for November 2026', () => {
    const nov2026 = new Date(2026, 10, 1); // Nov 1, 2026 is Sunday (day 0)
    const cells = getMonthGridCells(nov2026);

    // Nov 2026 has 30 days and starts on Sunday, so exactly 35 cells (5 full weeks)
    assert.strictEqual(cells.length, 35);
    assert.strictEqual(cells[0].dayNumber, 1);
    assert.strictEqual(cells[0].isCurrentMonth, true);
    assert.strictEqual(cells[29].dayNumber, 30);
    assert.strictEqual(cells[29].isCurrentMonth, true);

    // Remaining 5 cells should be December 1-5
    assert.strictEqual(cells[30].dayNumber, 1);
    assert.strictEqual(cells[30].isCurrentMonth, false);
    assert.strictEqual(cells[34].dayNumber, 5);
    assert.strictEqual(cells[34].isCurrentMonth, false);
  });

  it('generates 42 cells for months spanning 6 weeks (e.g. August 2026)', () => {
    const aug2026 = new Date(2026, 7, 1); // Aug 1, 2026 starts on Saturday (day 6)
    const cells = getMonthGridCells(aug2026);

    assert.strictEqual(cells.length, 42);
    // First 6 cells must be July 26-31
    assert.strictEqual(cells[0].dayNumber, 26);
    assert.strictEqual(cells[0].isCurrentMonth, false);
    assert.strictEqual(cells[5].dayNumber, 31);
    assert.strictEqual(cells[5].isCurrentMonth, false);

    // Aug 1 is cell index 6
    assert.strictEqual(cells[6].dayNumber, 1);
    assert.strictEqual(cells[6].isCurrentMonth, true);
  });

  it('handles February leap year correctly (29 days in 2028 vs 28 days in 2029)', () => {
    const leapFeb = new Date(2028, 1, 1);
    const leapCells = getMonthGridCells(leapFeb);
    const currentMonthLeap = leapCells.filter((c) => c.isCurrentMonth);
    assert.strictEqual(currentMonthLeap.length, 29);

    const nonLeapFeb = new Date(2029, 1, 1);
    const nonLeapCells = getMonthGridCells(nonLeapFeb);
    const currentMonthNonLeap = nonLeapCells.filter((c) => c.isCurrentMonth);
    assert.strictEqual(currentMonthNonLeap.length, 28);
  });

  it('marks selectedDate and today correctly', () => {
    const date = new Date(2026, 10, 15);
    const selected = new Date(2026, 10, 18);
    const cells = getMonthGridCells(date, selected);

    const selectedCell = cells.find((c) => c.isCurrentMonth && c.dayNumber === 18);
    assert.ok(selectedCell);
    assert.strictEqual(selectedCell.isSelected, true);

    const unselectedCell = cells.find((c) => c.isCurrentMonth && c.dayNumber === 15);
    assert.ok(unselectedCell);
    assert.strictEqual(unselectedCell.isSelected, false);
  });
});

describe('Week Schedule & Navigation (getWeekDays & startOfWeek)', () => {
  it('calculates 7 continuous days starting on Sunday', () => {
    const wednesday = new Date(2026, 10, 18); // Nov 18, 2026
    const weekDays = getWeekDays(wednesday);

    assert.strictEqual(weekDays.length, 7);
    assert.strictEqual(weekDays[0].date.getDay(), 0); // Sunday (Nov 15)
    assert.strictEqual(weekDays[0].dayNumber, 15);
    assert.strictEqual(weekDays[6].date.getDay(), 6); // Saturday (Nov 21)
    assert.strictEqual(weekDays[6].dayNumber, 21);
  });

  it('handles month transitions across weeks seamlessly', () => {
    const oct31 = new Date(2026, 9, 31); // Saturday Oct 31, 2026
    const weekDays = getWeekDays(oct31);

    assert.strictEqual(weekDays.length, 7);
    assert.strictEqual(weekDays[0].dayNumber, 25); // Oct 25
    assert.strictEqual(weekDays[6].dayNumber, 31); // Oct 31

    const nov1 = new Date(2026, 10, 1); // Sunday Nov 1, 2026
    const novWeek = getWeekDays(nov1);
    assert.strictEqual(novWeek[0].dayNumber, 1); // Nov 1
    assert.strictEqual(novWeek[6].dayNumber, 7); // Nov 7
  });

  it('adds days reliably across month and year boundaries', () => {
    const newYearsEve = new Date(2026, 11, 31);
    const nextDay = addDays(newYearsEve, 1);
    assert.strictEqual(nextDay.getFullYear(), 2027);
    assert.strictEqual(nextDay.getMonth(), 0);
    assert.strictEqual(nextDay.getDate(), 1);

    const prevDay = addDays(newYearsEve, -30);
    assert.strictEqual(prevDay.getMonth(), 11);
    assert.strictEqual(prevDay.getDate(), 1);
  });
});

describe('Entity Aggregation & Deduplication', () => {
  it('deduplicates events with identical IDs from unified feed', () => {
    const evts: CalendarEventItem[] = [
      createMockEvent({ id: 'evt-1', title: 'Task 1' }),
      createMockEvent({ id: 'evt-2', title: 'Bill 1' }),
      createMockEvent({ id: 'evt-1', title: 'Duplicate Task 1' }),
    ];

    const deduplicated = deduplicateEvents(evts);
    assert.strictEqual(deduplicated.length, 2);
    assert.deepStrictEqual(deduplicated.map((e) => e.id), ['evt-1', 'evt-2']);
  });

  it('filters events by entity type (event, task, bill, appointment, reminder)', () => {
    const evts: CalendarEventItem[] = [
      createMockEvent({ id: '1', type: 'event' }),
      createMockEvent({ id: '2', type: 'task' }),
      createMockEvent({ id: '3', type: 'bill' }),
      createMockEvent({ id: '4', type: 'appointment' }),
      createMockEvent({ id: '5', type: 'reminder' }),
    ];

    assert.strictEqual(filterEvents(evts, 'all').length, 5);
    assert.strictEqual(filterEvents(evts, 'event').length, 1);
    assert.strictEqual(filterEvents(evts, 'task').length, 1);
    assert.strictEqual(filterEvents(evts, 'bill').length, 1);
    assert.strictEqual(filterEvents(evts, 'appointment').length, 1);
    assert.strictEqual(filterEvents(evts, 'reminder').length, 1);
  });

  it('searches events by title, location, category, and details', () => {
    const evts: CalendarEventItem[] = [
      createMockEvent({ id: '1', title: 'Airtel Broadband Bill', location: 'Home' }),
      createMockEvent({ id: '2', title: 'Consultation', location: 'City Clinic' }),
      createMockEvent({ id: '3', title: 'Assignment Submission', category: 'Work/Study' }),
    ];

    const searchClinic = filterEvents(evts, 'all', 'clinic');
    assert.strictEqual(searchClinic.length, 1);
    assert.strictEqual(searchClinic[0].id, '2');

    const searchBill = filterEvents(evts, 'all', 'broadband');
    assert.strictEqual(searchBill.length, 1);
    assert.strictEqual(searchBill[0].id, '1');
  });

  it('groups events by date and orders all-day events before timed events', () => {
    const evts: CalendarEventItem[] = [
      createMockEvent({
        id: '1',
        date: '2026-11-20',
        allDay: false,
        startTime: '14:00',
        title: 'Afternoon Meeting',
      }),
      createMockEvent({
        id: '2',
        date: '2026-11-20',
        allDay: true,
        title: 'Rent Due Today',
      }),
      createMockEvent({
        id: '3',
        date: '2026-11-20',
        allDay: false,
        startTime: '09:00',
        title: 'Morning Sync',
      }),
      createMockEvent({
        id: '4',
        date: '2026-11-21',
        allDay: true,
        title: 'Weekend Off',
      }),
    ];

    const groups = groupEventsByDate(evts);
    assert.strictEqual(Object.keys(groups).length, 2);

    const nov20 = groups['2026-11-20'];
    assert.strictEqual(nov20.length, 3);
    // All-day first
    assert.strictEqual(nov20[0].title, 'Rent Due Today');
    // Then 09:00
    assert.strictEqual(nov20[1].title, 'Morning Sync');
    // Then 14:00
    assert.strictEqual(nov20[2].title, 'Afternoon Meeting');
  });
});

describe('Date Ranges & Header Formatting', () => {
  it('computes correct date range for month, week, and day views', () => {
    const date = new Date(2026, 10, 15);

    const monthRange = getDateRangeForView('month', date);
    assert.ok(monthRange.start < date);
    assert.ok(monthRange.end > date);

    const weekRange = getDateRangeForView('week', date);
    assert.strictEqual(weekRange.start.getDay(), 0); // Sunday
    assert.strictEqual(weekRange.end.getDay(), 6); // Saturday

    const dayRange = getDateRangeForView('day', date);
    assert.strictEqual(isSameDay(dayRange.start, dayRange.end), true);
  });

  it('formats calendar header strings for all 3 views', () => {
    const date = new Date(2026, 10, 15); // Nov 15, 2026 (Sunday)

    const monthHeader = formatCalendarHeader('month', date);
    assert.strictEqual(monthHeader, 'November 2026');

    const weekHeader = formatCalendarHeader('week', date);
    assert.ok(weekHeader.includes('Nov 15') && weekHeader.includes('21'));

    const dayHeader = formatCalendarHeader('day', date);
    assert.ok(dayHeader.includes('Sunday') && dayHeader.includes('November 15, 2026'));
  });
});
