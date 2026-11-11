/**
 * Task Board View
 * Mobile-adaptive workflow board (stage-segmented on phones, 3-column grid on tablets).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Badge, UrgencyTag } from '@/components/ui';
import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Task, TaskStatus } from '../types';
import { getDefaultBoardStage, getTaskUrgencyMeta } from '../services/taskCalculations';

export interface TaskBoardViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onMoveStatus: (task: Task, status: TaskStatus) => void;
  updatingId?: string | null;
}

const COLUMNS: { status: TaskStatus; label: string; nextAction?: { label: string; target: TaskStatus } }[] = [
  {
    status: 'todo',
    label: 'To Do',
    nextAction: { label: 'Start', target: 'in_progress' },
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    nextAction: { label: 'Complete', target: 'completed' },
  },
  {
    status: 'completed',
    label: 'Done',
    nextAction: { label: 'Reopen', target: 'todo' },
  },
];

export function TaskBoardView({
  tasks,
  onSelectTask,
  onMoveStatus,
  updatingId,
}: TaskBoardViewProps) {
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const defaultStage = useMemo(() => getDefaultBoardStage(tasks), [tasks]);
  const hasManualSelectionRef = useRef(false);
  const prevTaskCountRef = useRef(tasks.length);
  const [activeStage, setActiveStage] = useState<TaskStatus>(() => defaultStage);

  useEffect(() => {
    const wasEmpty = prevTaskCountRef.current === 0;
    prevTaskCountRef.current = tasks.length;

    // Auto-select the first populated stage on initial data arrival or before manual tab switches.
    if (!hasManualSelectionRef.current || (wasEmpty && tasks.length > 0)) {
      hasManualSelectionRef.current = false;
      setActiveStage(defaultStage);
    }
  }, [defaultStage, tasks.length]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      completed: [],
    };
    for (const task of tasks) {
      map[task.status]?.push(task);
    }
    return map;
  }, [tasks]);

  const renderBoardCard = (
    task: Task,
    nextAction?: { label: string; target: TaskStatus }
  ) => {
    const urgency = getTaskUrgencyMeta(task);
    const isBusy = updatingId === task._id;
    const priorityVariant =
      task.priority === 'urgent'
        ? 'danger'
        : task.priority === 'high'
          ? 'warning'
          : task.priority === 'medium'
            ? 'primary'
            : 'neutral';

    return (
      <Pressable
        key={task._id}
        onPress={() => onSelectTask(task)}
        style={({ pressed }) => [
          styles.boardCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.94 : 1,
          },
          createShadow(isDark, 'xs'),
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${task.priority}`}
      >
        <View style={styles.boardCardHeader}>
          <Badge variant={priorityVariant} size="sm">
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
          {task.category ? (
            <ThemedText style={[styles.boardCategory, { color: colors.textMuted }]}>
              {task.category}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText
          style={[
            styles.boardTitle,
            {
              color: task.status === 'completed' ? colors.textSecondary : colors.text,
              textDecorationLine: task.status === 'completed' ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </ThemedText>

        <View style={styles.boardFooter}>
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
          ) : (
            <View />
          )}

          {nextAction ? (
            <Pressable
              onPress={() => onMoveStatus(task, nextAction.target)}
              disabled={isBusy}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={[
                styles.moveChip,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: isDark ? colors.border : colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${nextAction.label} ${task.title}`}
            >
              <ThemedText style={[styles.moveChipText, { color: colors.primary }]}>
                {isBusy ? 'Saving...' : nextAction.label}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  };

  if (isTablet) {
    return (
      <View style={styles.tabletGrid}>
        {COLUMNS.map((col) => {
          const items = grouped[col.status];
          return (
            <View
              key={col.status}
              style={[
                styles.tabletColumn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.columnHeader}>
                <ThemedText style={[styles.columnTitle, { color: colors.text }]}>
                  {col.label}
                </ThemedText>
                <Badge variant="secondary" size="sm">
                  {items.length}
                </Badge>
              </View>
              {items.length === 0 ? (
                <ThemedText style={[styles.emptyColText, { color: colors.textMuted }]}>
                  No tasks
                </ThemedText>
              ) : (
                items.map((t) => renderBoardCard(t, col.nextAction))
              )}
            </View>
          );
        })}
      </View>
    );
  }

  const activeCol = COLUMNS.find((c) => c.status === activeStage) || COLUMNS[0];
  const stageItems = grouped[activeCol.status];

  return (
    <View style={styles.phoneBoard}>
      {/* Stage Switcher Pills */}
      <View
        style={[
          styles.stageBar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {COLUMNS.map((col) => {
          const isActive = col.status === activeStage;
          return (
            <Pressable
              key={col.status}
              onPress={() => {
                hasManualSelectionRef.current = true;
                setActiveStage(col.status);
              }}
              style={[
                styles.stageTab,
                isActive && {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <ThemedText
                style={[
                  styles.stageTabLabel,
                  {
                    color: isActive ? colors.text : colors.textSecondary,
                    fontFamily: isActive
                      ? Typography.fontFamilies.sansSemiBold
                      : Typography.fontFamilies.sansMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {col.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.stageCount,
                  { color: isActive ? colors.primary : colors.textMuted },
                ]}
              >
                {grouped[col.status].length}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {stageItems.length === 0 ? (
        <View
          style={[
            styles.emptyStage,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.emptyColText, { color: colors.textSecondary }]}>
            No tasks in {activeCol.label}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.stageList}>
          {stageItems.map((t) => renderBoardCard(t, activeCol.nextAction))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabletGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  tabletColumn: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  columnTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  phoneBoard: {
    gap: Spacing.three,
  },
  stageBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 4,
  },
  stageTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  stageTabLabel: {
    fontSize: Typography.fontSize.xs + 1,
  },
  stageCount: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  stageList: {
    gap: Spacing.two + 2,
  },
  emptyStage: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyColText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
  },
  boardCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two,
  },
  boardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  boardCategory: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  boardTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: 20,
  },
  boardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: 2,
  },
  moveChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  moveChipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

export default TaskBoardView;

