import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Plus,
  Bell,
  Loader2,
  Trash2,
  X,
  Check,
  Clock,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: 'active' | 'acknowledged' | 'dismissed' | 'completed';
  priority: string;
  category: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium',
    category: 'Personal',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = async () => {
    try {
      const res = await api.get('/reminders', { params: { sort: 'dueDate' } });
      setReminders(res.data.reminders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.dueDate) return;
    setSubmitting(true);
    try {
      await api.post('/reminders', formData);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium',
        category: 'Personal',
      });
      setShowModal(false);
      fetchReminders();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      await api.patch(`/reminders/${id}/acknowledge`);
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = reminders.filter((rem) => {
    const matchesSearch =
      rem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rem.description && rem.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? rem.status === 'active'
        : rem.status !== 'active';
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-400">Loading your reminders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#355966]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Reminders
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">
            Gentle alerts and scheduled cues to keep your mind uncluttered
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          id="new-reminder-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus size={16} />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-primary-500 text-white font-semibold shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((rem) => {
            const isActive = rem.status === 'active';
            const targetDate = new Date(rem.dueDate);
            const daysUntil = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={rem._id}
                className={`bg-white dark:bg-surface-0 p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4 ${
                  !isActive
                    ? 'border-surface-200/50 opacity-60 bg-surface-50/40 dark:bg-[#204B5A]/30'
                    : 'border-surface-200 dark:border-surface-700 shadow-xs hover:shadow-card'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                    }`}
                  >
                    {isActive ? <Bell size={18} /> : <CheckCircle2 size={18} />}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold text-surface-900 dark:text-surface-100 ${
                        !isActive ? 'line-through' : ''
                      }`}
                    >
                      {rem.title}
                    </p>
                    {rem.description && (
                      <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-1">{rem.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-surface-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {targetDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {rem.dueTime && ` · ${rem.dueTime}`}
                      </span>
                      {isActive && daysUntil <= 1 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                          {daysUntil <= 0 ? 'Due now' : 'Tomorrow'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isActive && (
                    <button
                      onClick={() => acknowledge(rem._id)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Acknowledge reminder"
                    >
                      <Check size={14} />
                      <span className="hidden sm:inline">Done</span>
                    </button>
                  )}
                  <button
                    onClick={() => deleteReminder(rem._id)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete reminder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#355966]">
            <Bell size={32} className="mx-auto text-surface-300 dark:text-surface-700 mb-2" />
            <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">
              No reminders in this view
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Set timely prompts so you never have to hold dates in your head.
            </p>
          </div>
        )}
      </div>

      {/* Modal: New Reminder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-surface-950/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-0 rounded-3xl border border-surface-200 dark:border-surface-700 p-6 shadow-modal z-10 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-[#355966] mb-4">
              <h3 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
                New Reminder
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call pharmacy for refill"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Details / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional context or notes..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="pt-3 border-t border-surface-100 dark:border-[#355966] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
