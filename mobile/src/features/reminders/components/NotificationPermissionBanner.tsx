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
    ? isDark ? '#FBBF24' : '#D97706'
    : colors.primary;

  const bannerBg = isExactAlarm
    ? isDark ? '#2E2818' : '#FEF3C7'
    : isDark ? '#26383E' : '#E8F2F0';

  const bannerBorder = isExactAlarm
    ? isDark ? '#594318' : '#FDE68A'
    : isDark ? '#354E57' : colors.primarySoft;

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
      <View style={[styles.iconBox, { backgroundColor: isExactAlarm ? 'rgba(217, 119, 6, 0.12)' : 'rgba(13, 110, 110, 0.1)' }]}>
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
          style={[styles.enableBtn, { backgroundColor: isExactAlarm ? (isDark ? '#D97706' : '#B45309') : colors.primary }]}
        >
          <ThemedText style={styles.enableBtnText}>{buttonText}</ThemedText>
        </Pressable>

        <Pressable onPress={onDismiss} hitSlop={8} style={styles.closeBtn}>
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
    padding: 4,
  },
});

