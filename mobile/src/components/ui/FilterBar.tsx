import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface FilterItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterBarProps<T extends string = string> {
  items: FilterItem<T>[];
  selected: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<ViewStyle>;
  activeChipStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
}

export function FilterBar<T extends string = string>({
  items,
  selected,
  onSelect,
  style,
  chipStyle,
  activeChipStyle,
  textStyle,
  activeTextStyle,
}: FilterBarProps<T>) {
  const colors = useTheme();
  const isDark = useIsDark();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {items.map((item) => {
        const isActive = item.value === selected;

        return (
          <Pressable
            key={item.value}
            onPress={() => onSelect(item.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive
                  ? colors.primary
                  : colors.surfaceSecondary,
                borderColor: isActive ? colors.primary : colors.border,
              },
              isActive && activeChipStyle,
              !isActive && chipStyle,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {item.icon ? (
              <View style={styles.iconContainer}>{item.icon}</View>
            ) : null}

            <Text
              style={[
                styles.text,
                {
                  color: isActive
                    ? isDark ? colors.surfaceSecondary : '#FFFFFF'
                    : colors.textSecondary,
                  fontFamily: isActive
                    ? Typography.fontFamilies.sansSemiBold
                    : Typography.fontFamilies.sansMedium,
                  fontWeight: isActive ? '600' : '500',
                },
                textStyle,
                isActive && activeTextStyle,
              ]}
            >
              {item.label}
            </Text>

            {typeof item.count === 'number' ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isActive
                      ? isDark ? 'rgba(20, 52, 64, 0.25)' : 'rgba(255, 255, 255, 0.25)'
                      : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isActive
                        ? isDark ? colors.surfaceSecondary : '#FFFFFF'
                        : colors.textMuted,
                    },
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
    lineHeight: 12,
    fontWeight: '600',
  },
});

export default FilterBar;

