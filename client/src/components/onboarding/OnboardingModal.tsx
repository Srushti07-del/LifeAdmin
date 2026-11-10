import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { COMPANIONS, saveCompanionStorage } from '../../lib/companions';
import CompanionAvatar from '../companions/CompanionAvatar';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Clock,
  Layout,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2: Preferences
  const [reminderTiming, setReminderTiming] = useState<number[]>([7, 3, 1, 0]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Step 3: Categories
  const allCategoryOptions = [
    'Personal',
    'Work & Career',
    'Education & Study',
    'Finance & Bills',
    'Health & Wellness',
    'Home & Rent',
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Personal',
    'Finance & Bills',
    'Work & Career',
  ]);

  // Step 4: Companion
  const [selectedCompanionId, setSelectedCompanionId] = useState('aura');
  const [companionName, setCompanionName] = useState('Aura');

  // Step 5: Dashboard Preset
  const [dashboardPreset, setDashboardPreset] = useState<'standard' | 'focus' | 'finance'>('standard');

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Persist settings to backend
      await api.put('/users/settings', {
        categories: selectedCategories,
        notificationsEnabled,
        defaultReminderTiming: reminderTiming,
      });

      // 2. Persist chosen companion
      saveCompanionStorage({
        activeId: selectedCompanionId,
        customName: companionName.trim() || 'Aura',
        xp: 150,
        level: 1,
        growthStage: 'Sprout',
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
      });

      // 3. Persist chosen dashboard preset
      localStorage.setItem('lifeadmin_dashboard_preset', dashboardPreset);
      localStorage.setItem('lifeadmin_onboarding_completed', 'true');

      if (user) {
        updateUser({
          categories: selectedCategories,
          notificationsEnabled,
          defaultReminderTiming: reminderTiming,
        });
      }
    } catch (err) {
      console.warn('Could not save onboarding remotely, saved locally:', err);
      localStorage.setItem('lifeadmin_onboarding_completed', 'true');
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-surface-0 rounded-3xl border border-surface-200 dark:border-surface-700 p-6 sm:p-8 shadow-modal z-10 animate-scale-in flex flex-col min-h-0 max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] my-2 sm:my-6">
        {/* Progress Dots (fixed at top, not scrollable) */}
        <div className="flex items-center justify-between pb-6 border-b border-surface-100 dark:border-surface-800 mb-6 shrink-0">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-7 bg-primary-500'
                    : i < step
                      ? 'w-3 bg-primary-200 dark:bg-primary-800'
                      : 'w-3 bg-surface-200 dark:bg-surface-800'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onComplete}
            className="text-xs font-medium text-surface-400 dark:text-surface-300 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
          >
            Skip setup
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-xs">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Welcome to LifeAdmin
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-200 mt-2 max-w-md mx-auto leading-relaxed">
                  Your life, organised. Your mind, uncluttered. Let&apos;s take one minute to tailor your workspace so you immediately know what needs attention next.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-all shadow-sm"
                >
                  Let&apos;s begin <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Preferences */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Notification & Reminder Pace
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  Choose how early you want LifeAdmin to alert you before deadlines and bill due dates.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Alert Cadence</p>
                      <p className="text-[11px] text-surface-400 dark:text-surface-300">7 days, 3 days, 1 day & on the due date</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderTiming.length > 0}
                    onChange={(e) => setReminderTiming(e.target.checked ? [7, 3, 1, 0] : [1, 0])}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">Quiet Hours</p>
                      <p className="text-[11px] text-surface-400 dark:text-surface-300">Respect your calm hours from 10:00 PM to 7:00 AM</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="rounded text-primary-500 focus:ring-primary-500"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Categories */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Select Your Key Domains
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  Choose the life categories that represent your daily responsibilities.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {allCategoryOptions.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs font-medium transition-all ${
                        active
                          ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 text-primary-800 dark:text-primary-200 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={14} className={active ? 'text-primary-500' : 'text-surface-400 dark:text-surface-300'} />
                        <span>{cat}</span>
                      </div>
                      {active && <Check size={14} className="text-primary-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Choose LifeBuddy Companion */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Choose Your LifeBuddy Companion
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  A gentle, quiet partner that grows with your productivity. No guilt, no stress.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {COMPANIONS.map((comp) => {
                  const isSelected = selectedCompanionId === comp.id;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setSelectedCompanionId(comp.id);
                        setCompanionName(comp.defaultName);
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/40 ring-2 ring-primary-500/20 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                      }`}
                    >
                      <CompanionAvatar id={comp.id} size="md" className="mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-surface-900 dark:text-surface-100 font-editorial">
                        {comp.name}
                      </h4>
                      <p className="text-[10px] text-surface-500 dark:text-surface-300 truncate">{comp.title}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Companion Name
                </label>
                <input
                  type="text"
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                  placeholder="Give your companion a name"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Dashboard Layout Preset */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  Choose Dashboard Layout
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
                  You can easily customize and reorder widgets at any time.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'standard',
                    title: 'Balanced Overview (Recommended)',
                    desc: 'Even balance of Needs Attention, Tasks, Upcoming Schedule, and Bills.',
                  },
                  {
                    id: 'focus',
                    title: 'Focus & Deadlines',
                    desc: 'Expands high-urgency deadlines, daily tasks, and calendar events.',
                  },
                  {
                    id: 'finance',
                    title: 'Financial Calm',
                    desc: 'Puts upcoming bills, recurring subscriptions, and expenses front and center.',
                  },
                ].map((preset) => {
                  const isSelected = dashboardPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setDashboardPreset(preset.id as any)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Layout size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{preset.title}</span>
                          {isSelected && <Check size={15} className="text-primary-500" />}
                        </div>
                        <p className="text-[11px] text-surface-500 dark:text-surface-200 mt-0.5">{preset.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-medium text-surface-500 dark:text-surface-300 hover:text-surface-800 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  Finalize <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Complete Setup */}
          {step === 6 && (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100">
                  You&apos;re All Set!
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-200 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your workspace is ready. {companionName} is delighted to meet you and will accompany your journey towards an uncluttered mind.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs transition-all shadow-sm"
                >
                  {saving ? 'Saving...' : 'Enter LifeAdmin Dashboard'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

