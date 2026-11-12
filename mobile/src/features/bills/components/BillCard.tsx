/**
 * Bill Card Component
 * Displays a single bill record with provider, category, recurrence,
 * urgency status indicator, and quick "Mark as Paid" action.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import {
  Card,
  UrgencyTag,
  UrgencyType,
  getButtonForegroundColor,
} from '@/components/ui';
import { Colors } from '@/constants/colors';
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
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BillCard({
  bill,
  onPress,
  onTogglePaid,
  isActionLoading = false,
  compact = false,
  style,
}: BillCardProps) {
  const { colors, isDark } = useAppTheme();
  const status = displayStatus(bill);
  const isPaid = bill.paymentStatus === 'paid' || bill.status === 'paid';
  const primaryFg = getButtonForegroundColor('primary', colors, isDark);

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

  const billTitle = bill.name || bill.title || 'Untitled Bill';
  const recurrenceFg = isDark ? Colors.urgency.upcoming.darkText : colors.primaryDeep;
  const cardAccessibilityLabel = `Bill ${billTitle}, ${formatCurrency(bill.amount, bill.currency)}, ${status.label}`;

  return (
    <Card
      style={[
        styles.card,
        compact && styles.compactCard,
        {
          backgroundColor: colors.surface,
          borderColor: isPaid
            ? colors.borderSubtle
            : status.key === 'overdue'
            ? Colors.urgency.critical.accent
            : colors.border,
          opacity: isPaid ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.content, compact && styles.compactContent]}>
        <Pressable
          onPress={onPress ? () => onPress(bill) : undefined}
          disabled={!onPress}
          style={({ pressed }) => [
            { gap: compact ? Spacing.two + 2 : Spacing.three },
            pressed && onPress && { opacity: 0.88 },
          ]}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={cardAccessibilityLabel}
          accessibilityHint={onPress ? 'Opens bill details' : undefined}
        >
          {/* Top Row: Provider/Category and Status Badge */}
          <View style={styles.topRow}>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <ThemedText
                  style={[styles.categoryText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {bill.category || 'Finance'}
                </ThemedText>
              </View>

              {!compact && recurrenceLabel && (
                <View
                  style={[
                    styles.recurrenceChip,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'arrow.clockwise', android: 'autorenew', web: 'autorenew' }}
                    size={11}
                    tintColor={recurrenceFg}
                  />
                  <ThemedText style={[styles.recurrenceText, { color: recurrenceFg }]}>
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
          <View style={compact ? styles.compactMain : styles.mainRow}>
            <View style={styles.titleCol}>
              <ThemedText
                style={[
                  styles.billName,
                  compact && styles.compactBillName,
                  {
                    color: isPaid ? colors.textSecondary : colors.text,
                    textDecorationLine: isPaid ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={compact ? 2 : 1}
              >
                {billTitle}
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

            <View style={compact ? styles.compactAmountCol : styles.amountCol}>
              <ThemedText
                style={[
                  styles.amountText,
                  compact && styles.compactAmountText,
                  {
                    color: isPaid
                      ? colors.textSecondary
                      : status.key === 'overdue'
                      ? isDark
                        ? Colors.urgency.critical.darkText
                        : Colors.urgency.critical.lightText
                      : colors.text,
                  },
                ]}
              >
                {formatCurrency(bill.amount, bill.currency)}
              </ThemedText>
              {compact && recurrenceLabel ? (
                <ThemedText style={[styles.compactRecurrence, { color: recurrenceFg }]}>
                  {recurrenceLabel}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Pressable>

        {/* Bottom Row: Due Date & Action Button */}
        <View
          style={[
            styles.bottomRow,
            compact && styles.compactBottomRow,
            { borderTopColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.dueDateRow}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={12}
              tintColor={colors.textSecondary}
            />
            <ThemedText
              style={[styles.dueDateText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {isPaid
                ? `Paid ${bill.paidAt ? formatShortDate(bill.paidAt) : ''}`
                : `Due ${formatShortDate(bill.dueDate)}`}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => onTogglePaid?.(bill)}
            disabled={isActionLoading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isPaid ? `Mark ${billTitle} as unpaid` : `Mark ${billTitle} as paid`
            }
            accessibilityHint={isPaid ? 'Reverts paid status' : 'Records bill payment'}
            accessibilityState={{ disabled: isActionLoading, busy: isActionLoading }}
            style={({ pressed }) => [
              styles.actionButton,
              compact && styles.compactActionButton,
              {
                backgroundColor: isPaid
                  ? colors.surfaceSecondary
                  : colors.primary,
                borderColor: isPaid ? colors.border : colors.primary,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {isActionLoading ? (
              <ActivityIndicator
                size="small"
                color={isPaid ? colors.primary : primaryFg}
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
                  tintColor={isPaid ? colors.textSecondary : primaryFg}
                />
                <ThemedText
                  style={[
                    styles.actionBtnText,
                    { color: isPaid ? colors.textSecondary : primaryFg },
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
  compactCard: {
    marginBottom: 0,
    padding: Spacing.three + 2,
  },
  content: {
    gap: Spacing.three,
  },
  compactContent: {
    gap: Spacing.two + 2,
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
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
  compactMain: {
    gap: Spacing.two,
  },
  titleCol: {
    flex: 1,
  },
  billName: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  compactBillName: {
    fontSize: Typography.fontSize.sm + 1,
    lineHeight: 20,
  },
  providerText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  compactAmountCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  amountText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.lg,
    fontVariant: ['tabular-nums'],
  },
  compactAmountText: {
    fontSize: Typography.fontSize.base + 1,
  },
  compactRecurrence: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  compactBottomRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.two,
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
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 90,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionButton: {
    width: '100%',
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

