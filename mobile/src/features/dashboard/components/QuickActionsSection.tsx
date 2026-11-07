/**
 * Quick Actions Section Component
 * 4 primary creation triggers: Add Task, Add Bill, Add Reminder, Add Appointment.
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
}

interface ActionConfig {
  type: QuickActionType;
  label: string;
  sublabel: string;
  icon: { ios: string; android: string; web: string };
  accentColor: string;
}

export function QuickActionsSection({ onActionPress }: QuickActionsSectionProps) {
  const { colors, isDark } = useAppTheme();

  const actions: ActionConfig[] = [
    {
      type: 'task',
      label: 'Add Task',
      sublabel: 'To-do / deadline',
      icon: { ios: 'checkmark.circle.badge.plus', android: 'add_task', web: 'add_task' },
      accentColor: colors.primary,
    },
    {
      type: 'bill',
      label: 'Add Bill',
      sublabel: 'Payment / INR',
      icon: { ios: 'creditcard.badge.plus', android: 'receipt_long', web: 'receipt_long' },
      accentColor: '#059669', // Emerald
    },
    {
      type: 'reminder',
      label: 'Reminder',
      sublabel: 'Alert & nudge',
      icon: { ios: 'bell.badge.fill', android: 'alarm_add', web: 'alarm_add' },
      accentColor: '#D97706', // Amber
    },
    {
      type: 'appointment',
      label: 'Appointment',
      sublabel: 'Doctor / meet',
      icon: { ios: 'calendar.badge.plus', android: 'event', web: 'event' },
      accentColor: '#0284C7', // Sky
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
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
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border : colors.borderSubtle,
              },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: isDark ? colors.surfaceSecondary : colors.surfaceSecondary },
              ]}
            >
              <SymbolView
                name={action.icon as any}
                size={22}
                tintColor={action.accentColor}
              />
            </View>

            <ThemedText numberOfLines={1} style={[styles.actionLabel, { color: colors.text }]}>
              {action.label}
            </ThemedText>

            <ThemedText numberOfLines={1} style={[styles.actionSublabel, { color: colors.textMuted }]}>
              {action.sublabel}
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
    marginBottom: Spacing.six,
  },
  sectionHeader: {
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.three + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionSublabel: {
    fontSize: 11,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});

export default QuickActionsSection;
