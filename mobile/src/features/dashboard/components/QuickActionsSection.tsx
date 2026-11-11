/**
 * Quick Actions Section Component
 * Compact 3x2 grid of 6 creation shortcuts across Tasks, Bills, Appointments,
 * Calendar Events, Reminders, and Documents.
 * Tap creates; press and hold opens the matching module.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { QuickActionType } from '../types';

interface QuickActionsSectionProps {
  onActionPress: (type: QuickActionType) => void;
  onNavigatePress?: (route: string) => void;
}

interface ActionConfig {
  type: QuickActionType;
  label: string;
  shortLabel: string;
  sublabel: string;
  route: string;
  routeLabel: string;
  icon: { ios: string; android: string; web: string };
  accentColor: string;
}

export function QuickActionsSection({
  onActionPress,
  onNavigatePress,
}: QuickActionsSectionProps) {
  const { colors, isDark } = useAppTheme();

  const actions: ActionConfig[] = [
    {
      type: 'task',
      label: 'Add Task',
      shortLabel: 'Task',
      sublabel: 'To-do / deadline',
      route: '/tasks',
      routeLabel: 'Tasks',
      icon: { ios: 'checkmark.circle.badge.plus', android: 'add_task', web: 'add_task' },
      accentColor: colors.primary,
    },
    {
      type: 'bill',
      label: 'Add Bill',
      shortLabel: 'Bill',
      sublabel: 'Payment / due',
      route: '/bills',
      routeLabel: 'Bills',
      icon: { ios: 'creditcard.badge.plus', android: 'receipt_long', web: 'receipt_long' },
      accentColor: isDark ? '#34D399' : '#059669',
    },
    {
      type: 'appointment',
      label: 'Appointment',
      shortLabel: 'Visit',
      sublabel: 'Doctor / visit',
      route: '/appointments',
      routeLabel: 'Visits',
      icon: { ios: 'person.crop.circle.badge.plus', android: 'medical_services', web: 'medical_services' },
      accentColor: isDark ? '#38BDF8' : '#0284C7',
    },
    {
      type: 'event',
      label: 'Calendar Event',
      shortLabel: 'Event',
      sublabel: 'Date & schedule',
      route: '/calendar',
      routeLabel: 'Calendar',
      icon: { ios: 'calendar.badge.plus', android: 'event', web: 'event' },
      accentColor: colors.primary,
    },
    {
      type: 'reminder',
      label: 'Reminder',
      shortLabel: 'Reminder',
      sublabel: 'Alert & nudge',
      route: '/reminders',
      routeLabel: 'Alerts',
      icon: { ios: 'bell.badge.fill', android: 'alarm_add', web: 'alarm_add' },
      accentColor: isDark ? '#FBBF24' : '#D97706',
    },
    {
      type: 'document',
      label: 'Upload Doc',
      shortLabel: 'Document',
      sublabel: 'Scan / vault',
      route: '/documents',
      routeLabel: 'Vault',
      icon: { ios: 'doc.badge.plus', android: 'upload_file', web: 'upload_file' },
      accentColor: isDark ? colors.primary : colors.primaryDeep,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </ThemedText>
        <ThemedText style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Tap to create{onNavigatePress ? ' · hold to open the module' : ''}
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.type}
            onPress={() => onActionPress(action.type)}
            onLongPress={onNavigatePress ? () => onNavigatePress(action.route) : undefined}
            delayLongPress={350}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${action.sublabel}`}
            accessibilityHint={onNavigatePress ? `Hold to open ${action.routeLabel}` : undefined}
            accessibilityActions={
              onNavigatePress
                ? [{ name: 'activate', label: `Open ${action.routeLabel}` }]
                : undefined
            }
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'activate') onNavigatePress?.(action.route);
            }}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : colors.borderSubtle,
              },
              createShadow(isDark, 'xs'),
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${action.accentColor}16` }]}>
              <SymbolView name={action.icon as any} size={20} tintColor={action.accentColor} />
            </View>
            <ThemedText numberOfLines={1} style={[styles.actionLabel, { color: colors.text }]}>
              {action.shortLabel}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    marginBottom: Spacing.two + 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
  },
  sectionHint: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 76,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});

export default QuickActionsSection;
