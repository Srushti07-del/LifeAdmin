/**
 * LifeAdmin Mobile Root Error Boundary
 * Expo Router convention: app/+error-boundary.tsx
 * Catches unhandled render exceptions, prevents native process crashes,
 * and provides safe themed recovery actions without data loss or auth loops.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { sanitizeErrorMessage, getUserFriendlyErrorSummary } from '@/utils/errorHandling';

export { sanitizeErrorMessage, getUserFriendlyErrorSummary };

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(__DEV__);

  // Safe theme extraction with fallback to default light tokens if context failed
  let colors = Colors.light;
  let isDark = false;
  try {
    const theme = useAppTheme();
    colors = theme.colors;
    isDark = theme.isDark;
  } catch {
    colors = Colors.light;
    isDark = false;
  }

  const sanitizedMessage = sanitizeErrorMessage(error?.message);

  const handleReturnHome = () => {
    try {
      router.replace('/(tabs)');
    } catch {
      // Safe fallback if navigation stack was invalidated
      retry().catch(() => {});
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
          {/* Calm Alert Emblem */}
          <View
            style={[
              styles.emblemContainer,
              {
                backgroundColor: isDark
                  ? Colors.urgency.critical.darkBg
                  : Colors.urgency.critical.lightBg,
                borderColor: isDark
                  ? Colors.urgency.critical.accent
                  : Colors.urgency.critical.accent,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: 'exclamationmark.triangle.fill',
                android: 'warning',
                web: 'warning',
              }}
              size={36}
              tintColor={
                isDark
                  ? Colors.urgency.critical.darkText
                  : Colors.urgency.critical.accent
              }
            />
          </View>

          {/* Editorial Heading */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: Typography.fontFamilies.editorial,
              },
            ]}
          >
            Something Went Wrong
          </Text>

          {/* Calm Explanatory Subtitle */}
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontFamily: Typography.fontFamilies.sans,
              },
            ]}
          >
            An unexpected error interrupted this view. Your saved paperwork and schedules are safe.
            You can retry loading this screen or return to the main dashboard.
          </Text>

          {/* Optional Developer / Technical Context */}
          {(__DEV__ || showTechnicalDetails) && (
            <View
              style={[
                styles.diagnosticBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.diagnosticLabel,
                  {
                    color: colors.textMuted,
                    fontFamily: Typography.fontFamilies.sansSemiBold,
                  },
                ]}
              >
                Diagnostic Notice
              </Text>
              <Text
                style={[
                  styles.diagnosticText,
                  {
                    color: colors.textSecondary,
                    fontFamily: Typography.fontFamilies.mono,
                  },
                ]}
              >
                {sanitizedMessage}
              </Text>
            </View>
          )}

          {/* Primary & Secondary Recovery Actions */}
          <View style={styles.actionRow}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => retry()}
              icon={
                <SymbolView
                  name={{
                    ios: 'arrow.clockwise',
                    android: 'refresh',
                    web: 'refresh',
                  }}
                  size={18}
                  tintColor={isDark ? colors.surfaceSecondary : '#FFFFFF'}
                />
              }
            >
              Try Again
            </Button>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={handleReturnHome}
              icon={
                <SymbolView
                  name={{
                    ios: 'house.fill',
                    android: 'home',
                    web: 'home',
                  }}
                  size={18}
                  tintColor={colors.primary}
                />
              }
            >
              Return to Dashboard
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
  },
  contentCard: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    textAlign: 'center',
  },
  emblemContainer: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.six,
    paddingHorizontal: Spacing.two,
  },
  diagnosticBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.six,
  },
  diagnosticLabel: {
    fontSize: Typography.fontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diagnosticText: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  actionRow: {
    width: '100%',
    gap: Spacing.three,
  },
});

export default ErrorBoundary;
