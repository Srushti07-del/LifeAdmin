import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Bell,
  CheckSquare,
  CalendarClock,
  Loader2,
  Pencil,
  Trash2,
  AlertCircle,
  FileText,
  IndianRupee,
} from 'lucide-react';

type CalendarView = 'month' | 'week' | 'day';
type ItemType = 'event' | 'task' | 'bill' | 'appointment' | 'reminder';

interface CalendarEventItem {
  id: string;
  originalId?: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: ItemType;
  source: string;
  status: string;
  priority?: string;
  category: string;
  color?: string;
  details?: string;
  location?: string;
  isOriginalEvent?: boolean;
}

interface EventFormState {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  category: string;
  description: string;
  color: string;
}

const emptyForm = (date = toLocalISODate(new Date())): EventFormState => ({
  title: '',
  startDate: date,
  endDate: '',
  startTime: '10:00',
  endTime: '',
  allDay: false,
  location: '',
  category: 'Personal',
  description: '',
  color: '#087E83',
});

function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventLocalDate(item: CalendarEventItem) {
  const d = new Date(item.date);
  return toLocalISODate(d);
}

function formatTimeRange(item: CalendarEventItem) {
  if (item.allDay || (!item.startTime && !item.endTime)) return 'All day';
  if (item.startTime && item.endTime) return `${item.startTime}–${item.endTime}`;
  return item.startTime || item.endTime || 'All day';
}

