import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Plus,
  CheckSquare,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  Flag,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  createdAt: string;
}

const priorityConfig = {
  low: { color: 'text-[#85827C]', bg: 'bg-[#2F2F2F] border border-[#505050]', label: 'Low' },
  medium: { color: 'text-primary-300', bg: 'bg-primary-950/40 border border-primary-800/60', label: 'Medium' },
  high: { color: 'text-amber-300', bg: 'bg-amber-950/40 border border-amber-800/60', label: 'High' },
  urgent: { color: 'text-rose-300', bg: 'bg-rose-950/40 border border-rose-800/60', label: 'Urgent' },
};

const statusConfig = {
  todo: { icon: CheckSquare, color: 'text-[#85827C]', label: 'To Do' },
  in_progress: { icon: Clock, color: 'text-primary-400', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completed' },
};

export default function TasksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'));
  const [filter, setFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Task['priority'],
    category: 'Personal',
  });

  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
    category: 'Personal',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync /new path with showForm
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowForm(true);
    }
  }, [location.pathname]);

  const fetchTasks = async () => {
    try {
      const params: Record<string, string> = { sort: 'dueDate' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/tasks', { params });
      setTasks(res.data.tasks);
      return res.data.tasks as Task[];
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  // Handle direct navigation to /tasks/:id
  useEffect(() => {
    if (!id || id === 'new') return;

    const openTaskById = async () => {
      const found = tasks.find((t) => t._id === id);
      if (found) {
        startEditing(found);
      } else {
        try {
          const res = await api.get(`/tasks/${id}`);
          if (res.data.task) {
            startEditing(res.data.task);
          }
        } catch (err) {
          console.error('Task not found:', err);
        }
      }
    };

    openTaskById();
  }, [id, tasks.length]);

  const startEditing = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      dueTime: task.dueTime || '',
      priority: task.priority,
      status: task.status,
      category: task.category || 'Personal',
    });
  };

  const closeEditModal = () => {
    setEditingTask(null);
    if (id && id !== 'new') {
      navigate('/tasks', { replace: true });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/tasks', formData);
      setFormData({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: 'Personal' });
      setShowForm(false);
      if (location.pathname.endsWith('/new')) {
        navigate('/tasks', { replace: true });
      }
      setFeedback({ type: 'success', message: 'Task created successfully' });
      fetchTasks();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create task' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editFormData.title.trim()) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      await api.put(`/tasks/${editingTask._id}`, editFormData);
      closeEditModal();
      setFeedback({ type: 'success', message: 'Task updated successfully' });
      fetchTasks();
    } catch (err: any) {
      console.error('Failed to update task:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update task' });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await api.put(`/tasks/${task._id}`, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (editingTask?._id === taskId) {
        closeEditModal();
      }
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, className: 'text-rose-400 font-semibold' };
    if (diffDays === 0) return { text: 'Due today', className: 'text-amber-400 font-semibold' };
    if (diffDays === 1) return { text: 'Due tomorrow', className: 'text-amber-400' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, className: 'text-primary-400' };
    return { text: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), className: 'text-[#85827C]' };
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
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Tasks</h1>
          <p className="text-[#85827C] text-sm mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="new-task-button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Task</span>
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

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'todo', label: 'To Do' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              filter === f.value
                ? 'bg-[#414141] text-[#F5F3EE] border border-[#505050] shadow-sm'
                : 'bg-[#383838] text-[#85827C] border border-[#505050] hover:text-[#B8B5AE] hover:bg-[#414141]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#383838] rounded-2xl p-6 border border-[#505050] shadow-sm space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-[#505050] pb-3">
            <h3 className="font-semibold text-[#F5F3EE] text-sm">Create New Task</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/tasks', { replace: true });
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
            placeholder="What needs to be done?"
            required
            id="task-title-input"
            className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
          />

          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add details, instructions or links (optional)"
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm resize-none"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="date"
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
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
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
                {['Personal', 'Work/Study', 'Finance', 'Household', 'Health', 'Errands'].map((c) => (
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
                if (location.pathname.endsWith('/new')) navigate('/tasks', { replace: true });
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="task-submit"
              className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3">
              <h3 className="font-semibold text-[#F5F3EE] text-base">Edit Task</h3>
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
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Task details"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Due Date</label>
                  <input
                    type="date"
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
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as Task['priority'] })}
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
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as Task['status'] })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
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
                    {['Personal', 'Work/Study', 'Finance', 'Household', 'Health', 'Errands'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => deleteTask(editingTask._id)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  <Trash2 size={14} />
                  <span>Delete Task</span>
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

      {/* Task list */}
      {tasks.length > 0 ? (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const statusCfg = statusConfig[task.status];
            const priorityCfg = priorityConfig[task.priority];
            const dueDateInfo = formatDueDate(task.dueDate);
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={task._id}
                className={`flex items-center gap-3 p-3.5 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all group ${
                  task.status === 'completed' ? 'opacity-55' : ''
                }`}
                id={`task-${task._id}`}
              >
                {/* Status toggle button */}
                <button
                  onClick={() => toggleStatus(task)}
                  className={`shrink-0 p-1 rounded-lg hover:bg-[#2F2F2F] transition-colors ${statusCfg.color}`}
                  title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                >
                  <StatusIcon size={20} />
                </button>

                {/* Content — clicking opens edit modal */}
                <div
                  onClick={() => startEditing(task)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-[#85827C]' : 'text-[#F5F3EE]'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${priorityCfg.bg} ${priorityCfg.color}`}>
                      <Flag size={9} />
                      {priorityCfg.label}
                    </span>
                    <span className="text-xs text-[#85827C]">{task.category}</span>
                    {dueDateInfo && task.status !== 'completed' && (
                      <>
                        <span className="text-[#505050]">·</span>
                        <span className={`text-xs flex items-center gap-1 ${dueDateInfo.className}`}>
                          <Calendar size={10} />
                          {dueDateInfo.text}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditing(task)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                    title="Edit task"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-rose-400 transition-colors"
                    title="Delete task"
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
          <CheckSquare size={36} className="mx-auto text-[#85827C] mb-3" />
          <p className="text-[#F5F3EE] font-medium text-sm">No tasks found</p>
          <p className="text-xs text-[#85827C] mt-1">Create your first task to start tracking your responsibilities.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-[#F5F3EE] text-xs font-medium transition-all"
          >
            <Plus size={14} /> Create Task
          </button>
        </div>
      )}
    </div>
  );
}
