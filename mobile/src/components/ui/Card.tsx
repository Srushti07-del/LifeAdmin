import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  elevated?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Card({
  elevated = false,
  onPress,
  style,
  children,
  ...props
}: CardProps) {
  const colors = useTheme();
  const isDark = useIsDark();

  const shadowStyle = createShadow(isDark, elevated ? 'elevated' : 'card');

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.five,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          shadowStyle,
          pressed && styles.pressed,
          style,
        ]}
        {...(props as any)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, cardStyle, shadowStyle, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardHeaderProps extends ViewProps {
  bordered?: boolean;
}

export function CardHeader({
  bordered = true,
  style,
  children,
  ...props
}: CardHeaderProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.header,
        bordered && {
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
          paddingBottom: Spacing.three,
          marginBottom: Spacing.four,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export interface CardTitleProps extends TextProps {
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ style, children, ...props }: CardTitleProps) {
  const colors = useTheme();

  return (
    <Text
      style={[
        styles.title,
        { color: colors.text },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export interface CardDescriptionProps extends TextProps {
  style?: StyleProp<TextStyle>;
}

export function CardDescription({
  style,
  children,
  ...props
}: CardDescriptionProps) {
  const colors = useTheme();

  return (
    <Text
      style={[
        styles.description,
        { color: colors.textSecondary },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardContent({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardFooterProps extends ViewProps {
  bordered?: boolean;
}

export function CardFooter({
  bordered = true,
  style,
  children,
  ...props
}: CardFooterProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.footer,
        bordered && {
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          paddingTop: Spacing.three,
          marginTop: Spacing.four,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    fontWeight: '600',
  },
  description: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    fontWeight: '400',
    marginTop: 2,
  },
  content: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default Card;

