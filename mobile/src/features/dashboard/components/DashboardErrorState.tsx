/**
 * Dashboard Error State Component
 * Displays actionable network diagnostic info and a Retry button.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import apiConfig from '@/services/config';

interface DashboardErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function DashboardErrorState({
  message,
  onRetry,
}: DashboardErrorStateProps) {
  const { colors, isDark } = useAppTheme();
  const diagnostics = apiConfig.getDiagnostics();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          createShadow(isDark, 'card'),
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : colors.borderSubtle,
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark
                ? Colors.urgency.critical.darkBg
                : Colors.urgency.critical.lightBg,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }}
            size={36}
            tintColor={
              isDark
                ? Colors.urgency.critical.darkText
                : Colors.urgency.critical.accent
            }
          />
        </View>

        <ThemedText style={[styles.title, { color: colors.text }]}>
          Cannot Connect to LifeAdmin
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {message || 'Could not load your dashboard. Ensure the Express backend is running on port 5000.'}
        </ThemedText>

        {/* Diagnostics Box */}
        <View style={[styles.diagnosticsBox, { backgroundColor: colors.surfaceSecondary }]}>
          <ThemedText style={[styles.diagnosticsLabel, { color: colors.textMuted }]}>
            TARGET BACKEND:
          </ThemedText>
          <ThemedText style={[styles.diagnosticsValue, { color: colors.text }]}>
            {diagnostics.baseUrl}
          </ThemedText>
          <ThemedText style={[styles.diagnosticsHint, { color: colors.textSecondary }]}>
            Platform: {diagnostics.platform} · Port 5000
          </ThemedText>
        </View>

        {/* Retry Button */}
        <Pressable
          onPress={onRetry}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Retry Connection"
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
            size={18}
            tintColor={getButtonForegroundColor('primary', colors, isDark)}
          />
          <ThemedText
            style={[
              styles.retryText,
              { color: getButtonForegroundColor('primary', colors, isDark) },
            ]}
          >
            Retry Connection
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    paddingTop: Spacing.eight,
  },
  card: {
    padding: Spacing.six,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  diagnosticsBox: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.five,
  },
  diagnosticsLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  diagnosticsValue: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.mono,
    marginTop: 2,
  },
  diagnosticsHint: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 11,
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.lg,
    minHeight: 48,
  },
  retryText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default DashboardErrorState;
