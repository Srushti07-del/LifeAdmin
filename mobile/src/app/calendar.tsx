/**
 * Calendar Screen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export default function CalendarScreen() {
  const { colors } = useAppTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: colors.text }]}>Calendar</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unified schedule of all dated responsibilities
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            size={40}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
            Calendar Feed
          </ThemedText>
          <ThemedText style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Aggregate view of your events, tasks, bill due dates, and appointments.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  header: {
    marginBottom: Spacing.six,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 4,
  },
  card: {
    padding: Spacing.six,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.three,
  },
  cardDesc: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.one,
    maxWidth: 280,
  },
});
