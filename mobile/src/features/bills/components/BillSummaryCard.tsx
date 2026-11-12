/**
 * Bill Summary Dashboard Card
 * Visual overview of monthly financial obligations:
 * - Monthly total due
 * - Amount paid and payment progress percentage
 * - Pending / due soon amount
 * - Overdue amount
 * All values rendered in user's preferred currency.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { formatCurrency, CurrencyCode } from '@/utils/currency';
import { BillTotals } from '../types';

export interface BillSummaryCardProps {
  totals: BillTotals;
  preferredCurrency: CurrencyCode;
}

export function BillSummaryCard({
  totals,
  preferredCurrency,
}: BillSummaryCardProps) {
  const { colors, isDark } = useAppTheme();

  const progressPercent = Math.round(totals.paymentProgress * 100);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header: Monthly Overview & Progress */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.eyebrow, { color: colors.textSecondary }]}>
            Monthly Obligations
          </ThemedText>
          <ThemedText style={[styles.monthlyAmount, { color: colors.text }]}>
            {formatCurrency(totals.dueThisMonthAmount, preferredCurrency)}
          </ThemedText>
        </View>

        <View
          style={[
            styles.progressBadge,
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
          <ThemedText style={[styles.progressText, { color: colors.primary }]}>
            {progressPercent}% Settled
          </ThemedText>
        </View>
      </View>

      {/* Payment Progress Bar */}
      <View style={styles.progressSection}>
        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Metrics Row: 3 metric tiles */}
      <View style={styles.metricsRow}>
        {/* Paid This Month */}
        <View
          style={[
            styles.metricTile,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricLabelRow}>
            <View style={[styles.dot, { backgroundColor: Colors.urgency.completed.accent }]} />
            <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Paid
            </ThemedText>
          </View>
          <ThemedText style={[styles.metricValue, { color: colors.text }]}>
            {formatCurrency(totals.paidAmount, preferredCurrency)}
          </ThemedText>
          <ThemedText style={[styles.metricSub, { color: colors.textSecondary }]}>
            {totals.paidCount} {totals.paidCount === 1 ? 'bill' : 'bills'}
          </ThemedText>
        </View>

        {/* Due Soon / Pending */}
        <View
          style={[
            styles.metricTile,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricLabelRow}>
            <View style={[styles.dot, { backgroundColor: Colors.urgency.dueSoon.accent }]} />
            <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Due Soon
            </ThemedText>
          </View>
          <ThemedText style={[styles.metricValue, { color: colors.text }]}>
            {formatCurrency(totals.pendingDueSoonAmount, preferredCurrency)}
          </ThemedText>
          <ThemedText style={[styles.metricSub, { color: colors.textSecondary }]}>
            {totals.upcomingCount} upcoming
          </ThemedText>
        </View>

        {/* Overdue */}
        <View
          style={[
            styles.metricTile,
            {
              backgroundColor:
                totals.overdueCount > 0
                  ? isDark
                    ? Colors.urgency.critical.darkBg
                    : Colors.urgency.critical.lightBg
                  : colors.surfaceSecondary,
              borderColor:
                totals.overdueCount > 0
                  ? Colors.urgency.critical.accent
                  : colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricLabelRow}>
            <View style={[styles.dot, { backgroundColor: Colors.urgency.critical.accent }]} />
            <ThemedText
              style={[
                styles.metricLabel,
                {
                  color:
                    totals.overdueCount > 0
                      ? isDark
                        ? Colors.urgency.critical.darkText
                        : Colors.urgency.critical.lightText
                      : colors.textSecondary,
                },
              ]}
            >
              Overdue
            </ThemedText>
          </View>
          <ThemedText
            style={[
              styles.metricValue,
              {
                color:
                  totals.overdueCount > 0
                    ? isDark
                      ? Colors.urgency.critical.darkText
                      : Colors.urgency.critical.lightText
                    : colors.text,
              },
            ]}
          >
            {formatCurrency(totals.overdueAmount, preferredCurrency)}
          </ThemedText>
          <ThemedText
            style={[
              styles.metricSub,
              {
                color:
                  totals.overdueCount > 0
                    ? isDark
                      ? Colors.urgency.critical.darkText
                      : Colors.urgency.critical.lightText
                    : colors.textSecondary,
              },
            ]}
          >
            {totals.overdueCount} {totals.overdueCount === 1 ? 'bill' : 'bills'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  monthlyAmount: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['3xl'],
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  progressText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    fontVariant: ['tabular-nums'],
  },
  progressSection: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricTile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.two + 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  metricValue: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
    marginTop: 1,
  },
});

