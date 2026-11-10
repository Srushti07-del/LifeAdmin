import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface StatCardProps extends ViewProps {
  label: string;
  value: string | number;
  subtitle?: string;
  dotColor?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  progress?: number; // 0 to 1
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function StatCard({
  label,
  value,
  subtitle,
  dotColor,
  accentColor,
  icon,
  badge,
  progress,
  onPress,
  style,
  valueStyle,
  labelStyle,
  ...props
}: StatCardProps) {
  const colors = useTheme();
  const isDark = useIsDark();

  const cardShadow = createShadow(isDark, 'card');

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        cardShadow,
        style,
      ]}
      {...props}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.label,
            { color: accentColor || colors.textSecondary },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>

        {dotColor ? (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        ) : badge ? (
          badge
        ) : icon ? (
          <View style={styles.iconContainer}>{icon}</View>
        ) : null}
      </View>

      {/* Main Metric Value */}
      <Text
        style={[
          styles.value,
          { color: colors.text },
          valueStyle,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>

      {/* Optional Subtitle */}
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}

      {/* Optional Progress Bar */}
      {typeof progress === 'number' ? (
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                backgroundColor: accentColor || colors.primary,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    overflow: 'hidden',
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one + 2,
  },
  label: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    marginTop: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.three,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});

export default StatCard;

