/**
 * Task Card Component
 * Clean Android task item with 48dp completion toggle, priority badge, urgency tag, and category chip.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Badge, UrgencyTag, UrgencyType } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Priority, Task } from '../types';
import { getTaskUrgencyMeta } from '../services/taskCalculations';

export interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  isUpdating?: boolean;
}

const PRIORITY_STYLES: Record<
  Priority,
  { label: string; variant: 'neutral' | 'primary' | 'warning' | 'danger' }
> = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'primary' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

export function TaskCard({
  task,
  onPress,
  onToggleComplete,
  isUpdating = false,
}: TaskCardProps) {
  const { colors, isDark } = useAppTheme();
  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const urgency = getTaskUrgencyMeta(task);
  const priorityMeta = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  const mapUrgencyType = (): UrgencyType => {
    switch (urgency.tier) {
      case 'completed':
        return 'completed';
      case 'critical':
        return 'overdue';
      case 'urgent':
        return 'urgent';
      case 'dueSoon':
        return 'dueSoon';
      default:
        return 'upcoming';
    }
  };

  const borderColor =
    urgency.tier === 'critical'
      ? isDark
        ? 'rgba(239, 68, 68, 0.55)'
        : '#FCA5A5'
      : colors.border;

  const cardAccessibilityLabel = `Task ${task.title}, priority ${priorityMeta.label}, ${urgency.label}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor,
          opacity: isCompleted ? 0.62 : 1,
        },
      ]}
    >
      {/* Left 48x48dp Completion Checkbox */}
      <Pressable
        onPress={() => onToggleComplete(task)}
        disabled={isUpdating}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={styles.checkboxHitArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted, disabled: isUpdating, busy: isUpdating }}
        accessibilityLabel={isCompleted ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
        accessibilityHint="Toggles task completion status"
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isCompleted
                  ? Colors.urgency.completed.accent
                  : isInProgress
                    ? colors.primary
                    : colors.border,
                backgroundColor: isCompleted
                  ? Colors.urgency.completed.accent
                  : isInProgress
                    ? colors.primarySoft
                    : 'transparent',
              },
            ]}
          >
            {isCompleted ? (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={14}
                tintColor="#FFFFFF"
                weight="bold"
              />
            ) : isInProgress ? (
              <View style={[styles.inProgressDot, { backgroundColor: colors.primary }]} />
            ) : null}
          </View>
        )}
      </Pressable>

      {/* Main Content */}
      <Pressable
        onPress={() => onPress(task)}
        style={({ pressed }) => [styles.content, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityHint="Opens task details"
      >
        <View style={styles.titleRow}>
          <ThemedText
            style={[
              styles.title,
              {
                color: isCompleted ? colors.textSecondary : colors.text,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={2}
          >
            {task.title}
          </ThemedText>

          <Badge variant={priorityMeta.variant} size="sm">
            {priorityMeta.label}
          </Badge>
        </View>

        {task.description ? (
          <ThemedText
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {task.description}
          </ThemedText>
        ) : null}

        {/* Bottom Metadata Row */}
        <View style={styles.metaRow}>
          {urgency.tier !== 'none' ? (
            <UrgencyTag
              urgency={mapUrgencyType()}
              label={
                task.dueTime && urgency.tier !== 'completed'
                  ? `${urgency.label} · ${task.dueTime}`
                  : urgency.label
              }
            />
          ) : null}

          {isInProgress && (
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: isDark
                    ? Colors.urgency.dueSoon.darkBg
                    : Colors.urgency.dueSoon.lightBg,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.statusText,
                  {
                    color: isDark
                      ? Colors.urgency.dueSoon.darkText
                      : Colors.urgency.dueSoon.lightText,
                  },
                ]}
              >
                In Progress
              </ThemedText>
            </View>
          )}

          {task.category ? (
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
                {task.category}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.three + 2,
    paddingRight: Spacing.four,
    paddingLeft: Spacing.two,
    marginBottom: Spacing.three,
  },
  checkboxHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base - 1,
    lineHeight: 21,
  },
  description: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  categoryChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
});

export default TaskCard;

