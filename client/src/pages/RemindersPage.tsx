import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Plus,
  Bell,
  Loader2,
  Trash2,
  X,
  Check,
  Pencil,
  Calendar,
} from 'lucide-react';

interface Reminder {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: 'active' | 'acknowledged' | 'dismissed' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
}

const priorityConfig = {
  low: { color: 'text-[#85827C]', bg: 'bg-[#2F2F2F] border border-[#505050]', label: 'Low' },
  medium: { color: 'text-primary-300', bg: 'bg-primary-950/40 border border-primary-800/60', label: 'Medium' },
  high: { color: 'text-amber-300', bg: 'bg-amber-950/40 border border-amber-800/60', label: 'High' },
  urgent: { color: 'text-rose-300', bg: 'bg-rose-950/40 border border-rose-800/60', label: 'Urgent' },
};

export default function RemindersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Reminder['priority'],
    category: 'Personal',
  });

  // Edit modal state
  const [editingRem, setEditingRem] = useState<Reminder | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Reminder['priority'],
    status: 'active' as Reminder['status'],
    category: 'Personal',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync /new path
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowForm(true);
    }
  }, [location.pathname]);

  const fetchReminders = async () => {
    try {
      const res = await api.get('/reminders', { params: { sort: 'dueDate' } });
      setReminders(res.data.reminders);
      return res.data.reminders as Reminder[];
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  // Handle direct navigation to /reminders/:id
  useEffect(() => {
    if (!id || id === 'new') return;

    const openReminderById = async () => {
      const found = reminders.find((r) => r._id === id);
      if (found) {
        startEditing(found);
      } else {
        try {
          const res = await api.get(`/reminders/${id}`);
          if (res.data.reminder) {
            startEditing(res.data.reminder);
          }
        } catch (err) {
          console.error('Reminder not found:', err);
        }
      }
    };

    openReminderById();
  }, [id, reminders.length]);

  const startEditing = (rem: Reminder) => {
    setEditingRem(rem);
    setEditFormData({
      title: rem.title,
      description: rem.description || '',
      dueDate: rem.dueDate ? new Date(rem.dueDate).toISOString().split('T')[0] : '',
      dueTime: rem.dueTime || '',
      priority: rem.priority,
      status: rem.status,
      category: rem.category || 'Personal',
    });
  };

  const closeEditModal = () => {
    setEditingRem(null);
    if (id && id !== 'new') {
      navigate('/reminders', { replace: true });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.dueDate) return;
    setSubmitting(true);
    setFeedback(null);
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
      setShowForm(false);
      if (location.pathname.endsWith('/new')) {
        navigate('/reminders', { replace: true });
      }
      setFeedback({ type: 'success', message: 'Reminder created successfully' });
      fetchReminders();
    } catch (err: any) {
      console.error('Failed to create reminder:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create reminder' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRem || !editFormData.title.trim() || !editFormData.dueDate) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      await api.put(`/reminders/${editingRem._id}`, editFormData);
      closeEditModal();
      setFeedback({ type: 'success', message: 'Reminder updated successfully' });
      fetchReminders();
    } catch (err: any) {
      console.error('Failed to update reminder:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update reminder' });
    } finally {
      setSavingEdit(false);
    }
  };

  const acknowledge = async (remId: string) => {
    try {
      await api.patch(`/reminders/${remId}/acknowledge`);
      setFeedback({ type: 'success', message: 'Reminder acknowledged' });
      fetchReminders();
    } catch (err) {
      console.error('Failed to acknowledge reminder:', err);
    }
  };

  const deleteReminder = async (remId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await api.delete(`/reminders/${remId}`);
      if (editingRem?._id === remId) {
        closeEditModal();
      }
      fetchReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Reminders</h1>
          <p className="text-[#85827C] text-sm mt-1">{reminders.length} reminder{reminders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="new-reminder-button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/80'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/80'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#383838] rounded-2xl p-6 border border-[#505050] shadow-sm space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-[#505050] pb-3">
            <h3 className="font-semibold text-[#F5F3EE] text-sm">New Reminder</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/reminders', { replace: true });
              }}
              className="text-[#85827C] hover:text-[#F5F3EE]"
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="What should LifeAdmin remind you of?"
            required
            className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add additional details (optional)"
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Target Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Time</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Reminder['priority'] })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {['Personal', 'Finance', 'Health', 'Home', 'Work'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/reminders', { replace: true });
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Reminder'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Reminder Modal */}
      {editingRem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3">
              <h3 className="font-semibold text-[#F5F3EE] text-base">Edit Reminder</h3>
              <button onClick={closeEditModal} className="text-[#85827C] hover:text-[#F5F3EE]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Due Time</label>
                  <input
                    type="time"
                    value={editFormData.dueTime}
                    onChange={(e) => setEditFormData({ ...editFormData, dueTime: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as Reminder['priority'] })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as Reminder['status'] })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {['Personal', 'Finance', 'Health', 'Home', 'Work'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => deleteReminder(editingRem._id)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  <Trash2 size={14} />
                  <span>Delete Reminder</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    {savingEdit ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder list */}
      {reminders.length > 0 ? (
        <div className="space-y-1.5">
          {reminders.map((rem) => {
            const isActive = rem.status === 'active';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const remDate = new Date(rem.dueDate);
            remDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.round((remDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const priorityCfg = priorityConfig[rem.priority] || priorityConfig.medium;

            return (
              <div
                key={rem._id}
                className={`flex items-center gap-3 p-3.5 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all group ${
                  !isActive ? 'opacity-55' : ''
                }`}
              >
                <div className={`shrink-0 p-2 rounded-lg ${isActive ? 'bg-[#2F2F2F] text-primary-400 border border-[#505050]' : 'bg-[#2F2F2F] text-[#85827C] border border-[#505050]'}`}>
                  <Bell size={18} />
                </div>

                {/* Click opens edit modal */}
                <div
                  onClick={() => startEditing(rem)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <p className={`text-sm font-medium ${!isActive ? 'line-through text-[#85827C]' : 'text-[#F5F3EE]'}`}>
                    {rem.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${priorityCfg.bg} ${priorityCfg.color}`}>
                      {priorityCfg.label}
                    </span>
                    <span className="text-xs text-[#85827C]">{rem.category}</span>
                    <span className="text-[#505050]">·</span>
                    <span className="text-xs text-[#85827C] flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(rem.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      {rem.dueTime && ` · ${rem.dueTime}`}
                    </span>
                    {isActive && (
                      <>
                        <span className="text-[#505050]">·</span>
                        <span
                          className={`text-xs ${
                            daysUntil < 0
                              ? 'text-rose-400 font-semibold'
                              : daysUntil <= 1
                              ? 'text-amber-400 font-semibold'
                              : 'text-[#85827C]'
                          }`}
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isActive && (
                    <button
                      onClick={() => acknowledge(rem._id)}
                      className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-emerald-400 transition-colors"
                      title="Acknowledge reminder"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => startEditing(rem)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                    title="Edit reminder"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteReminder(rem._id)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-rose-400 transition-colors"
                    title="Delete reminder"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#383838] rounded-2xl border border-[#505050]">
          <Bell size={36} className="mx-auto text-[#85827C] mb-3" />
          <p className="text-[#F5F3EE] font-medium text-sm">No reminders set</p>
          <p className="text-xs text-[#85827C] mt-1">Set timely reminders so nothing slips through the cracks.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-[#F5F3EE] text-xs font-medium transition-all"
          >
            <Plus size={14} /> Add Reminder
          </button>
        </div>
      )}
    </div>
  );
}
