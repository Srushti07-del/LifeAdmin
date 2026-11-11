/**
 * LifeAdmin Mobile — Appointments Calculations & Helpers
 * Pure domain logic: today/upcoming/past status calculations, summary metrics,
 * multi-criteria filtering, search, and date formatting.
 */

import {
  Appointment,
  AppointmentFilterKey,
  AppointmentSortKey,
  AppointmentTotals,
} from '../types';

/**
 * Returns YYYY-MM-DD in local time
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Determines whether an appointment is scheduled for today in local time
 */
export function isAppointmentToday(dateInput: string | Date): boolean {
  if (!dateInput) return false;
  const target = new Date(dateInput);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

/**
 * Determines whether an appointment is upcoming (future date, or today with remaining time)
 */
export function isAppointmentUpcoming(
  dateInput: string | Date,
  timeStr?: string
): boolean {
  if (!dateInput) return false;
  const target = new Date(dateInput);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const todayStart = startOfDay(now);
  const targetDayStart = startOfDay(target);

  if (targetDayStart.getTime() > todayStart.getTime()) {
    return true;
  }

  if (targetDayStart.getTime() === todayStart.getTime()) {
    if (!timeStr) return true; // Today without specific time is considered upcoming during the day
    const [hours, minutes] = timeStr.split(':').map((s) => parseInt(s, 10));
    if (isNaN(hours)) return true;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const apptMinutes = hours * 60 + (minutes || 0);
    return apptMinutes >= currentMinutes;
  }

  return false;
}

/**
 * Determines whether an appointment is in the past
 */
export function isAppointmentPast(
  dateInput: string | Date,
  timeStr?: string
): boolean {
  return !isAppointmentUpcoming(dateInput, timeStr);
}

/**
 * Computes dashboard overview counters for appointments
 */
export function calculateAppointmentTotals(
  appointments: Appointment[]
): AppointmentTotals {
  let todayCount = 0;
  let upcomingCount = 0;
  let pastCount = 0;

  for (const appt of appointments) {
    if (isAppointmentToday(appt.date)) {
      todayCount++;
    }
    if (isAppointmentUpcoming(appt.date, appt.time)) {
      upcomingCount++;
    } else {
      pastCount++;
    }
  }

  return {
    totalCount: appointments.length,
    todayCount,
    upcomingCount,
    pastCount,
  };
}

/**
 * Formats 24h "HH:mm" to human-readable "10:00 AM" or "10:00 AM – 11:00 AM"
 */
export function formatAppointmentTime(time?: string, endTime?: string): string {
  if (!time && !endTime) return 'Time not specified';

  const formatSingle = (t: string) => {
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const displayM = isNaN(m) ? '00' : String(m).padStart(2, '0');
    return `${displayH}:${displayM} ${ampm}`;
  };

  if (time && endTime) {
    return `${formatSingle(time)} – ${formatSingle(endTime)}`;
  }
  return formatSingle(time || endTime!);
}

/**
 * Formats appointment date string
 */
export function formatAppointmentDate(dateInput: string | Date): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekday = weekdays[d.getDay()];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  if (isAppointmentToday(d)) {
    return `Today, ${month} ${day}`;
  }

  return `${weekday}, ${month} ${day}, ${year}`;
}

/**
 * Filters, searches, and sorts appointments collection
 */
export function filterAndSortAppointments(
  appointments: Appointment[],
  filter: AppointmentFilterKey = 'all',
  searchQuery: string = '',
  category?: string,
  sortKey: AppointmentSortKey = 'date'
): Appointment[] {
  let list = appointments.filter((appt) => {
    // 1. Status Filter Tab
    if (filter === 'today') {
      if (!isAppointmentToday(appt.date)) return false;
    } else if (filter === 'upcoming') {
      if (!isAppointmentUpcoming(appt.date, appt.time)) return false;
    } else if (filter === 'past') {
      if (!isAppointmentPast(appt.date, appt.time)) return false;
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      if ((appt.category || 'Personal').toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // 3. Search Query
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.relatedPerson || '').toLowerCase().includes(q) ||
        (a.relatedOrganization || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
    );
  }

  // 4. Sort
  list = [...list].sort((a, b) => {
    if (sortKey === 'date') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortKey === '-date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortKey === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  return list;
}

