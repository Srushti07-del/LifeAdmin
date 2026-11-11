/**
 * Dashboard Tasks Overview Widget
 * Shows urgent and upcoming personal tasks with quick completion and navigation.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { formatShortDate } from '@/utils/date';
import { AttentionItem, UpcomingItem } from '../types';

interface DashboardTasksWidgetProps {
  needsAttention: AttentionItem[];
  upcoming: UpcomingItem[];
  onViewAll: () => void;
  onAddTask: () => void;
  onCompleteTask?: (id: string, title: string) => void;
}

interface TaskRowItem {
  id: string;
  title: string;
  dateLabel: string;
  isUrgent: boolean;
}

export function DashboardTasksWidget({
  needsAttention,
  upcoming,
  onViewAll,
  onAddTask,
  onCompleteTask,
}: DashboardTasksWidgetProps) {
  const { colors, isDark } = useAppTheme();

  const tasks = useMemo<TaskRowItem[]>(() => {
    const seen = new Set<string>();
    const combined: TaskRowItem[] = [];

    for (const item of needsAttention) {
      if (item.type !== 'task' || seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push({
        id: item.id,
        title: item.title,
        dateLabel: item.urgencyLabel || formatShortDate(item.dueDate),
        isUrgent: item.severity === 'overdue' || item.severity === 'urgent',
      });
    }

    for (const item of upcoming) {
      if (item.type !== 'task' || seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push({
        id: item.id,
        title: item.title,
        dateLabel: formatShortDate(item.date),
        isUrgent: false,
      });
    }

    return combined.slice(0, 5);
  }, [needsAttention, upcoming]);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          createShadow(isDark, 'card'),
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.primarySoft,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'checkmark.square.fill', android: 'checklist', web: 'checklist' }}
                size={18}
                tintColor={colors.primary}
              />
            </View>
            <View>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                My Tasks
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Scheduled personal responsibilities
              </ThemedText>
            </View>
          </View>

          <Pressable onPress={onViewAll} hitSlop={8}>
            <ThemedText style={[styles.viewAllText, { color: colors.primary }]}>
              View all
            </ThemedText>
          </Pressable>
        </View>

        {tasks.length > 0 ? (
          <View style={styles.list}>
            {tasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Pressable
                  onPress={() => onCompleteTask?.(task.id, task.title)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark task ${task.title} complete`}
                  style={styles.checkBtn}
                >
                  <SymbolView
                    name={{ ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
                    size={18}
                    tintColor={task.isUrgent ? Colors.urgency.critical.accent : colors.primary}
                  />
                </Pressable>

                <Pressable onPress={onViewAll} style={styles.rowBody}>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.rowTitle, { color: colors.text }]}
                  >
                    {task.title}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.rowMeta,
                      {
                        color: task.isUrgent
                          ? Colors.urgency.critical.accent
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {task.dateLabel}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              No upcoming tasks in the next 30 days.
            </ThemedText>
            <Pressable
              onPress={onAddTask}
              style={[
                styles.emptyBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.emptyBtnText, { color: colors.primary }]}>
                + Add Task
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.three,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  viewAllText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  checkBtn: {
    padding: 2,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    flex: 1,
    minWidth: 0,
  },
  rowMeta: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  emptyText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  emptyBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

export default DashboardTasksWidget;

