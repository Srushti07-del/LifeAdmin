import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Plus,
  Receipt,
  CheckSquare,
  CalendarClock,
  Bell,
  Loader2,
  FileText,
  Check,
} from 'lucide-react';

interface AttentionItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document';
  title: string;
  subtitle: string;
  reason: string;
  severity: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  urgencyLabel: string;
  dueDate: string;
  destination: string;
  amount?: number;
  currency?: string;
}

interface UpcomingItem {
  id: string;
  type: 'task' | 'bill' | 'appointment' | 'reminder' | 'document' | 'event';
  title: string;
  subtitle: string;
  date: string;
  time?: string;
  destination: string;
  amount?: number;
  currency?: string;
}

interface DashboardData {
  needsAttention: AttentionItem[];
  upcoming: UpcomingItem[];
  reminders: any[];
  stats: {
    overdueCount: number;
    dueSoonCount: number;
    upcomingCount: number;
    activeReminders: number;
  };
}

const severityConfig = {
  overdue: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-950/60 text-rose-300 border border-rose-800/80',
    iconColor: 'text-rose-400',
  },
  urgent: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-950/60 text-amber-300 border border-amber-800/80',
    iconColor: 'text-amber-400',
  },
  soon: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-950/40 text-amber-300 border border-amber-800/60',
    iconColor: 'text-amber-400',
  },
  upcoming: {
    dot: 'bg-primary-500',
    badge: 'bg-primary-950/50 text-primary-300 border border-primary-800/60',
    iconColor: 'text-primary-400',
  },
};

const typeIcons: Record<string, typeof CheckSquare> = {
  task: CheckSquare,
  bill: Receipt,
  appointment: CalendarClock,
  reminder: Bell,
  document: FileText,
  event: Calendar,
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
    today.setHours(0, 0, 0, 0);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff <= 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const navigateToDestination = (destination: string, type: string, id: string) => {
    if (destination) {
      navigate(destination);
      return;
    }
    const routes: Record<string, string> = {
      task: '/tasks',
      bill: '/bills',
      appointment: '/appointments',
      reminder: '/reminders',
      document: '/documents',
    };
    if (type === 'document') {
      navigate('/documents');
    } else {
      navigate(`${routes[type] || '/dashboard'}/${id}`);
    }
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
    <div className="space-y-7 animate-fade-in max-w-5xl">
      {/* Workspace Header & Summary Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#505050] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F3EE]">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[#85827C] text-xs mt-1">
            {isEmpty
              ? 'Your workspace is all caught up. Add responsibilities to start tracking.'
              : 'Here is what requires your focus across tasks, bills, and schedules.'}
          </p>
        </div>

        {/* Compact Summary Pills */}
        {data && !isEmpty && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
              data.stats.overdueCount > 0
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                : 'bg-[#383838] text-[#85827C] border-[#505050]'
            }`}>
              {data.stats.overdueCount} Overdue
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
              data.stats.dueSoonCount > 0
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                : 'bg-[#383838] text-[#85827C] border-[#505050]'
            }`}>
              {data.stats.dueSoonCount} Due Soon
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#383838] text-[#B8B5AE] border border-[#505050]">
              {data.stats.upcomingCount} Upcoming
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Workspace Empty State */}
      {isEmpty && (
        <div className="py-12 px-6 rounded-2xl bg-[#383838] border border-[#505050] text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#2F2F2F] text-[#85827C] flex items-center justify-center">
            <Check size={22} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F5F3EE]">
              Nothing needs your attention
            </h2>
            <p className="text-[#85827C] text-xs mt-1">
              You are completely caught up. Create tasks, bills, appointments, or reminders to stay organized.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {[
              { label: 'Task', path: '/tasks/new' },
              { label: 'Bill', path: '/bills/new' },
              { label: 'Appointment', path: '/appointments/new' },
              { label: 'Reminder', path: '/reminders/new' },
              { label: 'Document', path: '/documents/new' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="px-3.5 py-1.5 rounded-xl border border-[#505050] text-xs font-medium text-[#B8B5AE] hover:text-[#F5F3EE] bg-[#383838] hover:bg-[#414141] transition-colors"
              >
                + {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 1. NEEDS ATTENTION — Main priority column */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EE]">
                  Needs Attention
                </h2>
                {data && data.needsAttention.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/80">
                    {data.needsAttention.length}
                  </span>
                )}
              </div>
            </div>

            {data && data.needsAttention.length > 0 ? (
              <div className="space-y-2">
                {data.needsAttention.map((item) => {
                  const Icon = typeIcons[item.type] || CheckSquare;
                  const cfg = severityConfig[item.severity] || severityConfig.upcoming;

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => navigateToDestination(item.destination, item.type, item.id)}
                      className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-[#505050] bg-[#383838] hover:bg-[#414141] hover:border-[#606060] transition-all group"
                      id={`attention-item-${item.id}`}
                    >
                      <div className="shrink-0">
                        <span className={`block w-2 h-2 rounded-full ${cfg.dot}`} />
                      </div>

                      <div className={`p-1.5 rounded-lg bg-[#2F2F2F] ${cfg.iconColor} shrink-0`}>
                        <Icon size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[#F5F3EE] truncate">
                            {item.title}
                          </p>
                          {item.amount !== undefined && (
                            <span className="text-xs font-bold text-[#F5F3EE] shrink-0">
                              {item.currency}{item.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#B8B5AE] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                          {item.urgencyLabel}
                        </span>
                        <ChevronRight size={14} className="text-[#85827C] group-hover:text-[#F5F3EE] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 px-4 rounded-xl bg-[#383838] border border-[#505050] text-center">
                <p className="text-xs text-[#85827C] font-medium">All caught up! No urgent or overdue deadlines.</p>
              </div>
            )}
          </div>

          {/* Right Column: UPCOMING + QUICK ACTIONS */}
          <div className="space-y-6">
            {/* 2. UPCOMING */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EE]">
                  Upcoming
                </h2>
              </div>

              {data && data.upcoming.length > 0 ? (
                <div className="space-y-1.5">
                  {data.upcoming.slice(0, 8).map((item) => {
                    const Icon = typeIcons[item.type] || Calendar;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => navigateToDestination(item.destination, item.type, item.id)}
                        className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all group"
                      >
                        <div className="p-1 rounded-lg bg-[#2F2F2F] text-[#B8B5AE] shrink-0">
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#F5F3EE] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#85827C] mt-0.5 truncate">
                            {formatDate(item.date)} {item.time && `· ${item.time}`}
                          </p>
                        </div>
                        <ChevronRight size={13} className="text-[#85827C] group-hover:text-[#F5F3EE] transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 rounded-xl bg-[#383838] border border-[#505050] text-center">
                  <p className="text-xs text-[#85827C]">No upcoming responsibilities</p>
                </div>
              )}
            </div>

            {/* 3. QUICK ACTIONS */}
            <div className="space-y-2.5 pt-2 border-t border-[#505050]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#B8B5AE]">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Task', path: '/tasks/new', icon: CheckSquare },
                  { label: 'Bill', path: '/bills/new', icon: Receipt },
                  { label: 'Appointment', path: '/appointments/new', icon: CalendarClock },
                  { label: 'Reminder', path: '/reminders/new', icon: Bell },
                  { label: 'Document', path: '/documents/new', icon: FileText },
                  { label: 'Event', path: '/calendar/new', icon: Calendar },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all text-xs font-medium text-[#F5F3EE] hover:text-white"
                    id={`quick-create-${action.label.toLowerCase()}`}
                  >
                    <Plus size={13} className="text-primary-400 shrink-0" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
