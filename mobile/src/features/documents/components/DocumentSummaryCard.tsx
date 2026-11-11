/**
 * LifeAdmin Mobile — Documents Summary Card
 * Overview statistics of stored documents, AI extraction count, and total storage
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { DocumentTotals } from '../types';

interface DocumentSummaryCardProps {
  totals: DocumentTotals;
}

export function DocumentSummaryCard({ totals }: DocumentSummaryCardProps) {
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
              name={{ ios: 'folder.fill', android: 'folder' }}
              size={20}
              tintColor={colors.primary}
            />
          </View>
          <View>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Document Vault
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {totals.totalSizeFormatted} total across {totals.totalCount}{' '}
              {totals.totalCount === 1 ? 'file' : 'files'}
            </ThemedText>
          </View>
        </View>

        {totals.processingCount > 0 && (
          <View
            style={[
              styles.processingBadge,
              {
                backgroundColor: isDark
                  ? Colors.urgency.dueSoon.darkBg
                  : Colors.urgency.dueSoon.lightBg,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.processingText,
                {
                  color: isDark
                    ? Colors.urgency.dueSoon.darkText
                    : Colors.urgency.dueSoon.lightText,
                },
              ]}
            >
              {totals.processingCount} Analyzing
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            {totals.totalCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total Files
          </ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {totals.processedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            AI Analyzed
          </ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            {totals.totalSizeFormatted}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Storage Used
          </ThemedText>
        </View>
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
  processingBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  processingText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
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
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
});
