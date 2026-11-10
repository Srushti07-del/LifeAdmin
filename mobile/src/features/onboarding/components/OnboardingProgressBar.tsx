/**
 * Onboarding Progress Bar Component
 * Displays step dots / pills and provides a clear Skip action.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { OnboardingStep } from '../types';
import { Spacing, Radius } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface OnboardingProgressBarProps {
  currentStep: OnboardingStep;
  totalSteps?: number;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function OnboardingProgressBar({
  currentStep,
  totalSteps = 5,
  onSkip,
  showSkip = true,
}: OnboardingProgressBarProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = (index + 1) as OnboardingStep;
          const isActive = stepNumber === currentStep;
          const isPassed = stepNumber < currentStep;

          let dotColor = isDark ? colors.border : '#E2E8F0';
          if (isActive) {
            dotColor = colors.primary;
          } else if (isPassed) {
            dotColor = isDark ? colors.primaryDeep : colors.primarySoft;
          }

          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: dotColor,
                  width: isActive ? 28 : 8,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Skip button */}
      {showSkip && onSkip && currentStep < totalSteps ? (
        <Pressable
          onPress={onSkip}
          hitSlop={12}
          style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Skip onboarding setup"
          accessibilityRole="button"
        >
          <ThemedText style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip setup
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    height: 6,
    borderRadius: Radius.full,
  },
  skipButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  skipText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  placeholder: {
    width: 60,
  },
});

