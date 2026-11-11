/**
 * LifeAdmin Mobile — Unified Calendar Screen
 * Production-ready calendar screen aggregating manual events, tasks, bills,
 * appointments, and reminders across Month, Week, and Day views.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  SegmentedControl,
  EmptyState,
  getButtonForegroundColor,
} from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { BottomTabInset } from '@/constants/theme';
import {
  CalendarEventItem,
  CalendarViewType,
  CalendarItemType,
  EventFormData,
  calendarService,
  getDateRangeForView,
  filterEvents,
  formatCalendarHeader,
  addDays,
  startOfWeek,
  MonthView,
  WeekView,
  DayView,
  EventFormModal,
  CalendarItemDetailsModal,
  ENTITY_CONFIG,
} from '@/features/calendar';

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

const FILTER_TYPES: { key: string; label: string; type?: CalendarItemType }[] = [
  { key: 'all', label: 'All Items' },
  { key: 'event', label: 'Events', type: 'event' },
  { key: 'task', label: 'Tasks', type: 'task' },
  { key: 'bill', label: 'Bills', type: 'bill' },
  { key: 'appointment', label: 'Appts', type: 'appointment' },
  { key: 'reminder', label: 'Reminders', type: 'reminder' },
];

export default function CalendarScreen() {
  const { colors, isDark } = useAppTheme();

  // Navigation & View state
  const [view, setView] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Data & Filter state
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<CalendarEventItem | null>(null);
  const [defaultFormDate, setDefaultFormDate] = useState<Date>(new Date());
  const [selectedDetailItem, setSelectedDetailItem] = useState<CalendarEventItem | null>(null);

  // Calculate required query date range
  const queryRange = useMemo(() => {
    return getDateRangeForView(view, currentDate);
  }, [view, currentDate]);

  // Load unified events from backend
  const loadEvents = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setIsLoading(true);
        setError(null);

        const res = await calendarService.fetchEvents({
          start: queryRange.start.toISOString(),
          end: queryRange.end.toISOString(),
        });

        setEvents(res?.events || []);
      } catch (err: any) {
        console.warn('Error loading calendar events:', err);
        setError(err?.message || 'Failed to load schedule items. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [queryRange.start.getTime(), queryRange.end.getTime()]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadEvents(true);
  }, [loadEvents]);

  // Navigate Previous / Next
  const handleNavigate = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      if (view === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      }
      if (view === 'week') {
        return addDays(prev, direction * 7);
      }
      return addDays(prev, direction);
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, selectedType);
  }, [events, selectedType]);

  // Open Create Modal
  const handleOpenCreateModal = (date?: Date) => {
    setEditingItem(null);
    setDefaultFormDate(date || selectedDate || currentDate);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: CalendarEventItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (formData: Partial<EventFormData>) => {
    if (editingItem && editingItem.isOriginalEvent) {
      const res = await calendarService.updateEvent(editingItem.id, formData);
      setEvents((prev) =>
        prev.map((e) => (e.id === editingItem.id ? { ...e, ...res.event } : e))
      );
      if (selectedDetailItem?.id === editingItem.id) {
        setSelectedDetailItem((prev) => (prev ? { ...prev, ...res.event } : null));
      }
    } else {
      await calendarService.createEvent(formData);
      await loadEvents(true);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (item: CalendarEventItem) => {
    await calendarService.deleteEvent(item.id);
    setEvents((prev) => prev.filter((e) => e.id !== item.id));
    if (selectedDetailItem?.id === item.id) {
      setSelectedDetailItem(null);
    }
  };

  const headerTitle = formatCalendarHeader(view, currentDate);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Calendar
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Unified schedule of all dated responsibilities
            </ThemedText>
          </View>

          <Button
            variant="primary"
            size="sm"
            onPress={() => handleOpenCreateModal()}
            icon={
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={16}
                tintColor={getButtonForegroundColor('primary', colors, isDark)}
              />
            }
          >
            Add Event
          </Button>
        </View>

        {/* View Switcher & Navigation Controls Card */}
        <View
          style={[
            styles.navCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Row: Segmented Control & Today button */}
          <View style={styles.controlsTopRow}>
            <View style={styles.segmentedWrapper}>
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={view}
                onChange={setView}
              />
            </View>

            <Pressable
              onPress={handleGoToToday}
              hitSlop={6}
              style={[
                styles.todayBtn,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Jump to Today"
            >
              <ThemedText style={[styles.todayBtnText, { color: colors.primary }]}>
                Today
              </ThemedText>
            </Pressable>
          </View>

          {/* Bottom Row: Month/Range Title and Prev/Next Navigation */}
          <View style={styles.navRow}>
            <View style={styles.titleWithSpinner}>
              <ThemedText style={[styles.navTitle, { color: colors.text }]}>
                {headerTitle}
              </ThemedText>
              {isLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            <View style={styles.arrowsRow}>
              <Pressable
                onPress={() => handleNavigate(-1)}
                hitSlop={6}
                style={[
                  styles.arrowBtn,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Previous Period"
              >
                <SymbolView
                  name={{
                    ios: 'chevron.left',
                    android: 'chevron_left',
                    web: 'chevron_left',
                  }}
                  size={18}
                  tintColor={colors.text}
                />
              </Pressable>

              <Pressable
                onPress={() => handleNavigate(1)}
                hitSlop={6}
                style={[
                  styles.arrowBtn,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next Period"
              >
                <SymbolView
                  name={{
                    ios: 'chevron.right',
                    android: 'chevron_right',
                    web: 'chevron_right',
                  }}
                  size={18}
                  tintColor={colors.text}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Entity Type Filter Tabs */}
        <View style={styles.filterBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTER_TYPES.map((filter) => {
              const isSelected = selectedType === filter.key;
              const typeCfg = filter.type ? ENTITY_CONFIG[filter.type] : null;
              const selectedFg = getButtonForegroundColor('primary', colors, isDark);

              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setSelectedType(filter.key)}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  {typeCfg && (
                    <SymbolView
                      name={{
                        ios: typeCfg.iosIcon as any,
                        android: typeCfg.icon as any,
                        web: typeCfg.icon as any,
                      }}
                      size={12}
                      tintColor={isSelected ? selectedFg : typeCfg.color}
                    />
                  )}
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? selectedFg : colors.textSecondary,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansSemiBold
                          : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Scrollable Calendar Body */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.eight },
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
          {/* Error State */}
          {error ? (
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
              title="Unable to Load Calendar"
              description={error}
              actionLabel="Retry"
              onAction={() => loadEvents(false)}
            />
          ) : view === 'month' ? (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={filteredEvents}
              onSelectDate={(d) => setSelectedDate(d)}
              onSelectItem={(item) => setSelectedDetailItem(item)}
              onAddEvent={(d) => handleOpenCreateModal(d)}
            />
          ) : view === 'week' ? (
            <WeekView
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={filteredEvents}
              onSelectDate={(d) => setSelectedDate(d)}
              onSelectItem={(item) => setSelectedDetailItem(item)}
              onAddEvent={(d) => handleOpenCreateModal(d)}
            />
          ) : (
            <DayView
              currentDate={selectedDate || currentDate}
              items={filteredEvents}
              onSelectItem={(item) => setSelectedDetailItem(item)}
              onAddEvent={(d) => handleOpenCreateModal(d)}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Create & Edit Event Modal Sheet */}
      <EventFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveEvent}
        event={editingItem}
        defaultDate={defaultFormDate}
      />

      {/* Item Details Inspection Modal Sheet */}
      <CalendarItemDetailsModal
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        item={selectedDetailItem}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteEvent}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  navCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  controlsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  segmentedWrapper: {
    flex: 1,
  },
  todayBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  navTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.editorial,
  },
  arrowsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBarWrapper: {
    marginVertical: Spacing.two,
  },
  filterScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
});
