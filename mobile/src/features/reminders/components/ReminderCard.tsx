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
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  urgent: { color: '#EF4444', bg: '#FEE2E2' },
  high: { color: '#F97316', bg: '#FFEDD5' },
  medium: { color: '#0D9488', bg: '#CCFBF1' },
  low: { color: '#6B7280', bg: '#F3F4F6' },
};

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

  const priorityStyle = PRIORITY_COLORS[reminder.priority] || PRIORITY_COLORS.medium;
  const formattedDate = formatReminderDueDate(reminder.dueDate, reminder.dueTime);
  const formattedTime = formatReminderDueTime(reminder.dueTime);

  const hasOffsets = (reminder.reminderOffsetMinutes?.length || 0) > 0;
  const firstOffset = hasOffsets ? reminder.reminderOffsetMinutes![0] : 0;
  const isRecurring = reminder.recurrence && reminder.recurrence.type !== 'none';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#1C292D' : colors.surface,
          borderColor: isOverdue && !isCompleted ? '#EF4444' : isDark ? '#304247' : colors.border,
          opacity: isCompleted ? 0.65 : pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={styles.mainRow}>
        {/* Completion Checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          hitSlop={8}
          style={[
            styles.checkbox,
            {
              backgroundColor: isCompleted
                ? '#10B981'
                : isDark
                ? '#26383E'
                : colors.backgroundElement,
              borderColor: isCompleted ? '#10B981' : isDark ? '#354E57' : colors.border,
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
                { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : priorityStyle.bg },
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
              tintColor={isOverdue ? '#EF4444' : colors.primary}
            />
            <ThemedText
              style={[
                styles.timingText,
                { color: isOverdue ? '#EF4444' : colors.text },
              ]}
            >
              {formattedDate} {formattedTime ? `at ${formattedTime}` : ''}
            </ThemedText>

            {isOverdue && !isCompleted && (
              <View style={[styles.overdueChip, { backgroundColor: isDark ? '#4A1D1D' : '#FEE2E2' }]}>
                <ThemedText style={styles.overdueChipText}>OVERDUE</ThemedText>
              </View>
            )}
          </View>

          {/* Metadata Chips: Category, Recurrence, Alert Offset */}
          <View style={styles.chipsRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
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
                  { backgroundColor: isDark ? 'rgba(85, 189, 181, 0.15)' : 'rgba(13, 110, 110, 0.08)' },
                ]}
              >
                <SymbolView
                  name={{ ios: 'repeat', android: 'repeat' }}
                  size={11}
                  tintColor={colors.primary}
                />
                <ThemedText style={[styles.chipText, { color: colors.primary }]}>
                  {reminder.recurrence!.type.charAt(0).toUpperCase() + reminder.recurrence!.type.slice(1)}
                </ThemedText>
              </View>
            )}

            {hasOffsets && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' },
                ]}
              >
                <SymbolView
                  name={{ ios: 'bell', android: 'notifications' }}
                  size={11}
                  tintColor="#D97706"
                />
                <ThemedText style={[styles.chipText, { color: '#D97706' }]}>
                  {formatOffset(firstOffset)}
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
              { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
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
              { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash', android: 'delete' }}
              size={15}
              tintColor="#EF4444"
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
  },
  overdueChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  overdueChipText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#EF4444',
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
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

