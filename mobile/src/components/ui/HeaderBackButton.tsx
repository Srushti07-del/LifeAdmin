/**
 * LifeAdmin Mobile — Reusable Accessible Stack Back Button
 * Used by secondary Stack screens pushed above primary navigation tabs.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { navigateBackSafely } from '@/utils/navigationLayout';

export interface HeaderBackButtonProps {
  /** Fallback route when launched directly via deep link or cold notification without Stack history */
  fallbackHref?: string;
  /** Accessible screen-reader label */
  accessibilityLabel?: string;
  /** Optional custom handler; defaults to Stack back with safe fallback */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function HeaderBackButton({
  fallbackHref = '/more',
  accessibilityLabel = 'Go back',
  onPress,
  style,
}: HeaderBackButtonProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    navigateBackSafely(router, fallbackHref);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <SymbolView
        name={{ ios: 'chevron.backward', android: 'arrow_back' }}
        size={18}
        tintColor={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});

