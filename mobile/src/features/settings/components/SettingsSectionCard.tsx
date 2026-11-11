/**
 * LifeAdmin Mobile — Reusable Editorial Sanctuary Settings Section Container
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export interface SettingsSectionCardProps {
  title: string;
  subtitle?: string;
  icon: { ios: string; android: string };
  accentTone?: 'primary' | 'danger' | 'warning' | 'neutral';
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  subtitle,
  icon,
  accentTone = 'primary',
  headerRight,
  children,
}: SettingsSectionCardProps) {
  const { colors, isDark } = useAppTheme();

  const iconTint =
    accentTone === 'danger'
      ? Colors.status.danger
      : accentTone === 'warning'
      ? Colors.status.warning
      : accentTone === 'neutral'
      ? colors.textSecondary
      : colors.primary;

  const iconBg =
    accentTone === 'danger'
      ? isDark
        ? 'rgba(239, 68, 68, 0.16)'
        : '#FEE2E2'
      : accentTone === 'warning'
      ? isDark
        ? 'rgba(245, 158, 11, 0.16)'
        : '#FEF3C7'
      : colors.surfaceSecondary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: accentTone === 'danger' ? (isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA') : colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <SymbolView
              name={{ ios: icon.ios, android: icon.android, web: icon.android } as any}
              size={18}
              tintColor={iconTint}
            />
          </View>
          <View style={styles.titleCol}>
            <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
            {subtitle ? (
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  body: {
    gap: Spacing.three,
  },
});

export default SettingsSectionCard;
