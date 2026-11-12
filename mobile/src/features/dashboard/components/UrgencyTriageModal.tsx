/**
 * Urgency Triage Modal Sheet
 * Cross-module bottom sheet opened when tapping Overdue or Due Soon stat cards on Home.
 * Renders the exact `needsAttention` items backing each stat count, inline complete/pay
 * actions, and filtered module shortcuts so users never hit an un-filtered Tasks dead-end.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';
import { CurrencyCode, convertAmountTo, formatCurrency } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import {
  TriageMode,
  getFilteredModuleRoute,
  summarizeTriageByModule,
} from '../services/urgencyTriage';
import { AttentionItem } from '../types';

export interface UrgencyTriageModalProps {
  mode: TriageMode | null;
  items: AttentionItem[];
  preferredCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  onClose: () => void;
  onActionPress: (item: AttentionItem) => Promise<void> | void;
  onOpenRoute: (route: string) => void;
}

const ENTITY_META: Record<
  AttentionItem['type'],
  { label: string; icon: { ios: string; android: string; web: string } }
> = {
  task: {
    label: 'Task',
    icon: { ios: 'checkmark.square.fill', android: 'checklist', web: 'checklist' },
  },
  bill: {
    label: 'Bill',
    icon: { ios: 'creditcard.fill', android: 'receipt_long', web: 'receipt_long' },
  },
  reminder: {
    label: 'Reminder',
    icon: { ios: 'bell.fill', android: 'alarm', web: 'alarm' },
  },
  appointment: {
    label: 'Appointment',
    icon: { ios: 'calendar.badge.clock', android: 'calendar_month', web: 'calendar_month' },
  },
  document: {
    label: 'Document',
    icon: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  },
};

export function UrgencyTriageModal({
  mode,
  items,
  preferredCurrency,
  exchangeRates = {},
  onClose,
  onActionPress,
  onOpenRoute,
}: UrgencyTriageModalProps) {
  const { colors, isDark } = useAppTheme();
  const isOpen = mode !== null;
  const effectiveMode: TriageMode = mode ?? 'overdue';
  const moduleShortcuts = summarizeTriageByModule(items, effectiveMode);

  const urgencyPalette =
    effectiveMode === 'overdue' ? Colors.urgency.critical : Colors.urgency.urgent;
  const urgencyBadgeBg = isDark ? urgencyPalette.darkBg : urgencyPalette.lightBg;
  const urgencyBadgeText = isDark ? urgencyPalette.darkText : urgencyPalette.lightText;
  const actionTextColor = isDark ? colors.text : colors.primaryDeep;

  const navigateAndClose = (route: string) => {
    onClose();
    onOpenRoute(route);
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        effectiveMode === 'overdue'
          ? `Overdue Items (${items.length})`
          : `Due Soon (${items.length})`
      }
      description={
        effectiveMode === 'overdue'
          ? 'Past-due items across Tasks, Bills, Reminders, Appointments, and Documents'
          : 'Upcoming deadlines, bills, and reminders due within the next few days'
      }
    >
      {/* Filtered Module Shortcuts */}
      {moduleShortcuts.length > 0 ? (
        <View style={styles.shortcutSection}>
          <ThemedText style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>
            Filter in Module
          </ThemedText>
          <View style={styles.shortcutRow}>
            {moduleShortcuts.map((shortcut) => (
              <Pressable
                key={shortcut.type}
                onPress={() => navigateAndClose(shortcut.route)}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Open ${shortcut.label} (${shortcut.count} ${effectiveMode === 'overdue' ? 'overdue' : 'due soon'})`}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: isDark ? colors.border : colors.primary,
                  },
                  pressed && { opacity: 0.78 },
                ]}
              >
                <ThemedText
                  style={[
                    styles.shortcutChipText,
                    { color: isDark ? colors.text : colors.primaryDeep },
                  ]}
                >
                  {shortcut.label} · {shortcut.count}
                </ThemedText>
                <SymbolView
                  name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' }}
                  size={12}
                  tintColor={isDark ? colors.text : colors.primaryDeep}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Triage Item List or Quiet Empty State */}
      {items.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={28}
            tintColor={Colors.status.success}
          />
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            {effectiveMode === 'overdue' ? 'Nothing Overdue' : 'Nothing Due Soon'}
          </ThemedText>
          <ThemedText style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {effectiveMode === 'overdue'
              ? 'All tracked responsibilities are currently on schedule.'
              : 'No urgent tasks, bills, reminders, or expiring documents in this window.'}
          </ThemedText>
          <View style={styles.emptyShortcuts}>
            {(['task', 'bill', 'reminder'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => navigateAndClose(getFilteredModuleRoute(type, effectiveMode))}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Open ${ENTITY_META[type].label}s`}
                style={({ pressed }) => [
                  styles.emptyShortcutBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <ThemedText style={[styles.emptyShortcutText, { color: colors.text }]}>
                  Open {ENTITY_META[type].label}s
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const meta = ENTITY_META[item.type] || ENTITY_META.task;
            const filteredRoute = getFilteredModuleRoute(item.type, effectiveMode);
            const inlineActionLabel =
              item.type === 'bill' ? 'Pay' : item.type === 'task' ? 'Done' : 'Open';
            const accessibilityActionLabel =
              item.type === 'bill'
                ? `Pay bill ${item.title}`
                : item.type === 'task'
                  ? `Mark task ${item.title} done`
                  : `Open ${item.title} in ${meta.label}s`;

            return (
              <View
                key={`${item.type}-${item.id}`}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => navigateAndClose(filteredRoute)}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.label}: ${item.title}. ${item.urgencyLabel || item.reason}`}
                  accessibilityHint={`Opens filtered ${meta.label}s`}
                  style={({ pressed }) => [styles.itemBody, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.typeBadge, { backgroundColor: urgencyBadgeBg }]}>
                    <SymbolView
                      name={meta.icon as any}
                      size={16}
                      tintColor={isDark ? urgencyPalette.darkText : urgencyPalette.accent}
                    />
                  </View>

                  <View style={styles.itemTextCol}>
                    <View style={styles.itemTitleRow}>
                      <ThemedText numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
                        {item.title}
                      </ThemedText>
                      <View style={[styles.urgencyPill, { backgroundColor: urgencyBadgeBg }]}>
                        <ThemedText style={[styles.urgencyPillText, { color: urgencyBadgeText }]}>
                          {item.urgencyLabel || formatShortDate(item.dueDate)}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText
                      numberOfLines={1}
                      style={[styles.itemMeta, { color: colors.textSecondary }]}
                    >
                      {meta.label} · {item.reason || formatShortDate(item.dueDate)}
                      {item.amount !== undefined
                        ? ` · ${
                            preferredCurrency
                              ? formatCurrency(
                                  convertAmountTo(
                                    item.amount,
                                    item.currency,
                                    preferredCurrency,
                                    exchangeRates,
                                  ),
                                  preferredCurrency,
                                )
                              : formatCurrency(item.amount, item.currency)
                          }`
                        : ''}
                    </ThemedText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (item.type === 'task' || item.type === 'bill') {
                      void onActionPress(item);
                    } else {
                      navigateAndClose(filteredRoute);
                    }
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={accessibilityActionLabel}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <ThemedText style={[styles.actionBtnText, { color: actionTextColor }]}>
                    {inlineActionLabel}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  shortcutSection: {
    marginBottom: Spacing.three,
    gap: Spacing.one + 2,
  },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  shortcutChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  shortcutChipText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: Spacing.two + 2,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  typeBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  urgencyPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  urgencyPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  itemMeta: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
  },
  actionBtn: {
    minHeight: 38,
    minWidth: 58,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  emptyDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyShortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyShortcutBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyShortcutText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
});

export default UrgencyTriageModal;

