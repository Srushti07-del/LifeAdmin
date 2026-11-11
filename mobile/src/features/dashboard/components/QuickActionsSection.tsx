/**
 * Quick Actions Section Component
 * 6 creation and navigation triggers across Tasks, Bills, Appointments,
 * Calendar Events, Reminders, and Documents.
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
      sublabel: 'To-do / deadline',
      route: '/tasks',
      routeLabel: 'Tasks',
      icon: { ios: 'checkmark.circle.badge.plus', android: 'add_task', web: 'add_task' },
      accentColor: colors.primary,
    },
    {
      type: 'bill',
      label: 'Add Bill',
      sublabel: 'Payment / due',
      route: '/bills',
      routeLabel: 'Bills',
      icon: { ios: 'creditcard.badge.plus', android: 'receipt_long', web: 'receipt_long' },
      accentColor: isDark ? '#34D399' : '#059669',
    },
    {
      type: 'appointment',
      label: 'Appointment',
      sublabel: 'Doctor / visit',
      route: '/appointments',
      routeLabel: 'Visits',
      icon: { ios: 'person.crop.circle.badge.plus', android: 'medical_services', web: 'medical_services' },
      accentColor: isDark ? '#38BDF8' : '#0284C7',
    },
    {
      type: 'event',
      label: 'Calendar Event',
      sublabel: 'Date & schedule',
      route: '/calendar',
      routeLabel: 'Calendar',
      icon: { ios: 'calendar.badge.plus', android: 'event', web: 'event' },
      accentColor: colors.primary,
    },
    {
      type: 'reminder',
      label: 'Reminder',
      sublabel: 'Alert & nudge',
      route: '/reminders',
      routeLabel: 'Alerts',
      icon: { ios: 'bell.badge.fill', android: 'alarm_add', web: 'alarm_add' },
      accentColor: isDark ? '#FBBF24' : '#D97706',
    },
    {
      type: 'document',
      label: 'Upload Doc',
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
          Create or jump directly to any module
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => (
          <View
            key={action.type}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : colors.borderSubtle,
              },
              createShadow(isDark, 'xs'),
            ]}
          >
            <Pressable
              onPress={() => onActionPress(action.type)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${action.label}, ${action.sublabel}`}
              style={({ pressed }) => [
                styles.createArea,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <SymbolView
                    name={action.icon as any}
                    size={21}
                    tintColor={action.accentColor}
                  />
                </View>

                <View
                  style={[
                    styles.plusPill,
                    { backgroundColor: `${action.accentColor}16` },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'plus', android: 'add', web: 'add' }}
                    size={13}
                    tintColor={action.accentColor}
                  />
                </View>
              </View>

              <ThemedText numberOfLines={1} style={[styles.actionLabel, { color: colors.text }]}>
                {action.label}
              </ThemedText>

              <ThemedText numberOfLines={1} style={[styles.actionSublabel, { color: colors.textMuted }]}>
                {action.sublabel}
              </ThemedText>
            </Pressable>

            {onNavigatePress && (
              <Pressable
                onPress={() => onNavigatePress(action.route)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Open ${action.routeLabel}`}
                style={({ pressed }) => [
                  styles.navFooter,
                  { borderTopColor: isDark ? colors.border : colors.borderSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ThemedText style={[styles.navFooterText, { color: colors.primary }]}>
                  Open {action.routeLabel}
                </ThemedText>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  size={12}
                  tintColor={colors.primary}
                />
              </Pressable>
            )}
          </View>
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
  actionCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  createArea: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusPill: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionSublabel: {
    fontSize: 11,
    marginTop: 2,
  },
  navFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navFooterText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default QuickActionsSection;
