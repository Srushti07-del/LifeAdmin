/**
 * LifeBuddy Dashboard Widget
 * Visual command center card for the user's active virtual companion.
 * Displays companion avatar, level badge, stage, growth progress bar,
 * and gentle daily encouragement quote.
 * Tapping opens the Companion Sanctuary modal.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { COMPANIONS, getCompanionById, getGrowthStage } from '../catalog';
import { CompanionState } from '../types';
import { CompanionAvatar } from './CompanionAvatar';
import { CompanionSanctuaryModal } from './CompanionSanctuaryModal';
import { companionService } from '../services/companionService';

export interface LifeBuddyWidgetProps {
  onPressSanctuary?: () => void;
}

export function LifeBuddyWidget({ onPressSanctuary }: LifeBuddyWidgetProps) {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();

  const [companionState, setCompanionState] = useState<CompanionState>({
    activeId: 'aura',
    customName: 'Aura',
    xp: 150,
    level: 1,
    growthStage: 'Sprout',
    streakDays: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
  });

  const [isSanctuaryOpen, setIsSanctuaryOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const userId = user?.id || (user as any)?._id || 'guest';

    companionService.getCompanionState(userId).then((state) => {
      if (isMounted) setCompanionState(state);
    });

    const unsubscribe = companionService.subscribe((state) => {
      if (isMounted) setCompanionState(state);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, (user as any)?._id]);

  const activeCompanion = getCompanionById(companionState.activeId);
  const stage = companionState.growthStage || getGrowthStage(companionState.level);
  const xpInCurrentLevel = companionState.xp % 200;
  const xpPercentage = Math.min(100, Math.round((xpInCurrentLevel / 200) * 100));

  const handleOpenSanctuary = () => {
    if (onPressSanctuary) {
      onPressSanctuary();
    } else {
      setIsSanctuaryOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handleOpenSanctuary}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.95 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`LifeBuddy Companion ${companionState.customName || activeCompanion.name}, level ${companionState.level}. Tap to open Sanctuary.`}
      >
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleGroup}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              size={15}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.headerTitle, { color: colors.textSecondary }]}>
              LIFEBUDDY COMPANION
            </ThemedText>
          </View>
          <View style={styles.sanctuaryAction}>
            <ThemedText style={[styles.sanctuaryText, { color: colors.primary }]}>
              Sanctuary
            </ThemedText>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={12}
              tintColor={colors.primary}
            />
          </View>
        </View>

        {/* Content Row */}
        <View style={styles.contentRow}>
          <CompanionAvatar id={activeCompanion.id} size="lg" />

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <ThemedText
                style={[styles.companionName, { color: colors.text }]}
                numberOfLines={1}
              >
                {companionState.customName || activeCompanion.name}
              </ThemedText>
              <View
                style={[
                  styles.levelBadge,
                  {
                    backgroundColor: isDark ? 'rgba(22, 143, 145, 0.25)' : '#D3EAE7',
                    borderColor: colors.primary,
                  },
                ]}
              >
                <ThemedText style={[styles.levelBadgeText, { color: colors.primary }]}>
                  Lvl {companionState.level}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.speciesText, { color: colors.textSecondary }]}>
              {activeCompanion.species} · {stage}
            </ThemedText>

            {/* Growth Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <ThemedText style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Growth XP
                </ThemedText>
                <ThemedText style={[styles.progressCount, { color: colors.textSecondary }]}>
                  {xpInCurrentLevel} / 200
                </ThemedText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#143440' : '#E2E8F0' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${xpPercentage}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Gentle Encouragement Quote Card */}
        <View
          style={[
            styles.quoteContainer,
            {
              backgroundColor: isDark ? 'rgba(22, 143, 145, 0.12)' : '#EAF5F4',
              borderColor: isDark ? 'rgba(22, 143, 145, 0.28)' : '#C5DDDE',
            },
          ]}
        >
          <ThemedText style={[styles.quoteText, { color: colors.text }]}>
            &ldquo;{activeCompanion.quote}&rdquo;
          </ThemedText>
        </View>
      </Pressable>

      {/* Internal Sanctuary Modal fallback */}
      {!onPressSanctuary && (
        <CompanionSanctuaryModal
          visible={isSanctuaryOpen}
          onClose={() => setIsSanctuaryOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.three,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    letterSpacing: 0.8,
  },
  sanctuaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sanctuaryText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  companionName: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
    flexShrink: 1,
  },
  levelBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
  },
  speciesText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: Spacing.two,
    width: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  progressCount: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  quoteContainer: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  quoteText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

