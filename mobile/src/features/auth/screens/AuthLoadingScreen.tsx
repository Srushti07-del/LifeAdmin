/**
 * LifeAdmin Mobile Session Hydration Loading Screen
 * Shown briefly on cold start while checking SecureStore for saved sessions.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export function AuthLoadingScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.brandLogo,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <ThemedText style={styles.brandLetter}>L</ThemedText>
      </View>

      <ThemedText style={[styles.brandName, { color: colors.text }]}>
        LifeAdmin
      </ThemedText>

      <ThemedText style={[styles.tagline, { color: colors.textSecondary }]}>
        Calm Personal Command Center
      </ThemedText>

      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Typography.fontFamilies.editorial,
  },
  brandName: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.one,
  },
  tagline: {
    fontSize: Typography.fontSize.xs,
    letterSpacing: 0.5,
    marginBottom: Spacing.six,
  },
  spinner: {
    marginTop: Spacing.four,
  },
});
export default AuthLoadingScreen;
