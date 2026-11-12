/**
 * Quick Actions Section Component
 * Compact 3x2 grid of 6 creation shortcuts across Tasks, Bills, Appointments,
 * Calendar Events, Reminders, and Documents, paired with a secondary compact
 * row of one-tap shortcuts to pushed module screens.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
  icon: { ios: string; android: string; web: string };
  accentColor: string;
}

export interface ModuleShortcutConfig {
  route: '/documents' | '/appointments' | '/reminders' | '/ai';
  label: string;
  accessibilityLabel: string;
  icon: { ios: string; android: string; web: string };
}

export const MODULE_SHORTCUTS: ModuleShortcutConfig[] = [
  {
    route: '/documents',
    label: 'Documents',
    accessibilityLabel: 'Open Documents Vault',
    icon: { ios: 'folder.fill', android: 'folder_open', web: 'folder_open' },
  },
  {
    route: '/appointments',
    label: 'Appointments',
    accessibilityLabel: 'Open Appointments',
    icon: { ios: 'calendar.badge.clock', android: 'medical_services', web: 'medical_services' },
  },
  {
    route: '/reminders',
    label: 'Reminders',
    accessibilityLabel: 'Open Smart Reminders',
    icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  },
  {
    route: '/ai',
    label: 'LifeBuddy AI',
    accessibilityLabel: 'Open LifeBuddy AI Assistant',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  },
];

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
      icon: { ios: 'checkmark.circle.badge.plus', android: 'add_task', web: 'add_task' },
      accentColor: colors.primary,
    },
    {
      type: 'bill',
      label: 'Add Bill',
      shortLabel: 'Bill',
      sublabel: 'Payment / due',
      icon: { ios: 'creditcard.badge.plus', android: 'receipt_long', web: 'receipt_long' },
      accentColor: isDark ? '#34D399' : '#059669',
    },
    {
      type: 'appointment',
      label: 'Appointment',
      shortLabel: 'Visit',
      sublabel: 'Doctor / visit',
      icon: { ios: 'person.crop.circle.badge.plus', android: 'medical_services', web: 'medical_services' },
      accentColor: isDark ? '#38BDF8' : '#0284C7',
    },
    {
      type: 'event',
      label: 'Calendar Event',
      shortLabel: 'Event',
      sublabel: 'Date & schedule',
      icon: { ios: 'calendar.badge.plus', android: 'event', web: 'event' },
      accentColor: colors.primary,
    },
    {
      type: 'reminder',
      label: 'Reminder',
      shortLabel: 'Reminder',
      sublabel: 'Alert & nudge',
      icon: { ios: 'bell.badge.fill', android: 'alarm_add', web: 'alarm_add' },
      accentColor: isDark ? '#FBBF24' : '#D97706',
    },
    {
      type: 'document',
      label: 'Upload Doc',
      shortLabel: 'Document',
      sublabel: 'Scan / vault',
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
          Tap to create
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.type}
            onPress={() => onActionPress(action.type)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${action.sublabel}`}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : colors.borderSubtle,
              },
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

      {onNavigatePress ? (
        <View style={[styles.modulesRow, { borderTopColor: colors.borderSubtle }]}>
          <ThemedText style={[styles.modulesLabel, { color: colors.textSecondary }]}>
            Modules
          </ThemedText>
          <View style={styles.modulesChips}>
            {MODULE_SHORTCUTS.map((mod) => (
              <Pressable
                key={mod.route}
                onPress={() => onNavigatePress(mod.route)}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={mod.accessibilityLabel}
                style={({ pressed }) => [
                  styles.moduleChip,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
                    borderColor: isDark ? colors.border : colors.borderSubtle,
                  },
                  pressed && styles.chipPressed,
                ]}
              >
                <SymbolView
                  name={mod.icon as any}
                  size={13}
                  tintColor={colors.primary}
                />
                <ThemedText
                  numberOfLines={1}
                  style={[styles.moduleChipText, { color: colors.text }]}
                >
                  {mod.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
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
    fontFamily: Typography.fontFamilies.sans,
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
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textAlign: 'center',
  },
  modulesRow: {
    marginTop: Spacing.three,
    paddingTop: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  modulesLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    letterSpacing: 0.3,
  },
  modulesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  moduleChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  moduleChipText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  chipPressed: {
    opacity: 0.78,
  },
});

export default QuickActionsSection;
