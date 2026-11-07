/**
 * Date formatting helpers for LifeAdmin Mobile
 */

export function getGreeting(date: Date = new Date()): {
  text: string;
  iconName: string;
} {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return { text: 'Good morning', iconName: 'wb_sunny' };
  } else if (hours >= 12 && hours < 17) {
    return { text: 'Good afternoon', iconName: 'light_mode' };
  } else if (hours >= 17 && hours < 22) {
    return { text: 'Good evening', iconName: 'wb_twilight' };
  } else {
    return { text: 'Good night', iconName: 'nightlight_round' };
  }
}

export function formatShortDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `in ${diffDays} days`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(timeStr?: string, dateInput?: string | Date): string {
  if (timeStr) return timeStr;
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

  // If time is 00:00 (midnight default), don't show specific time
  if (hours === 0 && minutes === 0) return '';
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

export function formatTimelineDate(dateInput: string | Date): {
  dayNumber: string;
  monthName: string;
  weekday: string;
  relativeLabel?: string;
} {
  const d = new Date(dateInput);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let relativeLabel: string | undefined;
  if (diffDays === 0) relativeLabel = 'Today';
  else if (diffDays === 1) relativeLabel = 'Tomorrow';
  else if (diffDays < 0) relativeLabel = `${Math.abs(diffDays)}d ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    dayNumber: String(d.getDate()),
    monthName: months[d.getMonth()],
    weekday: days[d.getDay()],
    relativeLabel,
  };
}
