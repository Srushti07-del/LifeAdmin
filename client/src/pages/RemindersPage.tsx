import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Bell, Loader2, Trash2, X, Check, Clock } from 'lucide-react';

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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: 'Personal' });
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = async () => {
    try {
      const res = await api.get('/reminders', { params: { sort: 'dueDate' } });
      setReminders(res.data.reminders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchReminders(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reminders', formData);
      setFormData({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: 'Personal' });
      setShowForm(false);
      fetchReminders();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const acknowledge = async (id: string) => {
    try { await api.patch(`/reminders/${id}/acknowledge`); fetchReminders(); } catch (err) { console.error(err); }
  };

  const deleteReminder = async (id: string) => {
    try { await api.delete(`/reminders/${id}`); fetchReminders(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Reminders</h1>
          <p className="text-surface-500 text-sm mt-1">{reminders.length} reminder{reminders.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="new-reminder-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-md">
          <Plus size={18} /> New Reminder
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 shadow-card space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">New Reminder</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-surface-400"><X size={18} /></button>
          </div>
          <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="What to remember?" required
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Details (optional)" rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            <input type="time" value={formData.dueTime} onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      )}

      {reminders.length > 0 ? (
        <div className="space-y-2">
          {reminders.map((rem) => {
            const isActive = rem.status === 'active';
            const daysUntil = Math.ceil((new Date(rem.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={rem._id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all group ${!isActive ? 'opacity-60' : ''}`}>
                <div className={`flex-shrink-0 p-2 rounded-lg ${isActive ? 'bg-warning-400/10' : 'bg-surface-100 dark:bg-surface-800'}`}>
                  {isActive ? <Bell size={20} className="text-warning-500" /> : <Check size={20} className="text-success-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{rem.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-surface-500 flex items-center gap-1"><Clock size={10} /> {new Date(rem.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} {rem.dueTime && `· ${rem.dueTime}`}</span>
                    {isActive && daysUntil <= 1 && <span className="text-xs font-medium text-accent-500">{daysUntil <= 0 ? 'Due now!' : 'Tomorrow'}</span>}
                  </div>
                </div>
                {isActive && (
                  <button onClick={() => acknowledge(rem._id)} className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-success-400/10 text-surface-400 hover:text-success-500 transition-all" title="Acknowledge">
                    <Check size={18} />
                  </button>
                )}
                <button onClick={() => deleteReminder(rem._id)} className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-400/10 text-surface-400 hover:text-danger-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
          <Bell size={40} className="mx-auto text-surface-300 mb-3" />
          <p className="text-surface-600 dark:text-surface-400 font-medium">No reminders</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium"><Plus size={16} /> Add Reminder</button>
        </div>
      )}
    </div>
  );
}
