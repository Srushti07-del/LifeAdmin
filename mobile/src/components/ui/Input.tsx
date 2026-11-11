import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { getInputLayoutMetrics } from './inputLayout';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      inputContainerStyle,
      labelStyle,
      inputStyle,
      editable = true,
      multiline = false,
      numberOfLines,
      textAlignVertical,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const colors = useTheme();
    const isDark = useIsDark();
    const [isFocused, setIsFocused] = useState(false);

    const hasError = Boolean(error);
    const layoutMetrics = getInputLayoutMetrics({
      multiline: Boolean(multiline),
      numberOfLines,
    });

    const errorColor = isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.accent;

    const getBorderColor = () => {
      if (hasError) return errorColor;
      if (isFocused) return colors.primary;
      return colors.border;
    };

    const containerBg = isDark
      ? editable
        ? colors.surfaceSecondary
        : colors.background
      : editable
      ? colors.surface
      : colors.surfaceSecondary;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text
            style={[
              styles.label,
              { color: colors.text },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: containerBg,
              borderColor: getBorderColor(),
              borderWidth: isFocused ? 1.5 : 1,
              height: layoutMetrics.containerHeight,
              minHeight: layoutMetrics.containerMinHeight,
              alignItems: layoutMetrics.containerAlignItems,
            },
            !editable && styles.disabled,
            inputContainerStyle,
          ]}
        >
          {leftIcon ? (
            <View
              style={[
                styles.leftIconContainer,
                multiline && {
                  alignSelf: 'flex-start',
                  paddingTop: layoutMetrics.paddingTop,
                },
              ]}
            >
              {leftIcon}
            </View>
          ) : null}

          <TextInput
            ref={ref}
            editable={editable}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={textAlignVertical ?? layoutMetrics.textAlignVertical}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                color: colors.text,
                height: layoutMetrics.textInputHeight,
                minHeight: layoutMetrics.textInputMinHeight,
                paddingTop: layoutMetrics.paddingTop,
                paddingBottom: layoutMetrics.paddingBottom,
                lineHeight: layoutMetrics.lineHeight,
                textAlignVertical: textAlignVertical ?? layoutMetrics.textAlignVertical,
                paddingLeft: leftIcon ? Spacing.one : Spacing.four,
                paddingRight: rightIcon ? Spacing.one : Spacing.four,
              },
              inputStyle,
              style,
            ]}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />

          {rightIcon ? (
            <View
              style={[
                styles.rightIconContainer,
                multiline && {
                  alignSelf: 'flex-start',
                  paddingTop: layoutMetrics.paddingTop,
                },
              ]}
            >
              {rightIcon}
            </View>
          ) : null}
        </View>

        {hasError ? (
          <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
        ) : helperText ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: Spacing.one + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
  },
  leftIconContainer: {
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    paddingRight: Spacing.four,
    paddingLeft: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.one,
  },
  helperText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.one,
  },
});

export default Input;

