import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import {
  User,
  Settings,
  Sparkles,
  Trash2,
  CheckCircle2,
  Moon,
  Sun,
  Laptop,
  X,
  Plus,
  Search,
  IndianRupee,
  Bell,
  Target,
  Monitor,
  Calendar,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  FileText,
  LogOut,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencyInfo, type CurrencyCode } from '../lib/currency';

export default function SettingsPage() {
  const { user, updateUser, logout, setTheme: setThemeContext } = useAuth();

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings state
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(user?.theme || 'system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [autoExtract, setAutoExtract] = useState(user?.aiPreferences?.autoExtract ?? true);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(user?.aiPreferences?.suggestionsEnabled ?? true);
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>((user?.preferredCurrency || DEFAULT_CURRENCY) as CurrencyCode);
  const [currencySearch, setCurrencySearch] = useState('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [defaultReminderTiming, setDefaultReminderTiming] = useState<number[]>(user?.defaultReminderTiming || [7, 3, 1, 0]);

  // Categories
  const [categories, setCategories] = useState<string[]>(
    user?.categories || ['Personal', 'Work/Study', 'Health', 'Utilities', 'Housing', 'Financial']
  );
  const [newCatInput, setNewCatInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Email notification preferences
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailReminderIntervals, setEmailReminderIntervals] = useState<number[]>(user?.emailReminderIntervals || [1440, 60, 0]);
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(false);

  // Google Calendar connection state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<{
    connected: boolean;
    status?: string;
    googleEmail?: string;
    googleName?: string;
    googlePicture?: string;
    connectedAt?: Date;
    lastSyncAt?: Date;
    lastSyncStatus?: string;
    lastSyncError?: string;
    selectedCalendarId?: string;
    selectedCalendarName?: string;
  } | null>(null);
  const [loadingGoogleStatus, setLoadingGoogleStatus] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<Array<{ id: string; name: string; timezone?: string | null; primary: boolean; accessRole: string }>>([]);
  const [selectedGoogleCalendar, setSelectedGoogleCalendar] = useState<string>('');
  const [googleSyncLoading, setGoogleSyncLoading] = useState(false);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);
  const [googleSyncSuccess, setGoogleSyncSuccess] = useState(false);

  const INTERVAL_OPTIONS = [
    { minutes: 1440, label: '1 day before' },
    { minutes: 720, label: '12 hours before' },
    { minutes: 360, label: '6 hours before' },
    { minutes: 180, label: '3 hours before' },
    { minutes: 60, label: '1 hour before' },
    { minutes: 30, label: '30 minutes before' },
    { minutes: 15, label: '15 minutes before' },
    { minutes: 0, label: 'At scheduled time' },
  ];

  const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
    { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  ];

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setThemeState(user.theme || 'system');
      setNotificationsEnabled(user.notificationsEnabled ?? true);
      setAutoExtract(user.aiPreferences?.autoExtract ?? true);
      setSuggestionsEnabled(user.aiPreferences?.suggestionsEnabled ?? true);
      if (user.categories) setCategories(user.categories);
      if (user.preferredCurrency) setPreferredCurrency(user.preferredCurrency as CurrencyCode);
      setDefaultReminderTiming(user.defaultReminderTiming || [7, 3, 1, 0]);
      setEmailReminderIntervals(user.emailReminderIntervals || [1440, 60, 0]);
      setTimezone(user.timezone || 'UTC');
    }
    fetchEmailStatus();
    fetchGoogleCalendarStatus();
  }, [user]);

  const fetchEmailStatus = async () => {
    setLoadingEmailStatus(true);
    try {
      const res = await api.get('/email-notifications/status');
      setEmailConfigured(res.data.emailConfigured);
      setNotificationsEnabled(res.data.emailNotificationsEnabled ?? notificationsEnabled);
      setEmailReminderIntervals(res.data.emailReminderIntervals || emailReminderIntervals);
      setTimezone(res.data.timezone || timezone);
    } catch (err) {
      console.error('Fetch email status error:', err);
    } finally {
      setLoadingEmailStatus(false);
    }
  };

  const fetchGoogleCalendarStatus = async () => {
    setLoadingGoogleStatus(true);
    try {
      const res = await api.get('/google-calendar/status');
      setGoogleCalendarStatus(res.data || { connected: false });
      if (res.data?.connected) {
        setSelectedGoogleCalendar(res.data.selectedCalendarId || '');
        // Fetch available calendars
        try {
          const calRes = await api.get('/google-calendar/calendars');
          setGoogleCalendars(calRes.data.calendars || []);
        } catch (calErr) {
          console.error('Fetch Google calendars error:', calErr);
        }
      }
    } catch (err) {
      console.error('Fetch Google calendar status error:', err);
    } finally {
      setLoadingGoogleStatus(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await api.get('/google-calendar/auth-url');
      // Redirect to Google OAuth authorization
      window.location.href = res.data.authUrl;
    } catch (err: any) {
      console.error('Connect Google Calendar error:', err);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!window.confirm('Disconnect Google Calendar? Your LifeAdmin records will be preserved, but sync will stop.')) return;
    try {
      await api.post('/google-calendar/disconnect');
      setGoogleCalendarStatus({ connected: false });
      setGoogleCalendars([]);
      setSelectedGoogleCalendar('');
      triggerSuccessBanner();
    } catch (err: any) {
      console.error('Disconnect Google Calendar error:', err);
    }
  };

  const handleSelectGoogleCalendar = async (calendarId: string) => {
    try {
      const cal = googleCalendars.find((c) => c.id === calendarId);
      await api.post('/google-calendar/select-calendar', {
        calendarId,
        calendarName: cal?.name,
        calendarTimezone: cal?.timezone || undefined,
      });
      setSelectedGoogleCalendar(calendarId);
      setGoogleCalendarStatus((prev) => prev ? { ...prev, selectedCalendarId: calendarId, selectedCalendarName: cal?.name } : prev);
      triggerSuccessBanner();
    } catch (err: any) {
      console.error('Select Google calendar error:', err);
    }
  };

  const handleSyncNow = async () => {
    setGoogleSyncLoading(true);
    setGoogleSyncError(null);
    setGoogleSyncSuccess(false);
    try {
      await api.post('/google-calendar/sync');
      await fetchGoogleCalendarStatus();
      setGoogleSyncSuccess(true);
      setTimeout(() => setGoogleSyncSuccess(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Sync failed. Please try again.';
      setGoogleSyncError(msg);
      console.error('Manual sync error:', err);
    } finally {
      setGoogleSyncLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/users/profile', { name });
      updateUser({ name: res.data.user.name });
      triggerSuccessBanner();
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (overrides?: any) => {
    try {
      const payload = {
        theme,
        notificationsEnabled,
        defaultReminderTiming,
        emailReminderIntervals,
        timezone,
        aiPreferences: {
          autoExtract,
          suggestionsEnabled,
        },
        categories,
        preferredCurrency,
        ...overrides,
      };

      const res = await api.put('/users/settings', payload);
      updateUser(res.data.user);
      triggerSuccessBanner();
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  const triggerSuccessBanner = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddCategory = () => {
    if (!newCatInput.trim() || categories.includes(newCatInput.trim())) return;
    const updated = [...categories, newCatInput.trim()];
    setCategories(updated);
    setNewCatInput('');
    handleSaveSettings({ categories: updated });
  };

  const handleRemoveCategory = (cat: string) => {
    if (categories.length <= 1) return;
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    handleSaveSettings({ categories: updated });
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      'Are you absolutely sure you want to delete your LifeAdmin account? This permanently removes all your tasks, bills, appointments, documents, and reminders.'
    );
    if (!confirmation) return;

    try {
      await api.delete('/users/account');
      logout();
    } catch (err) {
      console.error('Delete account error:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl pb-16">
      {/* Editorial Header */}
      <div className="pb-3 border-b border-surface-100 dark:border-[#304247] flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">
            Customize your workspace appearance, categories, and account privacy
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 animate-scale-in">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
      </div>

      {/* Profile Section */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Personal Information
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">Your public profile name and account email</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-800 dark:text-surface-100 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-800 dark:text-surface-100 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className={`px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs`}
            >
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Appearance & Themes */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Appearance & Theme
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">Choose between light, dark, or system matching</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light Theme', icon: Sun },
            { id: 'dark', label: 'Dark Theme', icon: Moon },
            { id: 'system', label: 'System Match', icon: Laptop },
          ].map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setThemeState(t.id as any);
                  setThemeContext(t.id as any);
                  handleSaveSettings({ theme: t.id });
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-surface-800 text-primary-800 dark:text-primary-100 ring-2 ring-primary-500/30 shadow-xs'
                    : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200'
                }`}
              >
                <t.icon size={18} />
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Email Notification Preferences */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Notification Preferences
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">
              Choose how and when LifeAdmin notifies you by email.
            </p>
          </div>
        </div>

        {/* Email delivery status */}
        {loadingEmailStatus && (
          <div className="p-3.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-300 text-xs animate-pulse">
            Loading email settings...
          </div>
        )}
        {!emailConfigured && !loadingEmailStatus && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <p className="font-semibold mb-1">Email service not configured</p>
            <p className="text-rose-700">
              SMTP credentials are not set on the server. Email notifications will not be delivered until an administrator configures SMTP_HOST, SMTP_USER, and SMTP_PASS.
            </p>
          </div>
        )}

        {/* Global toggle */}
        <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <input
              id="email-notifications-enabled"
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="rounded text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="email-notifications-enabled" className="text-xs font-semibold text-surface-800 dark:text-surface-200">
              Enable email notifications
            </label>
          </div>
          <div className="text-[10px] text-surface-500 dark:text-surface-400">
            When enabled, you&apos;ll receive email reminders for deadlines, bills, appointments, and tasks.
          </div>
        </div>

        {/* Per-category toggles */}
        <div className="space-y-2">
              {[
            { id: 'tasks', label: 'Tasks & deadlines', icon: <Target size={14} /> },
            { id: 'bills', label: 'Bill payments', icon: <Bell size={14} className="text-amber-600" /> },
            { id: 'appointments', label: 'Appointments', icon: <Monitor size={14} /> },
            { id: 'reminders', label: 'Personal reminders', icon: <Bell size={14} className="text-primary-600" /> },
          ].map((n) => {
            const nt = user?.notificationTypes as Record<string, boolean> | undefined;
            const isEnabled = nt?.[n.id] ?? true;
            return (
              <label
                key={n.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors border-transparent hover:bg-surface-50 dark:hover:bg-surface-800/40`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => {
                    const types = { ...(user?.notificationTypes || {}) } as Record<string, boolean>;
                    types[n.id] = e.target.checked;
                    handleSaveSettings({ notificationTypes: types });
                  }}
                  className="rounded text-primary-500 focus:ring-primary-500 shrink-0"
                />
                <div className="flex items-center gap-2">
                  {n.icon}
                  <span className="text-xs font-medium text-surface-900 dark:text-surface-100">{n.label}</span>
                </div>
              </label>
            );
          })}
        </div>

        {/* Reminder intervals */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Reminder intervals</p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400">
                How far in advance to send email reminders for each event.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INTERVAL_OPTIONS.map((opt) => {
              const active = emailReminderIntervals.includes(opt.minutes);
              return (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setEmailReminderIntervals(emailReminderIntervals.filter((m) => m !== opt.minutes));
                    } else {
                      setEmailReminderIntervals([...emailReminderIntervals, opt.minutes]);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                    active
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {emailReminderIntervals.length === 0 && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 text-center">
              Select at least one interval.
            </p>
          )}
        </div>

        {/* Timezone */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200 mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-surface-500 dark:text-surface-400">
            Reminder times are converted to your local timezone for scheduling.
          </p>
        </div>

        {/* Quiet hours info */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 dark:text-surface-300">
                <Moon size={14} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Quiet hours</p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400">
                Emails scheduled during your quiet hours (set in {user?.quietHoursStart || '–'} to {user?.quietHoursEnd || '–'}) will be held until the quiet period ends.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={emailReminderIntervals.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              emailReminderIntervals.length === 0
                ? 'border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
            }`}
          >
            Save Notification Preferences
          </button>
        </div>
      </section>

      {/* Google Calendar Integration */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Google Calendar Integration
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">
              Sync LifeAdmin events, tasks, appointments, and bills with Google Calendar.
            </p>
          </div>
        </div>

        {/* Not connected state */}
        {!googleCalendarStatus?.connected && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <Calendar size={14} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Not connected</p>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400">
                    Connect your Google account to sync events, tasks, appointments, and bills between LifeAdmin and Google Calendar.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConnectGoogleCalendar}
              disabled={loadingGoogleStatus}
              className="w-full px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {loadingGoogleStatus ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Connecting...
                </span>
              ) : (
                <>
                  <Calendar size={16} />
                  <span>Connect Google Calendar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Connected state */}
        {googleCalendarStatus?.connected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Connected to Google Calendar</p>
                <p className="text-[10px] text-surface-500 dark:text-surface-400">
                  {googleCalendarStatus.googleName || googleCalendarStatus.googleEmail}
                </p>
              </div>
            </div>

            {/* Calendar selection */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
              <div className="mb-3">
                <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200 mb-1.5">
                  Sync with Google Calendar
                </label>
              </div>
              {googleCalendars.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {googleCalendars.map((cal) => (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => handleSelectGoogleCalendar(cal.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedGoogleCalendar === cal.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full flex-shrink-0 {cal.primary ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'}"/>
                      <span className="text-xs font-medium text-surface-900 dark:text-surface-100 truncate">
                        {cal.name} {cal.primary && <span className="text-[10px] text-primary-600 dark:text-primary-400 ml-1">(primary)</span>}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-surface-500 dark:text-surface-400 text-center py-4">
                  No calendars found.
                </p>
              )}
            </div>

            {/* Sync status */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Sync status</p>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400">
                    {googleCalendarStatus.lastSyncStatus ? `Last sync: ${googleCalendarStatus.lastSyncStatus}` : 'Never synced'}
                    {googleCalendarStatus.lastSyncAt && (
                      <span className="ml-2 text-[10px] text-surface-400">• {new Date(googleCalendarStatus.lastSyncAt).toLocaleString()}</span>
                    )}
                  </p>
                </div>
                {googleCalendarStatus.lastSyncError && (
                  <div className="flex items-center gap-1 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px]">
                    <AlertTriangle size={12} />
                    <span>{googleCalendarStatus.lastSyncError}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={googleSyncLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    googleSyncLoading
                      ? 'border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                  }`}
                >
                  {googleSyncLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  <span>Sync Now</span>
                </button>
              </div>
              {googleSyncSuccess && (
                <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Synced successfully
                </p>
              )}
              {googleSyncError && (
                <div className="mt-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle size={12} />
                  <div className="flex-1">
                    {googleSyncError}
                    <button
                      type="button"
                      onClick={() => setGoogleSyncError(null)}
                      className="ml-2 underline underline-offset-4 hover:text-rose-900/80"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Disconnect */}
            <button
              type="button"
              onClick={handleDisconnectGoogleCalendar}
              className="w-full px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-700/50 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut size={14} /> Disconnect Google Calendar
            </button>
          </div>
        )}
      </section>

      {/* Categories Management */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Workspace Categories
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">Organize tasks, bills, and documents into custom domains</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-xs font-medium text-surface-800 dark:text-surface-100 border border-surface-200 dark:border-surface-700"
            >
              <span>{cat}</span>
              <button
                type="button"
                onClick={() => handleRemoveCategory(cat)}
                className="text-surface-400 hover:text-rose-500 transition-colors p-0.5"
                title="Remove category"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm pt-2">
          <input
            type="text"
            value={newCatInput}
            onChange={(e) => setNewCatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            placeholder="Add new category (e.g. Health)"
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </section>

      {/* Currency & Exchange Rates */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Preferred Currency
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">
              Choose your display currency. Amounts are converted using live exchange rates.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
              type="text"
              value={currencySearch}
              onChange={(e) => setCurrencySearch(e.target.value)}
              placeholder="Search currencies..."
              className="w-full pl-9 py-2.5 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setCurrencyDropdownOpen((v) => !v)}
            className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            {getCurrencyInfo(preferredCurrency).symbol} {preferredCurrency}
            <span className="ml-2 text-[10px]">{currencyDropdownOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {currencyDropdownOpen && (
          <div className="max-w-md border border-surface-200 dark:border-surface-700 rounded-2xl bg-white dark:bg-surface-0 shadow-elevated z-20 mt-2">
            <div className="px-4 py-2 border-b border-surface-100 dark:border-surface-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Select your preferred display currency
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {Object.values(CURRENCIES)
                .filter((c) => c.name.toLowerCase().includes(currencySearch.toLowerCase()) || c.code.toLowerCase().includes(currencySearch.toLowerCase()))
                .map((c) => {
                  const isSelected = c.code === preferredCurrency;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setPreferredCurrency(c.code as CurrencyCode);
                        handleSaveSettings({ preferredCurrency: c.code });
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                          : 'text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.symbol}</span>
                        <span>{c.code}</span>
                      </span>
                      <span className="ml-auto text-surface-500 dark:text-surface-400">{c.name}</span>
                      {isSelected && <span className="text-primary-600 dark:text-primary-400">Selected</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">
          Original amounts stored in your bills are never modified. Displayed amounts are converted for your convenience.
        </p>
      </section>

      {/* Terms & Conditions */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Terms &amp; Conditions
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">
              Review the terms and policies that govern your use of LifeAdmin.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            to="/terms"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-surface-400" />
              <span className="text-xs font-medium">Terms of Service</span>
            </div>
            <ArrowRight size={14} className="text-surface-400 shrink-0" />
          </Link>
          <Link
            to="/privacy"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-surface-400" />
              <span className="text-xs font-medium">Privacy Policy</span>
            </div>
            <ArrowRight size={14} className="text-surface-400 shrink-0" />
          </Link>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Danger Zone
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">
              Permanent actions that cannot be undone.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors"
        >
          <Trash2 size={14} /> Delete Account
        </button>
      </section>
    </div>
  );
}


