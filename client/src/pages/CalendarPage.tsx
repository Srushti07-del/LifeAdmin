import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ExternalLink,
  Trash2,
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
  const navigate = useNavigate();
  const location = useLocation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; items: CalendarEventItem[] } | null>(null);
  
  // Create event modal state
  const [showAddModal, setShowAddModal] = useState(location.pathname.endsWith('/new'));
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('Personal');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [newEventColor, setNewEventColor] = useState('#4c6ef5');
  const [savingEvent, setSavingEvent] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit event modal state
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventTime, setEditEventTime] = useState('10:00');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventCategory, setEditEventCategory] = useState('Personal');
  const [editEventNotes, setEditEventNotes] = useState('');
  const [editEventColor, setEditEventColor] = useState('#4c6ef5');
  const [savingEditEvent, setSavingEditEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowAddModal(true);
    }
  }, [location.pathname]);

  const handleItemClick = (item: CalendarEventItem) => {
    setSelectedDayEvents(null);
    if (item.source === 'task' || item.type === 'task') {
      navigate(`/tasks/${item.originalId || item.id}`);
    } else if (item.source === 'bill' || item.type === 'bill') {
      navigate(`/bills/${item.originalId || item.id}`);
    } else if (item.source === 'appointment' || item.type === 'appointment') {
      navigate(`/appointments/${item.originalId || item.id}`);
    } else if (item.source === 'reminder' || item.type === 'reminder') {
      if (item.source === 'document') {
        navigate('/documents');
      } else {
        navigate(`/reminders/${item.originalId || item.id}`);
      }
    } else if (item.source === 'document') {
      navigate('/documents');
    } else if (item.source === 'manual' || item.type === 'event') {
      openEditEventModal(item);
    }
  };

  const openEditEventModal = (item: CalendarEventItem) => {
    setEditingEvent(item);
    setEditEventTitle(item.title);
    setEditEventDate(item.date ? new Date(item.date).toISOString().split('T')[0] : '');
    setEditEventTime(item.startTime || '10:00');
    setEditEventLocation(item.location || '');
    setEditEventCategory(item.category || 'Personal');
    setEditEventNotes(item.details || '');
    setEditEventColor(item.color || '#4c6ef5');
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editEventTitle.trim()) return;
    try {
      setSavingEditEvent(true);
      await api.put(`/calendar/events/${editingEvent.originalId || editingEvent.id}`, {
        title: editEventTitle,
        startDate: editEventDate,
        startTime: editEventTime,
        location: editEventLocation,
        category: editEventCategory,
        description: editEventNotes,
        color: editEventColor,
      });
      setEditingEvent(null);
      setFeedback({ type: 'success', message: 'Event updated successfully' });
      fetchEvents();
    } catch (err: any) {
      console.error('Update event error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update event' });
    } finally {
      setSavingEditEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || !confirm('Are you sure you want to delete this event?')) return;
    try {
      setDeletingEvent(true);
      await api.delete(`/calendar/events/${editingEvent.originalId || editingEvent.id}`);
      setEditingEvent(null);
      setFeedback({ type: 'success', message: 'Event deleted successfully' });
      fetchEvents();
    } catch (err: any) {
      console.error('Delete event error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to delete event' });
    } finally {
      setDeletingEvent(false);
    }
  };

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
      setFeedback({ type: 'success', message: 'Event scheduled successfully' });
      fetchEvents();
    } catch (err: any) {
      console.error('Create event error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create event' });
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
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Unified Calendar</h1>
          <p className="text-[#85827C] text-sm mt-1">
            All your tasks, bills, appointments, reminders, and events aggregated into one comprehensive view.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] font-medium text-sm transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-sm flex items-center justify-between ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
            : 'bg-rose-950/40 text-rose-300 border border-rose-800'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Month Navigator & Type Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#383838] p-4 rounded-2xl border border-[#505050]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-[#414141] text-[#B8B5AE] hover:text-[#F5F3EE] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-[#414141] text-[#B8B5AE] hover:text-[#F5F3EE] transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="text-lg font-bold text-[#F5F3EE] min-w-44 flex items-center gap-2">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            {loading && <Loader2 size={16} className="animate-spin text-[#B8B5AE]" />}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg border border-[#505050] bg-[#323232] text-xs font-medium text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE] transition-colors"
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
                ? 'bg-[#414141] text-[#F5F3EE] border border-[#505050]'
                : 'bg-[#323232] border border-[#505050] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE]'
            }`}
          >
            All Items
          </button>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-[#505050] ${
                selectedType === key
                  ? cfg.color
                  : 'bg-[#323232] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE]'
              }`}
            >
              <cfg.icon size={13} />
              <span>{cfg.label}s</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#383838] rounded-2xl border border-[#505050] overflow-hidden shadow-sm">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-[#505050] text-center text-xs font-semibold text-[#85827C] py-3 bg-[#323232]/50">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#505050]">
          {calendarDays.map((dayObj, i) => {
            const dayEvents = getEventsForDay(dayObj.date);
            const isCurrent = isToday(dayObj.date);

            return (
              <div
                key={i}
                onClick={() => setSelectedDayEvents({ date: dayObj.date, items: dayEvents })}
                className={`min-h-28 p-2 flex flex-col justify-between cursor-pointer transition-colors hover:bg-[#414141]/50 ${
                  !dayObj.isCurrentMonth ? 'bg-[#2F2F2F]/40 opacity-40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full ${
                      isCurrent
                        ? 'bg-[#505050] text-[#F5F3EE] shadow-sm'
                        : 'text-[#B8B5AE]'
                    }`}
                  >
                    {dayObj.date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium text-[#85827C]">
                      {dayEvents.length} item{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Event pills preview */}
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border border-[#505050]/50"
                      style={{
                        backgroundColor: item.color ? `${item.color}20` : '#4c6ef520',
                        color: item.color || '#F5F3EE',
                      }}
                      title={item.title}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color || '#4c6ef5' }} />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-medium text-[#85827C] pl-1">
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-modal border border-[#505050] animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#505050]">
              <div>
                <h3 className="text-lg font-bold text-[#F5F3EE]">
                  {selectedDayEvents.date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-[#85827C]">
                  {selectedDayEvents.items.length} schedule item(s) on this date
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg text-[#85827C] hover:text-[#F5F3EE]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selectedDayEvents.items.length === 0 ? (
                <div className="text-center py-10 text-[#85827C] text-sm">
                  Nothing scheduled on this day.
                </div>
              ) : (
                selectedDayEvents.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="p-3.5 rounded-xl border border-[#505050] bg-[#323232] hover:bg-[#414141] flex items-start gap-3 cursor-pointer transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
                      style={{ backgroundColor: item.color || '#4c6ef5' }}
                    >
                      {item.type.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#F5F3EE] truncate transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#414141] text-[#B8B5AE] border border-[#505050] font-semibold">
                          {item.type}
                        </span>
                      </div>
                      {item.details && (
                        <p className="text-xs text-[#85827C] mt-1">
                          {item.details}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#85827C] mt-2">
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
                    <ExternalLink size={14} className="text-[#85827C] group-hover:text-[#F5F3EE] transition-colors shrink-0 mt-1" />
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#505050] flex justify-between items-center">
              <button
                onClick={() => {
                  setNewEventDate(selectedDayEvents.date.toISOString().split('T')[0]);
                  setSelectedDayEvents(null);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#414141] hover:bg-[#505050] text-[#F5F3EE] border border-[#505050] text-xs font-medium transition-colors"
              >
                <Plus size={14} />
                <span>Add Event on this day</span>
              </button>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-md w-full p-6 shadow-modal border border-[#505050] animate-scale-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#505050]">
              <h3 className="text-lg font-bold text-[#F5F3EE]">Schedule Event</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-[#85827C] hover:text-[#F5F3EE]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Study Session, Lease Renewal, Car Inspection"
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="e.g. Campus Library 3rd Floor / Zoom"
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Category
                  </label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work/Study">Work / Study</option>
                    <option value="Health">Health</option>
                    <option value="Household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Badge Color
                  </label>
                  <input
                    type="color"
                    value={newEventColor}
                    onChange={(e) => setNewEventColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-[#323232] border border-[#505050] p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Important details or preparation..."
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#414141] hover:bg-[#505050] text-[#F5F3EE] border border-[#505050] text-sm font-medium shadow-sm transition-colors"
                >
                  {savingEvent && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#505050] animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3 mb-4">
              <h3 className="text-base font-semibold text-[#F5F3EE]">Edit Event</h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-[#85827C] hover:text-[#F5F3EE]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={editEventTitle}
                  onChange={(e) => setEditEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editEventTime}
                    onChange={(e) => setEditEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={editEventLocation}
                  onChange={(e) => setEditEventLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Category
                  </label>
                  <select
                    value={editEventCategory}
                    onChange={(e) => setEditEventCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work/Study">Work / Study</option>
                    <option value="Health">Health</option>
                    <option value="Household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">
                    Badge Color
                  </label>
                  <input
                    type="color"
                    value={editEventColor}
                    onChange={(e) => setEditEventColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-[#323232] border border-[#505050] p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editEventNotes}
                  onChange={(e) => setEditEventNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#323232] border border-[#505050] text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  {deletingEvent ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  <span>Delete</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditEvent}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#414141] hover:bg-[#505050] text-[#F5F3EE] border border-[#505050] text-sm font-medium shadow-sm transition-colors"
                  >
                    {savingEditEvent && <Loader2 size={16} className="animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
