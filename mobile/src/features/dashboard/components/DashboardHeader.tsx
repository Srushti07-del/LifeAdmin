/**
 * Dashboard Header Component
 * Displays personalized time-of-day greeting, user name/avatar, and notification indicator.
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { getGreeting } from '@/utils/date';

interface DashboardHeaderProps {
  userName?: string;
  unreadCount?: number;
  onCustomizePress?: () => void;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
}

export function DashboardHeader({
  userName = 'User',
  unreadCount = 0,
  onCustomizePress,
  onNotificationPress,
  onAvatarPress,
}: DashboardHeaderProps) {
  const { colors, isDark } = useAppTheme();
  const greeting = getGreeting();

  const userInitial = (userName?.charAt(0) || 'U').toUpperCase();

  return (
    <View style={styles.container}>
      {/* Left: Greeting and User Name */}
      <View style={styles.leftContent}>
        <View style={styles.greetingRow}>
          <SymbolView
            name={{ ios: 'sun.max.fill', android: greeting.iconName, web: greeting.iconName } as any}
            size={16}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.greetingText, { color: colors.textSecondary }]}>
            {greeting.text}
          </ThemedText>
        </View>

        <ThemedText style={[styles.nameText, { color: colors.text }]}>
          {userName}
        </ThemedText>
      </View>

      {/* Right: Customize, Notification Bell & Profile Avatar */}
      <View style={styles.rightContent}>
        {onCustomizePress && (
          <Pressable
            onPress={onCustomizePress}
            accessible
            accessibilityLabel="Customize dashboard widgets"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: colors.surfaceSecondary },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
              size={20}
              tintColor={colors.text}
            />
          </Pressable>
        )}

        {/* Notification Bell with Badge */}
        <Pressable
          onPress={onNotificationPress}
          accessible
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: isDark ? colors.surfaceSecondary : colors.surfaceSecondary },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            size={20}
            tintColor={colors.text}
          />
          {unreadCount > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.notification, borderColor: colors.background },
            ]}
          >
            <ThemedText style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>

        {/* Profile Avatar */}
        <Pressable
          onPress={onAvatarPress}
          hitSlop={4}
          accessible
          accessibilityLabel="User Profile"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.avatarButton,
            { borderColor: colors.primary, backgroundColor: colors.primarySoft },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={[styles.avatarText, { color: colors.primary }]}>
            {userInitial}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  leftContent: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  greetingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  nameText: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamilies.editorial,
    letterSpacing: -0.5,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});

export default DashboardHeader;
