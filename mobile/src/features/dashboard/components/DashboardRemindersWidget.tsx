/**
 * Dashboard Active Reminders Widget
 * Displays scheduled active reminders count and upcoming alert previews.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { formatShortDate, formatTime } from '@/utils/date';
import { DashboardReminderPreview } from '../types';

interface DashboardRemindersWidgetProps {
  activeCount: number;
  reminders?: DashboardReminderPreview[];
  onViewAll: () => void;
  onAddReminder: () => void;
}

export function DashboardRemindersWidget({
  activeCount,
  reminders = [],
  onViewAll,
  onAddReminder,
}: DashboardRemindersWidgetProps) {
  const { colors, isDark } = useAppTheme();
  const previews = reminders.slice(0, 3);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? Colors.urgency.dueSoon.darkBg
                    : Colors.urgency.dueSoon.lightBg,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'bell.fill', android: 'alarm', web: 'alarm' }}
                size={18}
                tintColor={
                  isDark
                    ? Colors.urgency.dueSoon.darkText
                    : Colors.urgency.dueSoon.accent
                }
              />
            </View>
            <View>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                Active Reminders
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                {activeCount} active reminder alert{activeCount === 1 ? '' : 's'} scheduled
              </ThemedText>
            </View>
          </View>

          <Pressable onPress={onViewAll} hitSlop={8}>
            <ThemedText style={[styles.viewAllText, { color: colors.primary }]}>
              View all
            </ThemedText>
          </Pressable>
        </View>

        {previews.length > 0 ? (
          <View style={styles.list}>
            {previews.map((rem) => {
              const timeStr = formatTime(rem.dueTime, rem.dueDate);
              return (
                <Pressable
                  key={rem._id}
                  onPress={onViewAll}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderSubtle,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.rowTitle, { color: colors.text }]}
                  >
                    {rem.title}
                  </ThemedText>
                  <ThemedText style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {formatShortDate(rem.dueDate)}
                    {timeStr ? ` · ${timeStr}` : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeCount > 0
                ? 'Open Reminders to view scheduled upcoming alerts.'
                : 'No reminders scheduled yet.'}
            </ThemedText>
            <Pressable
              onPress={onAddReminder}
              style={[
                styles.emptyBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.emptyBtnText, { color: colors.primary }]}>
                + Add Reminder
              </ThemedText>
            </Pressable>
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
  rowTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    flex: 1,
    minWidth: 0,
  },
  rowMeta: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
    fontVariant: ['tabular-nums'],
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  emptyText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  emptyBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

export default DashboardRemindersWidget;

