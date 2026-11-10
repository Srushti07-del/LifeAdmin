/**
 * Bill Card Component
 * Displays a single bill record with provider, category, recurrence,
 * urgency status indicator, and quick "Mark as Paid" action.
 */

import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Card, Badge, UrgencyTag, UrgencyType } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import { Bill } from '../types';
import { displayStatus } from '../services/billService';

export interface BillCardProps {
  bill: Bill;
  onPress?: (bill: Bill) => void;
  onTogglePaid?: (bill: Bill) => void;
  isActionLoading?: boolean;
}

export function BillCard({
  bill,
  onPress,
  onTogglePaid,
  isActionLoading = false,
}: BillCardProps) {
  const { colors, isDark } = useAppTheme();
  const status = displayStatus(bill);
  const isPaid = bill.paymentStatus === 'paid' || bill.status === 'paid';

  const mapUrgencyType = (key: string): UrgencyType => {
    switch (key) {
      case 'paid':
        return 'completed';
      case 'overdue':
        return 'overdue';
      case 'due_soon':
        return 'dueSoon';
      default:
        return 'upcoming';
    }
  };

  const recurrenceLabel = bill.recurrence?.type && bill.recurrence.type !== 'none'
    ? bill.recurrence.type.charAt(0).toUpperCase() + bill.recurrence.type.slice(1)
    : null;

  return (
    <Card
      onPress={() => onPress?.(bill)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isPaid
            ? isDark
              ? '#143440'
              : '#E2E8F0'
            : status.key === 'overdue'
            ? colors.notification || '#EF4444'
            : colors.border,
          borderLeftWidth: status.key === 'overdue' ? 4 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Bill ${bill.name || bill.title}, ${formatCurrency(bill.amount, bill.currency)}, ${status.label}`}
    >
      <View style={styles.content}>
        {/* Top Row: Provider/Category and Status Badge */}
        <View style={styles.topRow}>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
              ]}
            >
              <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
                {bill.category || 'Finance'}
              </ThemedText>
            </View>

            {recurrenceLabel && (
              <View
                style={[
                  styles.recurrenceChip,
                  { backgroundColor: isDark ? 'rgba(22, 143, 145, 0.2)' : '#D3EAE7' },
                ]}
              >
                <SymbolView
                  name={{ ios: 'arrow.clockwise', android: 'autorenew', web: 'autorenew' }}
                  size={11}
                  tintColor={colors.primary}
                />
                <ThemedText style={[styles.recurrenceText, { color: colors.primary }]}>
                  {recurrenceLabel}
                </ThemedText>
              </View>
            )}
          </View>

          <UrgencyTag
            urgency={mapUrgencyType(status.key)}
            label={status.label}
          />
        </View>

        {/* Main Body: Bill Title & Amount */}
        <View style={styles.mainRow}>
          <View style={styles.titleCol}>
            <ThemedText
              style={[
                styles.billName,
                {
                  color: isPaid ? colors.textSecondary : colors.text,
                  textDecorationLine: isPaid ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={1}
            >
              {bill.name || bill.title || 'Untitled Bill'}
            </ThemedText>

            {Boolean(bill.provider) && (
              <ThemedText
                style={[styles.providerText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {bill.provider}
              </ThemedText>
            )}
          </View>

          <View style={styles.amountCol}>
            <ThemedText
              style={[
                styles.amountText,
                {
                  color: isPaid
                    ? colors.textSecondary
                    : status.key === 'overdue'
                    ? colors.notification || '#EF4444'
                    : colors.text,
                },
              ]}
            >
              {formatCurrency(bill.amount, bill.currency)}
            </ThemedText>
          </View>
        </View>

        {/* Bottom Row: Due Date & Action Button */}
        <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
          <View style={styles.dueDateRow}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={13}
              tintColor={colors.textSecondary}
            />
            <ThemedText style={[styles.dueDateText, { color: colors.textSecondary }]}>
              {isPaid
                ? `Paid ${bill.paidAt ? formatShortDate(bill.paidAt) : ''}`
                : `Due ${formatShortDate(bill.dueDate)}`}
            </ThemedText>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onTogglePaid?.(bill);
            }}
            disabled={isActionLoading}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: isPaid
                  ? isDark
                    ? '#143440'
                    : '#F1F5F9'
                  : colors.primary,
                borderColor: isPaid ? colors.border : colors.primary,
              },
              pressed && { opacity: 0.8 },
            ]}
            hitSlop={6}
          >
            {isActionLoading ? (
              <ActivityIndicator
                size="small"
                color={isPaid ? colors.primary : '#FFFFFF'}
              />
            ) : (
              <View style={styles.actionBtnInner}>
                <SymbolView
                  name={
                    isPaid
                      ? { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }
                      : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                  }
                  size={13}
                  tintColor={isPaid ? colors.textSecondary : '#FFFFFF'}
                />
                <ThemedText
                  style={[
                    styles.actionBtnText,
                    { color: isPaid ? colors.textSecondary : '#FFFFFF' },
                  ]}
                >
                  {isPaid ? 'Unpay' : 'Mark Paid'}
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.three,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    borderWidth: 1,
  },
  content: {
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  recurrenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  recurrenceText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  titleCol: {
    flex: 1,
  },
  billName: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  providerText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueDateText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

