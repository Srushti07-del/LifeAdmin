/**
 * Task Summary Overview Card
 * Compact progress summary (counts and filtering live in the status filter bar below).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TaskSummaryMetrics } from '../types';

export interface TaskSummaryCardProps {
  metrics: TaskSummaryMetrics;
}

export function TaskSummaryCard({ metrics }: TaskSummaryCardProps) {
  const { colors, isDark } = useAppTheme();
  const completionPct = Math.round(metrics.completionRate * 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
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
              : `${metrics.completed} of ${metrics.total} completed${metrics.overdue > 0 ? ` · ${metrics.overdue} overdue` : ''}${metrics.dueSoon > 0 ? ` · ${metrics.dueSoon} due soon` : ''}`}
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

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three + 2,
    marginBottom: Spacing.three,
    gap: Spacing.two + 2,
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
});

export default TaskSummaryCard;

