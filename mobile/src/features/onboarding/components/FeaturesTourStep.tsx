/**
 * Screen 3 — LifeAdmin Features Tour
 * Introduces the core modules: Tasks, Bills, Calendar, Appointments, Documents, Reminders.
 * Calm editorial presentation with attractive native cards.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface FeaturesTourStepProps {
  onNext: () => void;
  onBack: () => void;
}

const MODULES = [
  {
    id: 'tasks',
    title: 'Tasks & Checklists',
    desc: 'Structured to-dos with urgency badges, domain tagging, and flexible deadlines.',
    icon: 'checklist',
    iosIcon: 'checklist',
    tint: '#168F91',
    bgLight: '#DDF1EF',
    bgDark: 'rgba(22, 143, 145, 0.2)',
  },
  {
    id: 'bills',
    title: 'Bills & Payments',
    desc: 'Keep track of subscriptions, utilities, and due dates with currency-aware totals.',
    icon: 'receipt_long',
    iosIcon: 'creditcard.fill',
    tint: '#0284C7',
    bgLight: '#E0F2FE',
    bgDark: 'rgba(2, 132, 199, 0.2)',
  },
  {
    id: 'calendar',
    title: 'Unified Calendar',
    desc: 'Aggregates all dated events, bills, and task deadlines into a single visual schedule.',
    icon: 'calendar_month',
    iosIcon: 'calendar',
    tint: '#8B5CF6',
    bgLight: '#EDE9FE',
    bgDark: 'rgba(139, 92, 246, 0.2)',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    desc: 'Specific medical, personal, and professional appointments kept neatly organized.',
    icon: 'event',
    iosIcon: 'calendar.badge.clock',
    tint: '#F59E0B',
    bgLight: '#FEF3C7',
    bgDark: 'rgba(245, 158, 11, 0.2)',
  },
  {
    id: 'documents',
    title: 'Document Vault',
    desc: 'Secure repository for insurance policies, warranties, and identity documents.',
    icon: 'description',
    iosIcon: 'doc.text.fill',
    tint: '#10B981',
    bgLight: '#D1FAE5',
    bgDark: 'rgba(16, 185, 129, 0.2)',
  },
  {
    id: 'reminders',
    title: 'Proactive Reminders',
    desc: 'Timely reminders before due dates so you never experience late fees or missed deadlines.',
    icon: 'alarm',
    iosIcon: 'bell.fill',
    tint: '#EC4899',
    bgLight: '#FCE7F3',
    bgDark: 'rgba(236, 72, 153, 0.2)',
  },
];

export function FeaturesTourStep({ onNext, onBack }: FeaturesTourStepProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Step Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Your Unified Life Command Center
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          Every essential area of daily administration, working harmoniously together.
        </ThemedText>
      </View>

      {/* Modules Grid */}
      <View style={styles.grid}>
        {MODULES.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark ? item.bgDark : item.bgLight,
                },
              ]}
            >
              <SymbolView
                name={{ ios: item.iosIcon, android: item.icon, web: item.icon } as any}
                size={22}
                tintColor={item.tint}
              />
            </View>

            <View style={styles.cardContent}>
              <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.cardDesc, { color: colors.textSecondary }]}>
                {item.desc}
              </ThemedText>
            </View>
          </View>
        ))}
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
          Meet Companion
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
  grid: {
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 17,
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

