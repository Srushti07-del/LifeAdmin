/**
 * LifeAdmin Mobile — Complete Settings & Profile Screen
 * Functional parity with client/src/pages/SettingsPage.tsx & native Android UX.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CURRENCIES, CurrencyCode } from '@/utils/currency';
import { AVAILABLE_DOMAINS } from '@/features/onboarding/types';
import { onboardingService } from '@/features/onboarding/services/onboardingService';
import { notificationService, reminderService } from '@/features/reminders';
import { ReminderPermissionStatus } from '@/features/reminders/types';
import { authService } from '@/features/auth/services/authService';
import {
  ALERT_TIMING_OPTIONS,
  CurrencyPickerModal,
  DEFAULT_SETTINGS_PREFERENCES,
  DeleteAccountModal,
  PasswordSecurityModal,
  QUIET_HOURS_PRESETS,
  SettingsPreferences,
  SettingsSectionCard,
  THEME_OPTIONS,
  ThemeMode,
  canRemoveCategory,
  countExportRecords,
  getAccountModeInfo,
  mergeSettingsPreferences,
  settingsService,
  validateCategoryName,
  validateDisplayName,
} from '@/features/settings';

type SaveBannerState = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, themePreference, activeTheme, setThemePreference } = useAppTheme();
  const {
    user,
    isGuest,
    logout,
    exitGuest,
    restartOnboarding,
    refreshUser,
    updateUser,
    deleteAccount,
  } = useAuth();

  // Synchronized settings state
  const [prefs, setPrefs] = useState<SettingsPreferences>(DEFAULT_SETTINGS_PREFERENCES);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Loading & status flags
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isSyncingNotifications, setIsSyncingNotifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [banner, setBanner] = useState<SaveBannerState>(null);

  // Modals
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Native Android permission state
  const [permissions, setPermissions] = useState<ReminderPermissionStatus>({
    notificationsGranted: true,
    exactAlarmGranted: true,
    canAskNotifications: true,
    canAskExactAlarm: true,
  });

  const accountMode = useMemo(() => getAccountModeInfo(user, isGuest), [user, isGuest]);

  const showBanner = useCallback((tone: 'success' | 'error' | 'info', text: string) => {
    setBanner({ tone, text });
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const status = await notificationService.getCombinedPermissionsAsync();
      setPermissions(status);
    } catch {
      // Safe fallback handled in service
    }
  }, []);

  const hydrateSettings = useCallback(
    async (preferFreshUser: boolean = false) => {
      const [localOverrides, onboardingPrefs] = await Promise.all([
        preferFreshUser
          ? Promise.resolve(null)
          : settingsService.loadLocalPreferences(user?.id, isGuest),
        user?.id ? onboardingService.getStoredPreferences(user.id) : Promise.resolve(null),
      ]);

      const merged = mergeSettingsPreferences(user, localOverrides, onboardingPrefs);
      // Keep active UI themePreference as the visible selection when already initialized
      merged.theme = themePreference;
      setPrefs(merged);
      setDisplayName(user?.name || '');
    },
    [user, isGuest, themePreference]
  );

  useEffect(() => {
    hydrateSettings(false);
  }, [hydrateSettings]);

  useEffect(() => {
    refreshPermissions();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshPermissions();
      }
    });
    return () => {
      sub.remove();
    };
  }, [refreshPermissions]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/more');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshUser(), refreshPermissions()]);
      await hydrateSettings(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generic helper to persist partial settings cleanly across local cache + onboarding + backend + AuthContext
  const commitPreferenceUpdate = async (
    updates: Partial<SettingsPreferences>,
    successMessage?: string
  ) => {
    const previous = prefs;
    const optimistic: SettingsPreferences = {
      ...prefs,
      ...updates,
      aiPreferences: {
        ...prefs.aiPreferences,
        ...(updates.aiPreferences || {}),
      },
    };
    setPrefs(optimistic);
    setIsSavingPrefs(true);

    try {
      const { user: remoteUser, syncedRemotely } = await settingsService.savePreferences(
        updates,
        user?.id,
        isGuest
      );

      const authPatch: Record<string, unknown> = {};
      if (updates.theme) authPatch.theme = updates.theme;
      if (typeof updates.notificationsEnabled === 'boolean') {
        authPatch.notificationsEnabled = updates.notificationsEnabled;
      }
      if (updates.defaultReminderTiming) {
        authPatch.defaultReminderTiming = updates.defaultReminderTiming;
      }
      if (updates.categories) authPatch.categories = updates.categories;
      if (updates.preferredCurrency) authPatch.preferredCurrency = updates.preferredCurrency;
      if (updates.aiPreferences) authPatch.aiPreferences = optimistic.aiPreferences;
      if (typeof updates.quietHoursStart === 'string') {
        authPatch.quietHoursStart = updates.quietHoursStart;
      }
      if (typeof updates.quietHoursEnd === 'string') {
        authPatch.quietHoursEnd = updates.quietHoursEnd;
      }

      if (remoteUser) {
        await updateUser(remoteUser);
      } else {
        await updateUser(authPatch as any);
      }

      if (successMessage) {
        showBanner(
          syncedRemotely ? 'success' : 'info',
          syncedRemotely ? successMessage : `${successMessage} (saved locally)`
        );
      }
    } catch (err: any) {
      // ThemeContext preserves local unsynced override; surface honest sync status for non-theme errors too
      if (updates.theme) {
        showBanner('info', 'Theme updated on this device; server sync will retry when online.');
      } else {
        setPrefs(previous);
        showBanner('error', err?.message || 'Could not sync setting changes. Please try again.');
      }
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // --- 1. PROFILE ---
  const normalizedInputName = displayName.trim().replace(/\s+/g, ' ');
  const isNameDirty = normalizedInputName !== (user?.name || '').trim();

  const handleSaveProfile = async () => {
    const check = validateDisplayName(displayName);
    if (!check.valid) {
      setNameError(check.error || 'Invalid display name.');
      return;
    }

    setNameError(null);
    setIsSavingProfile(true);
    try {
      const res = await settingsService.updateProfile({ name: check.normalized });
      setDisplayName(res.user?.name || check.normalized);
      await updateUser({ name: res.user?.name || check.normalized });
      showBanner('success', res.message || 'Profile details updated.');
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- 2. PERSONAL PREFERENCES (DOMAINS, CATEGORIES, CURRENCY, AI) ---
  const handleToggleDomainCategory = async (domainId: string) => {
    setCategoryError(null);
    const exists = prefs.categories.some(
      (c) => c.trim().toLowerCase() === domainId.toLowerCase()
    );

    if (exists) {
      if (!canRemoveCategory(prefs.categories)) {
        setCategoryError('Keep at least one category in your workspace.');
        return;
      }
      const next = prefs.categories.filter(
        (c) => c.trim().toLowerCase() !== domainId.toLowerCase()
      );
      await commitPreferenceUpdate({ categories: next }, `Removed "${domainId}" domain.`);
    } else {
      const next = [...prefs.categories, domainId];
      await commitPreferenceUpdate({ categories: next }, `Added "${domainId}" domain.`);
    }
  };

  const handleAddCustomCategory = async () => {
    const check = validateCategoryName(newCategory, prefs.categories);
    if (!check.valid) {
      setCategoryError(check.error || 'Enter a valid category.');
      return;
    }
    setCategoryError(null);
    const next = [...prefs.categories, check.normalized];
    setNewCategory('');
    await commitPreferenceUpdate({ categories: next }, `Added "${check.normalized}" category.`);
  };

  const handleRemoveCategory = async (categoryName: string) => {
    if (!canRemoveCategory(prefs.categories)) {
      setCategoryError('At least one workspace category is required.');
      return;
    }
    setCategoryError(null);
    const next = prefs.categories.filter((c) => c !== categoryName);
    await commitPreferenceUpdate({ categories: next }, `Removed "${categoryName}" category.`);
  };

  const handleSelectCurrency = async (code: CurrencyCode) => {
    setIsCurrencyPickerOpen(false);
    if (code === prefs.preferredCurrency) return;
    await commitPreferenceUpdate(
      { preferredCurrency: code },
      `Preferred currency switched to ${code} (${CURRENCIES[code].symbol}).`
    );
  };

  // --- 3. APPEARANCE ---
  const handleSelectTheme = async (mode: ThemeMode) => {
    setThemePreference(mode);
    await commitPreferenceUpdate({ theme: mode }, `Appearance set to ${mode} mode.`);
  };

  // --- 4. NOTIFICATIONS & ANDROID PERMISSIONS ---
  const handleToggleMasterNotifications = async (enabled: boolean) => {
    await commitPreferenceUpdate(
      { notificationsEnabled: enabled },
      enabled ? 'Reminder notifications enabled.' : 'Reminder notifications paused.'
    );
    if (!enabled) {
      await notificationService.clearAllUserSchedules(user?.id);
    } else if (user?.id) {
      try {
        const res = await reminderService.fetchReminders({ status: 'active', limit: 100 });
        await notificationService.reconcileUserReminders(res.reminders, user.id);
      } catch {
        // Ignore background schedule refresh error; manual Sync button remains available
      }
    }
  };

  const handleToggleTimingDay = async (days: number) => {
    const exists = prefs.defaultReminderTiming.includes(days);
    const next = exists
      ? prefs.defaultReminderTiming.filter((d) => d !== days)
      : [...prefs.defaultReminderTiming, days].sort((a, b) => b - a);
    await commitPreferenceUpdate(
      { defaultReminderTiming: next },
      'Default advance alert timing updated.'
    );
  };

  const handleSelectQuietHours = async (start: string, end: string, label: string) => {
    await commitPreferenceUpdate(
      { quietHoursStart: start, quietHoursEnd: end },
      `Quiet hours updated (${label}).`
    );
  };

  const handleSyncDeviceNotifications = async () => {
    if (!user?.id) return;
    setIsSyncingNotifications(true);
    try {
      if (!prefs.notificationsEnabled) {
        await notificationService.clearAllUserSchedules(user.id);
        showBanner('info', 'Reminder alerts are paused — device notification queue cleared.');
        return;
      }
      const res = await reminderService.fetchReminders({ status: 'active', limit: 100 });
      const syncResult = await notificationService.reconcileUserReminders(res.reminders, user.id);
      await refreshPermissions();
      showBanner(
        'success',
        `Device schedules synchronized (${syncResult.scheduledCount} active alerts scheduled).`
      );
    } catch (err: any) {
      showBanner('error', err?.message || 'Unable to synchronize reminder alerts.');
    } finally {
      setIsSyncingNotifications(false);
    }
  };

  const handleEnableDisplayNotifications = async () => {
    if (!permissions.canAskNotifications) {
      await Linking.openSettings();
      return;
    }
    const granted = await notificationService.requestPermissionsAsync();
    await refreshPermissions();
    if (!granted) {
      await Linking.openSettings();
    } else {
      showBanner('success', 'Android notification display permission granted.');
    }
  };

  const handleEnableExactAlarms = async () => {
    const granted = await notificationService.requestExactAlarmPermissionAsync();
    await refreshPermissions();
    if (granted) {
      showBanner('success', 'Android exact-alarm permission enabled for timely alerts.');
    }
  };

  // --- 5. PRIVACY, EXPORT & ACCOUNT ---
  const handleExportData = async () => {
    if (!accountMode.canExportData) {
      showBanner('info', 'Data export is only available for registered accounts.');
      return;
    }

    setIsExporting(true);
    try {
      const payload = await settingsService.exportUserData();
      const summary = countExportRecords(payload);
      const formattedJson = JSON.stringify(payload, null, 2);

      const summaryLine = `Tasks: ${summary.tasks} • Bills: ${summary.bills} • Appointments: ${summary.appointments} • Reminders: ${summary.reminders} • Docs: ${summary.documents}`;

      try {
        const result = await Share.share({
          title: 'LifeAdmin Personal Data Export',
          message: formattedJson,
        });
        if (result.action === Share.sharedAction) {
          showBanner('success', `Backup exported (${summary.total} records). ${summaryLine}`);
        } else {
          showBanner('info', `Prepared export of ${summary.total} records (${summaryLine}).`);
        }
      } catch {
        Alert.alert(
          'Export Ready',
          `Prepared ${summary.total} records.\n${summaryLine}\n\nDevice share sheet could not be opened.`
        );
      }
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to export account data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOutOrExitGuest = () => {
    if (accountMode.isGuest) {
      Alert.alert(
        'Exit Guest Demo Session',
        'Your temporary demo records will be erased from the server and this device. Continue?',
        [
          { text: 'Stay in Demo', style: 'cancel' },
          {
            text: 'Exit Demo',
            style: 'destructive',
            onPress: () => exitGuest(),
          },
        ]
      );
      return;
    }

    Alert.alert('Sign Out', 'Sign out of LifeAdmin on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountMode.canDeleteAccount) return;
    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const avatarInitials = useMemo(() => {
    const raw = (user?.name || 'LA').trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const currentCurrency = CURRENCIES[prefs.preferredCurrency] || CURRENCIES.INR;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top App Bar */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to More"
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surfaceSecondary },
              pressed && { opacity: 0.75 },
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.backward', android: 'arrow_back', web: 'arrow_back' } as any}
              size={18}
              tintColor={colors.text}
            />
          </Pressable>

          <View style={styles.headerTextCol}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
              Settings & Profile
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Account, preferences, appearance & device alerts
            </ThemedText>
          </View>

          {isSavingPrefs || isSavingProfile ? (
            <View style={[styles.syncPill, { backgroundColor: colors.primarySoft }]}>
              <ThemedText style={[styles.syncPillText, { color: colors.primary }]}>
                Saving...
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Feedback Banner */}
          {banner ? (
            <View
              style={[
                styles.feedbackBanner,
                {
                  backgroundColor:
                    banner.tone === 'error'
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.16)'
                        : '#FEF2F2'
                      : banner.tone === 'info'
                      ? colors.surfaceSecondary
                      : isDark
                      ? 'rgba(16, 185, 129, 0.16)'
                      : '#ECFDF5',
                  borderColor:
                    banner.tone === 'error'
                      ? Colors.status.danger
                      : banner.tone === 'info'
                      ? colors.border
                      : Colors.status.success,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.feedbackText,
                  {
                    color:
                      banner.tone === 'error'
                        ? Colors.status.danger
                        : banner.tone === 'info'
                        ? colors.text
                        : Colors.status.success,
                  },
                ]}
              >
                {banner.text}
              </ThemedText>
              <Pressable onPress={() => setBanner(null)} hitSlop={8}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' } as any}
                  size={15}
                  tintColor={colors.textMuted}
                />
              </Pressable>
            </View>
          ) : null}

          {/* Guest Demo Account Banner */}
          {accountMode.isGuest ? (
            <View
              style={[
                styles.guestBanner,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
                },
              ]}
            >
              <View style={styles.guestTopRow}>
                <SymbolView
                  name={{ ios: 'clock.badge.exclamationmark', android: 'schedule', web: 'schedule' } as any}
                  size={18}
                  tintColor={Colors.status.warning}
                />
                <ThemedText style={[styles.guestTitle, { color: colors.text }]}>
                  {accountMode.accountTypeLabel}
                </ThemedText>
              </View>
              <ThemedText style={[styles.guestDesc, { color: colors.textSecondary }]}>
                {accountMode.securityNote}
              </ThemedText>
              <Button
                variant="outline"
                size="sm"
                onPress={handleSignOutOrExitGuest}
                style={{ alignSelf: 'flex-start', marginTop: Spacing.two }}
              >
                End Demo & Sign Up Free
              </Button>
            </View>
          ) : null}

          {/* SECTION 1: PROFILE */}
          <SettingsSectionCard
            title="Profile & Account Identity"
            subtitle="Manage your display name and account details"
            icon={{ ios: 'person.crop.circle', android: 'person' }}
          >
            <View style={styles.profileSummaryRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <ThemedText
                  style={[styles.avatarText, { color: isDark ? '#143440' : '#FFFFFF' }]}
                >
                  {avatarInitials}
                </ThemedText>
              </View>
              <View style={styles.profileMetaCol}>
                <ThemedText style={[styles.profileNameText, { color: colors.text }]}>
                  {user?.name || 'LifeAdmin Member'}
                </ThemedText>
                <ThemedText style={[styles.profileEmailText, { color: colors.textSecondary }]}>
                  {accountMode.emailLabel}
                </ThemedText>
                <View style={styles.metaBadgeRow}>
                  <View style={[styles.metaChip, { backgroundColor: colors.primarySoft }]}>
                    <ThemedText style={[styles.metaChipText, { color: colors.primary }]}>
                      {accountMode.isGuest ? 'Guest Demo' : 'Free Forever'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.memberSinceText, { color: colors.textMuted }]}>
                    • {accountMode.memberSinceLabel}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Input
              label="Display Name"
              placeholder="Your name"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (nameError) setNameError(null);
              }}
              error={nameError || undefined}
              maxLength={60}
              helperText={`${displayName.trim().length}/60 characters`}
            />

            <Input
              label="Account Email"
              value={accountMode.emailLabel}
              editable={false}
              helperText={
                accountMode.isGuest
                  ? 'Guest workspaces do not bind an email address.'
                  : 'Used for login notifications and password recovery.'
              }
            />

            <Button
              variant="primary"
              size="md"
              loading={isSavingProfile}
              disabled={!isNameDirty || isSavingProfile}
              onPress={handleSaveProfile}
            >
              Save Profile Changes
            </Button>
          </SettingsSectionCard>

          {/* SECTION 2: PERSONAL & REGIONAL PREFERENCES */}
          <SettingsSectionCard
            title="Personal & Regional Preferences"
            subtitle="Domains, categories, currency, and smart assistant preferences"
            icon={{ ios: 'slider.horizontal.3', android: 'tune' }}
          >
            {/* Preferred Currency Selector */}
            <View style={styles.subsection}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                Preferred Currency
              </ThemedText>
              <Pressable
                onPress={() => setIsCurrencyPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Choose preferred currency"
                style={({ pressed }) => [
                  styles.currencyTrigger,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.currencySymbolBox, { backgroundColor: colors.primary }]}>
                  <ThemedText
                    style={[
                      styles.currencySymbol,
                      { color: isDark ? '#143440' : '#FFFFFF' },
                    ]}
                  >
                    {currentCurrency.symbol}
                  </ThemedText>
                </View>
                <View style={styles.currencyTextCol}>
                  <ThemedText style={[styles.currencyCode, { color: colors.text }]}>
                    {currentCurrency.code} — {currentCurrency.name}
                  </ThemedText>
                  <ThemedText style={[styles.currencyMeta, { color: colors.textSecondary }]}>
                    Locale: {currentCurrency.locale} • Tap to change
                  </ThemedText>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                  size={16}
                  tintColor={colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Onboarding Life Domains */}
            <View style={styles.subsection}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                Focus Domains (Synced with Onboarding)
              </ThemedText>
              <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                Choose the personal life areas highlighted across your workspace.
              </ThemedText>
              <View style={styles.chipWrap}>
                {AVAILABLE_DOMAINS.map((domain) => {
                  const active = prefs.categories.some(
                    (c) => c.trim().toLowerCase() === domain.id.toLowerCase()
                  );
                  return (
                    <Pressable
                      key={domain.id}
                      onPress={() => handleToggleDomainCategory(domain.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.domainChip,
                        {
                          backgroundColor: active ? colors.primarySoft : colors.surfaceSecondary,
                          borderColor: active ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <SymbolView
                        name={{
                          ios: active ? 'checkmark.circle.fill' : 'plus.circle',
                          android: active ? 'check_circle' : domain.icon,
                          web: active ? 'check_circle' : domain.icon,
                        } as any}
                        size={15}
                        tintColor={active ? colors.primary : colors.textMuted}
                      />
                      <ThemedText
                        style={[
                          styles.chipLabel,
                          { color: active ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {domain.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Active Workspace Categories */}
            <View style={styles.subsection}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                Active Workspace Categories ({prefs.categories.length})
              </ThemedText>
              <View style={styles.chipWrap}>
                {prefs.categories.map((cat) => {
                  const canDelete = canRemoveCategory(prefs.categories);
                  return (
                    <View
                      key={cat}
                      style={[
                        styles.tagPill,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <ThemedText style={[styles.tagText, { color: colors.text }]}>
                        {cat}
                      </ThemedText>
                      <Pressable
                        onPress={() => handleRemoveCategory(cat)}
                        hitSlop={6}
                        disabled={!canDelete}
                        accessibilityLabel={`Remove ${cat}`}
                        style={{ opacity: canDelete ? 1 : 0.35 }}
                      >
                        <SymbolView
                          name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                          size={15}
                          tintColor={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.addCategoryRow}>
                <View style={styles.addCategoryInput}>
                  <Input
                    placeholder="Add custom category (e.g. Travel)"
                    value={newCategory}
                    onChangeText={(txt) => {
                      setNewCategory(txt);
                      if (categoryError) setCategoryError(null);
                    }}
                    error={categoryError || undefined}
                    maxLength={32}
                    onSubmitEditing={handleAddCustomCategory}
                  />
                </View>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={handleAddCustomCategory}
                  style={{ marginTop: 2 }}
                >
                  Add
                </Button>
              </View>
            </View>

            {/* AI Preferences */}
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                  Document AI Auto-Extraction
                </ThemedText>
                <ThemedText style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Extract due dates, amounts & providers automatically when uploading files.
                </ThemedText>
              </View>
              <Switch
                value={prefs.aiPreferences.autoExtract}
                onValueChange={(val) =>
                  commitPreferenceUpdate(
                    {
                      aiPreferences: {
                        ...prefs.aiPreferences,
                        autoExtract: val,
                      },
                    },
                    val ? 'Document auto-extraction enabled.' : 'Document auto-extraction disabled.'
                  )
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                  Smart LifeBuddy Suggestions
                </ThemedText>
                <ThemedText style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Show proactive insights and priority guidance on Dashboard & Assistant.
                </ThemedText>
              </View>
              <Switch
                value={prefs.aiPreferences.suggestionsEnabled}
                onValueChange={(val) =>
                  commitPreferenceUpdate(
                    {
                      aiPreferences: {
                        ...prefs.aiPreferences,
                        suggestionsEnabled: val,
                      },
                    },
                    val ? 'Smart suggestions enabled.' : 'Smart suggestions disabled.'
                  )
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Re-run Guided Onboarding */}
            <Pressable
              onPress={restartOnboarding}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderSubtle,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                size={18}
                tintColor={colors.primary}
              />
              <View style={styles.actionRowTextCol}>
                <ThemedText style={[styles.actionRowTitle, { color: colors.text }]}>
                  Revisit Setup & Onboarding
                </ThemedText>
                <ThemedText style={[styles.actionRowDesc, { color: colors.textSecondary }]}>
                  Walk through domain setup, alert pacing & LifeBuddy companion selection again
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>
          </SettingsSectionCard>

          {/* SECTION 3: APPEARANCE */}
          <SettingsSectionCard
            title="Appearance"
            subtitle="Applies immediately across every screen and persists across restarts"
            icon={{ ios: 'paintbrush', android: 'palette' }}
          >
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((option) => {
                const selected = themePreference === option.id;
                const swatchBg =
                  option.id === 'light'
                    ? '#F5F7F5'
                    : option.id === 'dark'
                    ? '#183B4A'
                    : activeTheme === 'dark'
                    ? '#183B4A'
                    : '#F5F7F5';
                const swatchAccent =
                  option.id === 'light'
                    ? '#087E83'
                    : option.id === 'dark'
                    ? '#55BDB5'
                    : activeTheme === 'dark'
                    ? '#55BDB5'
                    : '#087E83';

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectTheme(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: selected ? colors.primarySoft : colors.surfaceSecondary,
                        borderColor: selected ? colors.primary : colors.borderSubtle,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: swatchBg, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.themeSwatchBar, { backgroundColor: swatchAccent }]} />
                    </View>
                    <ThemedText
                      style={[
                        styles.themeLabel,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                    <ThemedText style={[styles.themeDesc, { color: colors.textSecondary }]}>
                      {option.id === 'system'
                        ? `Device (${activeTheme === 'dark' ? 'Dark' : 'Light'})`
                        : option.description}
                    </ThemedText>
                    {selected ? (
                      <View style={styles.themeCheckBadge}>
                        <SymbolView
                          name={{
                            ios: 'checkmark.circle.fill',
                            android: 'check_circle',
                            web: 'check_circle',
                          } as any}
                          size={18}
                          tintColor={colors.primary}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </SettingsSectionCard>

          {/* SECTION 4: NOTIFICATIONS & ANDROID SYSTEM PERMISSIONS */}
          <SettingsSectionCard
            title="Notifications & Android Permissions"
            subtitle="Configure LifeAdmin alert rules separately from Android OS system access"
            icon={{ ios: 'bell.badge', android: 'notifications' }}
          >
            {/* App Notification Preferences */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                  Reminder Notifications
                </ThemedText>
                <ThemedText style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Schedule device alerts for bills, tasks, appointments & reminders.
                </ThemedText>
              </View>
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={handleToggleMasterNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Default Advance Alert Timing */}
            <View style={styles.subsection}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                Default Advance Alert Timing
              </ThemedText>
              <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                Pre-selected notification cadence for upcoming due items.
              </ThemedText>
              <View style={styles.chipWrap}>
                {ALERT_TIMING_OPTIONS.map((opt) => {
                  const selected = prefs.defaultReminderTiming.includes(opt.days);
                  return (
                    <Pressable
                      key={opt.days}
                      onPress={() => handleToggleTimingDay(opt.days)}
                      style={[
                        styles.timingChip,
                        {
                          backgroundColor: selected ? colors.primarySoft : colors.surfaceSecondary,
                          borderColor: selected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipLabel,
                          { color: selected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {opt.shortLabel}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={styles.subsection}>
              <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                Quiet Hours Window
              </ThemedText>
              <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                Stored on your profile to silence non-urgent background digests overnight.
              </ThemedText>
              <View style={styles.chipWrap}>
                {QUIET_HOURS_PRESETS.map((preset) => {
                  const selected =
                    prefs.quietHoursStart === preset.start && prefs.quietHoursEnd === preset.end;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() =>
                        handleSelectQuietHours(preset.start, preset.end, preset.label)
                      }
                      style={[
                        styles.timingChip,
                        {
                          backgroundColor: selected ? colors.primarySoft : colors.surfaceSecondary,
                          borderColor: selected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipLabel,
                          { color: selected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {preset.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Button
              variant="outline"
              size="sm"
              loading={isSyncingNotifications}
              onPress={handleSyncDeviceNotifications}
              icon={
                <SymbolView
                  name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' } as any}
                  size={15}
                  tintColor={colors.primary}
                />
              }
            >
              Sync Device Schedules Now
            </Button>

            {/* Android OS System Permissions */}
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
              Android System Permissions
            </ThemedText>

            {/* 1. Notification Display Access */}
            <View
              style={[
                styles.permissionBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: permissions.notificationsGranted
                    ? colors.borderSubtle
                    : Colors.status.danger,
                },
              ]}
            >
              <View style={styles.permissionTop}>
                <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
                  1. Notification Display Permission
                </ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: permissions.notificationsGranted
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#DCFCE7'
                        : isDark
                        ? 'rgba(239, 68, 68, 0.2)'
                        : '#FEE2E2',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusBadgeText,
                      {
                        color: permissions.notificationsGranted
                          ? Colors.status.success
                          : Colors.status.danger,
                      },
                    ]}
                  >
                    {permissions.notificationsGranted ? 'Granted' : 'Blocked'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                Required by Android to display reminder alerts and due-date banners on your lock
                screen and notification shade.
              </ThemedText>
              {!permissions.notificationsGranted ? (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleEnableDisplayNotifications}
                  style={{ alignSelf: 'flex-start', marginTop: Spacing.two }}
                >
                  {permissions.canAskNotifications
                    ? 'Allow Notifications'
                    : 'Open Notification Settings'}
                </Button>
              ) : null}
            </View>

            {/* 2. Exact Alarm Permission (Android 14+) */}
            <View
              style={[
                styles.permissionBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: permissions.exactAlarmGranted
                    ? colors.borderSubtle
                    : Colors.status.warning,
                },
              ]}
            >
              <View style={styles.permissionTop}>
                <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
                  2. Exact Alarms (Android 14+)
                </ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: permissions.exactAlarmGranted
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#DCFCE7'
                        : isDark
                        ? 'rgba(245, 158, 11, 0.2)'
                        : '#FEF3C7',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusBadgeText,
                      {
                        color: permissions.exactAlarmGranted
                          ? Colors.status.success
                          : Colors.status.warning,
                      },
                    ]}
                  >
                    {permissions.exactAlarmGranted ? 'Exact Timing' : 'Best-Effort'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                {permissions.exactAlarmGranted
                  ? 'Alarms & Reminders access is enabled so scheduled due-time notifications fire on time.'
                  : 'Android restricts exact alarms until approved in System Settings. Without it, alerts still run on a best-effort schedule (possible slight delay during Doze).'}
              </ThemedText>
              {!permissions.exactAlarmGranted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleEnableExactAlarms}
                  style={{ alignSelf: 'flex-start', marginTop: Spacing.two }}
                >
                  Open Alarms & Reminders Settings
                </Button>
              ) : null}
            </View>
          </SettingsSectionCard>

          {/* SECTION 5: UNIVERSAL FREE ACCESS */}
          <SettingsSectionCard
            title="Universal Free Access"
            subtitle="Everything in LifeAdmin is free — zero paywalls or gated features"
            icon={{ ios: 'heart.fill', android: 'favorite' }}
          >
            <ThemedText style={[styles.freePromiseText, { color: colors.textSecondary }]}>
              Your account includes unlimited Bills, Appointments, Reminders, Documents Vault OCR,
              Calendar unification, AI Goal Planning, and LifeBuddy companions at no cost.
            </ThemedText>
          </SettingsSectionCard>

          {/* SECTION 6: PRIVACY, SECURITY & ACCOUNT */}
          <SettingsSectionCard
            title="Privacy, Security & Account"
            subtitle="Credentials, personal backup export, session & account deletion"
            icon={{ ios: 'lock.shield', android: 'shield' }}
          >
            <View
              style={[
                styles.securityInfoBox,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle },
              ]}
            >
              <SymbolView
                name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' } as any}
                size={18}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.securityInfoText, { color: colors.textSecondary }]}>
                {accountMode.securityNote}
              </ThemedText>
            </View>

            {/* Password & Recovery */}
            <Pressable
              disabled={!accountMode.canRequestPasswordReset}
              onPress={() => setIsPasswordModalOpen(true)}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderSubtle,
                  opacity: accountMode.canRequestPasswordReset ? (pressed ? 0.8 : 1) : 0.5,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'key.horizontal', android: 'vpn_key', web: 'vpn_key' } as any}
                size={18}
                tintColor={colors.primary}
              />
              <View style={styles.actionRowTextCol}>
                <ThemedText style={[styles.actionRowTitle, { color: colors.text }]}>
                  Password & Account Recovery
                </ThemedText>
                <ThemedText style={[styles.actionRowDesc, { color: colors.textSecondary }]}>
                  {accountMode.canRequestPasswordReset
                    ? 'Send a 30-minute reset email or apply an existing reset token'
                    : 'Not applicable to ephemeral guest sessions'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>

            {/* Export Personal Data JSON */}
            <Pressable
              disabled={!accountMode.canExportData || isExporting}
              onPress={handleExportData}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderSubtle,
                  opacity: accountMode.canExportData ? (pressed ? 0.8 : 1) : 0.5,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'download', web: 'download' } as any}
                size={18}
                tintColor={colors.primary}
              />
              <View style={styles.actionRowTextCol}>
                <ThemedText style={[styles.actionRowTitle, { color: colors.text }]}>
                  {isExporting ? 'Preparing JSON Backup...' : 'Export Personal Data (JSON)'}
                </ThemedText>
                <ThemedText style={[styles.actionRowDesc, { color: colors.textSecondary }]}>
                  {accountMode.canExportData
                    ? 'Export tasks, bills, appointments, reminders, docs & AI history via device Share'
                    : 'Create a free registered account to export permanent backups'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>

            {/* Sign Out / Exit Guest Demo */}
            <Button
              variant="outline"
              size="md"
              fullWidth
              onPress={handleSignOutOrExitGuest}
            >
              {accountMode.isGuest ? 'Exit Guest Demo Session' : 'Sign Out'}
            </Button>
          </SettingsSectionCard>

          {/* DANGER ZONE (Registered Accounts Only) */}
          {accountMode.canDeleteAccount ? (
            <SettingsSectionCard
              title="Danger Zone"
              subtitle="Permanently delete your account and erase all stored data"
              icon={{ ios: 'trash', android: 'delete_forever' }}
              accentTone="danger"
            >
              <ThemedText style={[styles.freePromiseText, { color: colors.textSecondary }]}>
                Deleting your account cannot be undone. Consider exporting your JSON backup first.
              </ThemedText>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onPress={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
              >
                Delete Account Forever
              </Button>
            </SettingsSectionCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        selectedCurrency={prefs.preferredCurrency}
        onSelect={handleSelectCurrency}
        onClose={() => setIsCurrencyPickerOpen(false)}
        isSaving={isSavingPrefs}
      />

      <PasswordSecurityModal
        isOpen={isPasswordModalOpen}
        email={user?.email || ''}
        isGuest={accountMode.isGuest}
        onRequestResetEmail={(email) => settingsService.requestPasswordResetEmail(email)}
        onApplyResetToken={(token, password, confirmPassword) =>
          authService.resetPassword(token, { password, confirmPassword })
        }
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        isDeleting={isDeletingAccount}
        error={deleteError}
        onConfirmDelete={handleConfirmDeleteAccount}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  syncPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  syncPillText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.nine,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  feedbackText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  guestBanner: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  guestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: 4,
  },
  guestTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  guestDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.lg,
  },
  profileMetaCol: {
    flex: 1,
  },
  profileNameText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
  },
  profileEmailText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metaChipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  memberSinceText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  subsection: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  fieldHelp: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  currencyTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  currencySymbolBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.base,
  },
  currencyTextCol: {
    flex: 1,
  },
  currencyCode: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  currencyMeta: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  domainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  timingChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  chipLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  addCategoryInput: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.one,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  switchDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  actionRowTextCol: {
    flex: 1,
  },
  actionRowTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  actionRowDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 6,
    position: 'relative',
  },
  themeSwatch: {
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 4,
  },
  themeSwatchBar: {
    height: 6,
    width: '55%',
    borderRadius: Radius.full,
  },
  themeLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  themeDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  themeCheckBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  permissionBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  permissionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: 4,
  },
  permissionTitle: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  permissionDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 17,
  },
  freePromiseText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  securityInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  securityInfoText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 17,
  },
});

