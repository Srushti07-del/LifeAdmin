/**
 * Month Calendar View Component
 * 7-column calendar grid with today highlights, selected date focus,
 * multi-entity indicator dots, and responsive cell sizing.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarDayCell, CalendarEventItem } from '../types';
import {
  getMonthGridCells,
  groupEventsByDate,
} from '../services/calendarCalculations';
import { CalendarItemCard, ENTITY_CONFIG } from './CalendarItemCard';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEventItem[];
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarEventItem) => void;
  onAddEvent?: (date: Date) => void;
}

export function MonthView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectItem,
}: MonthViewProps) {
  const { colors, isDark } = useAppTheme();

  // Grid cells for current month
  const cells = useMemo(
    () => getMonthGridCells(currentDate, selectedDate),
    [currentDate, selectedDate]
  );

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  // Selected date items
  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;
  const selectedDayItems = selectedDateKey ? eventsByDate[selectedDateKey] || [] : [];

  return (
    <View style={styles.container}>
      {/* Month Calendar Grid Card */}
      <View
        style={[
          styles.gridCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Day-of-week header row */}
        <View
          style={[
            styles.weekHeaderRow,
            {
              borderBottomColor: colors.border,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            },
          ]}
        >
          {WEEKDAYS.map((day) => (
            <View key={day} style={styles.weekdayCol}>
              <ThemedText style={[styles.weekdayText, { color: colors.textSecondary }]}>
                {day}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* 7-column day cells grid */}
        <View style={styles.gridMatrix}>
          {cells.map((cell, index) => {
            const dayEvents = eventsByDate[cell.dateString] || [];
            const hasEvents = dayEvents.length > 0;

            return (
              <Pressable
                key={`${cell.dateString}-${index}`}
                onPress={() => onSelectDate(cell.date)}
                style={[
                  styles.dayCell,
                  !cell.isCurrentMonth && styles.otherMonthCell,
                  cell.isSelected && [
                    styles.selectedCell,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primarySoft,
                    },
                  ],
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cell.dateString}, ${dayEvents.length} events`}
              >
                {/* Day number badge */}
                <View
                  style={[
                    styles.dayNumberCircle,
                    cell.isToday && [
                      styles.todayCircle,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayNumberText,
                      {
                        color: cell.isToday
                          ? getButtonForegroundColor('primary', colors, isDark)
                          : !cell.isCurrentMonth
                          ? colors.textMuted
                          : colors.text,
                        fontFamily:
                          cell.isToday || cell.isSelected
                            ? Typography.fontFamilies.sansBold
                            : Typography.fontFamilies.sansMedium,
                      },
                    ]}
                  >
                    {cell.dayNumber}
                  </ThemedText>
                </View>

                {/* Event indicator dots */}
                <View style={styles.dotsRow}>
                  {dayEvents.slice(0, 3).map((item, dotIdx) => {
                    const dotColor =
                      item.color || ENTITY_CONFIG[item.type]?.color || colors.primary;
                    return (
                      <View
                        key={`${item.id}-${dotIdx}`}
                        style={[styles.eventDot, { backgroundColor: dotColor }]}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <View style={styles.moreDot}>
                      <ThemedText style={[styles.moreDotText, { color: colors.textSecondary }]}>
                        +{dayEvents.length - 3}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Day Agenda Section */}
      {selectedDate && (
        <View style={styles.agendaSection}>
          <View style={styles.agendaHeaderRow}>
            <View>
              <ThemedText style={[styles.agendaTitle, { color: colors.text }]}>
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </ThemedText>
              <ThemedText style={[styles.agendaSubtitle, { color: colors.textSecondary }]}>
                {selectedDayItems.length}{' '}
                {selectedDayItems.length === 1 ? 'item' : 'items'} scheduled
              </ThemedText>
            </View>
          </View>

          {/* Agenda items list */}
          {selectedDayItems.length === 0 ? (
            <View
              style={[
                styles.emptyDayBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.emptyDayText, { color: colors.textSecondary }]}>
                Nothing scheduled on this day.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {selectedDayItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  onPress={onSelectItem}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  gridCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    letterSpacing: 0.5,
  },
  gridMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.md,
  },
  otherMonthCell: {
    opacity: 0.45,
  },
  selectedCell: {
    borderWidth: 1.5,
  },
  dayNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  dayNumberText: {
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 8,
    marginTop: 2,
  },
  eventDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  moreDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreDotText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 8,
    fontVariant: ['tabular-nums'],
  },
  agendaSection: {
    gap: Spacing.three,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  agendaTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  agendaSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  emptyDayBox: {
    padding: Spacing.six,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: Typography.fontSize.sm,
  },
  itemsList: {
    gap: Spacing.two,
  },
});

