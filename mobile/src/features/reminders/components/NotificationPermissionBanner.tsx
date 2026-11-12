/**
 * LifeAdmin Mobile — Notification Permission Banner
 * Informs the user about native alert scheduling and prompts for notification
 * display or Android exact-alarm (SCHEDULE_EXACT_ALARM) permissions.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { PermissionBannerType } from '../types';

interface NotificationPermissionBannerProps {
  type?: PermissionBannerType;
  onEnable: () => void;
  onDismiss: () => void;
}

export function NotificationPermissionBanner({
  type = 'notifications',
  onEnable,
  onDismiss,
}: NotificationPermissionBannerProps) {
  const { colors, isDark } = useAppTheme();
  const isExactAlarm = type === 'exact_alarm';

  const title = isExactAlarm
    ? 'Allow Exact Alarms & Reminders'
    : 'Enable Device Notifications';

  const subtitle = isExactAlarm
    ? "Android requires 'Alarms & Reminders' access so scheduled bills and appointments ring at the exact minute, even in battery saver mode."
    : 'Receive timely alerts for your deadlines, bills, and appointments even when LifeAdmin is closed.';

  const buttonText = isExactAlarm ? 'Grant' : 'Enable';

  const iconName = isExactAlarm
    ? { ios: 'alarm.fill', android: 'alarm' as any }
    : { ios: 'bell.badge.fill', android: 'notification_important' as any };

  const iconTint = isExactAlarm
    ? isDark
      ? Colors.urgency.dueSoon.darkText
      : Colors.urgency.dueSoon.lightText
    : colors.primary;

  const bannerBg = isExactAlarm
    ? isDark
      ? Colors.urgency.dueSoon.darkBg
      : Colors.urgency.dueSoon.lightBg
    : colors.surfaceSecondary;

  const bannerBorder = isExactAlarm
    ? Colors.urgency.dueSoon.accent
    : colors.border;

  const enableBg = isExactAlarm ? Colors.urgency.dueSoon.accent : colors.primary;
  const enableFg = isExactAlarm
    ? '#FFFFFF'
    : getButtonForegroundColor('primary', colors, isDark);

  return (
    <View
      style={[
        styles.bannerContainer,
        {
          backgroundColor: bannerBg,
          borderColor: bannerBorder,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isExactAlarm
              ? 'rgba(245, 158, 11, 0.16)'
              : colors.primarySoft,
          },
        ]}
      >
        <SymbolView
          name={iconName as any}
          size={20}
          tintColor={iconTint}
        />
      </View>

      <View style={styles.textContainer}>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onEnable}
          hitSlop={6}
          style={[styles.enableBtn, { backgroundColor: enableBg }]}
        >
          <ThemedText style={[styles.enableBtnText, { color: enableFg }]}>
            {buttonText}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification banner"
          style={styles.closeBtn}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close' }}
            size={14}
            tintColor={colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 110, 110, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 15,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  enableBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  enableBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
  },
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
});

