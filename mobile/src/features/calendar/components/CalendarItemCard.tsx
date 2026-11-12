/**
 * Calendar Item Card Component
 * Renders a single unified calendar item with type badge, title, time range,
 * location, category chip, and status.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarEventItem, CalendarItemType } from '../types';
import { formatTimeRange } from '../services/calendarCalculations';

export const ENTITY_CONFIG: Record<
  CalendarItemType,
  { label: string; icon: string; iosIcon: string; color: string }
> = {
  event: {
    label: 'Event',
    icon: 'event',
    iosIcon: 'calendar',
    color: '#168F91',
  },
  task: {
    label: 'Task',
    icon: 'checklist',
    iosIcon: 'checkmark.square',
    color: '#10B981',
  },
  bill: {
    label: 'Bill',
    icon: 'receipt_long',
    iosIcon: 'creditcard',
    color: '#F59E0B',
  },
  appointment: {
    label: 'Appointment',
    icon: 'schedule',
    iosIcon: 'calendar.badge.clock',
    color: '#8B5CF6',
  },
  reminder: {
    label: 'Reminder',
    icon: 'notifications',
    iosIcon: 'bell',
    color: '#0284C7',
  },
};

export interface CalendarItemCardProps {
  item: CalendarEventItem;
  onPress: (item: CalendarEventItem) => void;
}

export function CalendarItemCard({ item, onPress }: CalendarItemCardProps) {
  const { colors, isDark } = useAppTheme();
  const config = ENTITY_CONFIG[item.type] || ENTITY_CONFIG.event;
  const darkAdjustedAccent =
    item.color ||
    (isDark
      ? item.type === 'appointment'
        ? '#A78BFA'
        : item.type === 'reminder'
        ? '#38BDF8'
        : item.type === 'event'
        ? colors.primary
        : config.color
      : config.color);
  const itemColor = darkAdjustedAccent;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${config.label}: ${item.title}, ${formatTimeRange(item)}`}
    >
      <View style={styles.content}>
        {/* Top Meta Row */}
        <View style={styles.topRow}>
          <View style={styles.typeBadgeRow}>
            <View
              style={[
                styles.typeIconBox,
                { backgroundColor: `${itemColor}20` },
              ]}
            >
              <SymbolView
                name={{
                  ios: config.iosIcon as any,
                  android: config.icon as any,
                  web: config.icon as any,
                }}
                size={14}
                tintColor={itemColor}
              />
            </View>
            <ThemedText style={[styles.typeLabel, { color: itemColor }]}>
              {config.label}
            </ThemedText>
          </View>

          <View style={styles.categoryBadge}>
            <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
              {item.category || 'General'}
            </ThemedText>
          </View>
        </View>

        {/* Title */}
        <ThemedText
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </ThemedText>

        {/* Time and Location Footers */}
        <View style={styles.metaFooter}>
          <View style={styles.metaItem}>
            <SymbolView
              name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              size={13}
              tintColor={colors.textSecondary}
            />
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatTimeRange(item)}
            </ThemedText>
          </View>

          {Boolean(item.location) && (
            <View style={styles.metaItem}>
              <SymbolView
                name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                size={13}
                tintColor={colors.textSecondary}
              />
              <ThemedText
                style={[styles.metaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.location}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  content: {
    gap: Spacing.one,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIconBox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
  },
  categoryText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    lineHeight: 20,
    marginVertical: 2,
  },
  metaFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
  },
});
