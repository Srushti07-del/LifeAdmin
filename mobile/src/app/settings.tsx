/**
 * LifeAdmin Mobile — Settings & Profile Screen
 * Complete feature parity with LifeAdmin Web, synchronized via shared backend.
 * Refined layout: zero visual jitter, predictable vertical flow, stable component heights.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button, HeaderBackButton, Input, ModalSheet } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { useSafeBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { CURRENCIES, CurrencyCode } from '@/utils/currency';
import { notificationService, reminderService } from '@/features/reminders';
import { ReminderPermissionStatus } from '@/features/reminders/types';
import {
  CurrencyPickerModal,
  DEFAULT_NOTIFICATION_TYPES,
  DEFAULT_SETTINGS_PREFERENCES,
  INTERVAL_OPTIONS,
  QUIET_HOURS_PRESETS,
  SettingsPreferences,
  SettingsSectionCard,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
  ThemeMode,
  canRemoveCategory,
  format12h,
  getAccountModeInfo,
  mergeSettingsPreferences,
  settingsService,
  validateCategoryName,
  validateDisplayName,
} from '@/features/settings';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, themePreference, activeTheme, setThemePreference } = useAppTheme();
  const { user, refreshUser, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const bottomPadding = useSafeBottomPadding(Spacing.eight, false);

  // Synchronized settings preferences state
  const [prefs, setPrefs] = useState<SettingsPreferences>(DEFAULT_SETTINGS_PREFERENCES);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Notification types multi-select state
  const [notificationTypes, setNotificationTypes] = useState({
    tasks: user?.notificationTypes?.tasks ?? DEFAULT_NOTIFICATION_TYPES.tasks,
    bills: user?.notificationTypes?.bills ?? DEFAULT_NOTIFICATION_TYPES.bills,
    appointments: user?.notificationTypes?.appointments ?? DEFAULT_NOTIFICATION_TYPES.appointments,
    reminders: user?.notificationTypes?.reminders ?? DEFAULT_NOTIFICATION_TYPES.reminders,
  });

  // Selected reminder intervals (in minutes)
  const [reminderIntervals, setReminderIntervals] = useState<number[]>(
    user?.emailReminderIntervals || [1440, 60]
  );

  // Timezone state
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  // Loading & status flags
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isSyncingNotifications, setIsSyncingNotifications] = useState(false);

  // Modals
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  // Native Android permission state
  const [permissions, setPermissions] = useState<ReminderPermissionStatus>({
    notificationsGranted: true,
    exactAlarmGranted: true,
    canAskNotifications: true,
    canAskExactAlarm: true,
  });

  const accountMode = useMemo(() => getAccountModeInfo(user), [user]);

  const refreshPermissions = useCallback(async () => {
    try {
      const status = await notificationService.getCombinedPermissionsAsync();
      setPermissions(status);
    } catch {
      // Safe fallback
    }
  }, []);

  const hydrateSettings = useCallback(
    async (preferFreshUser: boolean = false) => {
      const localOverrides = preferFreshUser
        ? null
        : await settingsService.loadLocalPreferences(user?.id);

      const merged = mergeSettingsPreferences(user, localOverrides);
      merged.theme = themePreference;
      setPrefs(merged);
      setDisplayName(user?.name || '');

      if (merged.notificationTypes) {
        setNotificationTypes(merged.notificationTypes);
      }
      if (merged.emailReminderIntervals) {
        setReminderIntervals(merged.emailReminderIntervals);
      }
      if (merged.timezone) {
        setTimezone(merged.timezone);
      }
    },
    [user, themePreference]
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

  // Helper to commit preference updates to local store + backend + AuthContext
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
      notificationTypes: {
        ...(prefs.notificationTypes || DEFAULT_NOTIFICATION_TYPES),
        ...(updates.notificationTypes || {}),
      },
    };
    setPrefs(optimistic);
    setIsSavingPrefs(true);

    try {
      const { user: remoteUser } = await settingsService.savePreferences(
        updates,
        user?.id
      );

      const authPatch: Record<string, unknown> = {};
      if (updates.theme) authPatch.theme = updates.theme;
      if (typeof updates.notificationsEnabled === 'boolean') {
        authPatch.notificationsEnabled = updates.notificationsEnabled;
      }
      if (updates.categories) authPatch.categories = updates.categories;
      if (updates.preferredCurrency) authPatch.preferredCurrency = updates.preferredCurrency;
      if (updates.aiPreferences) authPatch.aiPreferences = optimistic.aiPreferences;
      if (typeof updates.quietHoursStart === 'string') authPatch.quietHoursStart = updates.quietHoursStart;
      if (typeof updates.quietHoursEnd === 'string') authPatch.quietHoursEnd = updates.quietHoursEnd;
      if (updates.notificationTypes) authPatch.notificationTypes = updates.notificationTypes;
      if (updates.emailReminderIntervals) authPatch.emailReminderIntervals = updates.emailReminderIntervals;
      if (updates.timezone) authPatch.timezone = updates.timezone;

      if (remoteUser) {
        await updateUser(remoteUser);
      } else {
        await updateUser(authPatch as any);
      }

      if (successMessage) {
        showSnackbar({
          variant: 'success',
          title: 'Preferences Updated',
          message: successMessage,
          duration: 3500,
        });
      }
    } catch (err: any) {
      if (!updates.theme) {
        setPrefs(previous);
        showSnackbar({
          variant: 'error',
          title: 'Update Failed',
          message: err?.message || 'Could not sync setting changes.',
        });
      }
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // 1. Personal Information Handlers
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
      showSnackbar({
        variant: 'success',
        title: 'Profile Updated',
        message: 'Your display name has been saved.',
      });
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Profile Update Failed',
        message: err?.message || 'Failed to update profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Appearance Handlers
  const handleSelectTheme = async (mode: ThemeMode) => {
    setThemePreference(mode);
    await commitPreferenceUpdate({ theme: mode }, `Appearance set to ${mode} mode.`);
  };

  // 3. Notification Preferences Handlers
  const handleToggleNotifications = async (val: boolean) => {
    await commitPreferenceUpdate(
      { notificationsEnabled: val },
      val ? 'Alert notifications enabled.' : 'Alert notifications paused.'
    );
    if (!val) {
      await notificationService.clearAllUserSchedules(user?.id);
    } else if (user?.id) {
      try {
        const res = await reminderService.fetchReminders({ status: 'active', limit: 100 });
        await notificationService.reconcileUserReminders(res.reminders, user.id);
      } catch {
        // Safe fallback
      }
    }
  };

  const handleToggleNotificationType = async (key: 'tasks' | 'bills' | 'appointments' | 'reminders') => {
    const next = {
      ...notificationTypes,
      [key]: !notificationTypes[key],
    };
    setNotificationTypes(next);
    await commitPreferenceUpdate({ notificationTypes: next }, 'Notification types updated.');
  };

  const handleToggleInterval = async (minutes: number) => {
    const exists = reminderIntervals.includes(minutes);
    let next: number[];
    if (exists) {
      next = reminderIntervals.filter((m) => m !== minutes);
      if (next.length === 0) next = [1440]; // Keep at least one interval
    } else {
      next = [...reminderIntervals, minutes].sort((a, b) => b - a);
    }
    setReminderIntervals(next);
    await commitPreferenceUpdate({ emailReminderIntervals: next }, 'Reminder interval updated.');
  };

  const handleSelectTimezone = async (tz: string) => {
    setTimezone(tz);
    setIsTimezoneModalOpen(false);
    await commitPreferenceUpdate({ timezone: tz }, `Timezone set to ${tz}.`);
  };

  const handleSelectQuietHours = async (start: string, end: string, label: string) => {
    await commitPreferenceUpdate(
      { quietHoursStart: start, quietHoursEnd: end, quietHoursEnabled: Boolean(start && end) },
      `Quiet hours updated (${label}).`
    );
  };

  const handleSyncDeviceNotifications = async () => {
    if (!user?.id) return;
    setIsSyncingNotifications(true);
    try {
      if (!prefs.notificationsEnabled) {
        await notificationService.clearAllUserSchedules(user.id);
        showSnackbar({
          variant: 'info',
          title: 'Notifications Paused',
          message: 'Notifications are paused — device queue cleared.',
        });
        return;
      }
      const res = await reminderService.fetchReminders({ status: 'active', limit: 100 });
      const syncResult = await notificationService.reconcileUserReminders(res.reminders, user.id);
      await refreshPermissions();
      showSnackbar({
        variant: 'success',
        title: 'Schedules Synchronized',
        message: `${syncResult.scheduledCount} active reminders scheduled on this device.`,
      });
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Sync Failed',
        message: err?.message || 'Unable to synchronize reminder alerts.',
      });
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
      showSnackbar({
        variant: 'success',
        title: 'Permission Granted',
        message: 'Notification display access enabled.',
      });
    }
  };

  const handleEnableExactAlarms = async () => {
    const granted = await notificationService.requestExactAlarmPermissionAsync();
    await refreshPermissions();
    if (granted) {
      showSnackbar({
        variant: 'success',
        title: 'Permission Granted',
        message: 'Exact-alarm permission enabled for timely alerts.',
      });
    }
  };

  // 4. Workspace Categories Handlers
  const handleAddCategory = async () => {
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
      setCategoryError('Keep at least one category in your workspace.');
      return;
    }
    setCategoryError(null);
    const next = prefs.categories.filter((c) => c !== categoryName);
    await commitPreferenceUpdate({ categories: next }, `Removed "${categoryName}" category.`);
  };

  // 5. Preferred Currency Handler
  const handleSelectCurrency = async (code: CurrencyCode) => {
    setIsCurrencyPickerOpen(false);
    if (code === prefs.preferredCurrency) return;
    await commitPreferenceUpdate(
      { preferredCurrency: code },
      `Preferred currency switched to ${code} (${CURRENCIES[code].symbol}).`
    );
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
  const currentTimezoneLabel = TIMEZONE_OPTIONS.find((t) => t.value === timezone)?.label || timezone;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <HeaderBackButton
            onPress={handleBack}
            accessibilityLabel="Back to More"
          />

          <View style={styles.headerTextCol}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
              Settings & Profile
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Preferences, appearance, notifications & workspace
            </ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
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
          {/* 1. PERSONAL INFORMATION */}
          <SettingsSectionCard
            title="Personal Information"
            subtitle="Update your display name and view account email"
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
                      Free Account
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
              helperText="Visible on greetings, notifications, and shared items."
            />

            <Input
              label="Account Email"
              value={accountMode.emailLabel}
              editable={false}
              helperText="Email used for login notifications and password resets."
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

          {/* 2. APPEARANCE & THEME */}
          <SettingsSectionCard
            title="Appearance & Theme"
            subtitle="Applies immediately across all screens and saves to your account"
            icon={{ ios: 'paintbrush', android: 'palette' }}
          >
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((option) => {
                const selected = themePreference === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectTheme(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: selected
                          ? colors.primarySoft
                          : isDark
                          ? colors.surfaceElevated
                          : colors.surfaceSecondary,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
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
                        ? `Auto (${activeTheme === 'dark' ? 'Dark' : 'Light'})`
                        : option.description}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </SettingsSectionCard>

          {/* 3. NOTIFICATION PREFERENCES */}
          <SettingsSectionCard
            title="Notification Preferences"
            subtitle="Alert channels, event categories, intervals & quiet hours"
            icon={{ ios: 'bell.badge', android: 'notifications' }}
          >
            {/* Master Notification Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                  Email & Push Notifications
                </ThemedText>
                <ThemedText style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Receive alerts for upcoming deadlines, bills, appointments & reminders.
                </ThemedText>
              </View>
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {prefs.notificationsEnabled ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                {/* Notification Types */}
                <View style={styles.subsection}>
                  <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                    Notification Types
                  </ThemedText>
                  <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Select which categories trigger alert notifications.
                  </ThemedText>
                  <View style={styles.chipWrap}>
                    {(
                      [
                        { key: 'tasks', label: 'Tasks & Deadlines' },
                        { key: 'bills', label: 'Bill Payments' },
                        { key: 'appointments', label: 'Appointments' },
                        { key: 'reminders', label: 'Reminders' },
                      ] as const
                    ).map((item) => {
                      const active = Boolean(notificationTypes[item.key]);
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => handleToggleNotificationType(item.key)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? colors.primarySoft
                                : isDark
                                ? colors.surfaceElevated
                                : colors.surfaceSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <SymbolView
                            name={{
                              ios: active ? 'checkmark.circle.fill' : 'circle',
                              android: active ? 'check_circle' : 'radio_button_unchecked',
                              web: active ? 'check_circle' : 'radio_button_unchecked',
                            } as any}
                            size={14}
                            tintColor={active ? colors.primary : colors.textMuted}
                          />
                          <ThemedText
                            style={[
                              styles.chipLabel,
                              { color: active ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {item.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Reminder Intervals */}
                <View style={styles.subsection}>
                  <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                    Reminder Timing
                  </ThemedText>
                  <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Choose when advance notifications are delivered before due time.
                  </ThemedText>
                  <View style={styles.chipWrap}>
                    {INTERVAL_OPTIONS.map((opt) => {
                      const active = reminderIntervals.includes(opt.minutes);
                      return (
                        <Pressable
                          key={opt.minutes}
                          onPress={() => handleToggleInterval(opt.minutes)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? colors.primarySoft
                                : isDark
                                ? colors.surfaceElevated
                                : colors.surfaceSecondary,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.chipLabel,
                              { color: active ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {opt.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Timezone Selector Trigger */}
                <View style={styles.subsection}>
                  <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                    Timezone
                  </ThemedText>
                  <Pressable
                    onPress={() => setIsTimezoneModalOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select timezone"
                    style={({ pressed }) => [
                      styles.selectorTrigger,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={styles.selectorTextCol}>
                      <ThemedText style={[styles.selectorTitle, { color: colors.text }]}>
                        {currentTimezoneLabel}
                      </ThemedText>
                      <ThemedText style={[styles.selectorSubtitle, { color: colors.textSecondary }]}>
                        {timezone}
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                      size={16}
                      tintColor={colors.textMuted}
                    />
                  </Pressable>
                </View>

                {/* Quiet Hours Window */}
                <View style={styles.subsection}>
                  <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                    Quiet Hours
                  </ThemedText>
                  <ThemedText style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Silence non-urgent notifications overnight to prevent interruptions.
                  </ThemedText>
                  <View style={styles.chipWrap}>
                    {QUIET_HOURS_PRESETS.map((preset) => {
                      const selected =
                        prefs.quietHoursStart === preset.start && prefs.quietHoursEnd === preset.end;
                      return (
                        <Pressable
                          key={preset.id}
                          onPress={() => handleSelectQuietHours(preset.start, preset.end, preset.label)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected
                                ? colors.primarySoft
                                : isDark
                                ? colors.surfaceElevated
                                : colors.surfaceSecondary,
                              borderColor: selected ? colors.primary : colors.border,
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

                {/* Device Notification Sync Button */}
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
                  Sync Device Alert Queue
                </Button>

                {/* Android OS Permissions Status */}
                {(!permissions.notificationsGranted || !permissions.exactAlarmGranted) && (
                  <View style={styles.permissionSection}>
                    <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
                      Android System Permissions
                    </ThemedText>

                    {!permissions.notificationsGranted && (
                      <View
                        style={[
                          styles.permissionBox,
                          { backgroundColor: colors.surfaceSecondary, borderColor: Colors.status.danger },
                        ]}
                      >
                        <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
                          Notification Display Blocked
                        </ThemedText>
                        <ThemedText style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                          Android requires notification permission to show banners and lock screen alerts.
                        </ThemedText>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={handleEnableDisplayNotifications}
                          style={{ alignSelf: 'flex-start', marginTop: Spacing.two }}
                        >
                          {permissions.canAskNotifications ? 'Allow Notifications' : 'Open Settings'}
                        </Button>
                      </View>
                    )}

                    {!permissions.exactAlarmGranted && (
                      <View
                        style={[
                          styles.permissionBox,
                          { backgroundColor: colors.surfaceSecondary, borderColor: Colors.status.warning },
                        ]}
                      >
                        <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
                          Exact Alarms (Android 14+)
                        </ThemedText>
                        <ThemedText style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                          Enable Alarms & Reminders permission so scheduled alerts fire precisely on time.
                        </ThemedText>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={handleEnableExactAlarms}
                          style={{ alignSelf: 'flex-start', marginTop: Spacing.two }}
                        >
                          Enable Exact Alarms
                        </Button>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : null}
          </SettingsSectionCard>

          {/* 4. WORKSPACE CATEGORIES */}
          <SettingsSectionCard
            title="Workspace Categories"
            subtitle="Organize tasks, bills, and documents into life areas"
            icon={{ ios: 'tag', android: 'label' }}
          >
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
                  onSubmitEditing={handleAddCategory}
                />
              </View>
              <Button
                variant="secondary"
                size="md"
                onPress={handleAddCategory}
                style={{ marginTop: 2 }}
              >
                Add
              </Button>
            </View>
          </SettingsSectionCard>

          {/* 5. PREFERRED CURRENCY */}
          <SettingsSectionCard
            title="Preferred Currency"
            subtitle="Display currency for bills, totals, and financial summaries"
            icon={{ ios: 'indianrupeesign.circle', android: 'payments' }}
          >
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
          </SettingsSectionCard>

          {/* 6. SMART ASSISTANT & AUTOMATION */}
          <SettingsSectionCard
            title="Smart Assistant & Extraction"
            subtitle="AI document extraction and proactive insights"
            icon={{ ios: 'sparkles', android: 'auto_awesome' }}
          >
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
                  Document Auto-Extraction
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
                  Smart Insights & Suggestions
                </ThemedText>
                <ThemedText style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Surface priority alerts and overdue notices on Dashboard.
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
          </SettingsSectionCard>
        </ScrollView>
      </SafeAreaView>

      {/* Currency Picker Modal */}
      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        selectedCurrency={prefs.preferredCurrency}
        onSelect={handleSelectCurrency}
        onClose={() => setIsCurrencyPickerOpen(false)}
        isSaving={isSavingPrefs}
      />

      {/* Timezone Picker Sheet */}
      <ModalSheet
        isOpen={isTimezoneModalOpen}
        onClose={() => setIsTimezoneModalOpen(false)}
        title="Select Timezone"
        description="Choose your local timezone for schedule alerts"
      >
        <ScrollView style={styles.timezoneList} showsVerticalScrollIndicator={false}>
          {TIMEZONE_OPTIONS.map((item) => {
            const isSelected = timezone === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => handleSelectTimezone(item.value)}
                style={({ pressed }) => [
                  styles.timezoneItem,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : pressed
                      ? colors.surfaceSecondary
                      : 'transparent',
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.timezoneItemTextCol}>
                  <ThemedText
                    style={[
                      styles.timezoneItemLabel,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText style={[styles.timezoneItemVal, { color: colors.textSecondary }]}>
                    {item.value}
                  </ThemedText>
                </View>
                {isSelected && (
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                    size={18}
                    tintColor={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </ModalSheet>
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
  scrollContent: {
    padding: Spacing.four,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  avatarCircle: {
    width: 50,
    height: 50,
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
    marginTop: 4,
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
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeCard: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  themeLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  themeDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 11,
    textAlign: 'center',
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
  divider: {
    height: 1,
    marginVertical: Spacing.two,
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  chipLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  selectorSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  permissionSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  permissionBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  permissionTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  permissionDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    marginTop: 4,
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
  timezoneList: {
    maxHeight: 320,
  },
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderRadius: Radius.md,
  },
  timezoneItemTextCol: {
    flex: 1,
  },
  timezoneItemLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  timezoneItemVal: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
});
