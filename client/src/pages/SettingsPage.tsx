import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  User,
  Settings,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  Moon,
  Sun,
  Laptop,
  CreditCard,
  Loader2,
  Shield,
  X,
} from 'lucide-react';

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
  const [subscriptionTier, setSubscriptionTier] = useState(user?.subscriptionTier || 'free');

  // Categories
  const [categories, setCategories] = useState<string[]>(
    user?.categories || ['Personal', 'Work/Study', 'Health', 'Utilities', 'Housing', 'Financial']
  );
  const [newCatInput, setNewCatInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setThemeState(user.theme || 'system');
      setNotificationsEnabled(user.notificationsEnabled ?? true);
      setAutoExtract(user.aiPreferences?.autoExtract ?? true);
      setSuggestionsEnabled(user.aiPreferences?.suggestionsEnabled ?? true);
      setSubscriptionTier(user.subscriptionTier || 'free');
      if (user.categories) setCategories(user.categories);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/users/profile', { name });
      updateUser({ name: res.data.user.name });
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (overrides?: any) => {
    setSavingSettings(true);
    try {
      const payload = {
        theme,
        notificationsEnabled,
        aiPreferences: {
          autoExtract,
          suggestionsEnabled,
        },
        categories,
        subscriptionTier,
        ...overrides,
      };

      const res = await api.put('/users/settings', payload);
      updateUser(res.data.user);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Update settings error:', err);
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCatInput.trim() || categories.includes(newCatInput.trim())) return;
    setCategories([...categories, newCatInput.trim()]);
    setNewCatInput('');
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lifeadmin-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export your data.');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt('Type "DELETE" to permanently erase your account and all associated life records:');
    if (confirmation !== 'DELETE') return;

    try {
      await api.delete('/users/account');
      logout();
    } catch (err) {
      console.error('Delete account error:', err);
      alert('Failed to delete account.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Settings & Account</h1>
        <p className="text-surface-500 text-sm mt-1">
          Manage your personal profile, notification defaults, AI automation, and subscription plan.
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-4">
          <User size={18} className="text-primary-500" />
          Profile Information
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-sm text-surface-500 cursor-not-allowed"
            />
            <span className="text-[11px] text-surface-400 mt-1 block">
              Contact support to update your verified email address.
            </span>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center gap-2"
          >
            {savingProfile && <Loader2 size={14} className="animate-spin" />}
            <span>Save Profile</span>
          </button>
        </form>
      </section>

      {/* Preferences Section */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings size={18} className="text-primary-500" />
            System Preferences
          </span>
          {savingSettings && <Loader2 size={16} className="animate-spin text-primary-500" />}
        </h2>

        {/* Theme Picker */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
            Appearance & Theme
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Laptop },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setThemeContext(t.id as any);
                  setThemeState(t.id as any);
                  handleSaveSettings({ theme: t.id });
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                  theme === t.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                }`}
              >
                <t.icon size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications & AI Switches */}
        <div className="space-y-4 pt-4 border-t border-surface-100 dark:border-surface-800 max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                Push Notifications
              </p>
              <p className="text-[11px] text-surface-500">
                Receive proactive reminders before bills and deadlines are due.
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => {
                setNotificationsEnabled(e.target.checked);
                handleSaveSettings({ notificationsEnabled: e.target.checked });
              }}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                AI Auto-Extraction for Documents
              </p>
              <p className="text-[11px] text-surface-500">
                Automatically scan uploaded bills and contracts for deadlines and providers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoExtract}
              onChange={(e) => {
                setAutoExtract(e.target.checked);
                handleSaveSettings({ aiPreferences: { autoExtract: e.target.checked, suggestionsEnabled } });
              }}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                AI Copilot Smart Suggestions
              </p>
              <p className="text-[11px] text-surface-500">
                Display recommended action buttons when chatting with the LifeAdmin copilot.
              </p>
            </div>
            <input
              type="checkbox"
              checked={suggestionsEnabled}
              onChange={(e) => {
                setSuggestionsEnabled(e.target.checked);
                handleSaveSettings({ aiPreferences: { autoExtract, suggestionsEnabled: e.target.checked } });
              }}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Custom Categories Manager */}
        <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
            Workspace Categories
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-xs font-medium text-surface-700 dark:text-surface-300"
              >
                {cat}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-surface-400 hover:text-danger-500"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="New category..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs text-surface-900 dark:text-surface-100"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Subscription Plans (Phase 6.1) */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-2">
          <CreditCard size={18} className="text-primary-500" />
          Subscription & Membership Tier
        </h2>
        <p className="text-xs text-surface-500 mb-5">
          Upgrade your workspace to unlock unlimited document extraction, priority AI reasoning, and calendar sync.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Tier */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              subscriptionTier === 'free'
                ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 ring-2 ring-primary-500'
                : 'border-surface-200 dark:border-surface-800'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-surface-900 dark:text-surface-100">Free</span>
              {subscriptionTier === 'free' && (
                <span className="text-[10px] font-bold uppercase bg-primary-500 text-white px-2 py-0.5 rounded">
                  Current
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mb-3">$0</p>
            <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-2 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Up to 50 active tasks
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Unlimited manual bills
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Basic reminders
              </li>
            </ul>
            {subscriptionTier !== 'free' && (
              <button
                onClick={() => {
                  setSubscriptionTier('free');
                  handleSaveSettings({ subscriptionTier: 'free' });
                }}
                className="w-full py-1.5 rounded-xl border border-surface-200 text-xs font-semibold hover:bg-surface-50"
              >
                Downgrade to Free
              </button>
            )}
          </div>

          {/* Premium Tier */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              subscriptionTier === 'premium'
                ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/20 ring-2 ring-primary-500'
                : 'border-surface-200 dark:border-surface-800'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-surface-900 dark:text-surface-100">Premium</span>
              {subscriptionTier === 'premium' && (
                <span className="text-[10px] font-bold uppercase bg-primary-500 text-white px-2 py-0.5 rounded">
                  Current
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mb-3">
              $4.99 <span className="text-xs font-normal text-surface-400">/ mo</span>
            </p>
            <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-2 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Unlimited tasks & bills
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Document storage vault (5GB)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Flexible recurrence engine
              </li>
            </ul>
            {subscriptionTier !== 'premium' && (
              <button
                onClick={() => {
                  setSubscriptionTier('premium');
                  handleSaveSettings({ subscriptionTier: 'premium' });
                }}
                className="w-full py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
              >
                Switch to Premium
              </button>
            )}
          </div>

          {/* Premium AI Tier */}
          <div
            className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
              subscriptionTier === 'premium_ai'
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20 ring-2 ring-indigo-500'
                : 'border-surface-200 dark:border-surface-800'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-surface-900 dark:text-surface-100 flex items-center gap-1">
                <Sparkles size={14} className="text-indigo-500" />
                Premium AI
              </span>
              {subscriptionTier === 'premium_ai' && (
                <span className="text-[10px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded">
                  Current
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mb-3">
              $9.99 <span className="text-xs font-normal text-surface-400">/ mo</span>
            </p>
            <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-2 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Everything in Premium
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Unlimited AI OCR & Extraction
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-success-500" /> Conversational Life Copilot
              </li>
            </ul>
            {subscriptionTier !== 'premium_ai' && (
              <button
                onClick={() => {
                  setSubscriptionTier('premium_ai');
                  handleSaveSettings({ subscriptionTier: 'premium_ai' });
                }}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                Upgrade to Premium AI
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data Management & Danger Zone */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Shield size={18} className="text-primary-500" />
          Data Portability & Security
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
          <div>
            <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
              Export All Personal Records
            </p>
            <p className="text-[11px] text-surface-500">
              Download a complete JSON archive of your tasks, bills, appointments, documents, and reminders.
            </p>
          </div>
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 transition-colors whitespace-nowrap"
          >
            <Download size={14} />
            <span>Export JSON Archive</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-danger-400/30 bg-danger-400/5">
          <div>
            <p className="text-xs font-semibold text-danger-600 dark:text-danger-400">
              Delete Account & Permanent Purge
            </p>
            <p className="text-[11px] text-surface-500">
              Permanently delete your profile and all life admin responsibilities from our database.
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Trash2 size={14} />
            <span>Delete Account</span>
          </button>
        </div>
      </section>
    </div>
  );
}
