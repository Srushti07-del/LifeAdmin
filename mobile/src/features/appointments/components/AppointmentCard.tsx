/**
 * Appointment Card Component
 * Displays appointment title, doctor/specialist, organization, date/time,
 * location, category chip, notes preview, and clear status.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { Appointment } from '../types';
import {
  isAppointmentToday,
  isAppointmentUpcoming,
  formatAppointmentDate,
  formatAppointmentTime,
} from '../services/appointmentCalculations';

export interface AppointmentCardProps {
  appointment: Appointment;
  onPress: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const { colors, isDark } = useAppTheme();

  const isToday = isAppointmentToday(appointment.date);
  const isUpcoming = isAppointmentUpcoming(appointment.date, appointment.time);

  // Status badge config
  const statusConfig = isToday
    ? {
        label: 'Today',
        bg: colors.primarySoft,
        color: colors.primary,
        dot: colors.primary,
      }
    : isUpcoming
    ? {
        label: 'Upcoming',
        bg: colors.surfaceSecondary,
        color: colors.text,
        dot: colors.primary,
      }
    : {
        label: 'Past',
        bg: colors.surfaceSecondary,
        color: colors.textSecondary,
        dot: colors.textMuted,
      };

  return (
    <Pressable
      onPress={() => onPress(appointment)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isToday ? colors.primary : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Appointment: ${appointment.title}, ${formatAppointmentDate(appointment.date)}, ${statusConfig.label}`}
    >
      <View style={styles.content}>
        {/* Top Meta Row */}
        <View style={styles.topRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
              {appointment.category || 'General'}
            </ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.dot }]} />
            <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </ThemedText>
          </View>
        </View>

        {/* Title */}
        <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {appointment.title}
        </ThemedText>

        {/* Date and Time Line */}
        <View style={styles.timeLine}>
          <View style={styles.timeItem}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={14}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.dateText, { color: colors.primary }]}>
              {formatAppointmentDate(appointment.date)}
            </ThemedText>
          </View>

          {Boolean(appointment.time) && (
            <View style={styles.timeItem}>
              <ThemedText style={[styles.separator, { color: colors.textSecondary }]}>
                •
              </ThemedText>
              <SymbolView
                name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                size={14}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatAppointmentTime(appointment.time, appointment.endTime)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* People & Organization Chips */}
        {(appointment.relatedPerson || appointment.relatedOrganization) && (
          <View style={styles.entityRow}>
            {Boolean(appointment.relatedPerson) && (
              <View style={styles.entityChip}>
                <SymbolView
                  name={{ ios: 'person', android: 'person', web: 'person' }}
                  size={12}
                  tintColor={colors.textSecondary}
                />
                <ThemedText
                  style={[styles.entityText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {appointment.relatedPerson}
                </ThemedText>
              </View>
            )}

            {Boolean(appointment.relatedOrganization) && (
              <View style={styles.entityChip}>
                <SymbolView
                  name={{ ios: 'building.2', android: 'business', web: 'business' }}
                  size={12}
                  tintColor={colors.textSecondary}
                />
                <ThemedText
                  style={[styles.entityText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {appointment.relatedOrganization}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Location Badge */}
        {Boolean(appointment.location) && (
          <View style={styles.locationRow}>
            <SymbolView
              name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
              size={12}
              tintColor={colors.textSecondary}
            />
            <ThemedText
              style={[styles.locationText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {appointment.location}
            </ThemedText>
          </View>
        )}

        {/* Notes Preview */}
        {Boolean(appointment.notes) && (
          <ThemedText
            style={[styles.notesPreview, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {appointment.notes}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.two,
  },
  content: {
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.editorial,
    lineHeight: 22,
  },
  timeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    fontSize: Typography.fontSize.xs,
    marginHorizontal: 2,
  },
  timeText: {
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  entityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 2,
  },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  entityText: {
    fontSize: 11,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
  },
  notesPreview: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 2,
  },
});

