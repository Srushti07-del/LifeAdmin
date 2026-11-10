/**
 * Screen 4 — Meet LifeBuddy
 * Introduces LifeAdmin's virtual companion system.
 * Allows choosing a starter companion and setting a custom name.
 * Strictly adheres to positive reinforcement mechanics: companions never punish inactivity.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { COMPANIONS, CompanionAvatar } from '@/features/companions';
import { OnboardingPreferences } from '../types';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface MeetLifeBuddyStepProps {
  preferences: OnboardingPreferences;
  onUpdatePreferences: (updates: Partial<OnboardingPreferences>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MeetLifeBuddyStep({
  preferences,
  onUpdatePreferences,
  onNext,
  onBack,
}: MeetLifeBuddyStepProps) {
  const { colors, isDark } = useAppTheme();
  const selectedCompanion = COMPANIONS.find((c) => c.id === preferences.companionId) || COMPANIONS[0];

  const handleSelectCompanion = (id: string, defaultName: string) => {
    onUpdatePreferences({
      companionId: id,
      companionName: defaultName,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Step Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Meet Your LifeBuddy
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          A quiet, encouraging companion that celebrates your steady daily progress. No guilt, no pressure—your companion never gets sick or disappears.
        </ThemedText>
      </View>

      {/* 2x2 Companion Selection Grid */}
      <View style={styles.grid}>
        {COMPANIONS.map((companion) => {
          const isSelected = preferences.companionId === companion.id;
          return (
            <Pressable
              key={companion.id}
              onPress={() => handleSelectCompanion(companion.id, companion.defaultName)}
              style={({ pressed }) => [
                styles.companionCard,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(22, 143, 145, 0.22)'
                      : '#E6F4FE'
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel={`${companion.name}, ${companion.title}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <CompanionAvatar id={companion.id} size="md" />

              <ThemedText
                style={[
                  styles.companionName,
                  {
                    color: colors.text,
                    fontFamily: Typography.fontFamilies.editorial,
                  },
                ]}
              >
                {companion.name}
              </ThemedText>

              <ThemedText style={[styles.companionTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {companion.title}
              </ThemedText>

              {/* Selection Check */}
              {isSelected && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                    size={12}
                    tintColor="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected Companion Bio & Quote Box */}
      <View
        style={[
          styles.bioBox,
          {
            backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.bioHeader}>
          <SymbolView
            name={{ ios: 'quote.opening', android: 'format_quote', web: 'format_quote' } as any}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.bioQuote, { color: colors.text }]}>
            &ldquo;{selectedCompanion.quote}&rdquo;
          </ThemedText>
        </View>
        <ThemedText style={[styles.bioText, { color: colors.textSecondary }]}>
          {selectedCompanion.bio}
        </ThemedText>
      </View>

      {/* Custom Name Input */}
      <View style={styles.nameInputSection}>
        <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
          Companion Name
        </ThemedText>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={preferences.companionName}
            onChangeText={(val) => onUpdatePreferences({ companionName: val })}
            placeholder="Give your companion a name"
            placeholderTextColor={colors.textMuted}
            maxLength={24}
            autoCorrect={false}
          />
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
          onPress={onNext}
          style={styles.nextButton}
          rightIcon={
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
              size={16}
              tintColor="#FFFFFF"
            />
          }
        >
          Final Step
        </Button>
      </View>
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
    marginBottom: Spacing.four,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  companionCard: {
    width: '47.5%',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    position: 'relative',
  },
  companionName: {
    fontSize: Typography.fontSize.base,
    marginTop: Spacing.two,
    marginBottom: 2,
    textAlign: 'center',
  },
  companionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
  },
  checkCircle: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioBox: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  bioQuote: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontStyle: 'italic',
    flex: 1,
  },
  bioText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
  },
  nameInputSection: {
    marginBottom: Spacing.six,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: Spacing.two,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  textInput: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    padding: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

