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
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
          <View style={[styles.processingBadge, { backgroundColor: '#FEF3C7' }]}>
            <ThemedText style={styles.processingText}>
              {totals.processingCount} Analyzing
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            {totals.totalCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total Files
          </ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#0D9488' }]}>
            {totals.processedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            AI Analyzed
          </ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? '#304247' : colors.border }]} />

        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
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
  processingBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  processingText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    color: '#D97706',
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
