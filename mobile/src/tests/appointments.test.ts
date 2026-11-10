/**
 * Comprehensive Unit Tests for LifeAdmin Mobile Appointments Feature
 * Tests status determination (today/upcoming/past), calculation of dashboard totals,
 * multi-criteria filtering, search matching, sorting, and date/time formatting.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toLocalISODate,
  startOfDay,
  isAppointmentToday,
  isAppointmentUpcoming,
  isAppointmentPast,
  calculateAppointmentTotals,
  formatAppointmentTime,
  formatAppointmentDate,
  filterAndSortAppointments,
} from '../features/appointments/services/appointmentCalculations.ts';
import { Appointment } from '../features/appointments/types.ts';

function createMockAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    _id: `appt-${Math.random().toString(36).substring(2, 9)}`,
    title: 'Dr. Smith - Annual Dental Cleaning',
    date: '2026-11-20T10:00:00.000Z',
    time: '10:00',
    endTime: '11:00',
    location: 'Downtown Dental Clinic, Suite 400',
    relatedPerson: 'Dr. Jane Smith',
    relatedOrganization: 'Downtown Health Partners',
    category: 'Health',
    notes: 'Bring previous dental records and insurance card.',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Appointment Date & Time Helpers', () => {
  it('formats dates to local ISO format YYYY-MM-DD', () => {
    const d = new Date(2026, 10, 15); // Month 10 = November
    assert.strictEqual(toLocalISODate(d), '2026-11-15');

    const singleDigit = new Date(2026, 3, 5); // Month 3 = April
    assert.strictEqual(toLocalISODate(singleDigit), '2026-04-05');
  });

  it('normalizes a date to start of day (00:00:00.000)', () => {
    const d = new Date(2026, 6, 20, 15, 30, 45, 500);
    const start = startOfDay(d);
    assert.strictEqual(start.getHours(), 0);
    assert.strictEqual(start.getMinutes(), 0);
    assert.strictEqual(start.getSeconds(), 0);
    assert.strictEqual(start.getMilliseconds(), 0);
    assert.strictEqual(start.getDate(), 20);
  });

  it('formats 24h appointment times into human-readable 12h format', () => {
    assert.strictEqual(formatAppointmentTime('09:00', '10:30'), '9:00 AM – 10:30 AM');
    assert.strictEqual(formatAppointmentTime('14:15', '15:45'), '2:15 PM – 3:45 PM');
    assert.strictEqual(formatAppointmentTime('12:00', '13:00'), '12:00 PM – 1:00 PM');
    assert.strictEqual(formatAppointmentTime('00:30'), '12:30 AM');
    assert.strictEqual(formatAppointmentTime('18:00'), '6:00 PM');
    assert.strictEqual(formatAppointmentTime(undefined, undefined), 'Time not specified');
  });

  it('formats appointment dates nicely with weekday or "Today"', () => {
    const today = new Date();
    assert.ok(formatAppointmentDate(today).startsWith('Today,'));

    // Fixed future date: Dec 25, 2026 is a Friday
    const dec25 = new Date(2026, 11, 25);
    const formattedDec25 = formatAppointmentDate(dec25);
    assert.strictEqual(formattedDec25, 'Fri, Dec 25, 2026');

    assert.strictEqual(formatAppointmentDate(''), '');
  });
});

describe('Appointment Status Checks (Today, Upcoming, Past)', () => {
  it('identifies today appointments accurately', () => {
    const today = new Date();
    assert.strictEqual(isAppointmentToday(today), true);
    assert.strictEqual(isAppointmentToday(today.toISOString()), true);

    const yesterday = new Date(today.getTime() - 86400000 * 2);
    assert.strictEqual(isAppointmentToday(yesterday), false);

    const future = new Date(today.getTime() + 86400000 * 5);
    assert.strictEqual(isAppointmentToday(future), false);

    assert.strictEqual(isAppointmentToday(''), false);
    assert.strictEqual(isAppointmentToday('invalid-date'), false);
  });

  it('identifies future appointments as upcoming', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    assert.strictEqual(isAppointmentUpcoming(futureDate), true);
    assert.strictEqual(isAppointmentUpcoming(futureDate.toISOString()), true);
    assert.strictEqual(isAppointmentPast(futureDate), false);
  });

  it('identifies past dates as past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    assert.strictEqual(isAppointmentUpcoming(pastDate), false);
    assert.strictEqual(isAppointmentPast(pastDate), true);
  });

  it('handles today appointments with time-of-day granularity', () => {
    const today = new Date();
    const currentHour = today.getHours();

    // A time 2 hours later today should be upcoming
    if (currentHour < 22) {
      const laterTime = `${String(currentHour + 2).padStart(2, '0')}:00`;
      assert.strictEqual(isAppointmentUpcoming(today, laterTime), true);
      assert.strictEqual(isAppointmentPast(today, laterTime), false);
    }

    // A time 2 hours earlier today should be past
    if (currentHour >= 2) {
      const earlierTime = `${String(currentHour - 2).padStart(2, '0')}:00`;
      assert.strictEqual(isAppointmentUpcoming(today, earlierTime), false);
      assert.strictEqual(isAppointmentPast(today, earlierTime), true);
    }

    // Today without specific time defaults to upcoming during that day
    assert.strictEqual(isAppointmentUpcoming(today), true);
    assert.strictEqual(isAppointmentPast(today), false);
  });
});

describe('Dashboard Totals Calculation', () => {
  it('correctly tallies total, upcoming, today, and past appointments', () => {
    const today = new Date();
    const future = new Date(today.getTime() + 86400000 * 7);
    const past = new Date(today.getTime() - 86400000 * 7);

    const sampleAppointments: Appointment[] = [
      createMockAppointment({
        _id: '1',
        title: 'Today Appt',
        date: today.toISOString(),
        time: '23:59',
      }),
      createMockAppointment({
        _id: '2',
        title: 'Future Appt 1',
        date: future.toISOString(),
      }),
      createMockAppointment({
        _id: '3',
        title: 'Future Appt 2',
        date: future.toISOString(),
      }),
      createMockAppointment({
        _id: '4',
        title: 'Past Appt',
        date: past.toISOString(),
      }),
    ];

    const totals = calculateAppointmentTotals(sampleAppointments);
    assert.strictEqual(totals.totalCount, 4);
    assert.strictEqual(totals.todayCount, 1);
    assert.strictEqual(totals.upcomingCount, 3); // 1 today (at 23:59) + 2 future
    assert.strictEqual(totals.pastCount, 1);
  });

  it('handles empty appointment lists gracefully', () => {
    const totals = calculateAppointmentTotals([]);
    assert.strictEqual(totals.totalCount, 0);
    assert.strictEqual(totals.todayCount, 0);
    assert.strictEqual(totals.upcomingCount, 0);
    assert.strictEqual(totals.pastCount, 0);
  });
});

describe('Filtering, Searching, and Sorting', () => {
  const today = new Date();
  const future = new Date(today.getTime() + 86400000 * 5);
  const past = new Date(today.getTime() - 86400000 * 5);

  const dataset: Appointment[] = [
    createMockAppointment({
      _id: 'a1',
      title: 'Pediatric Checkup',
      date: today.toISOString(),
      time: '23:50',
      category: 'Health',
      relatedPerson: 'Dr. Alice Brown',
      relatedOrganization: 'Childrens Clinic',
      location: 'Room 201',
      notes: 'Vaccination follow up',
    }),
    createMockAppointment({
      _id: 'a2',
      title: 'Lawyer Consultation',
      date: future.toISOString(),
      time: '14:00',
      category: 'Work',
      relatedPerson: 'Marcus Vance',
      relatedOrganization: 'Vance & Associates',
      location: 'Financial District Office 10',
      notes: 'Lease contract review',
    }),
    createMockAppointment({
      _id: 'a3',
      title: 'Automotive Inspection',
      date: past.toISOString(),
      time: '09:00',
      category: 'Personal',
      relatedPerson: 'Jack Wheeler',
      relatedOrganization: 'Speedy Auto Works',
      location: 'Bay 4',
      notes: 'Brake pads replacement verification',
    }),
  ];

  it('filters by status tab (all, today, upcoming, past)', () => {
    const all = filterAndSortAppointments(dataset, 'all');
    assert.strictEqual(all.length, 3);

    const todayList = filterAndSortAppointments(dataset, 'today');
    assert.strictEqual(todayList.length, 1);
    assert.strictEqual(todayList[0]._id, 'a1');

    const upcomingList = filterAndSortAppointments(dataset, 'upcoming');
    assert.strictEqual(upcomingList.length, 2); // a1 (today late) + a2 (future)

    const pastList = filterAndSortAppointments(dataset, 'past');
    assert.strictEqual(pastList.length, 1);
    assert.strictEqual(pastList[0]._id, 'a3');
  });

  it('filters by category', () => {
    const healthOnly = filterAndSortAppointments(dataset, 'all', '', 'Health');
    assert.strictEqual(healthOnly.length, 1);
    assert.strictEqual(healthOnly[0].category, 'Health');

    const workOnly = filterAndSortAppointments(dataset, 'all', '', 'Work');
    assert.strictEqual(workOnly.length, 1);
    assert.strictEqual(workOnly[0].category, 'Work');

    const allCategories = filterAndSortAppointments(dataset, 'all', '', 'All');
    assert.strictEqual(allCategories.length, 3);
  });

  it('searches across title, related person, organization, location, and notes', () => {
    // Search by title keyword
    const matchTitle = filterAndSortAppointments(dataset, 'all', 'pediatric');
    assert.strictEqual(matchTitle.length, 1);
    assert.strictEqual(matchTitle[0]._id, 'a1');

    // Search by doctor / person
    const matchPerson = filterAndSortAppointments(dataset, 'all', 'marcus');
    assert.strictEqual(matchPerson.length, 1);
    assert.strictEqual(matchPerson[0]._id, 'a2');

    // Search by organization
    const matchOrg = filterAndSortAppointments(dataset, 'all', 'speedy auto');
    assert.strictEqual(matchOrg.length, 1);
    assert.strictEqual(matchOrg[0]._id, 'a3');

    // Search by location
    const matchLocation = filterAndSortAppointments(dataset, 'all', 'financial district');
    assert.strictEqual(matchLocation.length, 1);
    assert.strictEqual(matchLocation[0]._id, 'a2');

    // Search by notes
    const matchNotes = filterAndSortAppointments(dataset, 'all', 'vaccination');
    assert.strictEqual(matchNotes.length, 1);
    assert.strictEqual(matchNotes[0]._id, 'a1');

    // Search non-matching term
    const noMatch = filterAndSortAppointments(dataset, 'all', 'nonexistent term 12345');
    assert.strictEqual(noMatch.length, 0);
  });

  it('sorts appointments by earliest date, latest date, and title alphabetical', () => {
    const byDateAsc = filterAndSortAppointments(dataset, 'all', '', undefined, 'date');
    assert.strictEqual(byDateAsc[0]._id, 'a3'); // past date
    assert.strictEqual(byDateAsc[2]._id, 'a2'); // future date

    const byDateDesc = filterAndSortAppointments(dataset, 'all', '', undefined, '-date');
    assert.strictEqual(byDateDesc[0]._id, 'a2'); // future date
    assert.strictEqual(byDateDesc[2]._id, 'a3'); // past date

    const byTitle = filterAndSortAppointments(dataset, 'all', '', undefined, 'title');
    assert.strictEqual(byTitle[0].title, 'Automotive Inspection');
    assert.strictEqual(byTitle[1].title, 'Lawyer Consultation');
    assert.strictEqual(byTitle[2].title, 'Pediatric Checkup');
  });
});

