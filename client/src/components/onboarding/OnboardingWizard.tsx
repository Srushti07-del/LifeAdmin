import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  User,
  Target,
  Bell,
  Monitor,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const CATEGORY_OPTIONS = [
  { id: 'tasks', label: 'Tasks & Productivity', description: 'Manage your daily to-dos and deadlines' },
  { id: 'studies', label: 'Studies & Academics', description: 'Track courses, assignments, and exams' },
  { id: 'bills', label: 'Bills & Finances', description: 'Stay on top of payments and expenses' },
  { id: 'appointments', label: 'Appointments', description: 'Schedule meetings and appointments' },
  { id: 'reminders', label: 'Reminders & Routines', description: 'Daily habits and recurring tasks' },
  { id: 'documents', label: 'Documents', description: 'Store and organise important files' },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, updateUser, setTheme } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Personal profile
  const [displayName, setDisplayName] = useState(user?.name || '');

  // Step 3: Priorities
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user?.categories || []);

  // Step 4: Preferences
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(user?.theme || 'light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [notificationTypes, setNotificationTypes] = useState({
    tasks: user?.notificationTypes?.tasks ?? true,
    bills: user?.notificationTypes?.bills ?? true,
    appointments: user?.notificationTypes?.appointments ?? true,
    reminders: user?.notificationTypes?.reminders ?? true,
  });

  const saveStep = useCallback(async (nextStep?: number) => {
    setSaving(true);
    setError('');
    try {
      const updates: Record<string, unknown> = {};

      if (step === 2) {
        updates.name = displayName.trim();
      }
      if (step === 3) {
        updates.categories = selectedCategories;
      }
      if (step === 4) {
        updates.theme = theme;
        updates.notificationsEnabled = notificationsEnabled;
        updates.notificationTypes = notificationTypes;
      }

      if (nextStep) {
        updates.onboardingStep = nextStep;
      }

      await api.post('/api/onboarding/progress', { step, data: updates });

      // Optimistically update local user
      updateUser(updates as any);

      if (nextStep) {
        setStep(nextStep);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [step, displayName, selectedCategories, theme, notificationsEnabled, notificationTypes, updateUser]);

  const handleNext = () => {
    if (step === 5) {
      completeOnboarding();
      return;
    }
    saveStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    setError('');
    try {
      // Save final step data
      const updates: Record<string, unknown> = {};
      if (step === 4) {
        updates.theme = theme;
        updates.notificationsEnabled = notificationsEnabled;
        updates.notificationTypes = notificationTypes;
      }

      await api.post('/api/onboarding/progress', { step: 5, data: updates });
      updateUser(updates as any);

      // Mark onboarding as completed
      await api.post('/api/onboarding/complete');
      updateUser({ onboardingCompleted: true, onboardingStep: 5 } as any);

      // Apply chosen theme
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isDark ? 'dark' : 'light');
      } else {
        setTheme(theme);
      }

      onComplete();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return displayName.trim().length > 0;
      case 3:
        return selectedCategories.length > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const progress = (step / 5) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-surface-0 rounded-3xl border border-surface-200 dark:border-surface-700 p-6 sm:p-8 shadow-modal z-10 animate-scale-in min-h-0 max-h-[calc(100dvh-2rem)] flex flex-col my-2 sm:my-6">
        {/* Header */}
        <div className="mb-6 border-b border-surface-100 dark:border-surface-800 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${
                    i === step
                      ? 'w-7 bg-primary-500'
                      : i < step
                        ? 'w-3 bg-primary-200 dark:bg-primary-800'
                        : 'w-3 bg-surface-200 dark:bg-surface-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">
              Step {step} of 5
            </span>
          </div>
          <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-1.5 mb-3">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-xs">
                <Sparkles size={36} />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
                  Welcome to LifeAdmin
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-200 mt-3 max-w-md mx-auto leading-relaxed">
                  Organise your bills, deadlines, appointments, and files in one calm, editorial workspace. LifeAdmin helps you stay on top of everyday life — without the clutter.
                </p>
              </div>
              <div className="pt-6">
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 text-white font-medium text-sm transition-all shadow-sm"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Profile */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Personal Profile
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  What should we call you? This name appears across your dashboard and workspace.
                </p>
              </div>
              <div>
                <label
                  htmlFor="onboarding-name"
                  className="block text-xs font-semibold text-surface-800 dark:text-surface-200 mb-1.5"
                >
                  Display name
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3.5 text-surface-500 pointer-events-none" />
                  <input
                    id="onboarding-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    maxLength={50}
                    placeholder="e.g. Maya Chen"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                {error && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>
                )}
              </div>
              <div className="flex justify-between pt-4">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={saving || !isStepValid()}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Priorities */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Your Priorities
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  Select the areas you want to organise. You can choose multiple.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORY_OPTIONS.map((cat) => {
                  const active = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (active) {
                          setSelectedCategories(selectedCategories.filter((c) => c !== cat.id));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.id]);
                        }
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all ${
                        active
                          ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 text-primary-800 dark:text-primary-200 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 ${
                        active ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-surface-50 dark:bg-surface-800/50'
                      }">
                        {cat.id === 'tasks' && <Target size={16} />}
                        {cat.id === 'studies' && <Monitor size={16} />}
                        {cat.id === 'bills' && <Bell size={16} />}
                        {cat.id === 'appointments' && <CalendarIcon size={16} />}
                        {cat.id === 'reminders' && <Bell size={16} className="text-amber-600" />}
                        {cat.id === 'documents' && <User size={16} />}
                      </div>
                      <span className="text-xs font-semibold text-center leading-none">
                        {cat.label}
                      </span>
                      {active && <Check size={14} className="text-primary-600" />}
                    </button>
                  )
                })}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 text-center">
                  Please select at least one priority area.
                </p>
              )}
              <div className="flex justify-between pt-4">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={saving || !isStepValid()}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Preferences
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  Choose your appearance and notification settings.
                </p>
              </div>

              {/* Theme */}
              <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Theme</p>
                    <p className="text-[10px] text-surface-500 dark:text-surface-400">Light or dark mode for your workspace</p>
                  </div>
                  <div className="flex gap-1">
                    {['light', 'dark', 'system'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setThemeState(t as any)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                          theme === t
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-transparent bg-transparent hover:border-surface-300 dark:hover:border-surface-700'
                        }`}
                      >
                        {t === 'light' && <Sun size={14} className="text-primary-600" />}
                        {t === 'dark' && <Moon size={14} className="text-primary-400" />}
                        {t === 'system' && <Monitor size={14} className="text-surface-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="border border-surface-200 dark:border-surface-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      id="notifications-enabled"
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="rounded text-primary-500 focus:ring-primary-500"
                    />
                    <label htmlFor="notifications-enabled" className="text-xs font-semibold text-surface-800 dark:text-surface-200">
                      Enable notifications
                    </label>
                  </div>
                </div>
                <p className="text-[10px] text-surface-500 dark:text-surface-400 mb-4">
                  We never send spam. Notifications are only for your deadlines and reminders.
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'tasks', label: 'Tasks & deadlines', icon: <Target size={14} /> },
                    { id: 'bills', label: 'Bills & payments', icon: <Bell size={14} className="text-amber-600" /> },
                    { id: 'appointments', label: 'Appointments', icon: <Monitor size={14} /> },
                    { id: 'reminders', label: 'Reminders & routines', icon: <Bell size={14} className="text-primary-600" /> },
                  ].map((n) => (
                    <label
                      key={n.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        notificationTypes[n.id as keyof typeof notificationTypes]
                          ? 'bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700'
                          : 'border-transparent hover:bg-surface-50 dark:hover:bg-surface-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={notificationTypes[n.id as keyof typeof notificationTypes]}
                        onChange={(e) => {
                          setNotificationTypes({
                            ...notificationTypes,
                            [n.id]: e.target.checked,
                          });
                        }}
                        className="rounded text-primary-500 focus:ring-primary-500 shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        {n.icon}
                        <span className="text-xs font-medium text-surface-900 dark:text-surface-100">{n.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {!notificationsEnabled && (
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-2">
                    Notifications are disabled. You can enable them anytime in Settings.
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 dark:hover:text-surface-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={saving || !isStepValid()}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Completion */}
          {step === 5 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
                  You&apos;re All Set, {displayName || 'there'}!
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-200 mt-3 max-w-md mx-auto leading-relaxed">
                  Your workspace is ready. Your preferences have been saved and will sync across your devices. {displayName} is ready to organise their everyday life with LifeAdmin.
                </p>
              </div>
              <div className="pt-6">
                <button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 text-white font-medium text-sm transition-all shadow-sm"
                >
                  Enter LifeAdmin Dashboard <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Calendar icon (lucide Calendar not imported above to keep bundle small)
function CalendarIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
