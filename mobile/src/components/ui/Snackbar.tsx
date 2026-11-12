/**
 * LifeAdmin Mobile — Global Snackbar UI Component
 * Calm, non-blocking bottom thumb-zone feedback synchronized with Ocean Teal & Deep Ocean themes.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import {
  useSnackbarInternal,
} from '@/context/SnackbarContext';
import {
  computeSnackbarBottomOffset,
  getSnackbarVariantPalette,
} from '@/context/snackbarQueue';
import { Layout, Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { createShadow } from '@/constants/shadows';

export interface SnackbarViewportProps {
  /** Whether a bottom tab bar is currently displayed underneath screens */
  hasBottomTabs?: boolean;
  /** Host symbol returned by useSnackbarModalHost when rendered inside a React Native Modal */
  hostId?: symbol | null;
  /** Optional extra bottom spacing override */
  extraOffset?: number;
}

export function SnackbarViewport({
  hasBottomTabs = false,
  hostId = null,
  extraOffset,
}: SnackbarViewportProps) {
  const {
    current,
    dismissingId,
    hideSnackbar,
    completeDismiss,
    pauseTimer,
    resumeTimer,
    activeModalHostId,
  } = useSnackbarInternal();

  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isRunningAction, setIsRunningAction] = useState(false);

  const isHostActive =
    hostId === null ? activeModalHostId === null : activeModalHostId === hostId;

  const isVisible = Boolean(current) && isHostActive;
  const isExiting = Boolean(current && dismissingId === current.id);

  useEffect(() => {
    setIsRunningAction(false);
  }, [current?.id]);

  // Smooth entrance / exit animations (quiet motion: 220ms enter, 160ms exit)
  useEffect(() => {
    if (!isVisible || !current) {
      translateY.setValue(20);
      opacity.setValue(0);
      return;
    }

    if (isExiting) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 18,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          completeDismiss(current.id);
        }
      });
      return;
    }

    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [completeDismiss, current, isExiting, isVisible, opacity, translateY]);

  if (!isVisible || !current) {
    return null;
  }

  const palette = getSnackbarVariantPalette(current.variant, colors, isDark);
  const bottomOffset = computeSnackbarBottomOffset({
    bottomInset: insets.bottom,
    bottomTabInset: Layout.bottomTabInset,
    hasBottomTabs: hasBottomTabs && hostId === null,
    extraOffset,
  });

  const handleActionPress = async () => {
    if (!current.action || isRunningAction || isExiting) return;
    const itemId = current.id;
    const actionHandler = current.action.onPress;
    setIsRunningAction(true);
    pauseTimer(itemId);
    try {
      await Promise.resolve(actionHandler());
    } finally {
      setIsRunningAction(false);
      resumeTimer(itemId);
      hideSnackbar(itemId);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { paddingBottom: bottomOffset }]}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.snackbarCard,
          createShadow(isDark, 'elevated'),
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
            borderColor: colors.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Left Status Accent Strip */}
        <View
          style={[styles.accentStripe, { backgroundColor: palette.accent }]}
          accessible={false}
        />

        {/* Variant Status Icon */}
        <View style={[styles.iconBadge, { backgroundColor: palette.badgeBg }]}>
          <SymbolView
            name={{
              ios: palette.iosIcon,
              android: palette.androidIcon,
              web: palette.androidIcon,
            } as any}
            size={18}
            tintColor={palette.badgeIcon}
          />
        </View>

        {/* Copy Content */}
        <View style={styles.textContainer}>
          {current.title ? (
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {current.title}
            </Text>
          ) : null}
          <Text
            numberOfLines={3}
            style={[
              styles.message,
              {
                color: current.title ? colors.textSecondary : colors.text,
              },
            ]}
          >
            {current.message}
          </Text>
        </View>

        {/* Optional Action Button (e.g., Undo) with >= 44dp hit target */}
        {current.action ? (
          <Pressable
            onPress={handleActionPress}
            disabled={isRunningAction || isExiting}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={
              current.action.accessibilityLabel || current.action.label
            }
            accessibilityState={{ disabled: isRunningAction || isExiting, busy: isRunningAction }}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: palette.actionBg,
                opacity: pressed || isRunningAction ? 0.72 : 1,
              },
            ]}
          >
            {isRunningAction ? (
              <ActivityIndicator size="small" color={palette.actionText} />
            ) : (
              <Text style={[styles.actionText, { color: palette.actionText }]}>
                {current.action.label}
              </Text>
            )}
          </Pressable>
        ) : null}

        {/* Explicit Close Button with >= 44x44dp hit target */}
        <Pressable
          onPress={() => hideSnackbar(current.id)}
          disabled={isExiting}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { opacity: 0.65 },
          ]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={15}
            tintColor={colors.textMuted}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    zIndex: 9999,
    elevation: 24,
  },
  snackbarCard: {
    width: '100%',
    maxWidth: 520,
    minHeight: 56,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingLeft: Spacing.three + 2,
    paddingRight: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 1,
  },
  title: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 17,
  },
  message: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 17,
  },
  actionButton: {
    minHeight: 40,
    minWidth: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default SnackbarViewport;

