/**
 * LifeAdmin Mobile — Reminder Details Modal Sheet
 * In-depth inspection of reminder specifications, alert trigger schedule,
 * linked records, and completion/delete controls.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { Reminder } from '../types';
import {
  getReminderSection,
  formatReminderDueDate,
  formatReminderDueTime,
  getDueAt,
  getAlertTime,
  formatOffset,
} from '../services/reminderCalculations';

export interface ReminderDetailsModalProps {
  isOpen: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onEdit: (reminder: Reminder) => void;
  onToggleComplete: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export function ReminderDetailsModal({
  isOpen,
  reminder,
  onClose,
  onEdit,
  onToggleComplete,
  onDelete,
}: ReminderDetailsModalProps) {
  const { colors, isDark } = useAppTheme();

  if (!reminder) return null;

  const isCompleted = reminder.status === 'completed';
  const section = getReminderSection(reminder);
  const isOverdue = section === 'overdue';

  const dueAt = getDueAt(reminder.dueDate, reminder.dueTime);
  const formattedDate = formatReminderDueDate(reminder.dueDate, reminder.dueTime);
  const formattedTime = formatReminderDueTime(reminder.dueTime);
  const offsets = reminder.reminderOffsetMinutes || [0];

  const handleDeletePrompt = () => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${reminder.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onClose();
            onDelete(reminder._id);
          },
        },
      ]
    );
  };

  const completedColor = isDark
    ? Colors.urgency.completed.darkText
    : Colors.urgency.completed.lightText;
  const completedBg = isDark
    ? Colors.urgency.completed.darkBg
    : Colors.urgency.completed.lightBg;
  const criticalColor = isDark
    ? Colors.urgency.critical.darkText
    : Colors.urgency.critical.lightText;
  const criticalBg = isDark
    ? Colors.urgency.critical.darkBg
    : Colors.urgency.critical.lightBg;
  const highColor = isDark
    ? Colors.urgency.urgent.darkText
    : Colors.urgency.urgent.lightText;
  const highBg = isDark
    ? Colors.urgency.urgent.darkBg
    : Colors.urgency.urgent.lightBg;
  const primaryFg = getButtonForegroundColor('primary', colors, isDark);

  const recurrenceText =
    reminder.recurrence && reminder.recurrence.type !== 'none'
      ? reminder.recurrence.interval && reminder.recurrence.interval > 1
        ? `Every ${reminder.recurrence.interval} (${reminder.recurrence.type})`
        : `Repeats ${reminder.recurrence.type}`
      : 'Does not repeat';

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={reminder.title}
      description={`${reminder.category || 'Personal'} Reminder`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status & Priority Row */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isCompleted
                  ? completedBg
                  : isOverdue
                  ? criticalBg
                  : colors.primarySoft,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.statusChipText,
                {
                  color: isCompleted
                    ? completedColor
                    : isOverdue
                    ? criticalColor
                    : colors.primary,
                },
              ]}
            >
              {isCompleted ? 'COMPLETED' : isOverdue ? 'OVERDUE' : 'ACTIVE'}
            </ThemedText>
          </View>

          <View
            style={[
              styles.priorityChip,
              {
                backgroundColor:
                  reminder.priority === 'urgent'
                    ? criticalBg
                    : reminder.priority === 'high'
                    ? highBg
                    : colors.primarySoft,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.priorityChipText,
                {
                  color:
                    reminder.priority === 'urgent'
                      ? criticalColor
                      : reminder.priority === 'high'
                      ? highColor
                      : colors.primary,
                },
              ]}
            >
              {reminder.priority.toUpperCase()} PRIORITY
            </ThemedText>
          </View>
        </View>

        {/* Primary Action Button */}
        <View style={styles.primaryActionRow}>
          <Button
            variant={isCompleted ? 'outline' : 'primary'}
            onPress={() => onToggleComplete(reminder)}
            style={{ flex: 1 }}
            icon={
              <SymbolView
                name={{
                  ios: isCompleted ? 'arrow.uturn.backward' : 'checkmark',
                  android: isCompleted ? 'replay' : 'check',
                }}
                size={16}
                tintColor={isCompleted ? colors.text : primaryFg}
              />
            }
          >
            {isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
          </Button>

          <Pressable
            onPress={() => {
              onClose();
              onEdit(reminder);
            }}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'pencil', android: 'edit' }}
              size={18}
              tintColor={colors.text}
            />
          </Pressable>

          <Pressable
            onPress={handleDeletePrompt}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: criticalBg },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash.fill', android: 'delete' }}
              size={18}
              tintColor={criticalColor}
            />
          </Pressable>
        </View>

        {/* Schedule Specifications Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SCHEDULE DETAILS
          </ThemedText>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Due Date
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {formattedDate}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Due Time
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {formattedTime || '9:00 AM (default)'}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Recurrence
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {recurrenceText}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Category
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {reminder.category || 'Personal'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Native Notification Trigger Times */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SCHEDULED DEVICE ALERTS
          </ThemedText>

          {offsets.map((offset, idx) => {
            const triggerTime = getAlertTime(dueAt, offset);
            const isPast = triggerTime.getTime() < Date.now();

            return (
              <View key={`offset-${idx}`} style={styles.alertRow}>
                <View style={styles.alertIconBox}>
                  <SymbolView
                    name={{ ios: 'bell.fill', android: 'notifications' }}
                    size={14}
                    tintColor={isPast ? colors.textMuted : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.alertTiming, { color: colors.text }]}>
                    {formatOffset(offset)}
                  </ThemedText>
                  <ThemedText style={[styles.alertExact, { color: colors.textSecondary }]}>
                    {triggerTime.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {triggerTime.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.alertStatus,
                    { color: isPast ? colors.textMuted : completedColor },
                  ]}
                >
                  {isPast ? 'Passed' : 'Armed'}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Description / Notes */}
        {reminder.description ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              NOTES & DESCRIPTION
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {reminder.description}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.seven,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  priorityChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaCell: {
    width: '48%',
  },
  metaCellLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
  },
  metaCellValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: 2,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  alertIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 110, 110, 0.08)',
  },
  alertTiming: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  alertExact: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 1,
  },
  alertStatus: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 18,
  },
});

