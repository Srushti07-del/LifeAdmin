/**
 * Screen 5 — Ready to Begin
 * Shows friendly completion state and setup summary.
 * Provides the final "Enter LifeAdmin Dashboard" primary action.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button, getButtonForegroundColor } from '@/components/ui';
import { CompanionAvatar, getCompanionById } from '@/features/companions';
import { OnboardingPreferences } from '../types';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface ReadyStepProps {
  preferences: OnboardingPreferences;
  onFinish: () => void;
  onBack: () => void;
  isSaving: boolean;
}

export function ReadyStep({
  preferences,
  onFinish,
  onBack,
  isSaving,
}: ReadyStepProps) {
  const { colors, isDark } = useAppTheme();
  const companion = getCompanionById(preferences.companionId);
  const displayName = preferences.companionName.trim() || companion.defaultName;
  const domainCount = preferences.categories.length;
  const domainSummary =
    domainCount === 1 ? '1 category chosen' : `${domainCount} categories chosen`;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Companion Avatar Centered Hero */}
      <View style={styles.heroSection}>
        <CompanionAvatar id={companion.id} size="xl" showBadge />

        <ThemedText style={[styles.title, { color: colors.text }]}>
          You&apos;re All Set!
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your sanctuary is tailored and ready. {displayName} is delighted to meet you and will accompany your journey towards everyday peace of mind.
        </ThemedText>
      </View>

      {/* Setup Summary Card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <ThemedText style={[styles.summaryHeader, { color: colors.text }]}>
          Your Workspace Configuration
        </ThemedText>

        {/* Row 1: Companion */}
        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
              size={16}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Companion
            </ThemedText>
          </View>
          <ThemedText style={[styles.rowValue, { color: colors.text }]}>
            {displayName} ({companion.title})
          </ThemedText>
        </View>

        {/* Row 2: Active Domains */}
        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <SymbolView
              name={{ ios: 'folder.fill', android: 'category', web: 'category' } as any}
              size={16}
              tintColor="#0284C7"
            />
            <ThemedText style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Active Domains
            </ThemedText>
          </View>
          <ThemedText style={[styles.rowValue, { color: colors.text }]}>
            {domainSummary}
          </ThemedText>
        </View>

        {/* Row 3: Reminders */}
        <View style={styles.summaryRow}>
          <View style={styles.rowLeft}>
            <SymbolView
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' } as any}
              size={16}
              tintColor="#10B981"
            />
            <ThemedText style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Alerts Cadence
            </ThemedText>
          </View>
          <ThemedText style={[styles.rowValue, { color: colors.text }]}>
            {preferences.notificationsEnabled ? 'Proactive (7d, 3d, 1d, 0d)' : 'Quiet / Off'}
          </ThemedText>
        </View>

        {/* Row 4: Currency */}
        <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
          <View style={styles.rowLeft}>
            <SymbolView
              name={{ ios: 'creditcard.fill', android: 'receipt', web: 'receipt' } as any}
              size={16}
              tintColor="#8B5CF6"
            />
            <ThemedText style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Base Currency
            </ThemedText>
          </View>
          <ThemedText style={[styles.rowValue, { color: colors.text }]}>
            {preferences.preferredCurrency}
          </ThemedText>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isSaving}
          disabled={isSaving}
          onPress={onFinish}
          rightIcon={
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
              size={18}
              tintColor={getButtonForegroundColor('primary', colors, isDark)}
            />
          }
        >
          {isSaving ? 'Configuring Space...' : 'Enter LifeAdmin Dashboard'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onBack}
          disabled={isSaving}
          style={styles.reviewButton}
        >
          Review configuration
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
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  summaryCard: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.six,
  },
  summaryHeader: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
  },
  rowValue: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reviewButton: {
    marginTop: Spacing.one,
  },
});

