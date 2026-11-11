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
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
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
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        createShadow(isDark, 'card'),
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: colors.primarySoft },
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
          <View
            style={[
              styles.overdueBadge,
              {
                backgroundColor: isDark
                  ? Colors.urgency.critical.darkBg
                  : Colors.urgency.critical.lightBg,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.overdueText,
                {
                  color: isDark
                    ? Colors.urgency.critical.darkText
                    : Colors.urgency.critical.lightText,
                },
              ]}
            >
              {totals.overdueCount} Overdue
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        {/* Today */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'today' ? 'all' : 'today')}
          hitSlop={4}
          style={[
            styles.statItem,
            activeFilter === 'today' && {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
              borderWidth: 1,
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

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        {/* Upcoming */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
          hitSlop={4}
          style={[
            styles.statItem,
            activeFilter === 'upcoming' && {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
              borderWidth: 1,
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statValue,
              {
                color: isDark
                  ? Colors.urgency.upcoming.darkText
                  : Colors.urgency.upcoming.lightText,
              },
            ]}
          >
            {totals.upcomingCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Upcoming
          </ThemedText>
        </Pressable>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        {/* Overdue */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
          hitSlop={4}
          style={[
            styles.statItem,
            activeFilter === 'overdue' && {
              backgroundColor: isDark
                ? Colors.urgency.critical.darkBg
                : Colors.urgency.critical.lightBg,
              borderColor: Colors.urgency.critical.accent,
              borderWidth: 1,
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statValue,
              {
                color:
                  totals.overdueCount > 0
                    ? isDark
                      ? Colors.urgency.critical.darkText
                      : Colors.urgency.critical.lightText
                    : colors.textMuted,
              },
            ]}
          >
            {totals.overdueCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Overdue
          </ThemedText>
        </Pressable>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        {/* Completed */}
        <Pressable
          onPress={() => onSelectFilter(activeFilter === 'completed' ? 'all' : 'completed')}
          hitSlop={4}
          style={[
            styles.statItem,
            activeFilter === 'completed' && {
              backgroundColor: isDark
                ? Colors.urgency.completed.darkBg
                : Colors.urgency.completed.lightBg,
              borderColor: Colors.urgency.completed.accent,
              borderWidth: 1,
              borderRadius: Radius.md,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statValue,
              {
                color: isDark
                  ? Colors.urgency.completed.darkText
                  : Colors.urgency.completed.lightText,
              },
            ]}
          >
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
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.editorial,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    fontVariant: ['tabular-nums'],
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
    fontVariant: ['tabular-nums'],
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
    paddingVertical: 6,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ['tabular-nums'],
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

