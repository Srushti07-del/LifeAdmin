/**
 * Dashboard Error State Component
 * Displays actionable network diagnostic info and a Retry button.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <SymbolView
            name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }}
            size={36}
            tintColor="#EF4444"
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
            tintColor="#FFFFFF"
          />
          <ThemedText style={styles.retryText}>Retry Connection</ThemedText>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
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
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  diagnosticsValue: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.mono,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  diagnosticsHint: {
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
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default DashboardErrorState;
