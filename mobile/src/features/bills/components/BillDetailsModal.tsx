/**
 * Bill Details Inspection Modal Sheet
 * Displays comprehensive bill details, status badge, converted amount,
 * payment timeline, recurrence info, notes, and management actions (Edit, Toggle Paid, Delete).
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, UrgencyTag, UrgencyType, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  formatCurrency,
  convertAmountTo,
  normalizeCurrencyCode,
  CurrencyCode,
  DEFAULT_CURRENCY,
} from '@/utils/currency';
import { Bill } from '../types';
import { displayStatus } from '../services/billService';

export interface BillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => Promise<void>;
  onTogglePaid: (bill: Bill) => Promise<void>;
  preferredCurrency?: CurrencyCode;
  rates?: Record<string, number>;
  isActionLoading?: boolean;
}

export function BillDetailsModal({
  isOpen,
  onClose,
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
  preferredCurrency = DEFAULT_CURRENCY,
  rates = {},
  isActionLoading = false,
}: BillDetailsModalProps) {
  const { colors, isDark } = useAppTheme();
  const { showSnackbar } = useSnackbar();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!bill) return null;

  const status = displayStatus(bill);
  const isPaid = bill.paymentStatus === 'paid' || bill.status === 'paid';
  const billCurrency = normalizeCurrencyCode(bill.currency);
  const normPreferred = normalizeCurrencyCode(preferredCurrency);
  const isDifferentCurrency = billCurrency !== normPreferred;

  const convertedAmount = isDifferentCurrency
    ? convertAmountTo(bill.amount, billCurrency, normPreferred, rates)
    : null;

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

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete "${bill.name || bill.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete(bill._id);
              onClose();
            } catch {
              showSnackbar({
                variant: 'error',
                title: 'Delete Failed',
                message: 'Failed to delete bill. Please try again.',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    onClose();
    onEdit(bill);
  };

  const recurrenceLabel =
    bill.recurrence?.type && bill.recurrence.type !== 'none'
      ? bill.recurrence.type.charAt(0).toUpperCase() + bill.recurrence.type.slice(1)
      : 'One-time (Non-recurring)';

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Bill Details"
      description="Inspect status, recurrence, and payment record"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <UrgencyTag urgency={mapUrgencyType(status.key)} label={status.label} />
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: isDark ? 'rgba(22, 143, 145, 0.2)' : '#D3EAE7' },
              ]}
            >
              <ThemedText style={[styles.categoryBadgeText, { color: colors.primary }]}>
                {bill.category || 'Finance'}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.billName, { color: colors.text }]}>
            {bill.name || bill.title || 'Untitled Bill'}
          </ThemedText>

          {bill.provider ? (
            <ThemedText style={[styles.providerName, { color: colors.textSecondary }]}>
              Issued by {bill.provider}
            </ThemedText>
          ) : null}

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <ThemedText style={[styles.amountText, { color: colors.text }]}>
              {formatCurrency(bill.amount, bill.currency)}
            </ThemedText>
            {convertedAmount !== null && (
              <ThemedText style={[styles.convertedAmountText, { color: colors.textSecondary }]}>
                ≈ {formatCurrency(convertedAmount, normPreferred)} ({normPreferred})
              </ThemedText>
            )}
          </View>
        </View>

        {/* Key Attributes Grid */}
        <View style={[styles.detailsSection, { borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Due Date
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {formatFullDate(bill.dueDate)}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'checkmark.seal', android: 'verified', web: 'verified' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Payment Status
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.detailValue,
                { color: isPaid ? '#10B981' : colors.text },
              ]}
            >
              {isPaid ? 'Paid' : 'Unpaid / Pending'}
            </ThemedText>
          </View>

          {isPaid && bill.paidAt && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Paid On
                  </ThemedText>
                </View>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {formatFullDate(bill.paidAt)}
                </ThemedText>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'arrow.clockwise', android: 'autorenew', web: 'autorenew' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Recurrence
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {recurrenceLabel}
            </ThemedText>
          </View>
        </View>

        {/* Notes / Description */}
        {(bill.notes || bill.description) ? (
          <View
            style={[
              styles.notesBox,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.notesLabel, { color: colors.textSecondary }]}>
              Notes & Reference
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {bill.notes || bill.description}
            </ThemedText>
          </View>
        ) : null}

        {/* Primary Actions */}
        <View style={styles.actionButtons}>
          <Button
            variant={isPaid ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            loading={isActionLoading}
            onPress={() => onTogglePaid(bill)}
            icon={
              <SymbolView
                name={{
                  ios: isPaid ? 'arrow.uturn.backward' : 'checkmark.circle.fill',
                  android: isPaid ? 'undo' : 'check_circle',
                  web: isPaid ? 'undo' : 'check_circle',
                }}
                size={18}
                tintColor={
                  isPaid ? colors.text : getButtonForegroundColor('primary', colors, isDark)
                }
              />
            }
          >
            {isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
          </Button>

          <View style={styles.secondaryActionRow}>
            <Button
              variant="outline"
              size="md"
              style={styles.flexBtn}
              onPress={handleEdit}
              icon={
                <SymbolView
                  name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                  size={16}
                  tintColor={colors.primary}
                />
              }
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="md"
              style={styles.flexBtn}
              loading={isDeleting}
              onPress={handleDelete}
              icon={
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  size={16}
                  tintColor="#FFFFFF"
                />
              }
            >
              Delete
            </Button>
          </View>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryBadgeText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  billName: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    marginTop: Spacing.one,
  },
  providerName: {
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  amountContainer: {
    marginTop: Spacing.three,
  },
  amountText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize['3xl'],
    fontVariant: ['tabular-nums'],
  },
  convertedAmountText: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  detailsSection: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  notesBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flexBtn: {
    flex: 1,
  },
});
