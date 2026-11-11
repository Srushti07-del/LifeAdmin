/**
 * Appointment Details Inspection Modal Sheet
 * Displays full details, doctor/specialist, location, notes, and actions (Calendar jump, Edit, Delete).
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { Appointment } from '../types';
import {
  isAppointmentToday,
  isAppointmentUpcoming,
  formatAppointmentDate,
  formatAppointmentTime,
} from '../services/appointmentCalculations';

export interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => Promise<void>;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onDelete,
}: AppointmentDetailsModalProps) {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!appointment) return null;

  const isToday = isAppointmentToday(appointment.date);
  const isUpcoming = isAppointmentUpcoming(appointment.date, appointment.time);

  const statusConfig = isToday
    ? {
        label: 'Today',
        bg: isDark ? 'rgba(22, 143, 145, 0.25)' : '#D3EAE7',
        color: colors.primary,
      }
    : isUpcoming
    ? {
        label: 'Upcoming',
        bg: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.12)',
        color: '#8B5CF6',
      }
    : {
        label: 'Past',
        bg: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
        color: colors.textSecondary,
      };

  const handleDelete = () => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete "${appointment.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await onDelete(appointment._id);
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to delete appointment. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    onClose();
    onEdit(appointment);
  };

  const handleGoToCalendar = () => {
    onClose();
    router.push('/calendar' as any);
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Appointment Details"
      description="Consultation schedule and consultation notes"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
              borderColor: colors.border,
              borderLeftColor: isToday ? colors.primary : '#8B5CF6',
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </ThemedText>
            </View>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
              ]}
            >
              <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
                {appointment.category || 'General'}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.title, { color: colors.text }]}>
            {appointment.title}
          </ThemedText>
        </View>

        {/* Key Attributes Section */}
        <View style={[styles.detailsSection, { borderColor: colors.border }]}>
          {/* Date Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {formatAppointmentDate(appointment.date)}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Time Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Time
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {formatAppointmentTime(appointment.time, appointment.endTime)}
            </ThemedText>
          </View>

          {/* Person / Specialist Row (if present) */}
          {Boolean(appointment.relatedPerson) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'person', android: 'person', web: 'person' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    With Person
                  </ThemedText>
                </View>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {appointment.relatedPerson}
                </ThemedText>
              </View>
            </>
          )}

          {/* Organization / Clinic Row (if present) */}
          {Boolean(appointment.relatedOrganization) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'building.2', android: 'business', web: 'business' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Organization
                  </ThemedText>
                </View>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {appointment.relatedOrganization}
                </ThemedText>
              </View>
            </>
          )}

          {/* Location Row (if present) */}
          {Boolean(appointment.location) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Location / Link
                  </ThemedText>
                </View>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {appointment.location}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {/* Preparation Notes / Instructions */}
        {Boolean(appointment.notes) && (
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
              Preparation Notes
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {appointment.notes}
            </ThemedText>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onPress={handleGoToCalendar}
            icon={
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                size={16}
                tintColor={colors.primary}
              />
            }
          >
            View in Unified Calendar
          </Button>

          <View style={styles.secondaryActionsRow}>
            <Button
              variant="outline"
              size="md"
              style={styles.flexOne}
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
              style={styles.flexOne}
              loading={deleting}
              onPress={handleDelete}
              icon={
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  size={16}
                  tintColor="#EF4444"
                />
              }
            >
              Delete
            </Button>
          </View>

          <Button variant="ghost" size="md" fullWidth onPress={onClose}>
            Close
          </Button>
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
    gap: Spacing.two,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 24,
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
    fontWeight: Typography.fontWeight.semibold,
    maxWidth: '65%',
    textAlign: 'right',
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
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flexOne: {
    flex: 1,
  },
});

