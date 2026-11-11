import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  tabStyle?: StyleProp<ViewStyle>;
  activeTabStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  activeLabelStyle?: StyleProp<TextStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  style,
  tabStyle,
  activeTabStyle,
  labelStyle,
  activeLabelStyle,
}: SegmentedControlProps<T>) {
  const colors = useTheme();
  const isDark = useIsDark();

  const activeShadow = createShadow(isDark, 'xs');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
        style,
      ]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.tab,
              isActive && [
                styles.activeTab,
                {
                  backgroundColor: colors.surface,
                },
                activeShadow,
                activeTabStyle,
              ],
              !isActive && tabStyle,
              pressed && !isActive && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {option.icon ? (
              <View style={styles.iconContainer}>{option.icon}</View>
            ) : null}

            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.text : colors.textSecondary,
                  fontFamily: isActive
                    ? Typography.fontFamilies.sansSemiBold
                    : Typography.fontFamilies.sansMedium,
                },
                labelStyle,
                isActive && activeLabelStyle,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 38,
    width: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: Radius.md + 1,
    paddingHorizontal: Spacing.two,
    gap: 6,
  },
  activeTab: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default SegmentedControl;

