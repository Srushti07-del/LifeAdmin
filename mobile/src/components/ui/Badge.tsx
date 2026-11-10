import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function Badge({
  variant = 'secondary',
  size = 'md',
  dot = false,
  style,
  textStyle,
  children,
  ...props
}: BadgeProps) {
  const colors = useTheme();
  const isDark = useIsDark();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: isDark ? colors.surfaceElevated : colors.primarySoft,
          text: isDark ? colors.primary : colors.primaryDeep,
          border: isDark ? colors.primary : colors.border,
          dotColor: colors.primary,
        };
      case 'success':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
          text: isDark ? '#A7F3D0' : '#15803D',
          border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#86EFAC',
          dotColor: '#10B981',
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          text: isDark ? '#FFE8AD' : '#B45309',
          border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
          dotColor: '#F59E0B',
        };
      case 'danger':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          text: isDark ? '#FFD2D2' : '#B91C1C',
          border: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
          dotColor: '#EF4444',
        };
      case 'secondary':
      case 'neutral':
      default:
        return {
          bg: isDark ? colors.surfaceSecondary : colors.surfaceSecondary,
          text: isDark ? colors.text : colors.text,
          border: colors.border,
          dotColor: isDark ? colors.textMuted : colors.textMuted,
        };
    }
  };

  const vStyles = getVariantStyles();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: vStyles.bg,
          borderColor: vStyles.border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
          gap: isSmall ? 4 : 6,
        },
        style,
      ]}
      {...props}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: vStyles.dotColor },
          ]}
        />
      )}
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            {
              color: vStyles.text,
              fontSize: isSmall ? Typography.fontSize.micro : Typography.fontSize.xs,
              lineHeight: isSmall ? 14 : 16,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontWeight: '500',
  },
});

export default Badge;

