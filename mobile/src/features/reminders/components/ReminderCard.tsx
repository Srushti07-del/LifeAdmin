/**
 * LifeAdmin Mobile — Reminder Card Component
 * Presents individual reminder with interactive checkbox toggle,
 * recurrence badge, alert timing, priority indicator, and quick actions.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { Reminder } from '../types';
import {
  getReminderSection,
  formatReminderDueDate,
  formatReminderDueTime,
  formatOffset,
} from '../services/reminderCalculations';

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatRecurrenceLabel(recurrence?: Reminder['recurrence']): string {
  if (!recurrence || recurrence.type === 'none') return '';
  const unit = recurrence.type.charAt(0).toUpperCase() + recurrence.type.slice(1);
  if (recurrence.interval && recurrence.interval > 1) {
    const nounMap: Record<string, string> = {
      daily: 'days',
      weekly: 'weeks',
      monthly: 'months',
      yearly: 'years',
    };
    return `Every ${recurrence.interval} ${nounMap[recurrence.type] || unit}`;
  }
  return `Repeats ${unit}`;
}

export function ReminderCard({
  reminder,
  onPress,
  onToggleComplete,
  onEdit,
  onDelete,
}: ReminderCardProps) {
  const { colors, isDark } = useAppTheme();

  const isCompleted = reminder.status === 'completed';
  const section = getReminderSection(reminder);
  const isOverdue = section === 'overdue';

  const priorityMap = {
    urgent: {
      color: isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText,
      bg: isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg,
    },
    high: {
      color: isDark ? Colors.urgency.urgent.darkText : Colors.urgency.urgent.lightText,
      bg: isDark ? Colors.urgency.urgent.darkBg : Colors.urgency.urgent.lightBg,
    },
    medium: {
      color: isDark ? Colors.urgency.upcoming.darkText : Colors.urgency.upcoming.lightText,
      bg: isDark ? Colors.urgency.upcoming.darkBg : Colors.urgency.upcoming.lightBg,
    },
    low: {
      color: colors.textSecondary,
      bg: colors.surfaceSecondary,
    },
  };
  const priorityStyle = priorityMap[reminder.priority] || priorityMap.medium;

  const formattedDate = formatReminderDueDate(reminder.dueDate, reminder.dueTime);
  const formattedTime = formatReminderDueTime(reminder.dueTime);

  const offsetCount = reminder.reminderOffsetMinutes?.length || 0;
  const hasOffsets = offsetCount > 0;
  const firstOffset = hasOffsets ? reminder.reminderOffsetMinutes![0] : 0;
  const recurrenceLabel = formatRecurrenceLabel(reminder.recurrence);
  const isRecurring = Boolean(recurrenceLabel);

  const overdueColor = isDark
    ? Colors.urgency.critical.darkText
    : Colors.urgency.critical.lightText;
  const overdueBg = isDark
    ? Colors.urgency.critical.darkBg
    : Colors.urgency.critical.lightBg;
  const alertColor = isDark
    ? Colors.urgency.dueSoon.darkText
    : Colors.urgency.dueSoon.lightText;
  const alertBg = isDark
    ? Colors.urgency.dueSoon.darkBg
    : Colors.urgency.dueSoon.lightBg;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor:
            isOverdue && !isCompleted
              ? Colors.urgency.critical.accent
              : colors.border,
          opacity: isCompleted ? 0.68 : pressed ? 0.94 : 1,
        },
        createShadow(isDark, 'card'),
      ]}
    >
      <View style={styles.mainRow}>
        {/* Completion Checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          hitSlop={10}
          style={[
            styles.checkbox,
            {
              backgroundColor: isCompleted
                ? Colors.urgency.completed.accent
                : colors.surfaceSecondary,
              borderColor: isCompleted
                ? Colors.urgency.completed.accent
                : colors.border,
            },
          ]}
        >
          {isCompleted && (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check' }}
              size={14}
              tintColor="#FFFFFF"
            />
          )}
        </Pressable>

        {/* Content Body */}
        <View style={styles.contentBody}>
          {/* Top Title & Priority */}
          <View style={styles.titleRow}>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.title,
                { color: isCompleted ? colors.textMuted : colors.text },
                isCompleted && styles.completedTitle,
              ]}
            >
              {reminder.title}
            </ThemedText>

            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityStyle.bg },
              ]}
            >
              <ThemedText style={[styles.priorityText, { color: priorityStyle.color }]}>
                {reminder.priority.toUpperCase()}
              </ThemedText>
            </View>
          </View>

          {/* Description Preview if present */}
          {reminder.description ? (
            <ThemedText
              numberOfLines={2}
              style={[styles.description, { color: colors.textSecondary }]}
            >
              {reminder.description}
            </ThemedText>
          ) : null}

          {/* Date & Time Cue */}
          <View style={styles.timingRow}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_today' }}
              size={13}
              tintColor={isOverdue ? overdueColor : colors.primary}
            />
            <ThemedText
              style={[
                styles.timingText,
                { color: isOverdue ? overdueColor : colors.text },
              ]}
            >
              {formattedDate} {formattedTime ? `at ${formattedTime}` : ''}
            </ThemedText>

            {isOverdue && !isCompleted && (
              <View style={[styles.overdueChip, { backgroundColor: overdueBg }]}>
                <ThemedText style={[styles.overdueChipText, { color: overdueColor }]}>
                  OVERDUE
                </ThemedText>
              </View>
            )}
          </View>

          {/* Metadata Chips: Category, Recurrence, Alert Offset */}
          <View style={styles.chipsRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ThemedText style={[styles.chipText, { color: colors.textSecondary }]}>
                {reminder.category || 'Personal'}
              </ThemedText>
            </View>

            {isRecurring && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <SymbolView
                  name={{ ios: 'repeat', android: 'repeat' }}
                  size={11}
                  tintColor={colors.primary}
                />
                <ThemedText style={[styles.chipText, { color: colors.primary }]}>
                  {recurrenceLabel}
                </ThemedText>
              </View>
            )}

            {hasOffsets && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: alertBg },
                ]}
              >
                <SymbolView
                  name={{ ios: 'bell', android: 'notifications' }}
                  size={11}
                  tintColor={alertColor}
                />
                <ThemedText style={[styles.chipText, { color: alertColor }]}>
                  {formatOffset(firstOffset)}
                  {offsetCount > 1 ? ` +${offsetCount - 1}` : ''}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions Menu */}
        <View style={styles.actionsColumn}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={8}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'pencil', android: 'edit' }}
              size={15}
              tintColor={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={8}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash', android: 'delete' }}
              size={15}
              tintColor={Colors.urgency.critical.accent}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  contentBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
    marginTop: 3,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  timingText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontVariant: ['tabular-nums'],
  },
  overdueChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  overdueChipText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  chipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  actionsColumn: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

