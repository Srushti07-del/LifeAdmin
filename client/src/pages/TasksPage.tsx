import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  low: { color: 'text-surface-400', bg: 'bg-surface-100 dark:bg-surface-800', label: 'Low' },
  medium: { color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20', label: 'Medium' },
  high: { color: 'text-accent-500', bg: 'bg-accent-400/10', label: 'High' },
  urgent: { color: 'text-danger-500', bg: 'bg-danger-400/10', label: 'Urgent' },
};

const statusConfig = {
  todo: { icon: CheckSquare, color: 'text-surface-400', label: 'To Do' },
  in_progress: { icon: Clock, color: 'text-primary-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-success-500', label: 'Completed' },
};

export default function TasksPage() {
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'));
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Task['priority'],
    category: 'Personal',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const params: Record<string, string> = { sort: 'dueDate' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/tasks', { params });
      setTasks(res.data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/tasks', formData);
      setFormData({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: 'Personal' });
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'completed';
    try {
      await api.put(`/tasks/${task._id}`, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, className: 'text-danger-500' };
    if (diffDays === 0) return { text: 'Due today', className: 'text-accent-500' };
    if (diffDays === 1) return { text: 'Due tomorrow', className: 'text-warning-500' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, className: 'text-primary-500' };
    return { text: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), className: 'text-surface-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Tasks</h1>
          <p className="text-surface-500 text-sm mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="new-task-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filter === f.value
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'
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
          className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 shadow-card space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">New Task</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="What needs to be done?"
            required
            id="task-title-input"
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
          
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes (optional)"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="px-3 py-2 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
            <input
              type="time"
              value={formData.dueTime}
              onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              className="px-3 py-2 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
              className="px-3 py-2 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-2 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            >
              {['Personal', 'Work', 'Finance', 'Health', 'Education', 'Home'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="task-submit"
              className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusCfg = statusConfig[task.status];
            const priorityCfg = priorityConfig[task.priority];
            const dueDateInfo = formatDueDate(task.dueDate);
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={task._id}
                className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all group ${
                  task.status === 'completed' ? 'opacity-60' : ''
                }`}
                id={`task-${task._id}`}
              >
                {/* Status toggle */}
                <button
                  onClick={() => toggleStatus(task)}
                  className={`flex-shrink-0 p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${statusCfg.color}`}
                >
                  <StatusIcon size={22} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-surface-400' : 'text-surface-900 dark:text-surface-100'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Priority */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${priorityCfg.bg} ${priorityCfg.color}`}>
                      <Flag size={10} />
                      {priorityCfg.label}
                    </span>
                    {/* Category */}
                    <span className="text-xs text-surface-500">{task.category}</span>
                    {/* Due date */}
                    {dueDateInfo && task.status !== 'completed' && (
                      <>
                        <span className="text-surface-300 dark:text-surface-600">·</span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${dueDateInfo.className}`}>
                          <Calendar size={10} />
                          {dueDateInfo.text}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteTask(task._id)}
                  className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-400/10 text-surface-400 hover:text-danger-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
          <CheckSquare size={40} className="mx-auto text-surface-300 mb-3" />
          <p className="text-surface-600 dark:text-surface-400 font-medium">No tasks yet</p>
          <p className="text-sm text-surface-400 mt-1">Create your first task to start tracking your responsibilities.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all"
          >
            <Plus size={16} /> Create Task
          </button>
        </div>
      )}
    </div>
  );
}
