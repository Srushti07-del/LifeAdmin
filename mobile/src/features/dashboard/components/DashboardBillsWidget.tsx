/**
 * Dashboard Bills & Payments Overview Widget
 * Shows overdue and upcoming bills converted into the user's preferred currency.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import {
  CurrencyCode,
  convertAmountTo,
  formatCurrency,
  getCurrencyInfo,
} from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import { AttentionItem, UpcomingItem } from '../types';

interface DashboardBillsWidgetProps {
  needsAttention: AttentionItem[];
  upcoming: UpcomingItem[];
  preferredCurrency: CurrencyCode;
  exchangeRates?: Record<string, number>;
  onManageBills: () => void;
  onPayBill?: (id: string, title: string) => void;
}

interface BillRowItem {
  id: string;
  title: string;
  dueLabel: string;
  amount: number;
  currency?: string;
  isUrgent: boolean;
}

export function DashboardBillsWidget({
  needsAttention,
  upcoming,
  preferredCurrency,
  exchangeRates = {},
  onManageBills,
  onPayBill,
}: DashboardBillsWidgetProps) {
  const { colors, isDark } = useAppTheme();
  const currencyInfo = getCurrencyInfo(preferredCurrency);

  const bills = useMemo<BillRowItem[]>(() => {
    const seen = new Set<string>();
    const combined: BillRowItem[] = [];

    for (const item of needsAttention) {
      if (item.type !== 'bill' || seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push({
        id: item.id,
        title: item.title,
        dueLabel: item.urgencyLabel || formatShortDate(item.dueDate),
        amount: item.amount || 0,
        currency: item.currency,
        isUrgent: item.severity === 'overdue' || item.severity === 'urgent',
      });
    }

    for (const item of upcoming) {
      if (item.type !== 'bill' || seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push({
        id: item.id,
        title: item.title,
        dueLabel: formatShortDate(item.date),
        amount: item.amount || 0,
        currency: item.currency,
        isUrgent: false,
      });
    }

    return combined.slice(0, 5);
  }, [needsAttention, upcoming]);

  return (
    <View style={styles.wrapper}>
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
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(5, 150, 105, 0.2)'
                    : '#ECFDF5',
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'creditcard.fill', android: 'receipt_long', web: 'receipt_long' }}
                size={18}
                tintColor={isDark ? '#34D399' : '#059669'}
              />
            </View>
            <View>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                Bills & Payments
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Upcoming expenses in {currencyInfo.symbol} ({currencyInfo.code})
              </ThemedText>
            </View>
          </View>

          <Pressable onPress={onManageBills} hitSlop={8}>
            <ThemedText style={[styles.viewAllText, { color: colors.primary }]}>
              Manage
            </ThemedText>
          </Pressable>
        </View>

        {bills.length > 0 ? (
          <View style={styles.list}>
            {bills.map((bill) => {
              const convertedAmount = convertAmountTo(
                bill.amount,
                bill.currency,
                preferredCurrency,
                exchangeRates
              );
              return (
                <Pressable
                  key={bill.id}
                  onPress={onManageBills}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderSubtle,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.rowInfo}>
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.rowTitle, { color: colors.text }]}
                    >
                      {bill.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.rowMeta,
                        {
                          color: bill.isUrgent
                            ? isDark
                              ? Colors.urgency.critical.darkText
                              : Colors.urgency.critical.lightText
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {bill.dueLabel}
                    </ThemedText>
                  </View>

                  <View style={styles.rowRight}>
                    <ThemedText style={[styles.amountText, { color: colors.primary }]}>
                      {formatCurrency(convertedAmount, preferredCurrency)}
                    </ThemedText>
                    {onPayBill && (
                      <Pressable
                        onPress={() => onPayBill(bill.id, bill.title)}
                        hitSlop={6}
                        style={[
                          styles.payPill,
                          { backgroundColor: colors.primarySoft },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark bill ${bill.title} paid`}
                      >
                        <ThemedText style={[styles.payPillText, { color: colors.primary }]}>
                          Pay
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              All bills are paid or up to date.
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.three + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  viewAllText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  rowMeta: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  amountText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  payPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  payPillText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
  },
  emptyBox: {
    paddingVertical: Spacing.one,
  },
  emptyText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
});

export default DashboardBillsWidget;

