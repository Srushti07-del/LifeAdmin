/**
 * LifeAdmin Mobile — Offline Status Indicator Banner
 * An unobtrusive, calm pill banner adhering to Ocean Teal / Deep Ocean tokens.
 * Displays offline state and last successful synchronization timestamp.
 */

import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { useNetwork } from '@/context/NetworkContext';

export interface OfflineBannerProps {
  style?: StyleProp<ViewStyle>;
  onRetry?: () => void;
  compact?: boolean;
}

export function OfflineBanner({ style, onRetry, compact = false }: OfflineBannerProps) {
  const { colors, isDark } = useAppTheme();
  const { isOnline, formattedLastSync, isSyncing, syncNow } = useNetwork();

  // Do not render anything when online
  if (isOnline) {
    return null;
  }

  const handlePress = () => {
    if (onRetry) {
      onRetry();
    } else {
      void syncNow();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
          borderColor: isDark ? colors.border : 'rgba(24, 59, 61, 0.12)',
        },
        compact && styles.containerCompact,
        style,
      ]}
      accessibilityRole="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Working offline. Viewing cached data. Last synced: ${formattedLastSync}`}
    >
      <View style={styles.contentRow}>
        <SymbolView
          name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }}
          size={14}
          tintColor={colors.textSecondary}
        />
        <ThemedText style={[styles.text, { color: colors.textSecondary }]}>
          Offline • Viewing cached records{' '}
          {formattedLastSync !== 'Never synced' ? `(${formattedLastSync})` : ''}
        </ThemedText>
      </View>

      <Pressable
        onPress={handlePress}
        disabled={isSyncing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Retry connecting to server"
        style={styles.retryBtn}
      >
        <ThemedText
          style={[
            styles.retryText,
            { color: colors.primary },
            isSyncing && { opacity: 0.6 },
          ]}
        >
          {isSyncing ? 'Syncing...' : 'Retry'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  containerCompact: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  text: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  retryBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  retryText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
});

export default OfflineBanner;

