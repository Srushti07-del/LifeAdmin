/**
 * Needs Attention Section Component
 * Displays actionable items (overdue tasks, approaching bills, today's appointments)
 * with clear priority urgency badges.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { CurrencyCode, convertAmountTo, formatCurrency } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import { AttentionItem } from '../types';

interface NeedsAttentionSectionProps {
  items: AttentionItem[];
  preferredCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  onItemPress?: (item: AttentionItem) => void;
  onActionPress?: (item: AttentionItem) => void;
}

export function NeedsAttentionSection({
  items,
  preferredCurrency,
  exchangeRates = {},
  onItemPress,
  onActionPress,
}: NeedsAttentionSectionProps) {
  const { colors, isDark } = useAppTheme();

  if (!items || items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Needs Attention
          </ThemedText>
        </View>
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={28}
            tintColor={Colors.status.success}
          />
          <View style={styles.emptyTextContainer}>
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
              All Caught Up!
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No urgent deadlines or overdue bills right now.
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Needs Attention
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
            <ThemedText style={[styles.countBadgeText, { color: colors.primary }]}>
              {items.length}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Requires immediate review or action
        </ThemedText>
      </View>

      {/* Action Items List */}
      <View style={styles.itemsList}>
        {items.map((item) => {
          const urgencyConfig =
            item.severity === 'overdue'
              ? Colors.urgency.critical
              : item.severity === 'urgent'
              ? Colors.urgency.urgent
              : item.severity === 'soon'
              ? Colors.urgency.dueSoon
              : Colors.urgency.upcoming;

          const badgeBg = isDark ? urgencyConfig.darkBg : urgencyConfig.lightBg;
          const badgeText = isDark ? urgencyConfig.darkText : urgencyConfig.lightText;

          // Icon based on item type
          const iconName =
            item.type === 'bill'
              ? { ios: 'creditcard.fill', android: 'receipt_long', web: 'receipt_long' }
              : item.type === 'appointment'
              ? { ios: 'calendar.badge.clock', android: 'calendar_month', web: 'calendar_month' }
              : item.type === 'reminder'
              ? { ios: 'bell.fill', android: 'alarm', web: 'alarm' }
              : item.type === 'document'
              ? { ios: 'doc.text.fill', android: 'description', web: 'description' }
              : { ios: 'checkmark.square.fill', android: 'checklist', web: 'checklist' };

          return (
            <Pressable
              key={`${item.type}-${item.id}`}
              onPress={() => onItemPress?.(item)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.urgencyLabel || item.reason}`}
              style={({ pressed }) => [
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    item.severity === 'overdue'
                      ? urgencyConfig.accent
                      : isDark
                      ? colors.border
                      : colors.borderSubtle,
                },
                createShadow(isDark, 'card'),
                pressed && styles.pressed,
              ]}
            >
              {/* Card Body */}
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  {/* Type Icon & Title */}
                  <View style={styles.titleContainer}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: badgeBg },
                      ]}
                    >
                      <SymbolView
                        name={iconName as any}
                        size={18}
                        tintColor={urgencyConfig.accent}
                      />
                    </View>
                    <View style={styles.textColumn}>
                      <ThemedText numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
                        {item.title}
                      </ThemedText>
                      <ThemedText numberOfLines={1} style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle || item.reason}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Urgency Badge */}
                  <View style={[styles.urgencyBadge, { backgroundColor: badgeBg }]}>
                    <View
                      style={[
                        styles.urgencyDot,
                        { backgroundColor: urgencyConfig.accent },
                      ]}
                    />
                    <ThemedText style={[styles.urgencyBadgeText, { color: badgeText }]}>
                      {item.urgencyLabel || formatShortDate(item.dueDate)}
                    </ThemedText>
                  </View>
                </View>

                {/* Footer with Amount (if bill) or Action Button */}
                <View style={[styles.cardFooter, { borderTopColor: colors.borderSubtle }]}>
                  {item.amount !== undefined ? (
                    <ThemedText style={[styles.amountText, { color: colors.text }]}>
                      {preferredCurrency
                        ? formatCurrency(
                            convertAmountTo(item.amount, item.currency, preferredCurrency, exchangeRates),
                            preferredCurrency
                          )
                        : formatCurrency(item.amount, item.currency)}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[styles.dueDateText, { color: colors.textMuted }]}>
                      Due: {formatShortDate(item.dueDate)}
                    </ThemedText>
                  )}

                  <Pressable
                    onPress={() => onActionPress?.(item)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={item.type === 'bill' ? 'Pay Bill' : 'Mark Done'}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.surfaceSecondary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={[styles.actionButtonText, { color: colors.primaryDeep }]}>
                      {item.type === 'bill' ? 'Pay' : item.type === 'task' ? 'Done' : 'View'}
                    </ThemedText>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={14}
                      tintColor={colors.primaryDeep}
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.six,
  },
  sectionHeader: {
    marginBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  itemsList: {
    gap: Spacing.three,
  },
  itemCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.four,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amountText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  dueDateText: {
    fontSize: Typography.fontSize.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.md,
    gap: 4,
    minHeight: 32,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});

export default NeedsAttentionSection;
