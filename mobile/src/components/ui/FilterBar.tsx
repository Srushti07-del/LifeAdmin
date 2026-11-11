import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
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
import { getHorizontalOverflowState } from './scrollOverflow';

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
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const overflow = useMemo(
    () =>
      getHorizontalOverflowState({
        containerWidth,
        contentWidth,
        scrollX,
      }),
    [containerWidth, contentWidth, scrollX]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        fadingEdgeLength={28}
        scrollEventThrottle={16}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        style={styles.scrollView}
        contentContainerStyle={[styles.container, style]}
      >
      {items.map((item) => {
        const isActive = item.value === selected;

        return (
          <Pressable
            key={item.value}
            onPress={() => onSelect(item.value)}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive
                  ? colors.primary
                  : isDark
                  ? colors.surface
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
                      : isDark ? colors.surfaceElevated : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isActive
                        ? isDark ? colors.surfaceSecondary : '#FFFFFF'
                        : colors.textSecondary,
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

      {overflow.canScrollLeft ? (
        <View pointerEvents="none" style={[styles.edgeFade, styles.edgeFadeLeft]}>
          <View style={[styles.fadeBandStrong, { backgroundColor: colors.background }]} />
          <View style={[styles.fadeBandSoft, { backgroundColor: colors.background }]} />
        </View>
      ) : null}

      {overflow.canScrollRight ? (
        <View pointerEvents="none" style={[styles.edgeFade, styles.edgeFadeRight]}>
          <View style={[styles.fadeBandSoft, { backgroundColor: colors.background }]} />
          <View style={[styles.fadeBandStrong, { backgroundColor: colors.background }]}>
            <View
              style={[
                styles.scrollCueBadge,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={12}
                weight="semibold"
                tintColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    minWidth: 0,
    position: 'relative',
  },
  scrollView: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingRight: Spacing.five,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 6,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  edgeFadeLeft: {
    left: 0,
  },
  edgeFadeRight: {
    right: 0,
  },
  fadeBandSoft: {
    width: 10,
    height: '100%',
    opacity: 0.45,
  },
  fadeBandStrong: {
    width: 20,
    height: '100%',
    opacity: 0.92,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollCueBadge: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontVariant: ['tabular-nums'],
  },
});

export default FilterBar;

