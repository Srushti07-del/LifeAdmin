/**
 * LifeAdmin Mobile — Reminders Screen
 * Complete production-ready smart reminders & native notification timeline:
 * - Aggregate overview (Active, Today, Upcoming, Overdue, Completed)
 * - Sectioned timeline (Overdue, Today, Upcoming, Completed)
 * - Native bottom-sheet modals for Create/Edit and Details inspection
 * - Direct checkbox completion/reopen with automated recurring reminder generation
 * - Native device notification scheduling, rescheduling, and reconciliation
 * - Pull-to-refresh and permission status banner
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  SectionList,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "@/context/SnackbarContext";
import { useFabBottomPadding } from "@/hooks/use-safe-bottom-padding";
import { parseReminderSectionParam } from "@/utils/routeFilters";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  SearchInput,
  Button,
  EmptyState,
  FloatingActionButton,
  HeaderBackButton,
  getButtonForegroundColor,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import {
  Reminder,
  ReminderFormData,
  ReminderPriority,
  ReminderPermissionStatus,
  PermissionBannerType,
  reminderService,
  notificationService,
  calculateReminderTotals,
  groupRemindersBySection,
  filterAndSortReminders,
  determineActivePermissionBanner,
  ReminderSummaryCard,
  ReminderCard,
  ReminderFormModal,
  ReminderDetailsModal,
  NotificationPermissionBanner,
} from "@/features/reminders";
import { canUndoReminderToggle } from "@/utils/undoActions";

const CATEGORIES = [
  "All",
  "Personal",
  "Work",
  "Health",
  "Finance",
  "Education",
  "Housing",
  "General",
];

const PRIORITIES: Array<{ key: string; label: string }> = [
  { key: "all", label: "All Priorities" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

interface ReminderSection {
  key: string;
  title: string;
  count: number;
  indicatorColor: string;
  textColor: string;
  data: Reminder[];
}

export default function RemindersScreen() {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const bottomPadding = useFabBottomPadding(Spacing.six, false);
  const currentUserId = user?.id || "default_user";

  // Data state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Permission state (distinguishes notification display vs Android exact alarms)
  const [permissions, setPermissions] = useState<ReminderPermissionStatus>({
    notificationsGranted: true,
    exactAlarmGranted: true,
    canAskNotifications: true,
    canAskExactAlarm: true,
  });
  const [dismissedBanners, setDismissedBanners] = useState<
    Record<string, boolean>
  >({});

  // Check combined permissions on mount and when returning to foreground
  const checkAllPermissions = useCallback(async () => {
    try {
      const status = await notificationService.getCombinedPermissionsAsync();
      setPermissions(status);
    } catch (err) {
      console.warn("Failed to inspect device notification permissions:", err);
    }
  }, []);

  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  // Request notification display permission
  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermissionsAsync();
    await checkAllPermissions();
    if (granted && reminders.length > 0) {
      await notificationService.reconcileUserReminders(
        reminders,
        currentUserId,
      );
    }
  };

  // Request Android exact-alarm permission (opens system Alarms & Reminders screen)
  const handleRequestExactAlarmPermission = async () => {
    await notificationService.requestExactAlarmPermissionAsync();
    // Re-check once after returning from settings intent
    await checkAllPermissions();
  };

  // Determine active banner using pure helper
  const activeBanner = useMemo(() => {
    return determineActivePermissionBanner(permissions, dismissedBanners);
  }, [permissions, dismissedBanners]);

  // Filter & Search state
  const [filterSection, setFilterSection] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"dueDate" | "-dueDate">("dueDate");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [selectedReminderForDetails, setSelectedReminderForDetails] =
    useState<Reminder | null>(null);

  // Deep-link to specific reminder or initial section filter when opened via notification or URL
  const params = useLocalSearchParams<{
    reminderId?: string;
    section?: string | string[];
  }>();
  const handledReminderIdRef = useRef<string | null>(null);

  useEffect(() => {
    const parsedSection = parseReminderSectionParam(params.section);
    if (!parsedSection) return;
    setFilterSection(parsedSection);
    if (typeof (router as any).setParams === "function") {
      (router as any).setParams({ section: undefined });
    }
  }, [params.section, router]);

  useEffect(() => {
    if (!params.reminderId || isLoading) return;
    if (handledReminderIdRef.current === params.reminderId) return;

    handledReminderIdRef.current = params.reminderId;
    const matched = reminders.find((r) => r._id === params.reminderId);
    if (matched) {
      setSelectedReminderForDetails(matched);
    } else {
      showSnackbar({
        variant: "warning",
        title: "Reminder Not Found",
        message: "This reminder may have been deleted, completed, or rescheduled.",
      });
    }
  }, [params.reminderId, isLoading, reminders, showSnackbar]);

  // Fetch reminders and reconcile device notifications
  const loadReminders = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setIsLoading(true);
        setError(null);

        const res = await reminderService.fetchReminders({ limit: 300 });
        const list = res?.reminders || [];
        setReminders(list);

        // Reconcile local device alerts with backend state
        await notificationService.reconcileUserReminders(list, currentUserId);
      } catch (err: any) {
        console.warn("Error loading reminders:", err);
        setError(
          err?.message || "Unable to connect to server. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // AppState listener to re-reconcile permissions and alerts when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkAllPermissions();
        loadReminders(true);
      }
    });
    return () => subscription.remove();
  }, [checkAllPermissions, loadReminders]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReminders(true);
  }, [loadReminders]);

  // Computed summary metrics
  const totals = useMemo(() => {
    return calculateReminderTotals(reminders);
  }, [reminders]);

  // Filtered collection
  const filteredReminders = useMemo(() => {
    return filterAndSortReminders(
      reminders,
      filterSection,
      selectedCategory,
      selectedPriority,
      searchQuery,
      sortOrder,
    );
  }, [
    reminders,
    filterSection,
    selectedCategory,
    selectedPriority,
    searchQuery,
    sortOrder,
  ]);

  // Grouped timeline sections
  const grouped = useMemo(() => {
    return groupRemindersBySection(filteredReminders);
  }, [filteredReminders]);

  // Create or Update submit handler
  const handleFormSubmit = async (data: Partial<ReminderFormData>) => {
    if (editingReminder) {
      const { reminder: updated } = await reminderService.updateReminder(
        editingReminder._id,
        data,
      );
      setReminders((prev) =>
        prev.map((r) => (r._id === updated._id ? updated : r)),
      );
      await notificationService.scheduleReminderNotification(
        updated,
        currentUserId,
      );
      if (selectedReminderForDetails?._id === updated._id) {
        setSelectedReminderForDetails(updated);
      }
      showSnackbar({
        variant: "success",
        title: "Reminder Updated",
        message: "Your alert schedule has been synchronized.",
      });
    } else {
      const created = await reminderService.createReminder(data);
      setReminders((prev) => [created, ...prev]);
      await notificationService.scheduleReminderNotification(
        created,
        currentUserId,
      );
      showSnackbar({
        variant: "success",
        title: "Reminder Created",
        message: "Your notification has been scheduled.",
      });
    }
  };

  // Toggle complete / reopen
  const handleToggleComplete = async (reminder: Reminder, isUndo = false) => {
    const wasCompleted = reminder.status === "completed";
    try {
      if (wasCompleted) {
        const reopened = await reminderService.reopenReminder(reminder._id);
        setReminders((prev) =>
          prev.map((r) => (r._id === reminder._id ? reopened : r)),
        );
        if (selectedReminderForDetails?._id === reminder._id) {
          setSelectedReminderForDetails(reopened);
        }
        await notificationService.scheduleReminderNotification(
          reopened,
          currentUserId,
        );

        if (isUndo) {
          showSnackbar({
            variant: "info",
            title: "Action Undone",
            message: `"${reminder.title}" restored to active schedule.`,
            duration: 2800,
          });
        } else {
          showSnackbar({
            variant: "info",
            title: "Reminder Reopened",
            message: `"${reminder.title}" restored to active schedule.`,
            action: canUndoReminderToggle(true, reminder)
              ? {
                  label: "Undo",
                  accessibilityLabel: `Undo reopening ${reminder.title}`,
                  onPress: () => void handleToggleComplete(reopened, true),
                }
              : undefined,
          });
        }
      } else {
        const { reminder: completed, nextOccurrence } =
          await reminderService.completeReminder(reminder._id);
        // Cancel notification for completed reminder
        await notificationService.cancelReminderNotification(
          reminder._id,
          currentUserId,
        );

        setReminders((prev) => {
          let next = prev.map((r) => (r._id === reminder._id ? completed : r));
          if (nextOccurrence) {
            next = [nextOccurrence, ...next];
          }
          return next;
        });
        if (selectedReminderForDetails?._id === reminder._id) {
          setSelectedReminderForDetails(completed);
        }

        if (nextOccurrence) {
          await notificationService.scheduleReminderNotification(
            nextOccurrence,
            currentUserId,
          );
          showSnackbar({
            variant: "success",
            title: "Recurring Reminder Scheduled",
            message: `Next occurrence scheduled for ${new Date(nextOccurrence.dueDate).toLocaleDateString()}.`,
          });
        } else if (isUndo) {
          showSnackbar({
            variant: "info",
            title: "Action Undone",
            message: `"${reminder.title}" marked as done.`,
            duration: 2800,
          });
        } else {
          showSnackbar({
            variant: "success",
            title: "Reminder Completed",
            message: `"${reminder.title}" marked as done.`,
            action: canUndoReminderToggle(false, reminder, nextOccurrence)
              ? {
                  label: "Undo",
                  accessibilityLabel: `Undo completing ${reminder.title}`,
                  onPress: () => void handleToggleComplete(completed, true),
                }
              : undefined,
          });
        }
      }
    } catch (err: any) {
      console.warn("Error toggling complete:", err);
      showSnackbar({
        variant: "error",
        title: "Action Failed",
        message: err?.message || "Unable to update reminder status.",
      });
    }
  };

  // Delete handler
  const handleDeleteReminder = async (id: string) => {
    const deletedTitle = reminders.find((r) => r._id === id)?.title;
    try {
      await reminderService.deleteReminder(id);
      await notificationService.cancelReminderNotification(id, currentUserId);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      if (selectedReminderForDetails?._id === id) {
        setSelectedReminderForDetails(null);
      }
      showSnackbar({
        variant: "info",
        title: "Reminder Deleted",
        message: deletedTitle ? `"${deletedTitle}" removed.` : "Reminder removed.",
      });
    } catch (err: any) {
      console.warn("Delete reminder error:", err);
      showSnackbar({
        variant: "error",
        title: "Delete Failed",
        message: err?.message || "Unable to remove reminder.",
      });
    }
  };

  const confirmDelete = (reminder: Reminder) => {
    Alert.alert(
      "Delete Reminder",
      `Are you sure you want to delete "${reminder.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteReminder(reminder._id),
        },
      ],
    );
  };

  const reminderKeyExtractor = useCallback((item: Reminder) => item._id, []);

  const renderReminderItem = useCallback(
    ({ item }: { item: Reminder }) => (
      <ReminderCard
        reminder={item}
        onPress={() => setSelectedReminderForDetails(item)}
        onToggleComplete={() => handleToggleComplete(item)}
        onEdit={() => {
          setEditingReminder(item);
          setIsFormOpen(true);
        }}
        onDelete={() => confirmDelete(item)}
      />
    ),
    [handleToggleComplete, confirmDelete]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ReminderSection }) => (
      <View style={styles.sectionHeaderRow}>
        <View
          style={[
            styles.sectionIndicator,
            { backgroundColor: section.indicatorColor },
          ]}
        />
        <ThemedText
          style={[
            styles.sectionHeading,
            { color: section.textColor },
          ]}
        >
          {section.title} ({section.count})
        </ThemedText>
      </View>
    ),
    []
  );

  const sections: ReminderSection[] = useMemo(() => {
    if (isLoading || filteredReminders.length === 0) return [];
    const list: ReminderSection[] = [];

    if (
      grouped.overdue.length > 0 &&
      (filterSection === "all" || filterSection === "overdue")
    ) {
      list.push({
        key: "overdue",
        title: "Overdue",
        count: grouped.overdue.length,
        indicatorColor: Colors.urgency.critical.accent,
        textColor: isDark
          ? Colors.urgency.critical.darkText
          : Colors.urgency.critical.lightText,
        data: grouped.overdue,
      });
    }

    if (
      grouped.today.length > 0 &&
      (filterSection === "all" || filterSection === "today")
    ) {
      list.push({
        key: "today",
        title: "Due Today",
        count: grouped.today.length,
        indicatorColor: colors.primary,
        textColor: colors.primary,
        data: grouped.today,
      });
    }

    if (
      grouped.upcoming.length > 0 &&
      (filterSection === "all" || filterSection === "upcoming")
    ) {
      list.push({
        key: "upcoming",
        title: "Upcoming",
        count: grouped.upcoming.length,
        indicatorColor: Colors.urgency.upcoming.accent,
        textColor: isDark
          ? Colors.urgency.upcoming.darkText
          : Colors.urgency.upcoming.lightText,
        data: grouped.upcoming,
      });
    }

    if (
      grouped.completed.length > 0 &&
      (filterSection === "all" || filterSection === "completed")
    ) {
      list.push({
        key: "completed",
        title: "Completed",
        count: grouped.completed.length,
        indicatorColor: Colors.urgency.completed.accent,
        textColor: isDark
          ? Colors.urgency.completed.darkText
          : Colors.urgency.completed.lightText,
        data: grouped.completed,
      });
    }

    return list;
  }, [
    isLoading,
    filteredReminders.length,
    grouped,
    filterSection,
    isDark,
    colors.primary,
  ]);

  const renderHeader = (
    <View style={styles.headerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <HeaderBackButton fallbackHref="/more" />
        <View style={styles.headerTitles}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Smart Reminders
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Time-sensitive cues and native background notifications
          </ThemedText>
        </View>
      </View>

      {/* Permission Banner (Notification Display or Android Exact Alarm) */}
      {activeBanner && (
        <NotificationPermissionBanner
          type={activeBanner}
          onEnable={
            activeBanner === "notifications"
              ? handleRequestNotificationPermission
              : handleRequestExactAlarmPermission
          }
          onDismiss={() =>
            setDismissedBanners((prev) => ({ ...prev, [activeBanner]: true }))
          }
        />
      )}

      {/* Aggregate Summary Card */}
      <ReminderSummaryCard
        totals={totals}
        activeFilter={filterSection}
        onSelectFilter={setFilterSection}
      />

      {/* Search Bar & Sort Toggle */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search reminders by title, notes, or category..."
          />
        </View>

        <Pressable
          onPress={() =>
            setSortOrder((prev) =>
              prev === "dueDate" ? "-dueDate" : "dueDate",
            )
          }
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={
            sortOrder === "dueDate"
              ? "Sort order: Soonest first"
              : "Sort order: Latest first"
          }
          style={[
            styles.sortBtn,
            {
              backgroundColor:
                sortOrder === "-dueDate"
                  ? colors.primarySoft
                  : colors.surface,
              borderColor:
                sortOrder === "-dueDate" ? colors.primary : colors.border,
            },
          ]}
        >
          <SymbolView
            name={{ ios: "arrow.up.arrow.down", android: "sort" }}
            size={18}
            tintColor={
              sortOrder === "-dueDate" ? colors.primary : colors.text
            }
          />
        </Pressable>
      </View>

      {/* Category Pills Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryPillsScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const selectedFg = getButtonForegroundColor(
            "primary",
            colors,
            isDark,
          );
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              hitSlop={6}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.categoryPillText,
                  { color: isSelected ? selectedFg : colors.textSecondary },
                ]}
              >
                {cat}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Error Banner */}
      {error && (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: isDark
                ? Colors.urgency.critical.darkBg
                : Colors.urgency.critical.lightBg,
              borderColor: Colors.urgency.critical.accent,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.errorText,
              {
                color: isDark
                  ? Colors.urgency.critical.darkText
                  : Colors.urgency.critical.lightText,
              },
            ]}
          >
            {error}
          </ThemedText>
          <Button variant="outline" size="sm" onPress={() => loadReminders()}>
            Retry
          </Button>
        </View>
      )}

      {/* Content States */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText
            style={[styles.loadingText, { color: colors.textSecondary }]}
          >
            Loading active reminders...
          </ThemedText>
        </View>
      ) : filteredReminders.length === 0 ? (
        <EmptyState
          title={
            searchQuery ||
            selectedCategory !== "All" ||
            filterSection !== "all"
              ? "No matching reminders"
              : "No reminders yet"
          }
          description={
            searchQuery ||
            selectedCategory !== "All" ||
            filterSection !== "all"
              ? "Try adjusting your search query, priority filter, or category."
              : "Stay ahead of your everyday obligations. Schedule native alerts for calls, bills, meds, and meetings."
          }
          actionLabel={
            searchQuery ||
            selectedCategory !== "All" ||
            filterSection !== "all"
              ? "Clear Filters"
              : "Set First Reminder"
          }
          onAction={
            searchQuery ||
            selectedCategory !== "All" ||
            filterSection !== "all"
              ? () => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedPriority("all");
                  setFilterSection("all");
                }
              : () => {
                  setEditingReminder(null);
                  setIsFormOpen(true);
                }
          }
          icon={
            <SymbolView
              name={{
                ios:
                  searchQuery ||
                  selectedCategory !== "All" ||
                  filterSection !== "all"
                    ? "magnifyingglass"
                    : "bell.badge",
                android:
                  searchQuery ||
                  selectedCategory !== "All" ||
                  filterSection !== "all"
                    ? "search_off"
                    : "notifications_none",
                web:
                  searchQuery ||
                  selectedCategory !== "All" ||
                  filterSection !== "all"
                    ? "search_off"
                    : "notifications_none",
              }}
              size={28}
              tintColor={colors.primary}
            />
          }
        />
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={styles.screen}
      >
        <SectionList
          sections={sections}
          renderItem={renderReminderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={reminderKeyExtractor}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      <FloatingActionButton
        label="New Alert"
        accessibilityLabel="Create reminder"
        onPress={() => {
          setEditingReminder(null);
          setIsFormOpen(true);
        }}
        isTabScreen={false}
      />

      {/* Create / Edit Form Modal */}
      <ReminderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingReminder(null);
        }}
        onSubmit={handleFormSubmit}
        reminder={editingReminder}
      />

      {/* Details Inspection Modal */}
      <ReminderDetailsModal
        isOpen={Boolean(selectedReminderForDetails)}
        reminder={selectedReminderForDetails}
        onClose={() => setSelectedReminderForDetails(null)}
        onEdit={(r) => {
          setSelectedReminderForDetails(null);
          setEditingReminder(r);
          setIsFormOpen(true);
        }}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteReminder}
      />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.two,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize["3xl"],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.editorial,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInputWrap: {
    flex: 1,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryPillsScroll: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.three,
  },
  categoryPill: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  errorBox: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.four,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginRight: Spacing.two,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.eight,
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
  },
  timelineContainer: {
    marginTop: Spacing.one,
  },
  sectionWrap: {
    marginBottom: Spacing.five,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  sectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.1,
  },
});
