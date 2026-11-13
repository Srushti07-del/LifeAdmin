import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  Plus, Bell, Loader2, Trash2, Check, Clock, Search, CheckCircle2,
  AlertCircle, Pencil, RotateCcw, CalendarClock,
} from 'lucide-react';

type ReminderStatus = 'active' | 'acknowledged' | 'dismissed' | 'completed';
type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: ReminderStatus;
  priority: ReminderPriority;
  category: string;
  reminderOffsetMinutes?: number[];
  recurrence?: { type: RecurrenceType; interval?: number };
  completedAt?: string;
}

interface ReminderForm {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: ReminderPriority;
  category: string;
  reminderOffsetMinutes: number[];
  recurrenceType: RecurrenceType;
  recurrenceInterval: string;
}

const OFFSET_OPTIONS = [
  { value: 0, label: 'At time' },
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
];

const emptyForm = (): ReminderForm => ({
  title: '', description: '', dueDate: '', dueTime: '',
  priority: 'medium', category: 'Personal',
  reminderOffsetMinutes: [0], recurrenceType: 'none', recurrenceInterval: '1',
});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getDueAt(r: Reminder): Date {
  const d = new Date(r.dueDate);
  if (Number.isNaN(d.getTime())) return new Date();
  if (r.dueTime && /^\d{2}:\d{2}$/.test(r.dueTime)) {
    const [h, m] = r.dueTime.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else d.setHours(23, 59, 59, 999);
  return d;
}

function isCompleted(r: Reminder) { return r.status === 'completed'; }

function sectionOf(r: Reminder, now: Date): 'today' | 'upcoming' | 'overdue' | 'completed' {
  if (isCompleted(r)) return 'completed';
  const due = getDueAt(r);
  if (due.getTime() < now.getTime()) return 'overdue';
  const todayStart = startOfDay(now), todayEnd = endOfDay(now);
  if (due >= todayStart && due <= todayEnd) return 'today';
  return 'upcoming';
}

const priorityVariant: Record<string, 'danger' | 'warning' | 'primary' | 'neutral'> = {
  urgent: 'danger', high: 'warning', medium: 'primary', low: 'neutral',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [viewing, setViewing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<ReminderForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ReminderPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sort, setSort] = useState<'dueDate' | '-dueDate'>('dueDate');

  const fetchReminders = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/reminders', { params: { sort: 'dueDate', limit: 300 } });
      setReminders(res.data.reminders || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reminders.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const categories = useMemo(() => {
    const set = new Set(reminders.map((r) => r.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [reminders]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = reminders.filter((r) => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (statusFilter === 'active' && isCompleted(r)) return false;
      if (statusFilter === 'completed' && !isCompleted(r)) return false;
      if (q && !r.title.toLowerCase().includes(q) && !(r.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = getDueAt(a).getTime(), db = getDueAt(b).getTime();
      return sort === 'dueDate' ? da - db : db - da;
    });
    return list;
  }, [reminders, searchQuery, priorityFilter, categoryFilter, statusFilter, sort]);

  const grouped = useMemo(() => {
    const now = new Date();
    const g = { today: [] as Reminder[], upcoming: [] as Reminder[], overdue: [] as Reminder[], completed: [] as Reminder[] };
    filtered.forEach((r) => g[sectionOf(r, now)].push(r));
    return g;
  }, [filtered]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (r: Reminder) => {
    setViewing(null); setEditing(r);
    setForm({
      title: r.title || '', description: r.description || '',
      dueDate: r.dueDate ? r.dueDate.slice(0, 10) : '', dueTime: r.dueTime || '',
      priority: r.priority || 'medium', category: r.category || 'Personal',
      reminderOffsetMinutes: r.reminderOffsetMinutes?.length ? r.reminderOffsetMinutes : [0],
      recurrenceType: r.recurrence?.type || 'none',
      recurrenceInterval: String(r.recurrence?.interval || 1),
    });
    setShowModal(true);
  };
  const closeModal = () => { if (submitting) return; setShowModal(false); setEditing(null); setForm(emptyForm()); };

  const toggleOffset = (val: number) => {
    setForm((f) => {
      const has = f.reminderOffsetMinutes.includes(val);
      const next = has ? f.reminderOffsetMinutes.filter((x) => x !== val) : [...f.reminderOffsetMinutes, val];
      return { ...f, reminderOffsetMinutes: next.length ? next.sort((a, b) => a - b) : [0] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.dueDate) return;
    setSubmitting(true); setError('');
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim() || undefined,
        dueDate: form.dueDate, dueTime: form.dueTime || undefined,
        priority: form.priority, category: form.category,
        reminderOffsetMinutes: form.reminderOffsetMinutes,
        recurrence: { type: form.recurrenceType, interval: Math.max(1, parseInt(form.recurrenceInterval, 10) || 1) },
        status: 'active',
      };
      if (editing) await api.put(`/reminders/${editing._id}`, payload);
      else await api.post('/reminders', payload);
      closeModal(); await fetchReminders();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to save reminder.'); }
    finally { setSubmitting(false); }
  };

  const completeReminder = async (r: Reminder) => {
    setActionId(r._id); setError('');
    try { await api.patch(`/reminders/${r._id}/complete`); await fetchReminders(); }
    catch (err: any) { setError(err?.response?.data?.message || 'Failed to complete reminder.'); }
    finally { setActionId(null); }
  };
  const reopenReminder = async (r: Reminder) => {
    setActionId(r._id); setError('');
    try { await api.patch(`/reminders/${r._id}/pending`); await fetchReminders(); }
    catch (err: any) { setError(err?.response?.data?.message || 'Failed to update reminder.'); }
    finally { setActionId(null); }
  };
  const deleteReminder = async (r: Reminder) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    setActionId(r._id); setError('');
    try { await api.delete(`/reminders/${r._id}`); setViewing((v) => v?._id === r._id ? null : v); await fetchReminders(); }
    catch (err: any) { setError(err?.response?.data?.message || 'Failed to delete reminder.'); }
    finally { setActionId(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-500 dark:text-surface-400">Loading reminders...</p>
      </div>
    );
  }

  const sections: Array<{ key: keyof typeof grouped; title: string; tone: string; icon: typeof Bell }> = [
    { key: 'overdue', title: 'Overdue', tone: 'text-rose-700 dark:text-rose-300', icon: AlertCircle },
    { key: 'today', title: 'Today', tone: 'text-amber-700 dark:text-amber-300', icon: CalendarClock },
    { key: 'upcoming', title: 'Upcoming', tone: 'text-primary-700 dark:text-primary-300', icon: Clock },
    { key: 'completed', title: 'Completed', tone: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">Reminders</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Manage your scheduled reminders and recurring alerts.</p>
        </div>
        <button onClick={openCreate} id="new-reminder-button" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs transition-all">
          <Plus size={16} /><span>New Reminder</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-700/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={fetchReminders} className="font-medium underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search reminders..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} aria-label="Filter status" className={selectClass}>
          <option value="all">All status</option><option value="active">Active</option><option value="completed">Completed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} aria-label="Filter priority" className={selectClass}>
          <option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter category" className={selectClass}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort reminders" className={selectClass}>
          <option value="dueDate">Date (soonest)</option><option value="-dueDate">Date (latest)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#304247]">
          <Bell size={32} className="mx-auto text-surface-300 dark:text-surface-400 mb-2" />
          <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">{reminders.length === 0 ? 'No reminders yet' : 'No reminders match your filters'}</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 max-w-sm mx-auto">Add reminders with time, offset, and recurrence to get in-app alerts while the server is running.</p>
          {reminders.length === 0 && <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold"><Plus size={15} /> Add reminder</button>}
        </div>
      ) : (
        sections.map((sec) => grouped[sec.key].length > 0 && (
          <section key={sec.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <sec.icon size={16} className={sec.tone} />
              <h2 className={`text-sm font-bold ${sec.tone}`}>{sec.title}</h2>
              <span className="text-[11px] text-surface-500 dark:text-surface-400">({grouped[sec.key].length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {grouped[sec.key].map((r) => {
                const busy = actionId === r._id;
                const due = getDueAt(r);
                const done = isCompleted(r);
                const overdue = !done && due.getTime() < new Date().getTime();
                return (
                  <Card key={r._id} hover className={`flex flex-col h-full min-h-[200px] p-4 sm:p-5 ${done ? 'opacity-75' : ''} ${overdue ? 'ring-1 ring-rose-200 dark:ring-rose-800/50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold text-surface-900 dark:text-surface-100 leading-snug ${done ? 'line-through' : ''}`} title={r.title}>{r.title}</h3>
                        {r.description && <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">{r.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={priorityVariant[r.priority] || 'neutral'} size="sm">{r.priority}</Badge>
                        {r.recurrence?.type && r.recurrence.type !== 'none' && <Badge variant="primary" size="sm" dot>{r.recurrence.type}</Badge>}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 flex-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2"><span className="text-surface-500 dark:text-surface-400">Due</span><span className={`font-medium ${overdue ? 'text-rose-700 dark:text-rose-300' : 'text-surface-800 dark:text-surface-200'}`}>{due.toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: r.dueTime ? '2-digit' : undefined, minute: r.dueTime ? '2-digit' : undefined })}</span></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-surface-500 dark:text-surface-400">Category</span><span className="font-medium text-surface-700 dark:text-surface-300">{r.category}</span></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-surface-500 dark:text-surface-400">Alerts</span><span className="font-medium text-surface-700 dark:text-surface-300">{(r.reminderOffsetMinutes?.length ? r.reminderOffsetMinutes : [0]).map((m) => m === 0 ? 'at time' : `${m}m`).join(', ')}</span></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-700/70 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button type="button" onClick={() => setViewing(r)} disabled={busy} className={actionBtn}>View</button>
                      <button type="button" onClick={() => openEdit(r)} disabled={busy} className={actionBtn}><Pencil size={13} className="sm:hidden" /> Edit</button>
                      {done ? (
                        <button type="button" onClick={() => reopenReminder(r)} disabled={busy} className={actionBtnAlt}><RotateCcw size={13} /> Reopen</button>
                      ) : (
                        <button type="button" onClick={() => completeReminder(r)} disabled={busy} className={actionBtnPrimary}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Done</button>
                      )}
                      <button type="button" onClick={() => deleteReminder(r)} disabled={busy} className={actionBtnDanger}><Trash2 size={13} /> Delete</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Reminder details'} maxWidth="md"
        panelClassName="rounded-3xl dark:border-[#304247]" headerClassName="pb-3 border-surface-100 dark:border-[#304247]" contentClassName="pt-4 pb-0" titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="text-surface-500 dark:text-surface-400 text-xs">Priority</span><Badge variant={priorityVariant[viewing.priority] || 'neutral'} size="sm">{viewing.priority}</Badge></div>
            <DetailRow label="Status" value={viewing.status} />
            <DetailRow label="Due" value={getDueAt(viewing).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            <DetailRow label="Category" value={viewing.category || '—'} />
            <DetailRow label="Alert offsets" value={(viewing.reminderOffsetMinutes?.length ? viewing.reminderOffsetMinutes : [0]).map((m) => m === 0 ? 'At time' : `${m} min before`).join(', ')} />
            <DetailRow label="Recurrence" value={viewing.recurrence?.type && viewing.recurrence.type !== 'none' ? `${viewing.recurrence.type} (every ${viewing.recurrence.interval || 1})` : 'None'} />
            {viewing.description && <DetailRow label="Description" value={viewing.description} />}
            <p className="text-[11px] text-surface-500 dark:text-surface-400">In-app alerts are created while the LifeAdmin server is running. Duplicate alerts for the same occurrence/offset are prevented.</p>
            <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex justify-end gap-2">
              <button type="button" onClick={() => openEdit(viewing)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"><Pencil size={14} /> Edit</button>
              <button type="button" onClick={() => setViewing(null)} className="px-3 py-2 rounded-xl text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Reminder' : 'New Reminder'}
        description="Set a due time, alert offset, and optional recurrence. Alerts appear in-app while the server is running."
        maxWidth="lg" panelClassName="rounded-3xl dark:border-[#304247]" headerClassName="pb-3 border-surface-100 dark:border-[#304247]" contentClassName="pt-4 pb-0" titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Title *"><input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Call pharmacy for refill" className={inputClass} /></Field>
          <Field label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional context..." className={inputClass} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date *"><input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} /></Field>
            <Field label="Time"><input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ReminderPriority })} className={inputClass}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {['Personal', 'Work', 'Health', 'Finance', 'Home', 'Education', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Alert offsets (minutes before)">
            <div className="flex flex-wrap gap-2">
              {OFFSET_OPTIONS.map((opt) => {
                const active = form.reminderOffsetMinutes.includes(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => toggleOffset(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${active ? 'bg-primary-600 dark:bg-primary-500 text-white dark:text-[#101719] border-primary-600 dark:border-primary-500' : 'bg-white dark:bg-surface-0 text-surface-700 dark:text-surface-200 border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'}`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Recurrence">
              <select value={form.recurrenceType} onChange={(e) => setForm({ ...form, recurrenceType: e.target.value as RecurrenceType })} className={inputClass}>
                <option value="none">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label="Recurrence interval">
              <input type="number" min="1" value={form.recurrenceInterval} onChange={(e) => setForm({ ...form, recurrenceInterval: e.target.value })} disabled={form.recurrenceType === 'none'} className={`${inputClass} disabled:opacity-50`} />
            </Field>
          </div>
          <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex justify-end gap-2">
            <button type="button" onClick={closeModal} disabled={submitting} className="px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />}{submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500';
const selectClass = 'px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500';
const actionBtn = 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-60';
const actionBtnAlt = 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-60';
const actionBtnPrimary = 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 disabled:opacity-60';
const actionBtnDanger = 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-rose-200/80 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-60';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">{label}</label>{children}</div>;
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-surface-500 dark:text-surface-400 text-xs shrink-0">{label}</span><span className="text-right text-xs text-surface-800 dark:text-surface-200">{value}</span></div>;
}


