/**
 * Week Calendar View Component
 * Organizes schedule across the 7 days of the active week.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarDayCell, CalendarEventItem } from '../types';
import {
  getWeekDays,
  groupEventsByDate,
} from '../services/calendarCalculations';
import { CalendarItemCard } from './CalendarItemCard';

export interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEventItem[];
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarEventItem) => void;
  onAddEvent: (date: Date) => void;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function WeekView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectItem,
  onAddEvent,
}: WeekViewProps) {
  const { colors, isDark } = useAppTheme();

  const weekDays = useMemo(
    () => getWeekDays(currentDate, selectedDate),
    [currentDate, selectedDate]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  return (
    <View style={styles.container}>
      {weekDays.map((cell) => {
        const dayEvents = eventsByDate[cell.dateString] || [];
        const weekdayName = WEEKDAY_NAMES[cell.date.getDay()];
        const isSelected = selectedDate ? cell.isSelected : false;

        return (
          <View
            key={cell.dateString}
            style={[
              styles.daySection,
              {
                backgroundColor: colors.surface,
                borderColor: isSelected
                  ? colors.primary
                  : colors.border,
                borderWidth: isSelected ? 1.5 : 1,
              },
            ]}
          >
            {/* Day Header Row */}
            <View style={styles.dayHeaderRow}>
              <Pressable
                onPress={() => onSelectDate(cell.date)}
                style={styles.dayTitleCol}
                accessibilityRole="button"
                accessibilityLabel={`${weekdayName}, ${cell.dateString}`}
              >
                <View
                  style={[
                    styles.dateNumberCircle,
                    cell.isToday && [
                      styles.todayCircle,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dateNumberText,
                      {
                        color: cell.isToday ? '#FFFFFF' : colors.text,
                        fontWeight: Typography.fontWeight.bold,
                      },
                    ]}
                  >
                    {cell.dayNumber}
                  </ThemedText>
                </View>

                <View>
                  <ThemedText
                    style={[
                      styles.weekdayText,
                      {
                        color: cell.isToday
                          ? colors.primary
                          : colors.text,
                        fontWeight: Typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {weekdayName}
                  </ThemedText>
                  <ThemedText style={[styles.itemCountText, { color: colors.textSecondary }]}>
                    {dayEvents.length}{' '}
                    {dayEvents.length === 1 ? 'item' : 'items'}
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => onAddEvent(cell.date)}
                style={[
                  styles.quickAddBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : '#F1F5F9',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Add event on ${weekdayName}`}
              >
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  size={14}
                  tintColor={colors.primary}
                />
              </Pressable>
            </View>

            {/* Day items */}
            {dayEvents.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items scheduled
              </ThemedText>
            ) : (
              <View style={styles.itemsWrapper}>
                {dayEvents.map((item) => (
                  <CalendarItemCard
                    key={item.id}
                    item={item}
                    onPress={onSelectItem}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  daySection: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  dayTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  todayCircle: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  dateNumberText: {
    fontSize: Typography.fontSize.xs,
  },
  weekdayText: {
    fontSize: Typography.fontSize.sm,
  },
  itemCountText: {
    fontSize: 10,
  },
  quickAddBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  itemsWrapper: {
    gap: Spacing.one,
  },
});

