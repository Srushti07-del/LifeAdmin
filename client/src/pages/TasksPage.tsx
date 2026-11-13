import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import {
  Plus,
  CheckSquare,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  Trash2,
  Search,
  LayoutList,
  Columns,
  Edit2,
  Circle,
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

// Status sort priority: To Do → In Progress → Completed
const STATUS_ORDER: Record<string, number> = { todo: 0, in_progress: 1, completed: 2 };

function sortTasksByStatusThenDue(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    // Preserve existing due-date ordering within each status group
    return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
  });
}

const priorityConfig = {
  low: { color: 'text-surface-600 dark:text-surface-200', bg: 'bg-surface-100 dark:bg-surface-800', border: 'border-surface-300 dark:border-surface-700', label: 'Low' },
  medium: { color: 'text-teal-700 dark:text-primary-200', bg: 'bg-teal-50 dark:bg-surface-800', border: 'border-teal-200 dark:border-surface-700', label: 'Medium' },
  high: { color: 'text-amber-800 dark:text-[#FFE8AD]', bg: 'bg-amber-50 dark:bg-[#54390E]', border: 'border-amber-200 dark:border-amber-700/60', label: 'High' },
  urgent: { color: 'text-rose-800 dark:text-[#FFD2D2]', bg: 'bg-rose-50 dark:bg-[#5C2828]', border: 'border-rose-200 dark:border-rose-700/60', label: 'Urgent' },
};

export default function TasksPage() {
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form & Edit state
  const [showModal, setShowModal] = useState(location.pathname.endsWith('/new'));
  const [editingId, setEditingId] = useState<string | null>(null);
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
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/tasks', { params });
      setTasks(sortTasksByStatusThenDue(res.data.tasks));
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      dueTime: '',
      priority: 'medium',
      category: 'Personal',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingId(task._id);
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      dueTime: task.dueTime || '',
      priority: task.priority,
      category: task.category,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/tasks/${editingId}`, formData);
      } else {
        await api.post('/tasks', formData);
      }
      setShowModal(false);
      setEditingId(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
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
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, className: 'text-rose-600 dark:text-rose-400 font-semibold' };
    if (diffDays === 0) return { text: 'Due today', className: 'text-amber-600 dark:text-amber-400 font-semibold' };
    if (diffDays === 1) return { text: 'Due tomorrow', className: 'text-teal-600 dark:text-teal-400 font-medium' };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: 'text-primary-600 dark:text-primary-400' };
    return { text: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), className: 'text-surface-400' };
  };

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(tasks.map((t) => t.category)))];

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-400">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            My Tasks
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">
            {filteredTasks.length} responsibility item{filteredTasks.length === 1 ? '' : 's'} recorded
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (List vs Board) */}
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-xl border border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-surface-0 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-surface-400 hover:text-surface-700'
              }`}
              title="List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-surface-0 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-surface-400 hover:text-surface-700'
              }`}
              title="Board View"
            >
              <Columns size={16} />
            </button>
          </div>

          {/* New Task Button */}
          <button
            onClick={handleOpenCreate}
            id="new-task-button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] text-xs font-semibold shadow-xs transition-all`}
          >
            <Plus size={16} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title or notes..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary-600 dark:bg-primary-500 text-white dark:text-[#101719] font-semibold shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        {categories.length > 2 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* VIEW: LIST MODE */}
      {viewMode === 'list' && (
        <div className="space-y-2.5">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const due = formatDueDate(task.dueDate);
              const pConfig = priorityConfig[task.priority] || priorityConfig.medium;
              const isCompleted = task.status === 'completed';

              return (
                <div
                  key={task._id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-150 ${
                    isCompleted
                      ? 'bg-surface-50/40 dark:bg-surface-900/20 border-surface-200/60 opacity-70'
                      : 'bg-white dark:bg-surface-0 border-surface-200 dark:border-surface-700 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Status check circle */}
                    <button
                      onClick={() => toggleStatus(task)}
                      className="mt-0.5 text-surface-400 hover:text-primary-500 transition-colors"
                      title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={19} className="text-emerald-500" />
                      ) : task.status === 'in_progress' ? (
                        <Clock size={19} className="text-teal-600 dark:text-teal-400" />
                      ) : (
                        <Circle size={19} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 pr-4">
                      <p
                        className={`text-xs font-semibold tracking-tight text-surface-900 dark:text-surface-100 ${
                            isCompleted ? 'line-through text-surface-400 dark:text-surface-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                          {task.description && (
                          <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700">
                          {task.category}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pConfig.bg} ${pConfig.color} ${pConfig.border}`}>
                          {pConfig.label}
                        </span>
                        {due && (
                          <span className={`text-[11px] flex items-center gap-1 ${due.className}`}>
                            <Calendar size={11} /> {due.text} {task.dueTime && `· ${task.dueTime}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      title="Edit task"
                    >
                      <Edit2 size={14} />
                    </button>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-surface-400 hover:text-danger-500 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-all"
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#304247]">
              <CheckSquare size={32} className="mx-auto text-surface-300 dark:text-surface-700 mb-2" />
              <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">
                No tasks match your filter
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Clear filters or click &ldquo;New Task&rdquo; to add a new responsibility.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: BOARD (KANBAN) MODE */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'completed'] as const).map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            const colTitles = {
              todo: { label: 'To Do', icon: Circle, color: 'text-surface-300' },
              in_progress: { label: 'In Progress', icon: Clock, color: 'text-teal-600 dark:text-teal-400' },
              completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
            }[colStatus];

            return (
              <div
                key={colStatus}
                className="bg-surface-50/50 dark:bg-[#1C292D]/40 rounded-3xl p-4 border border-surface-200 dark:border-[#304247] min-h-[400px] flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 border-b border-surface-200/60 dark:border-[#304247] mb-3">
                  <div className="flex items-center gap-2">
                    <colTitles.icon size={16} className={colTitles.color} />
                    <span className="text-xs font-bold font-editorial text-surface-900 dark:text-surface-100">
                      {colTitles.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-surface-0 text-surface-500 dark:text-surface-200 border border-surface-200 dark:border-surface-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => {
                    const due = formatDueDate(task.dueDate);
                    const pConfig = priorityConfig[task.priority] || priorityConfig.medium;

                    return (
                      <div
                        key={task._id}
                className={`bg-white dark:bg-surface-0 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xs hover:shadow-card transition-all`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 p-0.5"
                              aria-label="Remove subtask"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => deleteTask(task._id)}
                              className="text-surface-400 hover:text-rose-500 p-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-1 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-100 dark:border-[#304247]">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${pConfig.bg} ${pConfig.color} ${pConfig.border}`}>
                            {pConfig.label}
                          </span>
                          <button
                            onClick={() => toggleStatus(task)}
                            className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                          >
                            Move →
                          </button>
                        </div>
                        {due && (
                          <p className={`text-[10px] mt-1.5 ${due.className}`}>
                            {due.text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-surface-500 dark:text-surface-400">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Task' : 'New Task'}
        maxWidth="md"
        panelClassName="rounded-3xl dark:border-[#304247]"
        headerClassName="pb-3 border-surface-100 dark:border-[#304247]"
        contentClassName="pt-4 pb-0"
        titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Submit research assignment"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Notes / Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional context or requirements..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Due Time
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Personal, Work, etc."
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex justify-end gap-2">
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
              {submitting ? 'Saving...' : editingId ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


