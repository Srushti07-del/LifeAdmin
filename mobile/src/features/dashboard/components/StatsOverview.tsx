/**
 * Stats Overview Component
 * 2x2 metric grid highlighting Overdue, Due Soon, Upcoming, and Active Alerts.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { DashboardStats } from '../types';

interface StatsOverviewProps {
  stats: DashboardStats;
  onStatPress?: (filterType: string) => void;
}

export function StatsOverview({ stats, onStatPress }: StatsOverviewProps) {
  const { colors, isDark } = useAppTheme();
  const overdueOn = stats.overdueCount > 0;
  const soonOn = stats.dueSoonCount > 0;
  const overdueText = isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText;
  const soonText = isDark ? Colors.urgency.urgent.darkText : Colors.urgency.urgent.lightText;

  return (
    <View style={styles.container}>
      {/* Overdue Card — neutral when nothing is overdue */}
      <Pressable
        onPress={() => onStatPress?.('overdue')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.overdueCount} Overdue responsibilities`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: overdueOn
              ? isDark
                ? Colors.urgency.critical.darkBg
                : Colors.urgency.critical.lightBg
              : colors.surface,
            borderColor: overdueOn
              ? isDark
                ? 'rgba(248, 113, 113, 0.4)'
                : Colors.urgency.critical.accent
              : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }}
            size={16}
            tintColor={
              overdueOn
                ? isDark
                  ? Colors.urgency.critical.darkText
                  : Colors.urgency.critical.accent
                : colors.textMuted
            }
          />
          <ThemedText style={[styles.statCount, { color: overdueOn ? overdueText : colors.text }]}>
            {stats.overdueCount}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.statLabel, { color: overdueOn ? overdueText : colors.textSecondary }]}
        >
          Overdue
        </ThemedText>
      </Pressable>

      {/* Due Soon Card — neutral when nothing is due soon */}
      <Pressable
        onPress={() => onStatPress?.('soon')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.dueSoonCount} Due Soon responsibilities`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: soonOn
              ? isDark
                ? Colors.urgency.urgent.darkBg
                : Colors.urgency.urgent.lightBg
              : colors.surface,
            borderColor: soonOn
              ? isDark
                ? 'rgba(251, 191, 36, 0.4)'
                : Colors.urgency.urgent.accent
              : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
            size={16}
            tintColor={
              soonOn
                ? isDark
                  ? Colors.urgency.urgent.darkText
                  : Colors.urgency.urgent.accent
                : colors.textMuted
            }
          />
          <ThemedText style={[styles.statCount, { color: soonOn ? soonText : colors.text }]}>
            {stats.dueSoonCount}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.statLabel, { color: soonOn ? soonText : colors.textSecondary }]}
        >
          Due Soon
        </ThemedText>
      </Pressable>

      {/* Upcoming Card */}
      <Pressable
        onPress={() => onStatPress?.('upcoming')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.upcomingCount} Upcoming activities`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.statCount, { color: colors.text }]}>
            {stats.upcomingCount}
          </ThemedText>
        </View>
        <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
          Upcoming
        </ThemedText>
      </Pressable>

      {/* Active Alerts / Reminders Card */}
      <Pressable
        onPress={() => onStatPress?.('reminders')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.activeReminders ?? 0} Active reminders`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'bell.fill', android: 'notifications_active', web: 'notifications_active' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.statCount, { color: colors.text }]}>
            {stats.activeReminders ?? 0}
          </ThemedText>
        </View>
        <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
          Alerts
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.half,
  },
  statCount: {
    fontSize: Typography.fontSize.xl,
    lineHeight: 24,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});

export default StatsOverview;
