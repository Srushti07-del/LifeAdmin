/**
 * Stats Overview Component
 * Metric pills highlighting count of Overdue, Due Soon, and Upcoming responsibilities.
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

  return (
    <View style={styles.container}>
      {/* Overdue Card */}
      <Pressable
        onPress={() => onStatPress?.('overdue')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.overdueCount} Overdue responsibilities`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: isDark
              ? Colors.urgency.critical.darkBg
              : Colors.urgency.critical.lightBg,
            borderColor: Colors.urgency.critical.accent,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }}
            size={18}
            tintColor={Colors.urgency.critical.accent}
          />
          <ThemedText
            style={[
              styles.statCount,
              {
                color: isDark
                  ? Colors.urgency.critical.darkText
                  : Colors.urgency.critical.lightText,
              },
            ]}
          >
            {stats.overdueCount}
          </ThemedText>
        </View>
        <ThemedText
          style={[
            styles.statLabel,
            {
              color: isDark
                ? Colors.urgency.critical.darkText
                : Colors.urgency.critical.lightText,
            },
          ]}
        >
          Overdue
        </ThemedText>
      </Pressable>

      {/* Due Soon Card */}
      <Pressable
        onPress={() => onStatPress?.('soon')}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${stats.dueSoonCount} Due Soon responsibilities`}
        style={({ pressed }) => [
          styles.statCard,
          {
            backgroundColor: isDark
              ? Colors.urgency.urgent.darkBg
              : Colors.urgency.urgent.lightBg,
            borderColor: Colors.urgency.urgent.accent,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.statHeader}>
          <SymbolView
            name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
            size={18}
            tintColor={Colors.urgency.urgent.accent}
          />
          <ThemedText
            style={[
              styles.statCount,
              {
                color: isDark
                  ? Colors.urgency.urgent.darkText
                  : Colors.urgency.urgent.lightText,
              },
            ]}
          >
            {stats.dueSoonCount}
          </ThemedText>
        </View>
        <ThemedText
          style={[
            styles.statLabel,
            {
              color: isDark
                ? Colors.urgency.urgent.darkText
                : Colors.urgency.urgent.lightText,
            },
          ]}
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
            backgroundColor: isDark
              ? colors.surfaceSecondary
              : colors.surfaceSecondary,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  statCount: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});

export default StatsOverview;
