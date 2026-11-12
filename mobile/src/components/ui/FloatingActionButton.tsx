/**
 * Floating Action Button (FAB)
 * Consistent thumb-zone primary creation CTA anchored bottom-right.
 * Respects compact-phone bottom tabs, tablet drawer/side rail, pushed Stack safe insets,
 * and lifts cleanly above any active bottom Snackbar so neither controls nor Dismiss are covered.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useSnackbarInternal } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from './Button';
import { BottomTabInset } from '@/constants/theme';
import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  FAB_HEIGHT,
  getFabBottomOffset,
} from '@/utils/navigationLayout';

export interface FloatingActionButtonProps {
  label: string;
  onPress: () => void;
  isTabScreen?: boolean;
  icon?: { ios: string; android: string; web?: string };
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  testID?: string;
}

export function FloatingActionButton({
  label,
  onPress,
  isTabScreen = true,
  icon = { ios: 'plus', android: 'add', web: 'add' },
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  testID,
}: FloatingActionButtonProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { current, dismissingId, activeModalHostId } = useSnackbarInternal();

  const isSnackbarVisible =
    Boolean(current) &&
    dismissingId !== current?.id &&
    activeModalHostId === null;

  const restingBottom = getFabBottomOffset({
    insetsBottom: insets.bottom,
    windowWidth: width,
    isTabScreen,
    bottomTabInset: BottomTabInset,
    platformOS: Platform.OS,
    isSnackbarVisible: false,
  });

  const liftedBottom = getFabBottomOffset({
    insetsBottom: insets.bottom,
    windowWidth: width,
    isTabScreen,
    bottomTabInset: BottomTabInset,
    platformOS: Platform.OS,
    isSnackbarVisible: true,
  });

  const liftDelta = Math.max(0, liftedBottom - restingBottom);
  const translateY = useRef(new Animated.Value(isSnackbarVisible ? -liftDelta : 0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isSnackbarVisible ? -liftDelta : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isSnackbarVisible, liftDelta, translateY]);

  const fg = getButtonForegroundColor('primary', colors, isDark);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          bottom: restingBottom,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
          },
          createShadow(isDark, 'elevated'),
          pressed && !disabled && styles.pressed,
        ]}
      >
        <SymbolView
          name={icon as any}
          size={18}
          weight="semibold"
          tintColor={fg}
        />
        <ThemedText
          numberOfLines={1}
          style={[styles.label, { color: fg }]}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: Spacing.four,
    zIndex: 20,
  },
  fab: {
    minHeight: FAB_HEIGHT,
    minWidth: FAB_HEIGHT,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

export default FloatingActionButton;

