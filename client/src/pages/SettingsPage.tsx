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
  Heart,
  Shield,
  X,
  Plus,
  Search,
  IndianRupee,
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

  // Categories
  const [categories, setCategories] = useState<string[]>(
    user?.categories || ['Personal', 'Work/Study', 'Health', 'Utilities', 'Housing', 'Financial']
  );
  const [newCatInput, setNewCatInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setThemeState(user.theme || 'system');
      setNotificationsEnabled(user.notificationsEnabled ?? true);
      setAutoExtract(user.aiPreferences?.autoExtract ?? true);
      setSuggestionsEnabled(user.aiPreferences?.suggestionsEnabled ?? true);
      if (user.categories) setCategories(user.categories);
      if (user.preferredCurrency) setPreferredCurrency(user.preferredCurrency as CurrencyCode);
    }
  }, [user]);

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
    }
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

      {/* 100% Free Product Promise */}
      <section className="bg-gradient-to-br from-primary-50/40 via-white to-teal-50/40 dark:from-surface-0 dark:via-surface-0 dark:to-surface-800/40 rounded-3xl p-6 sm:p-7 border border-primary-200/60 dark:border-surface-700 shadow-card space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Heart size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              LifeAdmin Universal Access Promise
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">100% Free Software · No Paywalls · Unlimited Productivity</p>
          </div>
        </div>
        <p className="text-xs text-surface-700 dark:text-surface-200 leading-relaxed">
          LifeAdmin is designed as a completely free personal life management system for everyone. All modules — including tasks, calendar aggregation, document vault, bills tracking, LifeBuddy companions, and AI assistance — are unlocked without subscription fees.
        </p>
      </section>

      {/* Data Portability & Account Controls */}
      <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-7 border border-surface-200 dark:border-surface-700 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-[#304247]">
          <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">
              Data Portability & Privacy
            </h2>
            <p className="text-[11px] text-surface-600 dark:text-surface-300">Download your personal data or close your account</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold text-surface-800 dark:text-surface-100 transition-colors"
          >
            <Download size={14} /> Export Backup (.json)
          </button>

          <button
            onClick={handleDeleteAccount}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors"
          >
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}


