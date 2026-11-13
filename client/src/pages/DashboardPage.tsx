import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
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
  Loader2,
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  Circle,
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
  amount?: number;
  currency?: string;
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
  | 'ai_briefing';

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'needs_attention', label: 'Needs Attention (High Priority)', visible: true },
  { id: 'lifebuddy', label: 'LifeBuddy Companion', visible: true },
  { id: 'tasks', label: 'Upcoming Tasks', visible: true },
  { id: 'bills', label: 'Upcoming Bills & Expenses', visible: true },
  { id: 'schedule', label: 'Today & Upcoming Schedule', visible: true },
  { id: 'ai_briefing', label: 'AI Briefing', visible: true },
];

const PRESETS: Record<string, WidgetId[]> = {
  standard: ['needs_attention', 'lifebuddy', 'tasks', 'bills', 'schedule', 'ai_briefing'],
  focus: ['needs_attention', 'tasks', 'schedule', 'ai_briefing', 'lifebuddy', 'bills'],
  finance: ['needs_attention', 'bills', 'tasks', 'schedule', 'ai_briefing', 'lifebuddy'],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI Briefing state (next 7 days: tasks, bills, appointments, reminders)
  interface BriefingItem {
    type: 'task' | 'bill' | 'appointment' | 'reminder';
    title: string;
    date: string;
    time?: string;
    amount?: number;
    currency?: string;
    category?: string;
  }
  const [briefing, setBriefing] = useState<{
    overview: string;
    items: BriefingItem[];
    rangeLabel: string;
    generatedAt: string | null;
    isEmpty: boolean;
  } | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Onboarding trigger
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Track task IDs currently being completed (prevents double submission)
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

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

  const handleTaskComplete = async (item: NeedsAttentionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type !== 'task') return;
    if (completingTaskIds.has(item.id)) return;

    setCompletingTaskIds(prev => new Set([...prev, item.id]));

    try {
      await api.put(`/tasks/${item.id}`, { status: 'completed' });
      toast.success('Task marked as completed');
      await fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete task. Please try again.');
    } finally {
      setCompletingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchDashboard();
    setCompanionState(getCompanionStorage());
  }, []);

  useEffect(() => {
    // Load previously generated briefing from localStorage on mount
    try {
      const saved = localStorage.getItem('lifeadmin_ai_briefing');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setBriefing({
            ...parsed,
            items: Array.isArray(parsed.items) ? parsed.items : [],
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (user?.companion) {
      setCompanionState(user.companion);
    }
  }, [user?.companion]);

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

  // Strips common Markdown syntax and any AI-enumerated item lists from briefing text
  // so the intro summary stays count-based only. No dangerouslySetInnerHTML is used.
  const sanitizeBriefingText = (text: string): string => {
    return text
      .replace(/^#{1,6}\s+/gm, '')           // Strip markdown headings (#, ##, ###)
      .replace(/\*\*\*/g, '')                // Strip *** markers
      .replace(/\*\*/g, '')                  // Strip **bold** markers
      .replace(/(?<!\w)\*(.*?)\*(?!\w)/g, '$1') // Strip *italic* markers
      .replace(/^\s*[-*+]\s+/gm, '')         // Strip list markers at line start
      .replace(/__/g, '')                    // Strip __underscore__ markers
      .split(/(?<=[.!?])\s+/)                // Split into sentences
      .filter((s: string) => {
        const lower = s.toLowerCase();
        return !(
          lower.includes('consisting of') ||
          lower.includes('including') ||
          lower.includes('namely') ||
          /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(s) ||
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/i.test(s)
        );
      })
      .join(' ')
      .trim();
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

  const regenerateBriefing = async () => {
    if (briefingLoading) return;
    setBriefingLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      const rangeLabel = `${today.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${in7Days.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const res = await api.post('/ai/chat', {
        message: 'Generate my 7-day briefing intro summary using only counts of upcoming items. Do not list individual names or dates.',
        scope: 'daily_briefing_7d',
        windowDays: 7,
      });

      const reply = res.data.reply || 'No briefing content was generated.';
      const generatedAt = now.toISOString();
      const items: BriefingItem[] = res.data.items || [];

      // Count items by type for a clean, count-based intro summary.
      const taskCount = items.filter((i) => i.type === 'task').length;
      const billCount = items.filter((i) => i.type === 'bill').length;
      const appointmentCount = items.filter((i) => i.type === 'appointment').length;
      const reminderCount = items.filter((i) => i.type === 'reminder').length;

      const countParts: string[] = [];
      if (taskCount > 0) countParts.push(`${taskCount} upcoming task${taskCount > 1 ? 's' : ''}`);
      if (billCount > 0) countParts.push(`${billCount} upcoming bill payment${billCount > 1 ? 's' : ''}`);
      if (appointmentCount > 0) countParts.push(`${appointmentCount} upcoming appointment${appointmentCount > 1 ? 's' : ''}`);
      if (reminderCount > 0) countParts.push(`${reminderCount} upcoming reminder${reminderCount > 1 ? 's' : ''}`);

      // Canonical count-based intro summary (single source of truth — do not concatenate AI reply).
      const overview = countParts.length > 0
        ? `You have ${countParts.join(', ')} scheduled for the next 7 days.`
        : 'You have no upcoming items scheduled for the next 7 days.';

      const updatedBriefing = {
        overview,
        items,
        rangeLabel,
        generatedAt,
        isEmpty: items.length === 0 && reply.trim().length === 0,
      };

      setBriefing(updatedBriefing);
      try {
        localStorage.setItem('lifeadmin_ai_briefing', JSON.stringify(updatedBriefing));
      } catch {
        // Ignore storage errors
      }
      toast.success('Briefing regenerated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate briefing. Please try again.');
    } finally {
      setBriefingLoading(false);
    }
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
                    const isTask = item.type === 'task';
                    const isCompleting = completingTaskIds.has(item.id);
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
                          {isTask && (
                            <button
                              onClick={(e) => handleTaskComplete(item, e)}
                              className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                                isCompleting
                                  ? 'text-surface-400 animate-pulse'
                                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
                              }`}
                              title="Mark task as completed"
                              aria-label="Mark task as completed"
                              disabled={isCompleting}
                            >
                              {isCompleting ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Circle size={16} />
                              )}
                            </button>
                          )}
                          <div
                            className={`flex items-center gap-3.5 min-w-0 ${isTask ? 'pl-2' : ''}`}
                          >
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
          {/* AI BRIEFING WIDGET */}
          {widgets.find((w) => w.id === 'ai_briefing')?.visible && (
            <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-surface-200 dark:border-surface-700 mb-6 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-normal font-editorial text-surface-900 dark:text-surface-100 truncate">
                      AI Briefing
                    </h2>
                    <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
                      Your next 7 days at a glance • {briefing?.rangeLabel ?? ''}
                      {briefing?.generatedAt && (
                        <span className="ml-2 text-[10px] text-surface-400 dark:text-surface-500">
                          • Generated {new Date(briefing.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={regenerateBriefing}
                  disabled={briefingLoading}
                  className="flex-shrink-0 text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 hover:underline transition-colors whitespace-nowrap"
                >
                  {briefingLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={14} />}
                  <span>Regenerate</span>
                </button>
              </div>

              {briefing ? (
                <>
                  {/* Weekly overview */}
                  <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-6">
                    {sanitizeBriefingText(briefing.overview)}
                  </p>

                  {/* Upcoming items */}
                  {briefing.items.length > 0 && (
                    <>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-3">
                        Upcoming Items
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            key: 'task',
                            label: 'Tasks',
                            icon: <CheckSquare className="text-primary-600 dark:text-primary-400" />,
                            items: briefing.items.filter((i) => i.type === 'task'),
                          },
                          {
                            key: 'bill',
                            label: 'Bills & Payments',
                            icon: <Receipt className="text-teal-600 dark:text-teal-400" />,
                            items: briefing.items.filter((i) => i.type === 'bill'),
                          },
                          {
                            key: 'appointment',
                            label: 'Appointments',
                            icon: <Calendar className="text-primary-600 dark:text-primary-400" />,
                            items: briefing.items.filter((i) => i.type === 'appointment'),
                          },
                          {
                            key: 'reminder',
                            label: 'Reminders',
                            icon: <AlertTriangle className="text-surface-500 dark:text-surface-600" />,
                            items: briefing.items.filter((i) => i.type === 'reminder'),
                          },
                        ]
                          .filter((g) => g.items.length > 0)
                          .map((group) => (
                            <div key={group.key} className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                                  {group.icon}
                                </div>
                                <h4 className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                                  {group.label}
                                </h4>
                              </div>
                              <div className="space-y-1">
                                {group.items.map((item, idx) => (
                                  <div
                                    key={`${group.key}-${idx}`}
                                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-transparent hover:border-surface-200 dark:hover:border-surface-700 transition-colors"
                                  >
                                    <div className="min-w-0 text-xs leading-relaxed">
                                      <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                                        {item.title}
                                      </p>
                                      <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5 flex items-center gap-1.5">
                                        {item.type === 'bill' ? (
                                          <>
                                            {formatCurrency(
                                              convertAmountTo(
                                                item.amount || 0,
                                                item.currency,
                                                preferredCurrency,
                                                dashboardExchangeRates
                                              ),
                                              preferredCurrency
                                            )}
                                            <span>·</span>
                                            {formatDate(item.date)}
                                          </>
                                        ) : item.type === 'appointment' ? (
                                          <>
                                            {formatDate(item.date)}
                                            {item.time && <span>· {item.time}</span>}
                                          </>
                                        ) : item.type === 'reminder' ? (
                                          <>
                                            {formatDate(item.date)}
                                            {item.time && <span>· {item.time}</span>}
                                          </>
                                        ) : (
                                          <>
                                            {item.category && <span>{item.category} ·</span>}
                                            {formatDate(item.date)}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 flex items-center justify-center mb-3 shadow-xs">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-xs font-semibold text-surface-900 dark:text-surface-100 mb-1">
                    Briefing ready when you are
                  </h4>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 max-w-xs mb-3">
                    Generate a personalized summary of your tasks, bills & payments, appointments, and reminders for the next 7 days.
                  </p>
                  <button
                    onClick={regenerateBriefing}
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                  >
                    Generate briefing
                  </button>
                </div>
              )}
            </div>
          )}

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
