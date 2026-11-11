/**
 * Task Summary Overview Card
 * Scannable metrics strip showing active progress, overdue count, and quick filter taps.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TaskFilterMode, TaskSummaryMetrics } from '../types';

export interface TaskSummaryCardProps {
  metrics: TaskSummaryMetrics;
  activeFilter: TaskFilterMode;
  onSelectFilter: (filter: TaskFilterMode) => void;
}

export function TaskSummaryCard({
  metrics,
  activeFilter,
  onSelectFilter,
}: TaskSummaryCardProps) {
  const { colors, isDark } = useAppTheme();
  const completionPct = Math.round(metrics.completionRate * 100);

  const tiles: {
    key: TaskFilterMode;
    label: string;
    value: number;
    accentColor: string;
    bgTint: string;
  }[] = [
    {
      key: 'todo',
      label: 'To Do',
      value: metrics.todo,
      accentColor: colors.primary,
      bgTint: colors.primarySoft,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      value: metrics.inProgress,
      accentColor: isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText,
      bgTint: isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: metrics.overdue,
      accentColor:
        metrics.overdue > 0
          ? isDark
            ? Colors.urgency.critical.darkText
            : Colors.urgency.critical.lightText
          : colors.textMuted,
      bgTint:
        metrics.overdue > 0
          ? isDark
            ? Colors.urgency.critical.darkBg
            : Colors.urgency.critical.lightBg
          : colors.surfaceSecondary,
    },
    {
      key: 'completed',
      label: 'Done',
      value: metrics.completed,
      accentColor: isDark ? Colors.urgency.completed.darkText : Colors.urgency.completed.lightText,
      bgTint: isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg,
    },
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        createShadow(isDark, 'card'),
      ]}
    >
      {/* Top Progress Row */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <ThemedText style={[styles.heading, { color: colors.text }]}>
            {metrics.active === 0
              ? 'All caught up'
              : `${metrics.active} active ${metrics.active === 1 ? 'task' : 'tasks'}`}
          </ThemedText>
          <ThemedText style={[styles.subtext, { color: colors.textSecondary }]}>
            {metrics.total === 0
              ? 'Create your first task to start tracking progress'
              : `${metrics.completed} of ${metrics.total} completed${metrics.dueSoon > 0 ? ` · ${metrics.dueSoon} due soon` : ''}`}
          </ThemedText>
        </View>

        <View
          style={[
            styles.rateBadge,
            {
              backgroundColor: colors.primarySoft,
              borderColor: isDark ? colors.border : colors.primary,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={13}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.rateText, { color: colors.primary }]}>
            {completionPct}%
          </ThemedText>
        </View>
      </View>

      {/* Completion Bar */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${completionPct}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      {/* Interactive Status Filter Tiles */}
      <View style={styles.tilesGrid}>
        {tiles.map((tile) => {
          const isSelected = activeFilter === tile.key;
          return (
            <Pressable
              key={tile.key}
              onPress={() => onSelectFilter(isSelected ? 'all' : tile.key)}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: isSelected ? tile.bgTint : colors.surfaceSecondary,
                  borderColor: isSelected ? tile.accentColor : colors.borderSubtle,
                },
                pressed && styles.tilePressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tile.label}: ${tile.value}`}
            >
              <ThemedText
                style={[
                  styles.tileValue,
                  { color: isSelected ? tile.accentColor : colors.text },
                ]}
              >
                {tile.value}
              </ThemedText>
              <ThemedText
                style={[
                  styles.tileLabel,
                  { color: isSelected ? tile.accentColor : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tile.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  heading: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
    lineHeight: 24,
  },
  subtext: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  rateText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  tilesGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    minHeight: 54,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tilePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  tileValue: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.lg,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
    lineHeight: 14,
  },
});

export default TaskSummaryCard;

