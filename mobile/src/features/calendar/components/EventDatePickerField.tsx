/**
 * Event Date Picker Field
 * Native Material 3 Compose picker on Android builds with ExpoUI,
 * with an inline interactive visual calendar fallback on older APKs, iOS, and Web.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { DateTimePickerProps } from '@expo/ui/community/datetime-picker';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { SymbolView } from 'expo-symbols';
import { getButtonForegroundColor } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';
import {
  formatCalendarHeader,
  formatDisplayDate,
  getMonthGridCells,
  parseLocalISODate,
  resolveDatePickerSelection,
  toLocalISODate,
} from '../services/calendarCalculations';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface EventDatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (nextIsoDate: string) => void;
  error?: string;
  disabled?: boolean;
}

function getAndroidNativeDatePicker(): React.ComponentType<DateTimePickerProps> | null {
  if (Platform.OS !== 'android') return null;
  try {
    if (!requireOptionalNativeModule('ExpoUI')) {
      return null;
    }
    // Load lazily so builds without ExpoUI native views never throw at module import time.
    const mod = require('@expo/ui/community/datetime-picker') as {
      DateTimePicker?: React.ComponentType<DateTimePickerProps>;
    };
    return mod?.DateTimePicker ?? null;
  } catch {
    return null;
  }
}

export function EventDatePickerField({
  label = 'Start Date *',
  value,
  onChange,
  error,
  disabled = false,
}: EventDatePickerFieldProps) {
  const { colors, isDark } = useAppTheme();
  const NativeDateTimePicker = useMemo(() => getAndroidNativeDatePicker(), []);

  const parsedSelectedDate = useMemo(() => parseLocalISODate(value), [value]);
  const pickerDate = useMemo(() => parsedSelectedDate ?? new Date(), [parsedSelectedDate]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => pickerDate);

  useEffect(() => {
    if (parsedSelectedDate) {
      setViewMonth(parsedSelectedDate);
    }
  }, [parsedSelectedDate]);

  const cells = useMemo(
    () => (isOpen && !NativeDateTimePicker ? getMonthGridCells(viewMonth, parsedSelectedDate) : []),
    [isOpen, NativeDateTimePicker, viewMonth, parsedSelectedDate]
  );

  const errorColor = isDark ? Colors.urgency.critical.accent : Colors.urgency.critical.lightText;
  const activeDayTextColor = getButtonForegroundColor('primary', colors, isDark);

  const handleToggle = () => {
    if (disabled) return;
    Keyboard.dismiss();
    setViewMonth(parsedSelectedDate ?? new Date());
    setIsOpen((prev) => !prev);
  };

  const handleShiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <View style={styles.wrapper}>
      <ThemedText style={[styles.label, { color: colors.text }]}>
        {label}
      </ThemedText>

      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Start date, ${formatDisplayDate(value)}`}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: error
              ? errorColor
              : isOpen
                ? colors.primary
                : colors.borderSubtle,
            opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            size={18}
            tintColor={error ? errorColor : colors.primary}
          />
          <ThemedText
            style={[
              styles.triggerDateText,
              {
                color: parsedSelectedDate ? colors.text : colors.textMuted,
                fontFamily: parsedSelectedDate
                  ? Typography.fontFamilies.sansSemiBold
                  : Typography.fontFamilies.sans,
              },
            ]}
            numberOfLines={1}
          >
            {formatDisplayDate(value, 'Choose date')}
          </ThemedText>
        </View>

        <View style={styles.triggerRight}>
          {parsedSelectedDate ? (
            <View
              style={[
                styles.isoBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <ThemedText style={[styles.isoText, { color: colors.textSecondary }]}>
                {toLocalISODate(parsedSelectedDate)}
              </ThemedText>
            </View>
          ) : null}

          <SymbolView
            name={{
              ios: isOpen ? 'chevron.up' : 'chevron.down',
              android: isOpen ? 'expand_less' : 'expand_more',
              web: isOpen ? 'expand_less' : 'expand_more',
            }}
            size={18}
            tintColor={colors.textSecondary}
          />
        </View>
      </Pressable>

      {error ? (
        <ThemedText style={[styles.errorText, { color: errorColor }]}>
          {error}
        </ThemedText>
      ) : null}

      {/* Native Android Material 3 DatePicker Dialog when ExpoUI is compiled in */}
      {isOpen && NativeDateTimePicker ? (
        <NativeDateTimePicker
          value={pickerDate}
          mode="date"
          presentation="dialog"
          display="default"
          accentColor={colors.primary}
          themeVariant={isDark ? 'dark' : 'light'}
          onValueChange={(_event, selectedDate) => {
            setIsOpen(false);
            onChange(resolveDatePickerSelection(value, selectedDate));
          }}
          onDismiss={() => setIsOpen(false)}
        />
      ) : null}

      {/* In-app visual calendar fallback (iOS, Web, or Android APK without ExpoUI) */}
      {isOpen && !NativeDateTimePicker ? (
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => handleShiftMonth(-1)}
              hitSlop={8}
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <SymbolView
                name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                size={16}
                tintColor={colors.text}
              />
            </Pressable>

            <ThemedText style={[styles.monthTitle, { color: colors.text }]}>
              {formatCalendarHeader('month', viewMonth)}
            </ThemedText>

            <View style={styles.headerRightActions}>
              <Pressable
                onPress={() => {
                  const today = new Date();
                  setViewMonth(today);
                  onChange(resolveDatePickerSelection(value, today));
                  setIsOpen(false);
                }}
                hitSlop={6}
                style={[styles.todayBtn, { backgroundColor: colors.primarySoft }]}
                accessibilityRole="button"
                accessibilityLabel="Select today"
              >
                <ThemedText style={[styles.todayBtnText, { color: colors.primary }]}>
                  Today
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => handleShiftMonth(1)}
                hitSlop={8}
                style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  size={16}
                  tintColor={colors.text}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_INITIALS.map((day, idx) => (
              <View key={`${day}-${idx}`} style={styles.weekdayCell}>
                <ThemedText style={[styles.weekdayLabel, { color: colors.textMuted }]}>
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {cells.map((cell, idx) => {
              const selected = cell.isSelected;
              const isToday = cell.isToday;
              return (
                <Pressable
                  key={`${cell.dateString}-${idx}`}
                  onPress={() => {
                    onChange(resolveDatePickerSelection(value, cell.date));
                    setIsOpen(false);
                  }}
                  style={[
                    styles.dayCell,
                    selected && { backgroundColor: colors.primary },
                    !selected && isToday && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={formatDisplayDate(cell.dateString, cell.dateString)}
                  accessibilityState={{ selected }}
                >
                  <ThemedText
                    style={[
                      styles.dayNumber,
                      {
                        color: selected
                          ? activeDayTextColor
                          : cell.isCurrentMonth
                            ? isToday
                              ? colors.primary
                              : colors.text
                            : colors.textMuted,
                        fontFamily:
                          selected || isToday
                            ? Typography.fontFamilies.sansSemiBold
                            : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {cell.dayNumber}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable
              onPress={() => {
                onChange(resolveDatePickerSelection(value, null, true));
                setIsOpen(false);
              }}
              hitSlop={8}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel date selection"
            >
              <ThemedText style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 2,
  },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  triggerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  triggerDateText: {
    fontSize: Typography.fontSize.sm,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  isoBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  isoText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  calendarCard: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.two,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  todayBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: 11,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: 11,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: Typography.fontSize.xs + 1,
    fontVariant: ['tabular-nums'],
  },
  calendarFooter: {
    alignItems: 'flex-end',
    paddingTop: Spacing.one,
  },
  cancelBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

