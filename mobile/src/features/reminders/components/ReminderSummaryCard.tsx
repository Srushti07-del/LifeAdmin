/**
 * LifeAdmin Mobile — Reminder Summary Card
 * Displays aggregate counts for active, today, upcoming, overdue, and completed reminders
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { ReminderTotals, ReminderSectionKey } from '../types';

interface ReminderSummaryCardProps {
  totals: ReminderTotals;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export function ReminderSummaryCard({
  totals,
  activeFilter,
  onSelectFilter,
}: ReminderSummaryCardProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C292D' : colors.surface,
          borderColor: isDark ? '#304247' : colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? 'rgba(85, 189, 181, 0.15)' : 'rgba(13, 110, 110, 0.1)' },
            ]}
          >
            <SymbolView
              name={{ ios: 'bell.fill', android: 'notifications' }}
              size={20}
              tintColor={colors.primary}
            />
          </View>
          <View>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Smart Reminders
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {totals.activeCount} active • {totals.todayCount} due today
            </ThemedText>
          </View>
        </View>

        {totals.overdueCount > 0 && (
          <View style={[styles.overdueBadge, { backgroundColor: isDark ? '#4A1D1D' : '#FEE2E2' }]}>
            <ThemedText style={styles.overdueText}>
              {totals.overdueCount} Overdue
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

      <View style={styles.statsRow}>
        {/* Today */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'today' ? 'all' : 'today')}
          style={[
            styles.statItem,
            activeFilter === 'today' && {
              backgroundColor: isDark ? 'rgba(85, 189, 181, 0.15)' : 'rgba(13, 110, 110, 0.08)',
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {totals.todayCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Today
          </ThemedText>
        </Pressable>

        <View style={[styles.statDivider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

        {/* Upcoming */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
          style={[
            styles.statItem,
            activeFilter === 'upcoming' && {
              backgroundColor: isDark ? 'rgba(85, 189, 181, 0.15)' : 'rgba(13, 110, 110, 0.08)',
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText style={[styles.statValue, { color: '#0D9488' }]}>
            {totals.upcomingCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Upcoming
          </ThemedText>
        </Pressable>

        <View style={[styles.statDivider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

        {/* Overdue */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
          style={[
            styles.statItem,
            activeFilter === 'overdue' && {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText style={[styles.statValue, { color: totals.overdueCount > 0 ? '#EF4444' : colors.textMuted }]}>
            {totals.overdueCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Overdue
          </ThemedText>
        </Pressable>

        <View style={[styles.statDivider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

        {/* Completed */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'completed' ? 'all' : 'completed')}
          style={[
            styles.statItem,
            activeFilter === 'completed' && {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
            {totals.completedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Done
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  overdueBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  overdueText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#EF4444',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
});

