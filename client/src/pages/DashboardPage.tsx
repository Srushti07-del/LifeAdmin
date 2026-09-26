import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  AlertCircle,
  Clock,
  Calendar,
  ChevronRight,
  Plus,
  Receipt,
  CheckSquare,
  CalendarClock,
  Bell,
  Loader2,
  TrendingUp,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

interface NeedsAttentionItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  urgencyLabel: string;
  dueDate: string;
  amount?: number;
  currency?: string;
}

interface UpcomingItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  time?: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  upcoming: UpcomingItem[];
  reminders: any[];
  stats: {
    overdueCount: number;
    dueSoonCount: number;
    upcomingCount: number;
    activeReminders: number;
  };
}

const urgencyConfig = {
  overdue: { dot: 'urgency-dot-overdue', text: 'urgency-overdue', bg: 'bg-danger-400/10 dark:bg-danger-400/5' },
  urgent: { dot: 'urgency-dot-urgent', text: 'urgency-urgent', bg: 'bg-accent-400/10 dark:bg-accent-400/5' },
  soon: { dot: 'urgency-dot-soon', text: 'urgency-soon', bg: 'bg-warning-400/10 dark:bg-warning-400/5' },
  upcoming: { dot: 'urgency-dot-upcoming', text: 'urgency-upcoming', bg: 'bg-primary-400/10 dark:bg-primary-400/5' },
};

const typeIcons: Record<string, typeof CheckSquare> = {
  task: CheckSquare,
  bill: Receipt,
  appointment: CalendarClock,
  reminder: Bell,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return days[date.getDay()];

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const navigateToItem = (type: string, id: string) => {
    const routes: Record<string, string> = {
      task: '/tasks',
      bill: '/bills',
      appointment: '/appointments',
      reminder: '/reminders',
    };
    navigate(`${routes[type] || '/dashboard'}/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const isEmpty = !data || (data.needsAttention.length === 0 && data.upcoming.length === 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-surface-500 mt-1">
          {isEmpty
            ? "Let's get your responsibilities in one place."
            : "Here's what needs your attention."}
        </p>
      </div>

      {/* Stats summary */}
      {data && !isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Overdue', value: data.stats.overdueCount, color: 'text-danger-500', bg: 'bg-danger-400/10' },
            { label: 'Due Soon', value: data.stats.dueSoonCount, color: 'text-accent-500', bg: 'bg-accent-400/10' },
            { label: 'Upcoming', value: data.stats.upcomingCount, color: 'text-primary-500', bg: 'bg-primary-400/10' },
            { label: 'Reminders', value: data.stats.activeReminders, color: 'text-warning-500', bg: 'bg-warning-400/10' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-shadow"
            >
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger-400/10 border border-danger-400/20 rounded-2xl text-danger-600 dark:text-danger-400 text-sm">
          {error}
        </div>
      )}

      {/* Onboarding empty state */}
      {isEmpty && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8 md:p-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center mb-6">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">
              Welcome to LifeAdmin
            </h2>
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-1">
              Let's get your responsibilities in one place.
            </p>
            <p className="text-surface-400 dark:text-surface-500 text-xs mb-8">
              Nothing needs your attention yet. Add your first task, bill, appointment, or reminder to start tracking what matters.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Task', path: '/tasks/new', icon: CheckSquare, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                { label: 'Bill', path: '/bills/new', icon: Receipt, color: 'text-accent-500', bg: 'bg-accent-400/10' },
                { label: 'Appointment', path: '/appointments/new', icon: CalendarClock, color: 'text-warning-500', bg: 'bg-warning-400/10' },
                { label: 'Reminder', path: '/reminders/new', icon: Bell, color: 'text-success-500', bg: 'bg-success-400/10' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all group ${action.bg}`}
                >
                  <action.icon size={22} className={action.color} />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-surface-100">
                    Add {action.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-surface-200 dark:border-surface-800">
              <p className="text-xs text-surface-400 mb-3">Or upload a document and let LifeAdmin extract the details</p>
              <button
                onClick={() => navigate('/documents')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-sm font-medium text-surface-700 dark:text-surface-300 transition-colors"
              >
                <FileText size={16} />
                <span>Go to Documents</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NEEDS ATTENTION — main column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-danger-500" />
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Needs Attention
            </h2>
            {data && data.needsAttention.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-400/10 text-danger-500">
                {data.needsAttention.length}
              </span>
            )}
          </div>

          {data && data.needsAttention.length > 0 ? (
            <div className="space-y-2">
              {data.needsAttention.map((item, idx) => {
                const Icon = typeIcons[item.type] || CheckSquare;
                const config = urgencyConfig[item.urgency];
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateToItem(item.type, item.id)}
                    className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:shadow-card transition-all duration-200 group ${config.bg}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    id={`attention-item-${item.id}`}
                  >
                    <div className="flex-shrink-0">
                      <span className={`urgency-dot ${config.dot}`} />
                    </div>
                    <div className="flex-shrink-0 p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <Icon size={18} className="text-surface-600 dark:text-surface-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.amount && (
                          <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                            {item.currency}{item.amount.toLocaleString()}
                          </span>
                        )}
                        {item.amount && <span className="text-surface-300 dark:text-surface-600">·</span>}
                        <span className={`text-xs font-medium ${config.text}`}>{item.urgencyLabel}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-surface-300 group-hover:text-surface-500 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-success-400/10 flex items-center justify-center mb-3">
                <TrendingUp size={24} className="text-success-500" />
              </div>
              <p className="text-surface-600 dark:text-surface-400 font-medium">All caught up!</p>
              <p className="text-sm text-surface-400 mt-1">No deadlines or overdue items right now.</p>
            </div>
          )}
        </div>

        {/* UPCOMING — sidebar column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Upcoming</h2>
          </div>

          {data && data.upcoming.length > 0 ? (
            <div className="space-y-2">
              {data.upcoming.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => navigateToItem(item.type, item.id)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all duration-200 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <Calendar size={16} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {formatDate(item.date)} {item.time && `· ${item.time}`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-surface-300 group-hover:text-surface-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800">
              <Clock size={24} className="mx-auto text-surface-300 mb-2" />
              <p className="text-sm text-surface-400">No upcoming events</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2">
            <h3 className="text-sm font-medium text-surface-500 mb-3 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Task', path: '/tasks/new', icon: CheckSquare },
                { label: 'Bill', path: '/bills/new', icon: Receipt },
                { label: 'Appointment', path: '/appointments/new', icon: CalendarClock },
                { label: 'Reminder', path: '/reminders/new', icon: Bell },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-card transition-all text-sm text-surface-700 dark:text-surface-300"
                  id={`quick-create-${action.label.toLowerCase()}`}
                >
                  <Plus size={14} className="text-primary-500" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
