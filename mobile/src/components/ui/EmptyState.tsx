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

import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import Button from './Button';

export interface EmptyStateProps extends ViewProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  titleStyle,
  descriptionStyle,
  ...props
}: EmptyStateProps) {
  const colors = useTheme();
  const isDark = useIsDark();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.78)',
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.primarySoft,
            borderColor: colors.border,
          },
        ]}
      >
        {icon}
      </View>

      <Text
        style={[
          styles.title,
          { color: colors.text },
          titleStyle,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.description,
          { color: colors.textSecondary },
          descriptionStyle,
        ]}
      >
        {description}
      </Text>

      {actionLabel && onAction ? (
        <Button
          variant="primary"
          size="sm"
          onPress={onAction}
          style={styles.actionButton}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    width: '100%',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.one + 2,
  },
  description: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.five,
  },
  actionButton: {
    marginTop: Spacing.one,
  },
});

export default EmptyState;

