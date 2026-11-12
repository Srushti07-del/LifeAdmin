/**
 * LifeAdmin Mobile — Appointments Screen
 * Complete production-ready appointments management screen:
 * - Summary dashboard (Total, Today, Upcoming, Past)
 * - Multi-criteria organization (Status tabs, Category filter chips, Search, Sort)
 * - Native bottom-sheet modals for Create, Edit, and Details inspection
 * - Calendar integration, deletion confirmation, and pull-to-refresh
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { useFabBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { parseAppointmentFilterParam } from '@/utils/routeFilters';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SearchInput,
  FilterBar,
  FilterItem,
  EmptyState,
  FloatingActionButton,
  HeaderBackButton,
  getButtonForegroundColor,
} from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  Appointment,
  AppointmentFilterKey,
  AppointmentSortKey,
  AppointmentFormData,
  appointmentService,
  calculateAppointmentTotals,
  filterAndSortAppointments,
  AppointmentCard,
  AppointmentSummaryCard,
  AppointmentFormModal,
  AppointmentDetailsModal,
} from '@/features/appointments';

const CATEGORIES = ['All', 'Health', 'Personal', 'Work', 'Education', 'Legal', 'Finance'];

interface SortOption {
  key: AppointmentSortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'date', label: 'Earliest Date' },
  { key: '-date', label: 'Latest Date' },
  { key: 'title', label: 'Title (A–Z)' },
];

export default function AppointmentsScreen() {
  const { colors, isDark } = useAppTheme();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const bottomPadding = useFabBottomPadding(Spacing.six, false);

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [activeFilter, setActiveFilter] = useState<AppointmentFilterKey>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSort, setActiveSort] = useState<AppointmentSortKey>('date');
  const [showSortPicker, setShowSortPicker] = useState<boolean>(false);

  useEffect(() => {
    const parsedFilter = parseAppointmentFilterParam(params.filter);
    if (!parsedFilter) return;
    setActiveFilter(parsedFilter);
    if (typeof (router as any).setParams === 'function') {
      (router as any).setParams({ filter: undefined });
    }
  }, [params.filter, router]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<Appointment | null>(null);

  // Fetch appointments from server
  const loadAppointments = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setError(null);

      const res = await appointmentService.fetchAppointments({ limit: 200 });
      setAppointments(res?.appointments || []);
    } catch (err: any) {
      console.warn('Error loading appointments:', err);
      setError(err?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAppointments(true);
  }, [loadAppointments]);

  // Derived totals and filtered items
  const totals = useMemo(() => {
    return calculateAppointmentTotals(appointments);
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return filterAndSortAppointments(
      appointments,
      activeFilter,
      searchQuery,
      selectedCategory,
      activeSort
    );
  }, [appointments, activeFilter, searchQuery, selectedCategory, activeSort]);

  // Status Filter Tabs with dynamic counts
  const filterItems: FilterItem<AppointmentFilterKey>[] = useMemo(
    () => [
      { value: 'all', label: 'All', count: totals.totalCount },
      { value: 'upcoming', label: 'Upcoming', count: totals.upcomingCount },
      { value: 'today', label: 'Today', count: totals.todayCount },
      { value: 'past', label: 'Past', count: totals.pastCount },
    ],
    [totals]
  );

  // Submit Create or Edit form
  const handleFormSubmit = async (formData: Partial<AppointmentFormData>) => {
    if (editingAppointment) {
      const res = await appointmentService.updateAppointment(
        editingAppointment._id,
        formData
      );
      setAppointments((prev) =>
        prev.map((a) => (a._id === editingAppointment._id ? res.appointment : a))
      );
      if (selectedAppointmentForDetails?._id === editingAppointment._id) {
        setSelectedAppointmentForDetails(res.appointment);
      }
      setEditingAppointment(null);
      showSnackbar({
        variant: 'success',
        title: 'Appointment Updated',
        message: `"${res.appointment.title}" saved.`,
      });
    } else {
      const res = await appointmentService.createAppointment(formData);
      setAppointments((prev) => [res.appointment, ...prev]);
      showSnackbar({
        variant: 'success',
        title: 'Appointment Scheduled',
        message: `"${res.appointment.title}" added to your schedule.`,
      });
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (appointmentId: string) => {
    const existingTitle = appointments.find((a) => a._id === appointmentId)?.title;
    await appointmentService.deleteAppointment(appointmentId);
    setAppointments((prev) => prev.filter((a) => a._id !== appointmentId));
    if (selectedAppointmentForDetails?._id === appointmentId) {
      setSelectedAppointmentForDetails(null);
    }
    showSnackbar({
      variant: 'info',
      title: 'Appointment Deleted',
      message: existingTitle ? `"${existingTitle}" removed.` : 'Appointment removed.',
    });
  };

  // Open Form in Create mode
  const handleOpenCreateModal = () => {
    setEditingAppointment(null);
    setIsFormOpen(true);
  };

  // Open Form in Edit mode
  const handleOpenEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
  };

  // Reset filters
  const handleResetFilters = () => {
    setActiveFilter('all');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.key === activeSort)?.label || 'Sort';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <HeaderBackButton fallbackHref="/more" />
          <View style={styles.headerTitleCol}>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Appointments
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Doctor visits, consultations, and professional meetings
            </ThemedText>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Summary Dashboard Card */}
          <AppointmentSummaryCard totals={totals} />

          {/* Search Bar & Sort Toggle Row */}
          <View style={styles.searchSortRow}>
            <View style={styles.searchWrapper}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search appointments, doctor, clinic..."
              />
            </View>

            <Pressable
              onPress={() => setShowSortPicker((prev) => !prev)}
              style={[
                styles.sortButton,
                {
                  backgroundColor: showSortPicker ? colors.primary : colors.surface,
                  borderColor: showSortPicker ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by: ${currentSortLabel}`}
            >
              <SymbolView
                name={{
                  ios: 'arrow.up.arrow.down',
                  android: 'sort',
                  web: 'sort',
                }}
                size={16}
                tintColor={
                  showSortPicker
                    ? getButtonForegroundColor('primary', colors, isDark)
                    : colors.text
                }
              />
            </Pressable>
          </View>

          {/* Sort Options Tray (When opened) */}
          {showSortPicker && (
            <View
              style={[
                styles.sortTray,
                {
                  backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.sortTrayTitle, { color: colors.textSecondary }]}>
                Sort Appointments By
              </ThemedText>
              <View style={styles.sortOptionsGrid}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = activeSort === opt.key;
                  const selectedFg = getButtonForegroundColor('primary', colors, isDark);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        setActiveSort(opt.key);
                        setShowSortPicker(false);
                      }}
                      hitSlop={6}
                      style={[
                        styles.sortOptionChip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? colors.surfaceElevated
                            : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.sortOptionText,
                          {
                            color: isSelected ? selectedFg : colors.text,
                            fontFamily: isSelected
                              ? Typography.fontFamilies.sansSemiBold
                              : Typography.fontFamilies.sans,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Status Tabs Filter */}
          <View style={styles.filterSection}>
            <FilterBar
              items={filterItems}
              selected={activeFilter}
              onSelect={setActiveFilter}
            />
          </View>

          {/* Category Chip Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  hitSlop={6}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : isDark
                        ? colors.surface
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansSemiBold
                          : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Loading State */}
          {isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading your appointments...
              </ThemedText>
            </View>
          ) : error ? (
            /* Error State */
            <EmptyState
              icon={
                <SymbolView
                  name={{
                    ios: 'exclamationmark.triangle',
                    android: 'warning',
                    web: 'warning',
                  }}
                  size={36}
                  tintColor={colors.notification || '#EF4444'}
                />
              }
              title="Unable to Load Appointments"
              description={error}
              actionLabel="Retry"
              onAction={() => loadAppointments(false)}
            />
          ) : appointments.length === 0 ? (
            /* Empty State: No Appointments */
            <EmptyState
              icon={
                <SymbolView
                  name={{
                    ios: 'calendar.badge.clock',
                    android: 'schedule',
                    web: 'schedule',
                  }}
                  size={40}
                  tintColor={colors.primary}
                />
              }
              title="No appointments scheduled"
              description="Keep critical doctor visits, advisor meetings, and interviews organized in one place."
              actionLabel="Schedule Your First Appointment"
              onAction={handleOpenCreateModal}
            />
          ) : filteredAppointments.length === 0 ? (
            /* Empty State: Filter Matched Nothing */
            <EmptyState
              icon={
                <SymbolView
                  name={{
                    ios: 'line.3.horizontal.decrease.circle',
                    android: 'filter_alt_off',
                    web: 'filter_alt_off',
                  }}
                  size={36}
                  tintColor={colors.textSecondary}
                />
              }
              title="No matching appointments"
              description="We couldn't find any appointments matching your current search or filter criteria."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          ) : (
            /* Appointments List */
            <View style={styles.appointmentsList}>
              <View style={styles.listHeaderRow}>
                <ThemedText style={[styles.listCountText, { color: colors.textSecondary }]}>
                  Showing {filteredAppointments.length} of {appointments.length} appointments
                </ThemedText>
              </View>

              {filteredAppointments.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  onPress={(a) => setSelectedAppointmentForDetails(a)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <FloatingActionButton
          label="New Visit"
          accessibilityLabel="Add appointment"
          onPress={handleOpenCreateModal}
          isTabScreen={false}
        />
      </SafeAreaView>

      {/* Create & Edit Modal Sheet */}
      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleFormSubmit}
        appointment={editingAppointment}
      />

      {/* Appointment Details Modal Sheet */}
      <AppointmentDetailsModal
        isOpen={!!selectedAppointmentForDetails}
        onClose={() => setSelectedAppointmentForDetails(null)}
        appointment={selectedAppointmentForDetails}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteAppointment}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.editorial,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchWrapper: {
    flex: 1,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortTray: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  sortTrayTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sortOptionChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: Typography.fontSize.xs,
  },
  filterSection: {
    marginTop: -Spacing.one,
  },
  categoryScroll: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  categoryChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
  },
  appointmentsList: {
    gap: Spacing.three,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  listCountText: {
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.ten,
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
  },
});

