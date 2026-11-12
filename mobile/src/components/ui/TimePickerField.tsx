/**
 * LifeAdmin Mobile — Shared Native-First Time Picker Field
 * Native Material 3 TimePicker dialog on Android builds with ExpoUI
 * (hardened for reliable repeated opening), paired with an Ocean Teal
 * interactive hour/minute + quick-slot fallback picker on iOS, Web, or
 * builds without ExpoUI. Always outputs 24-hour "HH:mm" strings.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { getButtonForegroundColor } from './Button';
import { getAndroidNativeDateTimePicker } from './DatePickerField';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';
import {
  formatDisplayTime,
  parseHHMMTime,
  parseHHMMTimeToDate,
  resolveTimePickerSelection,
} from '@/utils/dateTimeValidation';

const QUICK_TIMES = [
  { value: '09:00', label: '9:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '18:00', label: '6:00 PM' },
];

const MINUTE_STEPS = [0, 15, 30, 45];

export interface TimePickerFieldProps {
  label?: string;
  value: string;
  onChange: (nextTimeHHMM: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  compact?: boolean;
  accessibilityLabelPrefix?: string;
}

export function TimePickerField({
  label,
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Choose time',
  allowClear = false,
  compact = false,
  accessibilityLabelPrefix = 'Time',
}: TimePickerFieldProps) {
  const { colors, isDark } = useAppTheme();
  const NativeDateTimePicker = useMemo(() => getAndroidNativeDateTimePicker(), []);

  const parsedTime = useMemo(() => parseHHMMTime(value), [value]);
  const pickerDate = useMemo(
    () => parseHHMMTimeToDate(value) ?? new Date(2026, 0, 1, 9, 0, 0, 0),
    [value]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [pickerInstanceKey, setPickerInstanceKey] = useState(0);
  const handledSessionRef = useRef(false);
  const [draftHour, setDraftHour] = useState<number>(() => parsedTime?.hours ?? 9);
  const [draftMinute, setDraftMinute] = useState<number>(() => parsedTime?.minutes ?? 0);

  useEffect(() => {
    if (parsedTime) {
      setDraftHour(parsedTime.hours);
      setDraftMinute(parsedTime.minutes);
    }
  }, [parsedTime]);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  const errorColor = isDark ? Colors.urgency.critical.accent : Colors.urgency.critical.lightText;
  const activeFg = getButtonForegroundColor('primary', colors, isDark);

  const handleToggle = () => {
    if (disabled) return;
    Keyboard.dismiss();

    if (NativeDateTimePicker) {
      handledSessionRef.current = false;
      setPickerInstanceKey((prev) => prev + 1);
      setIsOpen(true);
      return;
    }

    if (parsedTime) {
      setDraftHour(parsedTime.hours);
      setDraftMinute(parsedTime.minutes);
    }
    setIsOpen((prev) => !prev);
  };

  const handleClear = () => {
    if (disabled) return;
    setIsOpen(false);
    onChange('');
  };

  const formatDraftHHMM = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const shiftHour = (delta: number) => {
    setDraftHour((prev) => (prev + delta + 24) % 24);
  };

  const showClearBtn = allowClear && Boolean(value?.trim()) && !disabled;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <ThemedText
          numberOfLines={1}
          style={[styles.label, { color: colors.text }]}
        >
          {label}
        </ThemedText>
      ) : null}

      <View style={[styles.fieldRow, compact && styles.fieldRowCompact]}>
        <Pressable
          onPress={handleToggle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabelPrefix}, ${formatDisplayTime(value, placeholder)}`}
          style={({ pressed }) => [
            styles.trigger,
            compact && styles.triggerCompact,
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
          <View style={[styles.triggerLeft, compact && styles.triggerLeftCompact]}>
            <SymbolView
              name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              size={compact ? 15 : 18}
              tintColor={error ? errorColor : colors.primary}
            />
            <ThemedText
              style={[
                styles.triggerTimeText,
                compact && styles.triggerTimeTextCompact,
                {
                  color: parsedTime ? colors.text : colors.textMuted,
                  fontFamily: parsedTime
                    ? Typography.fontFamilies.sansSemiBold
                    : Typography.fontFamilies.sans,
                },
              ]}
              numberOfLines={1}
            >
              {formatDisplayTime(value, placeholder)}
            </ThemedText>
          </View>

          <View style={styles.triggerRight}>
            <SymbolView
              name={{
                ios: isOpen ? 'chevron.up' : 'chevron.down',
                android: isOpen ? 'expand_less' : 'expand_more',
                web: isOpen ? 'expand_less' : 'expand_more',
              }}
              size={compact ? 16 : 18}
              tintColor={colors.textSecondary}
            />
          </View>
        </Pressable>

        {showClearBtn ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${accessibilityLabelPrefix.toLowerCase()}`}
            style={({ pressed }) => [
              styles.clearBtn,
              compact && styles.clearBtnCompact,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderSubtle,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={compact ? 14 : 16}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <ThemedText style={[styles.errorText, { color: errorColor }]}>
          {error}
        </ThemedText>
      ) : null}

      {/* Native Android Material 3 TimePicker Dialog */}
      {isOpen && NativeDateTimePicker ? (
        <NativeDateTimePicker
          key={`time-picker-${pickerInstanceKey}`}
          value={pickerDate}
          mode="time"
          presentation="dialog"
          display="default"
          is24Hour={false}
          accentColor={colors.primary}
          themeVariant={isDark ? 'dark' : 'light'}
          onValueChange={(_event, selectedDate) => {
            if (handledSessionRef.current) return;
            handledSessionRef.current = true;
            setIsOpen(false);
            onChange(resolveTimePickerSelection(value, selectedDate));
          }}
          onDismiss={() => {
            if (handledSessionRef.current) return;
            handledSessionRef.current = true;
            setIsOpen(false);
          }}
        />
      ) : null}

      {/* Interactive Fallback Time Picker Card (iOS, Web, or Android without ExpoUI) */}
      {isOpen && !NativeDateTimePicker ? (
        <View
          style={[
            styles.pickerCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.stepperHeader}>
            <Pressable
              onPress={() => shiftHour(-1)}
              hitSlop={8}
              style={[
                styles.stepBtn,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous hour"
            >
              <SymbolView
                name={{ ios: 'minus', android: 'remove', web: 'remove' }}
                size={16}
                tintColor={colors.text}
              />
            </Pressable>

            <View style={styles.previewTimeWrap}>
              <ThemedText style={[styles.previewTime, { color: colors.text }]}>
                {formatDisplayTime(formatDraftHHMM(draftHour, draftMinute))}
              </ThemedText>
            </View>

            <Pressable
              onPress={() => shiftHour(1)}
              hitSlop={8}
              style={[
                styles.stepBtn,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next hour"
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={16}
                tintColor={colors.text}
              />
            </Pressable>
          </View>

          {/* Quarter-hour quick selection */}
          <View style={styles.chipRow}>
            {MINUTE_STEPS.map((min) => {
              const selected = draftMinute === min;
              return (
                <Pressable
                  key={min}
                  onPress={() => setDraftMinute(min)}
                  style={[
                    styles.minuteChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Set minutes to ${String(min).padStart(2, '0')}`}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: selected ? activeFg : colors.text },
                    ]}
                  >
                    :{String(min).padStart(2, '0')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Common time-of-day shortcuts */}
          <View style={styles.chipRow}>
            {QUICK_TIMES.map((preset) => {
              const isSelected = value.trim() === preset.value;
              return (
                <Pressable
                  key={preset.value}
                  onPress={() => {
                    onChange(preset.value);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${preset.label}`}
                >
                  <ThemedText
                    style={[
                      styles.presetText,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footerRow}>
            {allowClear && Boolean(value?.trim()) ? (
              <Pressable
                onPress={handleClear}
                hitSlop={8}
                style={styles.footerBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear time selection"
              >
                <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
                  Clear
                </ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setIsOpen(false)}
              hitSlop={8}
              style={styles.footerBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel time selection"
            >
              <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
                Cancel
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                onChange(formatDraftHHMM(draftHour, draftMinute));
                setIsOpen(false);
              }}
              hitSlop={8}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Apply selected time"
            >
              <ThemedText style={[styles.footerText, { color: activeFg }]}>
                Set Time
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fieldRowCompact: {
    gap: Spacing.one,
  },
  trigger: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  triggerCompact: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  clearBtn: {
    width: 44,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnCompact: {
    width: 36,
  },
  triggerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  triggerLeftCompact: {
    gap: Spacing.one + 2,
  },
  triggerTimeText: {
    fontSize: Typography.fontSize.sm,
  },
  triggerTimeTextCompact: {
    fontSize: Typography.fontSize.xs + 1,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  pickerCard: {
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTimeWrap: {
    flex: 1,
    alignItems: 'center',
  },
  previewTime: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  minuteChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  presetChip: {
    paddingHorizontal: Spacing.two + 2,
    minHeight: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
  },
  footerBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  applyBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

