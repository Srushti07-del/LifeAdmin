/**
 * Day Calendar View Component
 * Detailed chronological agenda separated into All-Day/Due items and Scheduled Times.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarEventItem } from '../types';
import { CalendarItemCard } from './CalendarItemCard';

export interface DayViewProps {
  currentDate: Date;
  items: CalendarEventItem[];
  onSelectItem: (item: CalendarEventItem) => void;
  onAddEvent: (date: Date) => void;
}

export function DayView({
  currentDate,
  items,
  onSelectItem,
  onAddEvent,
}: DayViewProps) {
  const { colors, isDark } = useAppTheme();
  // The calendar header already shows the full date, so the banner only adds context.
  const isToday = currentDate.toDateString() === new Date().toDateString();

  const allDayItems = useMemo(
    () => items.filter((i) => i.allDay || (!i.startTime && !i.endTime)),
    [items]
  );

  const timedItems = useMemo(
    () =>
      items
        .filter((i) => !allDayItems.includes(i))
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    [items, allDayItems]
  );

  return (
    <View style={styles.container}>
      {/* Day Overview Banner */}
      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.bannerHeader}>
          <View>
            <ThemedText style={[styles.bannerTitle, { color: colors.text }]}>
              {isToday
                ? 'Today'
                : currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
            </ThemedText>
            <ThemedText style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
              {items.length} {items.length === 1 ? 'item' : 'items'} scheduled
            </ThemedText>
          </View>

          <Pressable
            onPress={() => onAddEvent(currentDate)}
            hitSlop={6}
            style={[
              styles.addBtn,
              { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add event today"
          >
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={16}
              tintColor={getButtonForegroundColor('primary', colors, isDark)}
            />
            <ThemedText
              style={[
                styles.addBtnText,
                { color: getButtonForegroundColor('primary', colors, isDark) },
              ]}
            >
              Add Event
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Empty State */}
      {items.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            size={36}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            No Scheduled Items
          </ThemedText>
          <ThemedText style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            No tasks, bills, appointments, or events for this date.
          </ThemedText>
        </View>
      ) : (
        <>
          {/* All-Day / Due Section */}
          {allDayItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <SymbolView
                  name={{ ios: 'sun.max', android: 'wb_sunny', web: 'wb_sunny' }}
                  size={14}
                  tintColor={colors.textSecondary}
                />
                <ThemedText
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  All Day & Due Responsibilities ({allDayItems.length})
                </ThemedText>
              </View>

              <View style={styles.itemsList}>
                {allDayItems.map((item) => (
                  <CalendarItemCard
                    key={item.id}
                    item={item}
                    onPress={onSelectItem}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Timed Items Section */}
          {timedItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <SymbolView
                  name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                  size={14}
                  tintColor={colors.textSecondary}
                />
                <ThemedText
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  Scheduled Agenda ({timedItems.length})
                </ThemedText>
              </View>

              <View style={styles.itemsList}>
                {timedItems.map((item) => (
                  <CalendarItemCard
                    key={item.id}
                    item={item}
                    onPress={onSelectItem}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  overviewCard: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.editorial,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  addBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  emptyCard: {
    padding: Spacing.eight,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.one,
  },
  emptyDesc: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    maxWidth: 240,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: Spacing.two,
  },
});

