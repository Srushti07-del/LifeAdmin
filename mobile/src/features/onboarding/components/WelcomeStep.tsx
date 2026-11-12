/**
 * Screen 1 — Welcome
 * Introduces LifeAdmin, communicates purpose, and uses editorial aesthetic.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Icon Emblem */}
      <View
        style={[
          styles.heroEmblem,
          {
            backgroundColor: colors.primarySoft,
            borderColor: colors.primary,
          },
        ]}
      >
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
          size={36}
          tintColor={colors.primary}
        />
      </View>

      {/* Editorial Title & Subtitle */}
      <ThemedText style={[styles.title, { color: colors.text }]}>
        Welcome to LifeAdmin
      </ThemedText>

      <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your everyday life, organized into one tranquil space. No clutter, no noise—just calm clarity for what matters today.
      </ThemedText>

      {/* 3 Core Value Cards */}
      <View style={styles.cardsList}>
        <View
          style={[
            styles.valueCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <SymbolView
              name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' } as any}
              size={20}
              tintColor={colors.primary}
            />
          </View>
          <View style={styles.valueCardText}>
            <ThemedText style={[styles.valueCardTitle, { color: colors.text }]}>
              Clarity Over Chaos
            </ThemedText>
            <ThemedText style={[styles.valueCardDesc, { color: colors.textSecondary }]}>
              Immediate visibility into urgent deadlines, bills, and high-priority responsibilities.
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.valueCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? Colors.urgency.upcoming.darkBg : Colors.urgency.upcoming.lightBg },
            ]}
          >
            <SymbolView
              name={{ ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' } as any}
              size={20}
              tintColor={Colors.status.info}
            />
          </View>
          <View style={styles.valueCardText}>
            <ThemedText style={[styles.valueCardTitle, { color: colors.text }]}>
              Unified Life Sanctuary
            </ThemedText>
            <ThemedText style={[styles.valueCardDesc, { color: colors.textSecondary }]}>
              Tasks, recurring payments, calendar events, and appointments brought into one rhythm.
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.valueCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg },
            ]}
          >
            <SymbolView
              name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' } as any}
              size={20}
              tintColor={Colors.urgency.completed.accent}
            />
          </View>
          <View style={styles.valueCardText}>
            <ThemedText style={[styles.valueCardTitle, { color: colors.text }]}>
              Meet LifeBuddy
            </ThemedText>
            <ThemedText style={[styles.valueCardDesc, { color: colors.textSecondary }]}>
              A peaceful companion that celebrates your steady daily habits without stress or penalties.
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={onNext}
          rightIcon={
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
              size={18}
              tintColor={getButtonForegroundColor('primary', colors, isDark)}
            />
          }
        >
          Get Started
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.eight,
    alignItems: 'center',
  },
  heroEmblem: {
    width: 76,
    height: 76,
    borderRadius: Radius['2xl'],
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: Spacing.six,
  },
  cardsList: {
    width: '100%',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  valueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCardText: {
    flex: 1,
  },
  valueCardTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 2,
  },
  valueCardDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
  },
  actionContainer: {
    width: '100%',
    marginTop: Spacing.two,
  },
});

