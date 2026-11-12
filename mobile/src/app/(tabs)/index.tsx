/**
 * LifeAdmin Mobile Dashboard Screen
 * Production-quality personal command center with customizable widget layouts,
 * presets (Standard / Focus / Finance), AI Daily Briefing, multi-currency awareness,
 * and quick creation / navigation across all core modules.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { MaxContentWidth } from '@/constants/theme';
import { useSafeBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from '@/utils/currency';
import {
  DashboardHeader,
  StatsOverview,
  UrgencyTriageModal,
  NeedsAttentionSection,
  QuickActionsSection,
  UpcomingTimelineSection,
  QuickActionModal,
  DashboardCustomizeModal,
  AIDailyBriefingWidget,
  DashboardTasksWidget,
  DashboardBillsWidget,
  DashboardRemindersWidget,
  DashboardSkeleton,
  DashboardErrorState,
  LifeBuddyWidget,
  DashboardOverview,
  AttentionItem,
  UpcomingItem,
  QuickActionType,
  TriageMode,
  WidgetConfig,
  DEFAULT_WIDGETS,
  DASHBOARD_PRESETS,
  detectActivePreset,
  dashboardPreferencesService,
  fetchDashboardOverview,
  deriveStatsFromOverview,
  getTriageItems,
  markTaskCompleted,
  markBillPaid,
} from '@/features/dashboard';
import { billService, Bill, BillFormModal } from '@/features/bills';
import { taskService } from '@/features/tasks';
import { canUndoPaidBillFromDashboard } from '@/utils/undoActions';
import {
  appointmentService,
  AppointmentFormData,
  AppointmentFormModal,
} from '@/features/appointments';
import { calendarService, EventFormData, EventFormModal } from '@/features/calendar';
import {
  reminderService,
  notificationService,
  ReminderFormData,
  ReminderFormModal,
} from '@/features/reminders';
import {
  documentService,
  UploadDocumentParams,
  DocumentUploadModal,
} from '@/features/documents';
import { ApiError } from '@/types/api';

export default function DashboardScreen() {
  const { colors, isDark } = useAppTheme();
  const { user, isGuest, exitGuest, refreshUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const bottomPadding = useSafeBottomPadding(Spacing.six, true);

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Dashboard Widget Layout State (persisted per user / guest locally)
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() =>
    DEFAULT_WIDGETS.map((w) => ({ ...w }))
  );
  const [isCustomizeVisible, setIsCustomizeVisible] = useState(false);

  // Quick Action Modals State
  const [quickActionType, setQuickActionType] = useState<QuickActionType | null>(null);
  const [isQuickActionVisible, setIsQuickActionVisible] = useState(false);
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);
  const [isAppointmentModalVisible, setIsAppointmentModalVisible] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);

  // Notifications summary & Urgency Triage sheet state
  const [isNotifSheetVisible, setIsNotifSheetVisible] = useState(false);
  const [triageMode, setTriageMode] = useState<TriageMode | null>(null);

  const derivedStats = useMemo(() => deriveStatsFromOverview(data), [data]);
  const triageItems = useMemo(
    () => (triageMode ? getTriageItems(data?.needsAttention, triageMode) : []),
    [data?.needsAttention, triageMode]
  );

  const preferredCurrency = useMemo(
    () => normalizeCurrencyCode(user?.preferredCurrency || DEFAULT_CURRENCY),
    [user?.preferredCurrency]
  );

  const activePreset = useMemo(() => detectActivePreset(widgets), [widgets]);
  const activeLayoutLabel = useMemo(() => {
    if (activePreset === 'custom') return 'Custom Layout';
    return `${DASHBOARD_PRESETS[activePreset].label} Layout`;
  }, [activePreset]);
  const visibleWidgets = useMemo(() => widgets.filter((w) => w.visible), [widgets]);

  // Load saved dashboard layout whenever user or guest status changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await dashboardPreferencesService.loadWidgets(user?.id, isGuest);
      if (!cancelled) {
        setWidgets(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isGuest]);

  const loadDashboard = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [result, ratesRes] = await Promise.all([
          fetchDashboardOverview(),
          billService.fetchRates().catch(() => ({ rates: {} })),
          refreshUser().catch(() => {}),
        ]);
        setData(result);
        setExchangeRates(ratesRes?.rates || {});
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const navigateToEntityRoute = useCallback(
    (type: string) => {
      switch (type) {
        case 'bill':
          router.push('/bills' as any);
          break;
        case 'appointment':
          router.push('/appointments' as any);
          break;
        case 'reminder':
          router.push('/reminders' as any);
          break;
        case 'document':
          router.push('/documents' as any);
          break;
        case 'event':
          router.push('/calendar' as any);
          break;
        case 'task':
        default:
          router.push('/tasks' as any);
          break;
      }
    },
    [router]
  );

  const handleCompleteTask = async (id: string, title: string) => {
    try {
      await markTaskCompleted(id);
      await loadDashboard(true);
      showSnackbar({
        variant: 'success',
        title: 'Task Completed',
        message: `"${title}" marked as complete.`,
        action: {
          label: 'Undo',
          accessibilityLabel: `Undo completing ${title}`,
          onPress: () => {
            void (async () => {
              try {
                await taskService.updateTaskStatus(id, 'todo');
                await loadDashboard(true);
                showSnackbar({
                  variant: 'info',
                  title: 'Action Undone',
                  message: `"${title}" moved back to To Do.`,
                  duration: 2800,
                });
              } catch (undoErr: any) {
                showSnackbar({
                  variant: 'error',
                  title: 'Undo Failed',
                  message: undoErr?.message || 'Could not revert task status.',
                });
              }
            })();
          },
        },
      });
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Action Failed',
        message: err?.message || 'Could not complete task.',
      });
    }
  };

  const handlePayBill = async (id: string, title: string) => {
    try {
      const res = await markBillPaid(id);
      await loadDashboard(true);
      showSnackbar({
        variant: 'success',
        title: res?.nextOccurrence ? 'Bill Paid & Next Scheduled' : 'Bill Paid',
        message: res?.nextOccurrence
          ? `Payment for "${title}" recorded and next cycle scheduled.`
          : `Payment for "${title}" recorded.`,
        action: canUndoPaidBillFromDashboard(res?.nextOccurrence)
          ? {
              label: 'Undo',
              accessibilityLabel: `Undo payment for ${title}`,
              onPress: () => {
                void (async () => {
                  try {
                    await billService.markBillUnpaid(id);
                    await loadDashboard(true);
                    showSnackbar({
                      variant: 'info',
                      title: 'Action Undone',
                      message: `"${title}" restored to unpaid.`,
                      duration: 2800,
                    });
                  } catch (undoErr: any) {
                    showSnackbar({
                      variant: 'error',
                      title: 'Undo Failed',
                      message: undoErr?.message || 'Could not revert bill payment.',
                    });
                  }
                })();
              },
            }
          : undefined,
      });
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Action Failed',
        message: err?.message || 'Could not record payment.',
      });
    }
  };

  // Handle Action button on Attention Cards (e.g., Mark Done, Pay Bill, View)
  const handleItemAction = async (item: AttentionItem) => {
    if (item.type === 'task') {
      await handleCompleteTask(item.id, item.title);
    } else if (item.type === 'bill') {
      await handlePayBill(item.id, item.title);
    } else {
      navigateToEntityRoute(item.type);
    }
  };

  const handleItemPress = (item: AttentionItem | UpcomingItem) => {
    navigateToEntityRoute(item.type);
  };

  const handleOpenQuickAction = (type: QuickActionType) => {
    switch (type) {
      case 'task':
        setQuickActionType('task');
        setIsQuickActionVisible(true);
        break;
      case 'bill':
        setIsBillModalVisible(true);
        break;
      case 'appointment':
        setIsAppointmentModalVisible(true);
        break;
      case 'event':
        setIsEventModalVisible(true);
        break;
      case 'reminder':
        setIsReminderModalVisible(true);
        break;
      case 'document':
        setIsDocumentModalVisible(true);
        break;
    }
  };

  const handleSaveWidgets = async (nextWidgets: WidgetConfig[]) => {
    setWidgets(nextWidgets);
    await dashboardPreferencesService.saveWidgets(nextWidgets, user?.id, isGuest);
  };

  const handleCreateBill = async (formData: Partial<Bill>) => {
    await billService.createBill(formData);
    showSnackbar({
      variant: 'success',
      title: 'Bill Created',
      message: 'Your bill has been added.',
    });
    await loadDashboard(true);
  };

  const handleCreateAppointment = async (formData: Partial<AppointmentFormData>) => {
    await appointmentService.createAppointment(formData);
    showSnackbar({
      variant: 'success',
      title: 'Appointment Scheduled',
      message: 'Your appointment has been added.',
    });
    await loadDashboard(true);
  };

  const handleCreateEvent = async (formData: Partial<EventFormData>) => {
    await calendarService.createEvent(formData);
    showSnackbar({
      variant: 'success',
      title: 'Event Added',
      message: 'Your calendar event has been scheduled.',
    });
    await loadDashboard(true);
  };

  const handleCreateReminder = async (formData: Partial<ReminderFormData>) => {
    const created = await reminderService.createReminder(formData);
    const notificationUserId = user?.id || 'default_user';
    await notificationService.scheduleReminderNotification(created, notificationUserId);
    showSnackbar({
      variant: 'success',
      title: 'Reminder Created',
      message: 'Your alert has been scheduled.',
    });
    await loadDashboard(true);
  };

  const handleUploadDocument = async (params: UploadDocumentParams) => {
    await documentService.uploadDocument(params);
    showSnackbar({
      variant: 'success',
      title: 'Document Uploaded',
      message: 'Your document has been stored in the vault.',
    });
    await loadDashboard(true);
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.id) {
      case 'needs_attention':
        return (
          <NeedsAttentionSection
            key="needs_attention"
            items={data?.needsAttention || []}
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
            onItemPress={handleItemPress}
            onActionPress={handleItemAction}
          />
        );
      case 'lifebuddy':
        return (
          <View key="lifebuddy" style={styles.lifebuddyWrapper}>
            <LifeBuddyWidget />
          </View>
        );
      case 'ai_briefing':
        return (
          <AIDailyBriefingWidget
            key="ai_briefing"
            overview={data}
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
            isLoadingOverview={loading}
            sessionKey={user?.id || (isGuest ? 'guest' : 'anon')}
            onPressItem={(type) => navigateToEntityRoute(type)}
          />
        );
      case 'tasks':
        return (
          <DashboardTasksWidget
            key="tasks"
            needsAttention={data?.needsAttention || []}
            upcoming={data?.upcoming || []}
            onViewAll={() => router.push('/tasks' as any)}
            onAddTask={() => handleOpenQuickAction('task')}
            onCompleteTask={handleCompleteTask}
          />
        );
      case 'bills':
        return (
          <DashboardBillsWidget
            key="bills"
            needsAttention={data?.needsAttention || []}
            upcoming={data?.upcoming || []}
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
            onManageBills={() => router.push('/bills' as any)}
            onPayBill={handlePayBill}
          />
        );
      case 'schedule':
        return (
          <UpcomingTimelineSection
            key="schedule"
            items={data?.upcoming || []}
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
            onItemPress={handleItemPress}
          />
        );
      case 'reminders':
        return (
          <DashboardRemindersWidget
            key="reminders"
            activeCount={data?.stats?.activeReminders || 0}
            reminders={data?.reminders || []}
            onViewAll={() => router.push('/reminders' as any)}
            onAddReminder={() => handleOpenQuickAction('reminder')}
          />
        );
      default:
        return null;
    }
  };

  const totalUnreadCount = data
    ? data.stats.overdueCount + data.stats.dueSoonCount + (data.reminders?.length || 0)
    : 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {loading && !refreshing ? (
          <DashboardSkeleton />
        ) : error && !data ? (
          <DashboardErrorState
            message={error.message}
            onRetry={() => loadDashboard()}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDashboard(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* 1. Header with greeting, customize button, notification bell, avatar */}
            <DashboardHeader
              userName={user?.name || 'Friend'}
              unreadCount={totalUnreadCount}
              onCustomizePress={() => setIsCustomizeVisible(true)}
              onNotificationPress={() => setIsNotifSheetVisible(true)}
              onAvatarPress={() => router.push('/more' as any)}
            />

            {/* Guest Demo Session Banner */}
            {isGuest && (
              <View
                style={[
                  styles.guestBanner,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.guestBannerLeft}>
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                    size={16}
                    tintColor={colors.primary}
                  />
                  <ThemedText style={[styles.guestBannerText, { color: colors.text }]}>
                    Guest Demo Session • Temporary workspace
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Exit Demo Session',
                      'This will end your guest session and clear ephemeral demo data on the server.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Exit Demo',
                          style: 'destructive',
                          onPress: () => exitGuest(),
                        },
                      ]
                    );
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Exit guest demo session"
                >
                  <ThemedText style={[styles.exitDemoBtn, { color: colors.notification }]}>
                    Exit
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* Quick Metrics Grid (2x2: Overdue, Due Soon, Upcoming, Alerts) */}
            {derivedStats && (
              <StatsOverview
                stats={derivedStats}
                onStatPress={(filter) => {
                  if (filter === 'overdue') setTriageMode('overdue');
                  else if (filter === 'soon') setTriageMode('soon');
                  else if (filter === 'upcoming') router.push('/calendar' as any);
                  else if (filter === 'reminders') router.push('/reminders' as any);
                }}
              />
            )}

            {/* Dynamically Ordered & Toggled Dashboard Widgets */}
            {visibleWidgets.length > 0 ? (
              visibleWidgets.map(renderWidget)
            ) : (
              <View
                style={[
                  styles.emptyLayoutCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <ThemedText style={[styles.emptyLayoutTitle, { color: colors.text }]}>
                  All dashboard widgets are hidden
                </ThemedText>
                <ThemedText style={[styles.emptyLayoutDesc, { color: colors.textSecondary }]}>
                  Open Customize Layout to restore widgets or switch to a preset.
                </ThemedText>
                <Pressable
                  onPress={() => setIsCustomizeVisible(true)}
                  style={[styles.emptyLayoutBtn, { backgroundColor: colors.primary }]}
                >
                  <ThemedText
                    style={[
                      styles.emptyLayoutBtnText,
                      { color: getButtonForegroundColor('primary', colors, isDark) },
                    ]}
                  >
                    Customize Layout
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* Layout Preset & Customize Strip (quiet footer, below content) */}
            <Pressable
              onPress={() => setIsCustomizeVisible(true)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Customize dashboard layout. Current: ${activeLayoutLabel}, ${visibleWidgets.length} widgets visible`}
              style={({ pressed }) => [
                styles.layoutBar,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? colors.border : colors.borderSubtle,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.layoutBarLeft}>
                <View style={[styles.layoutDot, { backgroundColor: colors.primary }]} />
                <ThemedText style={[styles.layoutBarLabel, { color: colors.text }]}>
                  {activeLayoutLabel}
                </ThemedText>
                <ThemedText style={[styles.layoutBarMeta, { color: colors.textMuted }]}>
                  · {visibleWidgets.length}/{widgets.length} widgets
                </ThemedText>
              </View>
              <View style={styles.layoutBarRight}>
                <SymbolView
                  name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
                  size={14}
                  tintColor={colors.primary}
                />
                <ThemedText style={[styles.layoutActionText, { color: colors.primary }]}>
                  Customize
                </ThemedText>
              </View>
            </Pressable>

            {/* Expanded Quick Actions & Module Navigation Grid (all 6 modules) */}
            <QuickActionsSection
              onActionPress={handleOpenQuickAction}
              onNavigatePress={(route) => router.push(route as any)}
            />
          </ScrollView>
        )}

        {/* Quick Create Modal (Tasks) */}
        <QuickActionModal
          visible={isQuickActionVisible}
          type={quickActionType}
          onClose={() => setIsQuickActionVisible(false)}
          onSuccess={() => loadDashboard(true)}
        />

        {/* Reusable Native Modals for Bills, Appointments, Events, Reminders, Documents */}
        <BillFormModal
          isOpen={isBillModalVisible}
          onClose={() => setIsBillModalVisible(false)}
          onSubmit={handleCreateBill}
          defaultCurrency={preferredCurrency}
        />

        <AppointmentFormModal
          isOpen={isAppointmentModalVisible}
          onClose={() => setIsAppointmentModalVisible(false)}
          onSubmit={handleCreateAppointment}
        />

        <EventFormModal
          isOpen={isEventModalVisible}
          onClose={() => setIsEventModalVisible(false)}
          onSubmit={handleCreateEvent}
        />

        <ReminderFormModal
          isOpen={isReminderModalVisible}
          onClose={() => setIsReminderModalVisible(false)}
          onSubmit={handleCreateReminder}
        />

        <DocumentUploadModal
          isOpen={isDocumentModalVisible}
          onClose={() => setIsDocumentModalVisible(false)}
          onUpload={handleUploadDocument}
        />

        {/* Cross-Module Overdue / Due Soon Triage Sheet */}
        <UrgencyTriageModal
          mode={triageMode}
          items={triageItems}
          preferredCurrency={preferredCurrency}
          exchangeRates={exchangeRates}
          onClose={() => setTriageMode(null)}
          onActionPress={handleItemAction}
          onOpenRoute={(route) => router.push(route as any)}
        />

        {/* Dashboard Customization Bottom Sheet */}
        <DashboardCustomizeModal
          isOpen={isCustomizeVisible}
          onClose={() => setIsCustomizeVisible(false)}
          widgets={widgets}
          onSave={handleSaveWidgets}
        />

        {/* Notifications Summary Sheet Modal */}
        <Modal
          visible={isNotifSheetVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNotifSheetVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsNotifSheetVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss action alerts"
            />
            <View
              style={[
                styles.notifSheet,
                createShadow(isDark, 'modal'),
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.notifHeader}>
                <ThemedText style={[styles.notifTitle, { color: colors.text }]}>
                  Action Alerts ({totalUnreadCount})
                </ThemedText>
                <Pressable
                  onPress={() => setIsNotifSheetVisible(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close action alerts"
                  style={({ pressed }) => [styles.closeIcon, pressed && { opacity: 0.7 }]}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={20}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <ScrollView style={styles.notifList}>
                {data?.needsAttention && data.needsAttention.length > 0 ? (
                  data.needsAttention.map((item) => (
                    <Pressable
                      key={`${item.type}-${item.id}`}
                      onPress={() => {
                        setIsNotifSheetVisible(false);
                        navigateToEntityRoute(item.type);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}. ${item.reason}`}
                      accessibilityHint={`Opens ${item.type} section`}
                      style={[
                        styles.notifItem,
                        { borderBottomColor: colors.borderSubtle },
                      ]}
                    >
                      <ThemedText style={[styles.notifItemTitle, { color: colors.text }]}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={[styles.notifItemDesc, { color: colors.textSecondary }]}>
                        {item.reason}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.noNotifs}>
                    <ThemedText style={{ color: colors.textSecondary }}>
                      No unread alerts or overdue items.
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  lifebuddyWrapper: {
    paddingHorizontal: Spacing.four,
  },
  layoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  layoutBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  layoutDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  layoutBarLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  layoutBarMeta: {
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  layoutBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  layoutActionText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  emptyLayoutCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.five,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyLayoutTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  emptyLayoutDesc: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  emptyLayoutBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  emptyLayoutBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  notifSheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 480,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.five,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  notifTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.editorial,
  },
  closeIcon: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.one,
  },
  notifList: {
    maxHeight: 360,
  },
  notifItem: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifItemTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  notifItemDesc: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  noNotifs: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  guestBannerText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  exitDemoBtn: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    paddingHorizontal: Spacing.two,
  },
});
