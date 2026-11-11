/**
 * Upcoming Timeline Section Component
 * Chronological timeline of upcoming responsibilities with activity icons and tags.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CurrencyCode, convertAmountTo, formatCurrency } from '@/utils/currency';
import { formatTime, formatTimelineDate } from '@/utils/date';
import { UpcomingItem } from '../types';

interface UpcomingTimelineSectionProps {
  items: UpcomingItem[];
  preferredCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  onItemPress?: (item: UpcomingItem) => void;
}

export function UpcomingTimelineSection({
  items,
  preferredCurrency,
  exchangeRates = {},
  onItemPress,
}: UpcomingTimelineSectionProps) {
  const { colors, isDark } = useAppTheme();

  if (!items || items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Upcoming
          </ThemedText>
        </View>
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No upcoming events or scheduled items in the next 30 days.
          </ThemedText>
        </View>
      </View>
    );
  }

  // Type metadata helper
  const getTypeMeta = (type: UpcomingItem['type']) => {
    switch (type) {
      case 'bill':
        return {
          label: 'Bill',
          icon: { ios: 'creditcard.fill', android: 'receipt_long', web: 'receipt_long' },
          accent: '#059669', // Emerald
        };
      case 'appointment':
        return {
          label: 'Appointment',
          icon: { ios: 'calendar.badge.clock', android: 'event', web: 'event' },
          accent: '#0284C7', // Sky
        };
      case 'reminder':
        return {
          label: 'Reminder',
          icon: { ios: 'bell.fill', android: 'alarm', web: 'alarm' },
          accent: '#D97706', // Amber
        };
      case 'event':
        return {
          label: 'Calendar Event',
          icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
          accent: '#8B5CF6', // Purple
        };
      case 'document':
        return {
          label: 'Document',
          icon: { ios: 'doc.text.fill', android: 'description', web: 'description' },
          accent: '#0D9488', // Teal
        };
      case 'task':
      default:
        return {
          label: 'Task',
          icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
          accent: colors.primary,
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Upcoming
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Next 30 days ({items.length})
          </ThemedText>
        </View>
      </View>

      {/* Timeline List */}
      <View style={styles.timelineList}>
        {items.map((item, index) => {
          const typeMeta = getTypeMeta(item.type);
          const dateInfo = formatTimelineDate(item.date);
          const isLast = index === items.length - 1;
          const timeLabel = formatTime(item.time, item.date);

          return (
            <View key={`${item.type}-${item.id}-${index}`} style={styles.timelineRow}>
              {/* Left: Date Column */}
              <View style={styles.dateColumn}>
                <ThemedText style={[styles.dayNumber, { color: colors.text }]}>
                  {dateInfo.dayNumber}
                </ThemedText>
                <ThemedText style={[styles.monthName, { color: colors.textSecondary }]}>
                  {dateInfo.monthName}
                </ThemedText>
                {dateInfo.relativeLabel && (
                  <View style={[styles.relativePill, { backgroundColor: colors.surfaceSecondary }]}>
                    <ThemedText style={[styles.relativeText, { color: colors.primaryDeep }]}>
                      {dateInfo.relativeLabel}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Middle: Timeline Node & Vertical Connector Line */}
              <View style={styles.connectorColumn}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: typeMeta.accent, borderColor: colors.background },
                  ]}
                />
                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      { backgroundColor: isDark ? colors.border : colors.borderSubtle },
                    ]}
                  />
                )}
              </View>

              {/* Right: Activity Card */}
              <Pressable
                onPress={() => onItemPress?.(item)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${typeMeta.label}: ${item.title}`}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? colors.border : colors.borderSubtle,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <SymbolView
                      name={typeMeta.icon as any}
                      size={13}
                      tintColor={typeMeta.accent}
                    />
                    <ThemedText style={[styles.typeBadgeText, { color: typeMeta.accent }]}>
                      {typeMeta.label}
                    </ThemedText>
                  </View>

                  {timeLabel ? (
                    <ThemedText style={[styles.timeText, { color: colors.textMuted }]}>
                      {timeLabel}
                    </ThemedText>
                  ) : null}
                </View>

                <ThemedText numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
                  {item.title}
                </ThemedText>

                {item.subtitle ? (
                  <ThemedText numberOfLines={1} style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                    {item.subtitle}
                  </ThemedText>
                ) : null}

                {item.amount !== undefined && (
                  <ThemedText style={[styles.amountText, { color: colors.primaryDeep }]}>
                    {preferredCurrency
                      ? formatCurrency(
                          convertAmountTo(item.amount, item.currency, preferredCurrency, exchangeRates),
                          preferredCurrency
                        )
                      : formatCurrency(item.amount, item.currency)}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.eight,
  },
  sectionHeader: {
    marginBottom: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  timelineList: {
    position: 'relative',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  dateColumn: {
    width: 48,
    alignItems: 'center',
    paddingTop: 2,
  },
  dayNumber: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  monthName: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.semibold,
  },
  relativePill: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  relativeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  connectorColumn: {
    width: 20,
    alignItems: 'center',
    position: 'relative',
    height: '100%',
    paddingTop: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    borderWidth: 2,
    zIndex: 2,
  },
  connectorLine: {
    position: 'absolute',
    top: 18,
    bottom: -18,
    width: 2,
    zIndex: 1,
  },
  card: {
    flex: 1,
    padding: Spacing.three + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginLeft: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
  },
  itemTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  itemSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  amountText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});

export default UpcomingTimelineSection;
