import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  getCompanionStorage,
  getActiveCompanion,
  getGrowthStage,
} from '../lib/companions';
import type { CompanionState } from '../lib/companions';
import CompanionAvatar from '../components/companions/CompanionAvatar';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { formatCurrency, convertAmountTo, useExchangeRates, getCurrencyInfo, type CurrencyCode } from '../lib/currency';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Plus,
  Receipt,
  CheckSquare,
  Bell,
  Loader2,
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
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

export type WidgetId =
  | 'needs_attention'
  | 'lifebuddy'
  | 'schedule'
  | 'tasks'
  | 'bills'
  | 'reminders'
  | 'ai_briefing';

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'needs_attention', label: 'Needs Attention (High Priority)', visible: true },
  { id: 'lifebuddy', label: 'LifeBuddy Companion', visible: true },
  { id: 'ai_briefing', label: 'AI Daily Briefing', visible: true },
  { id: 'tasks', label: 'Upcoming Tasks', visible: true },
  { id: 'bills', label: 'Upcoming Bills & Expenses', visible: true },
  { id: 'schedule', label: 'Today & Upcoming Schedule', visible: true },
  { id: 'reminders', label: 'Active Reminders', visible: true },
];

const PRESETS: Record<string, WidgetId[]> = {
  standard: ['needs_attention', 'lifebuddy', 'ai_briefing', 'tasks', 'bills', 'schedule', 'reminders'],
  focus: ['needs_attention', 'tasks', 'schedule', 'ai_briefing', 'reminders', 'lifebuddy', 'bills'],
  finance: ['needs_attention', 'bills', 'ai_briefing', 'tasks', 'schedule', 'lifebuddy', 'reminders'],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Onboarding trigger
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Companion state
  const [companionState, setCompanionState] = useState<CompanionState>(getCompanionStorage);

  // Customization modal & widget ordering
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem('lifeadmin_dashboard_widgets');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_WIDGETS;
  });

  // Exchange rates for currency conversion in bills widget
  const preferredCurrency = (user?.preferredCurrency || 'INR') as CurrencyCode;
  const { rates: dashboardExchangeRates } = useExchangeRates(preferredCurrency);

  useEffect(() => {
    // Check if new user needs onboarding
    const needsOnboard = localStorage.getItem('lifeadmin_show_onboarding') === 'true';
    if (needsOnboard) {
      setShowOnboarding(true);
      localStorage.removeItem('lifeadmin_show_onboarding');
    }
  }, []);

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

  useEffect(() => {
    fetchDashboard();
    setCompanionState(getCompanionStorage());
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
    if (diff <= 7 && diff > 0) return days[date.getDay()];

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const navigateToItem = (type: string, _id?: string) => {
    const routes: Record<string, string> = {
      task: '/tasks',
      bill: '/bills',
      appointment: '/appointments',
      reminder: '/reminders',
    };
    navigate(routes[type] || '/dashboard');
  };

  // Customization methods
  const saveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('lifeadmin_dashboard_widgets', JSON.stringify(newWidgets));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;
    const reordered = [...widgets];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    saveWidgets(reordered);
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    saveWidgets(updated);
  };

  const applyPreset = (presetKey: string) => {
    const order = PRESETS[presetKey] || PRESETS.standard;
    const reordered: WidgetConfig[] = order.map((id) => {
      const existing = widgets.find((w) => w.id === id);
      return existing || { id, label: id, visible: true };
    });
    saveWidgets(reordered);
  };

  const resetWidgets = () => {
    saveWidgets(DEFAULT_WIDGETS);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-400 font-medium">Assembling your workspace...</p>
      </div>
    );
  }

  const isEmpty = !data || (data.needsAttention.length === 0 && data.upcoming.length === 0);
  const activeCompanion = getActiveCompanion(companionState.activeId);
  const stage = getGrowthStage(companionState.level);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          setCompanionState(getCompanionStorage());
          fetchDashboard();
        }}
      />

      {/* Editorial Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-surface-200 dark:border-surface-700">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-surface-400">·</span>
            <span className="text-surface-500 dark:text-surface-400 font-medium lowercase">dashboard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Friend'}.
          </h1>
          <p className="text-sm text-surface-700 dark:text-surface-300 mt-1 font-normal">
            Your life, organised. Your mind, uncluttered.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors shadow-xs"
          >
            <SlidersHorizontal size={14} className="text-primary-600 dark:text-primary-400" />
            <span>Customize</span>
          </button>

          <button
            onClick={() => navigate('/tasks/new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus size={15} />
            <span>Quick Task</span>
          </button>
        </div>
      </div>

      {/* Gentle First-Time Orientation Banner */}
      {isEmpty && (
        <div className="bg-primary-50/70 dark:bg-surface-0 border border-primary-200 dark:border-surface-700 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-bold text-lg shadow-xs flex-shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-base font-normal font-editorial text-surface-900 dark:text-surface-100">
                Welcome to your command center!
              </h3>
              <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5">
                Nothing requires urgent attention right now. Add your first task or bill to start staying ahead.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/tasks/new')}
              className="px-3.5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs"
            >
              Add First Task
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 text-xs font-medium"
            >
              Reopen Setup
            </button>
          </div>
        </div>
      )}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 sm:p-5 border border-surface-200 dark:border-surface-700 shadow-card hover:shadow-elevated transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 tracking-wider uppercase">
                Overdue
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold font-sans text-surface-900 dark:text-surface-100 mt-2 tracking-tight">
              {data.stats.overdueCount}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Require immediate action</p>
          </div>

          <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 sm:p-5 border border-surface-200 dark:border-surface-700 shadow-card hover:shadow-elevated transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wider uppercase">
                Due Soon
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold font-sans text-surface-900 dark:text-surface-100 mt-2 tracking-tight">
              {data.stats.dueSoonCount}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Next 7 days</p>
          </div>

          <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 sm:p-5 border border-surface-200 dark:border-surface-700 shadow-card hover:shadow-elevated transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 tracking-wider uppercase">
                Upcoming
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold font-sans text-surface-900 dark:text-surface-100 mt-2 tracking-tight">
              {data.stats.upcomingCount}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Within 30 days</p>
          </div>

          <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 sm:p-5 border border-surface-200 dark:border-surface-700 shadow-card hover:shadow-elevated transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 tracking-wider uppercase">
                Active Alerts
              </span>
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold font-sans text-surface-900 dark:text-surface-100 mt-2 tracking-tight">
              {data.stats.activeReminders}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 font-medium">Scheduled reminders</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Primary Column (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          {/* NEEDS ATTENTION WIDGET */}
          {widgets.find((w) => w.id === 'needs_attention')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-surface-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-normal font-editorial text-surface-900 dark:text-surface-100">
                      Needs Attention
                    </h2>
                    <p className="text-xs text-surface-600 dark:text-surface-400">High-priority deadlines and urgent items</p>
                  </div>
                </div>

                {data && data.needsAttention.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60">
                    {data.needsAttention.length} urgent
                  </span>
                )}
              </div>

              {data && data.needsAttention.length > 0 ? (
                <div className="space-y-2.5">
                  {data.needsAttention.map((item) => {
                    const isOverdue = item.urgency === 'overdue';
                    const isUrgent = item.urgency === 'urgent';
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigateToItem(item.type, item.id)}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4 group ${
                          isOverdue
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : isUrgent
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-200/70 dark:border-teal-800/60 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              isOverdue ? 'bg-rose-500 animate-pulse' : isUrgent ? 'bg-amber-500' : 'bg-primary-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-600 dark:text-surface-400 font-medium">
                              <span className="capitalize">{item.subtitle || item.type}</span>
                                  {item.amount && (
                                    <>
                                      <span>·</span>
                                      <span className="font-bold text-surface-900 dark:text-surface-100">
                                        {formatCurrency(convertAmountTo(item.amount, item.currency, preferredCurrency, dashboardExchangeRates), preferredCurrency)}
                                      </span>
                                    </>
                                  )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              isOverdue
                                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {item.urgencyLabel}
                          </span>
                          <ChevronRight
                            size={16}
                            className="text-surface-400 group-hover:text-surface-900 dark:group-hover:text-surface-100 transition-colors"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <TrendingUp size={20} />
                  </div>
                  <h4 className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                    All caught up on high-urgency items
                  </h4>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    No deadlines or bills are currently overdue.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TASKS WIDGET */}
          {widgets.find((w) => w.id === 'tasks')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 flex items-center justify-center">
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-normal font-editorial text-surface-900 dark:text-surface-100">
                      My Tasks
                    </h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Scheduled personal responsibilities</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  View all
                </button>
              </div>

              {data && data.upcoming.filter((u) => u.type === 'task').length > 0 ? (
                <div className="space-y-2">
                  {data.upcoming
                    .filter((u) => u.type === 'task')
                    .slice(0, 5)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate('/tasks')}
                        className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CheckSquare size={16} className="text-primary-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">{formatDate(task.date)}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-surface-500 dark:text-surface-400 text-xs">
                  No upcoming tasks. Add one with Quick Task.
                </div>
              )}
            </div>
          )}

          {/* BILLS & PAYMENTS WIDGET */}
          {widgets.find((w) => w.id === 'bills')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-normal font-editorial text-surface-900 dark:text-surface-100">
                      Bills & Payments
                    </h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Upcoming expenses in {getCurrencyInfo(preferredCurrency).symbol} ({preferredCurrency})</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/bills')}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  Manage bills
                </button>
              </div>

              {data && data.needsAttention.filter((i) => i.type === 'bill').length > 0 ? (
                <div className="space-y-2">
                  {data.needsAttention
                    .filter((i) => i.type === 'bill')
                    .map((bill) => (
                      <div
                        key={bill.id}
                        onClick={() => navigate('/bills')}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50/60 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700 cursor-pointer hover:border-primary-400 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Receipt size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                              {bill.title}
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400">{bill.urgencyLabel}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-sans text-primary-700 dark:text-primary-300">
                          {formatCurrency(convertAmountTo(bill.amount || 0, bill.currency, preferredCurrency, dashboardExchangeRates), preferredCurrency)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-surface-500 dark:text-surface-400 text-xs">
                  All bills are paid or up to date.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right / Secondary Column */}
        <div className="space-y-6">
          {/* LIFEBUDDY WIDGET */}
          {widgets.find((w) => w.id === 'lifebuddy')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300">
                    LifeBuddy Companion
                  </span>
                </div>
                <button
                  onClick={() => navigate('/lifebuddy')}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  Sanctuary
                </button>
              </div>

              <div className="flex items-center gap-4">
                <CompanionAvatar id={activeCompanion.id} size="lg" className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-normal font-editorial text-surface-900 dark:text-surface-100 truncate">
                      {companionState.customName || activeCompanion.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50">
                      Lvl {companionState.level}
                    </span>
                  </div>
                  <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5">{activeCompanion.species} · {stage}</p>

                  {/* Growth Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-surface-600 dark:text-surface-400 mb-1 font-medium">
                      <span>Growth XP</span>
                      <span>{companionState.xp % 200} / 200</span>
                    </div>
                    <div className="h-2 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden border border-surface-200 dark:border-surface-700">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((companionState.xp % 200) / 200) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gentle Encouragement Quote */}
              <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 text-xs text-surface-800 dark:text-surface-200 italic">
                &ldquo;{activeCompanion.quote}&rdquo;
              </div>
            </div>
          )}

          {/* AI PRODUCTIVITY BRIEFING WIDGET */}
          {widgets.find((w) => w.id === 'ai_briefing')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-200 dark:border-surface-700 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                    AI Daily Briefing
                  </h3>
                  <p className="text-[11px] text-surface-600 dark:text-surface-400">Contextual morning summary</p>
                </div>
              </div>
              <p className="text-xs text-surface-800 dark:text-surface-300 leading-relaxed font-normal">
                {data && data.stats.overdueCount > 0
                  ? `You have ${data.stats.overdueCount} overdue item requiring attention. Prioritize clearing this before taking on new tasks.`
                  : "All current tasks are neatly on track. Consider reviewing upcoming bill renewals for the week ahead."}
              </p>
              <button
                onClick={() => navigate('/ai')}
                className="mt-3 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                Open Planning Assistant <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* UPCOMING SCHEDULE WIDGET */}
          {widgets.find((w) => w.id === 'schedule')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary-500" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                    Upcoming Schedule
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  Calendar
                </button>
              </div>

              {data && data.upcoming.length > 0 ? (
                <div className="space-y-2">
                  {data.upcoming.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigateToItem(item.type, item.id)}
                      className="p-3 rounded-xl bg-surface-50/60 dark:bg-surface-800/40 border border-surface-200/80 dark:border-surface-700 text-xs flex items-center justify-between cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">{item.title}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 capitalize">{item.type} {item.time && `· ${item.time}`}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 flex-shrink-0">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-surface-500 dark:text-surface-400">
                  No upcoming events in the next 30 days.
                </div>
              )}
            </div>
          )}

          {/* REMINDERS WIDGET */}
          {widgets.find((w) => w.id === 'reminders')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                    Reminders
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/reminders')}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  View
                </button>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
                {data?.stats.activeReminders || 0} active reminder alert{data?.stats.activeReminders === 1 ? '' : 's'} scheduled.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Customize Dashboard Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-surface-950/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowCustomizeModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-0 rounded-3xl border border-surface-200 dark:border-surface-700 p-6 shadow-modal z-10 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-surface-700 mb-4">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                  Customize Dashboard
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-medium">Toggle and reorder your active widgets</p>
              </div>
              <button
                onClick={resetWidgets}
                className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 font-medium"
                title="Restore default layout"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                Layout Presets
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyPreset('standard')}
                  className="py-2 px-2.5 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
                >
                  Balanced
                </button>
                <button
                  onClick={() => applyPreset('focus')}
                  className="py-2 px-2.5 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
                >
                  Focus
                </button>
                <button
                  onClick={() => applyPreset('finance')}
                  className="py-2 px-2.5 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
                >
                  Finance
                </button>
              </div>
            </div>

            {/* Widget Order & Visibility List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {widgets.map((widget, idx) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/60 text-xs"
                >
                  <span className={`font-semibold ${widget.visible ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 line-through'}`}>
                    {widget.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => moveWidget(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveWidget(idx, 'down')}
                      disabled={idx === widgets.length - 1}
                      className="p-1 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      className={`p-1 rounded-lg ${widget.visible ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50' : 'text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}
                    >
                      {widget.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-surface-200 dark:border-surface-700 mt-4 flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
