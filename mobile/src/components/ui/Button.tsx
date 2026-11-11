import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/spacing';
import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Returns high-contrast foreground color for button text and icons. */
export function getButtonForegroundColor(
  variant: ButtonVariant,
  colors: ThemeColors,
  isDark: boolean
): string {
  switch (variant) {
    case 'primary':
      return isDark ? colors.surfaceSecondary : '#FFFFFF';
    case 'danger':
      return '#FFFFFF';
    case 'ghost':
      return colors.textSecondary;
    default:
      return colors.text;
  }
}

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      rightIcon,
      fullWidth = false,
      style,
      textStyle,
      children,
      onPress,
      ...props
    },
    ref
  ) => {
    const colors = useTheme();
    const isDark = useIsDark();
    const isDisabled = disabled || loading;

    const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle; gap: number; spinnerSize: number | 'small' }> = {
      sm: {
        container: { height: 32, paddingHorizontal: 12 },
        text: { fontSize: Typography.fontSize.xs, lineHeight: 16 },
        gap: 6,
        spinnerSize: 14,
      },
      md: {
        container: { height: 40, paddingHorizontal: 16 },
        text: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
        gap: 8,
        spinnerSize: 'small',
      },
      lg: {
        container: { height: 48, paddingHorizontal: 20 },
        text: { fontSize: Typography.fontSize.base, lineHeight: 24 },
        gap: 10,
        spinnerSize: 'small',
      },
    };

    const currentSize = sizeStyles[size];

    const getVariantColors = (pressed: boolean) => {
      const fg = getButtonForegroundColor(variant, colors, isDark);
      switch (variant) {
        case 'primary': {
          const bg = pressed ? colors.primaryDeep : colors.primary;
          return {
            container: {
              backgroundColor: bg,
              borderWidth: 0,
            },
            text: {
              color: fg,
              fontFamily: Typography.fontFamilies.sansSemiBold,
            },
            spinnerColor: fg,
          };
        }
        case 'secondary': {
          const bg = isDark
            ? pressed ? colors.surfaceElevated : colors.surfaceSecondary
            : pressed ? colors.borderSubtle : colors.surfaceSecondary;
          return {
            container: {
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: colors.border,
            },
            text: {
              color: fg,
              fontFamily: Typography.fontFamilies.sansMedium,
            },
            spinnerColor: fg,
          };
        }
        case 'outline': {
          const bg = pressed ? colors.surfaceSecondary : 'transparent';
          return {
            container: {
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: colors.border,
            },
            text: {
              color: fg,
              fontFamily: Typography.fontFamilies.sansMedium,
            },
            spinnerColor: fg,
          };
        }
        case 'ghost': {
          const bg = pressed ? colors.surfaceSecondary : 'transparent';
          return {
            container: {
              backgroundColor: bg,
              borderWidth: 0,
            },
            text: {
              color: fg,
              fontFamily: Typography.fontFamilies.sansMedium,
            },
            spinnerColor: colors.text,
          };
        }
        case 'danger': {
          const bg = pressed ? '#B91C1C' : '#DC2626';
          return {
            container: {
              backgroundColor: bg,
              borderWidth: 0,
            },
            text: {
              color: fg,
              fontFamily: Typography.fontFamilies.sansSemiBold,
            },
            spinnerColor: fg,
          };
        }
      }
    };

    const touchHitSlop =
      size === 'sm'
        ? { top: 8, bottom: 8, left: 6, right: 6 }
        : size === 'md'
          ? { top: 4, bottom: 4, left: 4, right: 4 }
          : undefined;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        onPress={onPress}
        hitSlop={touchHitSlop}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => {
          const variantStyle = getVariantColors(pressed && !isDisabled);
          return [
            styles.base,
            currentSize.container,
            { gap: currentSize.gap },
            variantStyle.container,
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
            pressed && !isDisabled && styles.pressed,
            style,
          ];
        }}
        {...props}
      >
        {({ pressed }) => {
          const variantStyle = getVariantColors(pressed && !isDisabled);
          return (
            <>
              {loading ? (
                <ActivityIndicator
                  size={currentSize.spinnerSize}
                  color={variantStyle.spinnerColor}
                  style={styles.spinner}
                />
              ) : (
                icon && <View style={styles.iconContainer}>{icon}</View>
              )}

              {typeof children === 'string' ? (
                <Text style={[variantStyle.text, currentSize.text, textStyle]}>
                  {children}
                </Text>
              ) : (
                children
              )}

              {!loading && rightIcon && (
                <View style={styles.iconContainer}>{rightIcon}</View>
              )}
            </>
          );
        }}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 2,
  },
});

export default Button;

