/**
 * Task Details Inspection Modal Sheet
 * Shows full task context, quick workflow stage switchers, edit, and safe delete.
 */

import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  ModalSheet,
  UrgencyTag,
  getButtonForegroundColor,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Task, TaskStatus } from '../types';
import { getTaskUrgencyMeta } from '../services/taskCalculations';

export interface TaskDetailsModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onChangeStatus: (task: Task, status: TaskStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating?: boolean;
}

const STAGES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function TaskDetailsModal({
  task,
  onClose,
  onEdit,
  onChangeStatus,
  onDelete,
  isUpdating = false,
}: TaskDetailsModalProps) {
  const { colors, isDark } = useAppTheme();

  if (!task) return null;

  const urgency = getTaskUrgencyMeta(task);
  const priorityVariant =
    task.priority === 'urgent'
      ? 'danger'
      : task.priority === 'high'
        ? 'warning'
        : task.priority === 'medium'
          ? 'primary'
          : 'neutral';

  const confirmDelete = () => {
    Alert.alert(
      'Delete Task',
      `Remove "${task.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDelete(task._id);
            onClose();
          },
        },
      ]
    );
  };

  const formattedDue = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No due date set';

  return (
    <ModalSheet
      isOpen={Boolean(task)}
      onClose={onClose}
      title="Task Details"
      footer={
        <View style={styles.footerRow}>
          <Button
            variant="danger"
            onPress={confirmDelete}
            disabled={isUpdating}
            icon={
              <SymbolView
                name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                size={15}
                tintColor="#FFFFFF"
              />
            }
          >
            Delete
          </Button>
          <Button
            variant="primary"
            onPress={() => {
              onClose();
              onEdit(task);
            }}
            style={styles.editBtn}
            icon={
              <SymbolView
                name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                size={15}
                tintColor={getButtonForegroundColor('primary', colors, isDark)}
              />
            }
          >
            Edit Task
          </Button>
        </View>
      }
    >
      <View style={styles.body}>
        {/* Title & Tags */}
        <View style={styles.titleSection}>
          <ThemedText style={[styles.taskTitle, { color: colors.text }]}>
            {task.title}
          </ThemedText>

          <View style={styles.badgeRow}>
            <Badge variant={priorityVariant} size="md">
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </Badge>

            {urgency.tier !== 'none' ? (
              <UrgencyTag
                urgency={
                  urgency.tier === 'critical'
                    ? 'overdue'
                    : urgency.tier === 'completed'
                      ? 'completed'
                      : urgency.tier === 'dueSoon'
                        ? 'dueSoon'
                        : urgency.tier === 'urgent'
                          ? 'urgent'
                          : 'upcoming'
                }
                label={urgency.label}
              />
            ) : null}
          </View>
        </View>

        {/* Workflow Status Switcher */}
        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Workflow Stage
          </ThemedText>
          <View style={styles.stageRow}>
            {STAGES.map((stage) => {
              const selected = task.status === stage.value;
              return (
                <Pressable
                  key={stage.value}
                  disabled={isUpdating || selected}
                  onPress={() => onChangeStatus(task, stage.value)}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  style={[
                    styles.stageChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText
                    style={[
                      styles.stageText,
                      {
                        color: selected
                          ? getButtonForegroundColor('primary', colors, isDark)
                          : colors.text,
                      },
                    ]}
                  >
                    {stage.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Schedule & Category */}
        <View
          style={[
            styles.metaCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaKey, { color: colors.textMuted }]}>
              Schedule
            </ThemedText>
            <ThemedText style={[styles.metaValue, { color: colors.text }]}>
              {formattedDue}
              {task.dueTime ? ` at ${task.dueTime}` : ''}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaKey, { color: colors.textMuted }]}>
              Category
            </ThemedText>
            <ThemedText style={[styles.metaValue, { color: colors.text }]}>
              {task.category || 'Personal'}
            </ThemedText>
          </View>
        </View>

        {/* Notes */}
        {task.description ? (
          <View
            style={[
              styles.metaCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <ThemedText style={[styles.metaKey, { color: colors.textMuted }]}>
              Notes
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {task.description}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.four,
  },
  titleSection: {
    gap: Spacing.two + 2,
  },
  taskTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
    lineHeight: 30,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionBox: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  stageRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stageChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  stageText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  metaCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
  },
  metaItem: {
    gap: 2,
  },
  metaKey: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.sm,
  },
  divider: {
    height: 1,
  },
  notesText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  editBtn: {
    flex: 1,
  },
});

export default TaskDetailsModal;
