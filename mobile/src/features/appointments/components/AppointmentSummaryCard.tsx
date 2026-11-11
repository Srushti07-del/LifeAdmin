/**
 * Appointment Summary Card Component
 * Displays appointment metrics: Total Scheduled, Today's Consultations, Upcoming, Past.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { AppointmentTotals } from '../types';

export interface AppointmentSummaryCardProps {
  totals: AppointmentTotals;
}

export function AppointmentSummaryCard({ totals }: AppointmentSummaryCardProps) {
  const { colors, isDark } = useAppTheme();

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
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <ThemedText style={[styles.eyebrow, { color: colors.primary }]}>
            Consultations & Meetings
          </ThemedText>
          <ThemedText style={[styles.mainCount, { color: colors.text }]}>
            {totals.totalCount} {totals.totalCount === 1 ? 'Appointment' : 'Appointments'}
          </ThemedText>
        </View>

        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <SymbolView
            name={{ ios: 'calendar.badge.clock', android: 'schedule', web: 'schedule' }}
            size={24}
            tintColor={colors.primary}
          />
        </View>
      </View>

      {/* Metrics Row: Today, Upcoming, Past */}
      <View style={[styles.metricsGrid, { borderColor: colors.border }]}>
        {/* Today */}
        <View
          style={[
            styles.metricTile,
            totals.todayCount > 0 && [
              styles.todayTileActive,
              {
                backgroundColor: colors.primarySoft,
              },
            ],
          ]}
        >
          <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Today
          </ThemedText>
          <ThemedText
            style={[
              styles.metricValue,
              { color: totals.todayCount > 0 ? colors.primary : colors.text },
            ]}
          >
            {totals.todayCount}
          </ThemedText>
        </View>

        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

        {/* Upcoming */}
        <View style={styles.metricTile}>
          <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Upcoming
          </ThemedText>
          <ThemedText style={[styles.metricValue, { color: colors.primary }]}>
            {totals.upcomingCount}
          </ThemedText>
        </View>

        <View style={[styles.tileDivider, { backgroundColor: colors.border }]} />

        {/* Past */}
        <View style={styles.metricTile}>
          <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Past
          </ThemedText>
          <ThemedText style={[styles.metricValue, { color: colors.textSecondary }]}>
            {totals.pastCount}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainCount: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricTile: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTileActive: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileDivider: {
    width: 1,
    height: '100%',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});