const typeConfig: Record<ItemType, { label: string; icon: typeof CalendarIcon; className: string }> = {
  event: { label: 'Event', icon: CalendarIcon, className: 'bg-primary-500 text-white' },
  task: { label: 'Task', icon: CheckSquare, className: 'bg-accent-500 text-white' },
  bill: { label: 'Bill', icon: IndianRupee, className: 'bg-warning-500 text-white' },
  appointment: { label: 'Appointment', icon: CalendarClock, className: 'bg-purple-500 text-white' },
  reminder: { label: 'Reminder', icon: Bell, className: 'bg-blue-500 text-white' },
};

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detailItem, setDetailItem] = useState<CalendarEventItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarEventItem | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const range = useMemo(() => {
    if (view === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      start.setDate(start.getDate() - 7);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === 'week') {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const start = startOfDay(currentDate);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentDate, view]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/calendar/events', {
        params: { start: range.start.toISOString(), end: range.end.toISOString() },
      });
      setEvents(res.data.events || []);
    } catch (err: any) {
      console.error('Fetch calendar events error:', err);
      setError(err?.response?.data?.message || 'Failed to load calendar items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [range.start.getTime(), range.end.getTime()]);

  const filteredEvents = useMemo(
    () => events.filter((evt) => selectedType === 'all' || evt.type === selectedType),
    [events, selectedType]
  );

  const getEventsForDay = (date: Date) => {
    const key = toLocalISODate(date);
    return filteredEvents
      .filter((evt) => eventLocalDate(evt) === key)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
  };

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      if (view === 'month') return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      if (view === 'week') return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const openCreate = (date?: Date) => {
    setEditingItem(null);
    setForm(emptyForm(date ? toLocalISODate(date) : toLocalISODate(currentDate)));
    setShowForm(true);
  };

  const openEdit = (item: CalendarEventItem) => {
    setEditingItem(item);
    const date = toLocalISODate(new Date(item.date));
    setForm({
      title: item.title,
      startDate: date,
      endDate: '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      allDay: !!item.allDay,
      location: item.location || '',
      category: item.category || 'Personal',
      description: item.details || '',
      color: item.color || '#087E83',
    });
    setDetailItem(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm(toLocalISODate(currentDate)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        title: form.title.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        startTime: form.allDay ? undefined : form.startTime || undefined,
        endTime: form.allDay ? undefined : form.endTime || undefined,
        allDay: form.allDay,
        location: form.location.trim() || undefined,
        category: form.category,
        description: form.description.trim() || undefined,
        color: form.color,
      };
      if (editingItem?.isOriginalEvent) {
        await api.put(`/calendar/events/${editingItem.id}`, payload);
      } else {
        await api.post('/calendar/events', payload);
      }
      closeForm();
      await fetchEvents();
    } catch (err: any) {
      console.error('Save calendar event error:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Failed to save event.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CalendarEventItem) => {
    if (!item.isOriginalEvent) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      setDeleting(true);
      setError('');
      await api.delete(`/calendar/events/${item.id}`);
      setDetailItem(null);
      setSelectedDay(null);
      await fetchEvents();
    } catch (err: any) {
      console.error('Delete calendar event error:', err);
      setError(err?.response?.data?.message || 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  const headerLabel = useMemo(() => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentDate, view]);

  const selectedDayItems = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Unified Calendar</h1>
          <p className="text-surface-500 text-sm mt-1">
            View tasks, bills, appointments, reminders, and personal events in month, week, or day views.
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-700/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={fetchEvents} className="font-medium underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#204B5A] p-4 rounded-2xl border border-surface-200 dark:border-[#355966]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} aria-label="Previous" className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => navigate(1)} aria-label="Next" className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100 min-w-[14rem] flex items-center gap-2">
            {headerLabel}
            {loading && <Loader2 size={16} className="animate-spin text-primary-500" />}
          </h2>
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
            Today
          </button>
          <div className="flex items-center rounded-xl border border-surface-200 dark:border-surface-700 p-1 bg-surface-50/60 dark:bg-surface-800/40">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${view === v ? 'bg-white dark:bg-[#285968] text-surface-900 dark:text-surface-100 shadow-sm' : 'text-surface-600 dark:text-surface-300'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedType === 'all' ? 'bg-surface-900 text-white dark:bg-primary-500 dark:text-[#183B4A]' : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
          >
            All Items
          </button>
          {(Object.entries(typeConfig) as [ItemType, typeof typeConfig.event][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedType === key ? cfg.className : 'bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'}`}
            >
              <cfg.icon size={13} />
              <span>{cfg.label}s</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && <MonthView currentDate={currentDate} getEventsForDay={getEventsForDay} loading={loading} onSelectDay={setSelectedDay} onSelectItem={setDetailItem} />}
      {view === 'week' && <WeekView currentDate={currentDate} getEventsForDay={getEventsForDay} loading={loading} onSelectDay={(d) => { setCurrentDate(d); setSelectedDay(d); }} onSelectItem={setDetailItem} onCreate={openCreate} />}
      {view === 'day' && <DayView currentDate={currentDate} items={getEventsForDay(currentDate)} loading={loading} onCreate={() => openCreate(currentDate)} onSelectItem={setDetailItem} />}

      <Modal
        isOpen={!!selectedDay && view !== 'day'}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Day details'}
        description={selectedDay ? `${selectedDayItems.length} schedule item(s)` : undefined}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {selectedDayItems.length === 0 ? (
            <EmptyInline message="Nothing scheduled on this day." actionLabel="Add event" onAction={() => { if (selectedDay) { setSelectedDay(null); openCreate(selectedDay); } }} />
          ) : (
            selectedDayItems.map((item) => (
              <ItemCard key={item.id} item={item} onOpen={() => { setDetailItem(item); setSelectedDay(null); }} />
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title || 'Details'}
        description={detailItem ? `${typeConfig[detailItem.type].label} · ${detailItem.category}` : undefined}
        maxWidth="lg"
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/40 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-surface-700 dark:text-surface-200"><CalendarIcon size={15} /><span>{new Date(detailItem.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
              <div className="flex items-center gap-2 text-surface-700 dark:text-surface-200"><Clock size={15} /><span>{formatTimeRange(detailItem)}</span></div>
              {detailItem.location && <div className="flex items-center gap-2 text-surface-700 dark:text-surface-200"><MapPin size={15} /><span>{detailItem.location}</span></div>}
              {detailItem.details && <div className="flex items-start gap-2 text-surface-700 dark:text-surface-200"><FileText size={15} className="mt-0.5" /><span>{detailItem.details}</span></div>}
              <div className="text-xs text-surface-500">Status: {detailItem.status}</div>
              {!detailItem.isOriginalEvent && <div className="text-xs text-surface-500">Source item from {detailItem.source}. Edit it in its module to keep data consistent.</div>}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {detailItem.isOriginalEvent && (
                <>
                  <button type="button" onClick={() => openEdit(detailItem)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800">
                    <Pencil size={15} /> Edit
                  </button>
                  <button type="button" disabled={deleting} onClick={() => handleDelete(detailItem)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger-600 hover:bg-danger-700 text-white text-sm font-medium disabled:opacity-60">
                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
                  </button>
                </>
              )}
              <button type="button" onClick={() => setDetailItem(null)} className="px-3 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingItem ? 'Edit Event' : 'Schedule Event'}
        description="Manual calendar events are saved to your account."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Event title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Study session, renewal, inspection" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="End date (optional)">
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
            <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
            All day
          </label>
          {!form.allDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Start time">
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} />
              </Field>
              <Field label="End time">
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputClass} />
              </Field>
            </div>
          )}
          <Field label="Location (optional)">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Campus library / Zoom" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                <option value="Personal">Personal</option>
                <option value="Work/Study">Work / Study</option>
                <option value="Health">Health</option>
                <option value="Household">Household</option>
                <option value="Finance">Finance</option>
              </select>
            </Field>
            <Field label="Badge color">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-1 cursor-pointer" />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Important details or preparation..." className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeForm} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" />}
              <span>{editingItem ? 'Save Changes' : 'Save Event'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function EmptyInline({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-10 text-surface-500 text-sm">
      <p>{message}</p>
      {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"><Plus size={14} />{actionLabel}</button>}
    </div>
  );
}

function ItemCard({ item, onOpen }: { item: CalendarEventItem; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left p-3.5 rounded-xl border border-surface-200 dark:border-[#355966] bg-surface-50/50 dark:bg-surface-800/40 flex items-start gap-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs" style={{ backgroundColor: item.color || '#087E83' }}>{item.type.charAt(0).toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{item.title}</h4>
          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 font-semibold">{item.type}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500 mt-1.5">
          <span className="inline-flex items-center gap-1"><Clock size={12} />{formatTimeRange(item)}</span>
          {item.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
          {item.details && <span className="truncate">{item.details}</span>}
        </div>
      </div>
    </button>
  );
}

function MonthView({ currentDate, getEventsForDay, loading, onSelectDay, onSelectItem }: { currentDate: Date; getEventsForDay: (d: Date) => CalendarEventItem[]; loading: boolean; onSelectDay: (d: Date) => void; onSelectItem: (i: CalendarEventItem) => void }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  const today = new Date();
  if (!loading && cells.every((c) => getEventsForDay(c.date).length === 0)) {
    // still show grid; empty state is subtle because month grid itself is the UI
  }
  return (
    <div className="bg-white dark:bg-[#204B5A] rounded-2xl border border-surface-200 dark:border-[#355966] overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-surface-200 dark:border-[#355966] text-center text-xs font-semibold text-surface-400 py-3 bg-surface-50/50 dark:bg-surface-800/20">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-surface-200 dark:divide-surface-800">
        {cells.map((cell, i) => {
          const dayEvents = getEventsForDay(cell.date);
          const isToday = isSameDay(cell.date, today);
          return (
            <div key={i} className={`min-h-28 p-2 flex flex-col ${!cell.isCurrentMonth ? 'bg-surface-50/30 dark:bg-[#143440]/40 opacity-50' : ''}`}>
              <button type="button" onClick={() => onSelectDay(cell.date)} className="flex items-center justify-between w-full text-left">
                <span className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full ${isToday ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-700 dark:text-surface-300'}`}>{cell.date.getDate()}</span>
                {dayEvents.length > 0 && <span className="text-[10px] font-medium text-surface-400">{dayEvents.length}</span>}
              </button>
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border border-surface-200/50 dark:border-surface-700/50"
                    style={{ backgroundColor: item.color ? `${item.color}20` : '#087E8320', color: item.color || '#087E83' }}
                    title={item.title}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color || '#087E83' }} />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && <button type="button" onClick={() => onSelectDay(cell.date)} className="text-[10px] font-medium text-surface-400 pl-1 hover:text-surface-600 dark:hover:text-surface-200">+{dayEvents.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, getEventsForDay, loading, onSelectDay, onSelectItem, onCreate }: { currentDate: Date; getEventsForDay: (d: Date) => CalendarEventItem[]; loading: boolean; onSelectDay: (d: Date) => void; onSelectItem: (i: CalendarEventItem) => void; onCreate: (d: Date) => void }) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  const hasItems = days.some((d) => getEventsForDay(d).length > 0);
  return (
    <div className="bg-white dark:bg-[#204B5A] rounded-2xl border border-surface-200 dark:border-[#355966] overflow-hidden shadow-sm">
      {!loading && !hasItems && <div className="px-4 pt-4"><EmptyInline message="No items scheduled this week." /></div>}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-surface-200 dark:divide-surface-800">
        {days.map((day) => {
          const items = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="min-h-40 p-3">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => onSelectDay(day)} className="text-left">
                  <div className="text-[11px] font-semibold text-surface-400 uppercase">{day.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-primary-600 dark:text-primary-300' : 'text-surface-900 dark:text-surface-100'}`}>{day.getDate()}</div>
                </button>
                <button type="button" onClick={() => onCreate(day)} aria-label={`Add event on ${toLocalISODate(day)}`} className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"><Plus size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 ? <div className="text-[11px] text-surface-400 py-2">No items</div> : items.map((item) => (
                  <button key={item.id} type="button" onClick={() => onSelectItem(item)} className="w-full text-left rounded-lg px-2 py-1.5 border border-surface-200/60 dark:border-surface-700/60" style={{ backgroundColor: item.color ? `${item.color}18` : '#087E8318' }}>
                    <div className="text-[11px] font-semibold truncate" style={{ color: item.color || '#087E83' }}>{item.title}</div>
                    <div className="text-[10px] text-surface-500">{formatTimeRange(item)}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ currentDate, items, loading, onCreate, onSelectItem }: { currentDate: Date; items: CalendarEventItem[]; loading: boolean; onCreate: () => void; onSelectItem: (i: CalendarEventItem) => void }) {
  const allDay = items.filter((i) => i.allDay || (!i.startTime && !i.endTime));
  const timed = items.filter((i) => !allDay.includes(i)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  return (
    <div className="bg-white dark:bg-[#204B5A] rounded-2xl border border-surface-200 dark:border-[#355966] overflow-hidden shadow-sm p-4 sm:p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-surface-900 dark:text-surface-100">Day agenda</div>
          <div className="text-xs text-surface-500">{items.length} item(s) on {toLocalISODate(currentDate)}</div>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium"><Plus size={14} />Add event</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-surface-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyInline message="No tasks, appointments, or events scheduled for this day." actionLabel="Add event" onAction={onCreate} />
      ) : (
        <>
          {allDay.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">All day / due</h3>
              <div className="space-y-2">{allDay.map((item) => <ItemCard key={item.id} item={item} onOpen={() => onSelectItem(item)} />)}</div>
            </section>
          )}
          {timed.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Scheduled times</h3>
              <div className="space-y-2">{timed.map((item) => <ItemCard key={item.id} item={item} onOpen={() => onSelectItem(item)} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
