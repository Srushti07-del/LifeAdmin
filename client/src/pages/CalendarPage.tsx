import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  DollarSign,
  Bell,
  CheckSquare,
  CalendarClock,
  X,
  Loader2,
} from 'lucide-react';

interface CalendarEventItem {
  id: string;
  originalId?: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: 'event' | 'task' | 'bill' | 'appointment' | 'reminder';
  source: string;
  status: string;
  priority?: string;
  category: string;
  color?: string;
  details?: string;
  location?: string;
  isOriginalEvent?: boolean;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; items: CalendarEventItem[] } | null>(null);
  
  // Create event modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('Personal');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [newEventColor, setNewEventColor] = useState('#4c6ef5');
  const [savingEvent, setSavingEvent] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Determine month bounds
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0).toISOString();

      const res = await api.get('/calendar/events', { params: { start, end } });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Fetch calendar events error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEvent(true);
      await api.post('/calendar/events', {
        title: newEventTitle,
        startDate: newEventDate,
        startTime: newEventTime,
        location: newEventLocation,
        category: newEventCategory,
        description: newEventNotes,
        color: newEventColor,
      });

      setShowAddModal(false);
      setNewEventTitle('');
      setNewEventNotes('');
      setNewEventLocation('');
      fetchEvents();
    } catch (err) {
      console.error('Create event error:', err);
      alert('Failed to create event');
    } finally {
      setSavingEvent(false);
    }
  };

  // Build calendar matrix
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month padding
  const remainingSlots = 35 - calendarDays.length > 0 ? 35 - calendarDays.length : (42 - calendarDays.length);
  for (let i = 1; i <= remainingSlots; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((evt) => {
      const evtDateStr = new Date(evt.date).toISOString().split('T')[0];
      const matchesDate = evtDateStr === dateStr;
      if (!matchesDate) return false;
      if (selectedType === 'all') return true;
      return evt.type === selectedType;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const typeConfig = {
    event: { label: 'Event', icon: CalendarIcon, color: 'bg-primary-500 text-white' },
    task: { label: 'Task', icon: CheckSquare, color: 'bg-accent-500 text-white' },
    bill: { label: 'Bill', icon: DollarSign, color: 'bg-warning-500 text-white' },
    appointment: { label: 'Appointment', icon: CalendarClock, color: 'bg-purple-500 text-white' },
    reminder: { label: 'Reminder', icon: Bell, color: 'bg-blue-500 text-white' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Unified Calendar</h1>
          <p className="text-surface-500 text-sm mt-1">
            All your tasks, bills, appointments, reminders, and events aggregated into one comprehensive view.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      {/* Month Navigator & Type Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 min-w-44 flex items-center gap-2">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            {loading && <Loader2 size={16} className="animate-spin text-primary-500" />}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
            }`}
          >
            All Items
          </button>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedType === key
                  ? cfg.color
                  : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
              }`}
            >
              <cfg.icon size={13} />
              <span>{cfg.label}s</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-sm">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-surface-200 dark:border-surface-800 text-center text-xs font-semibold text-surface-400 py-3 bg-surface-50/50 dark:bg-surface-800/20">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-surface-200 dark:divide-surface-800">
          {calendarDays.map((dayObj, i) => {
            const dayEvents = getEventsForDay(dayObj.date);
            const isCurrent = isToday(dayObj.date);

            return (
              <div
                key={i}
                onClick={() => setSelectedDayEvents({ date: dayObj.date, items: dayEvents })}
                className={`min-h-28 p-2 flex flex-col justify-between cursor-pointer transition-colors hover:bg-surface-50/80 dark:hover:bg-surface-800/40 ${
                  !dayObj.isCurrentMonth ? 'bg-surface-50/30 dark:bg-surface-950/20 opacity-40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full ${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-surface-700 dark:text-surface-300'
                    }`}
                  >
                    {dayObj.date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium text-surface-400">
                      {dayEvents.length} item{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Event pills preview */}
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border border-surface-200/50 dark:border-surface-700/50"
                      style={{
                        backgroundColor: item.color ? `${item.color}20` : '#4c6ef520',
                        color: item.color || '#4c6ef5',
                      }}
                      title={item.title}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || '#4c6ef5' }} />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-medium text-surface-400 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Drawer / Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-surface-800 animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  {selectedDayEvents.date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-surface-500">
                  {selectedDayEvents.items.length} schedule item(s) on this date
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selectedDayEvents.items.length === 0 ? (
                <div className="text-center py-10 text-surface-400 text-sm">
                  Nothing scheduled on this day.
                </div>
              ) : (
                selectedDayEvents.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/40 flex items-start gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                      style={{ backgroundColor: item.color || '#4c6ef5' }}
                    >
                      {item.type.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                          {item.title}
                        </h4>
                        <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 font-semibold">
                          {item.type}
                        </span>
                      </div>
                      {item.details && (
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                          {item.details}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-surface-400 mt-2">
                        {item.startTime && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {item.startTime}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {item.location}
                          </span>
                        )}
                        <span>Category: {item.category}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-surface-200 dark:border-surface-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setNewEventDate(selectedDayEvents.date.toISOString().split('T')[0]);
                  setSelectedDayEvents(null);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
              >
                <Plus size={14} />
                <span>Add Event on this day</span>
              </button>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium text-surface-600 hover:bg-surface-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-surface-800 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">Schedule Event</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-surface-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Study Session, Lease Renewal, Car Inspection"
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="e.g. Campus Library 3rd Floor / Zoom"
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work/Study">Work / Study</option>
                    <option value="Health">Health</option>
                    <option value="Household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Badge Color
                  </label>
                  <input
                    type="color"
                    value={newEventColor}
                    onChange={(e) => setNewEventColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Important details or preparation..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
                >
                  {savingEvent && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
