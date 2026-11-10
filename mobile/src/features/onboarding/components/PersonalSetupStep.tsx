/**
 * Screen 2 — Personal Setup
 * Collects key domains (categories), alert cadence, and preferred currency.
 * Reuses existing User model profile fields without unnecessary friction.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { OnboardingPreferences, CURRENCIES, AVAILABLE_DOMAINS } from '../types';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export { CURRENCIES, AVAILABLE_DOMAINS };

interface PersonalSetupStepProps {
  preferences: OnboardingPreferences;
  onUpdatePreferences: (updates: Partial<OnboardingPreferences>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PersonalSetupStep({
  preferences,
  onUpdatePreferences,
  onNext,
  onBack,
}: PersonalSetupStepProps) {
  const { colors, isDark } = useAppTheme();

  const toggleDomain = (domainId: string) => {
    const current = preferences.categories;
    if (current.includes(domainId)) {
      onUpdatePreferences({ categories: current.filter((id) => id !== domainId) });
    } else {
      onUpdatePreferences({ categories: [...current, domainId] });
    }
  };

  const hasSelectedDomain = preferences.categories.length > 0;

  const handleContinue = () => {
    if (!hasSelectedDomain) return;
    onNext();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Step Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Tailor Your Sanctuary
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select the core life categories you want to track and set your notification pace.
        </ThemedText>
      </View>

      {/* Domain Selection */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Key Life Domains
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Choose the areas representing your daily responsibilities (at least one).
        </ThemedText>

        <View style={styles.domainsGrid}>
          {AVAILABLE_DOMAINS.map((domain) => {
            const isSelected = preferences.categories.includes(domain.id);
            return (
              <Pressable
                key={domain.id}
                onPress={() => toggleDomain(domain.id)}
                style={({ pressed }) => [
                  styles.domainChip,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(22, 143, 145, 0.25)'
                        : '#E6F4FE'
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 1.5 : 1.2,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityLabel={`${domain.label}, ${isSelected ? 'selected' : 'not selected'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <SymbolView
                  name={{ ios: 'circle.fill', android: domain.icon, web: domain.icon } as any}
                  size={16}
                  tintColor={isSelected ? colors.primary : colors.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.domainLabel,
                    {
                      color: isSelected ? colors.text : colors.textSecondary,
                      fontFamily: isSelected
                        ? Typography.fontFamilies.sansSemiBold
                        : Typography.fontFamilies.sans,
                    },
                  ]}
                >
                  {domain.label}
                </ThemedText>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? colors.border
                        : '#CBD5E1',
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                      size={12}
                      tintColor="#FFFFFF"
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {!hasSelectedDomain && (
          <View style={styles.domainHintRow}>
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' } as any}
              size={14}
              tintColor={colors.textMuted}
            />
            <ThemedText style={[styles.domainHintText, { color: colors.textMuted }]}>
              Please select at least one domain to continue
            </ThemedText>
          </View>
        )}
      </View>

      {/* Reminder Cadence */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Alert Cadence & Notifications
        </ThemedText>

        <View
          style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingTextContainer}>
            <ThemedText style={[styles.settingTitle, { color: colors.text }]}>
              Proactive Due Date Alerts
            </ThemedText>
            <ThemedText style={[styles.settingDesc, { color: colors.textSecondary }]}>
              Notifies you at 7, 3, and 1 day before due dates and on the due date.
            </ThemedText>
          </View>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={(val) => onUpdatePreferences({ notificationsEnabled: val })}
            thumbColor={preferences.notificationsEnabled ? colors.primary : '#94A3B8'}
            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primarySoft }}
          />
        </View>
      </View>

      {/* Preferred Currency */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Display Currency
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Default currency for recurring bills and budget tracking.
        </ThemedText>

        <View style={styles.currencyRow}>
          {CURRENCIES.map((cur) => {
            const isSelected = preferences.preferredCurrency === cur.code;
            return (
              <Pressable
                key={cur.code}
                onPress={() => onUpdatePreferences({ preferredCurrency: cur.code })}
                accessibilityLabel={`${cur.label}, ${isSelected ? 'selected' : 'not selected'}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.currencyPill,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(22, 143, 145, 0.25)'
                        : '#E6F4FE'
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <ThemedText
                  style={[
                    styles.currencyCode,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.primary
                          : colors.primaryDeep
                        : colors.textSecondary,
                      fontFamily: isSelected
                        ? Typography.fontFamilies.sansSemiBold
                        : Typography.fontFamilies.sansMedium,
                      fontWeight: 'normal',
                    },
                  ]}
                >
                  {cur.symbol} {cur.code}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Nav Actions */}
      <View style={styles.buttonRow}>
        <Button
          variant="outline"
          size="md"
          onPress={onBack}
          style={styles.backButton}
          icon={
            <SymbolView
              name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' } as any}
              size={16}
              tintColor={colors.text}
            />
          }
        >
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={handleContinue}
          disabled={!hasSelectedDomain}
          style={styles.nextButton}
          rightIcon={
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
              size={16}
              tintColor="#FFFFFF"
            />
          }
        >
          Continue
        </Button>
      </View>
      {!hasSelectedDomain && (
        <ThemedText style={[styles.validationHint, { color: colors.textMuted }]}>
          Select at least one life domain to proceed
        </ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.eight,
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.five,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: Spacing.one,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
    marginBottom: Spacing.three,
  },
  domainsGrid: {
    gap: Spacing.two,
  },
  domainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    gap: Spacing.three,
  },
  domainLabel: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  domainHintText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  currencyPill: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.2,
  },
  currencyCode: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  validationHint: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});

