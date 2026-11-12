/**
 * LifeBuddy Dashboard Widget
 * Visual command center card for the user's active virtual companion.
 * Displays companion avatar, level badge, stage, growth progress bar,
 * and gentle daily encouragement quote.
 * Tapping opens the Companion Sanctuary modal.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
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

  const companionDisplayName = companionState.customName || activeCompanion.name;
  const badgeTextColor = isDark ? colors.text : colors.primaryDeep;

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleOpenSanctuary}
          style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel={`LifeBuddy Companion ${companionDisplayName}, level ${companionState.level}`}
          accessibilityHint="Opens LifeBuddy Sanctuary"
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
                  {companionDisplayName}
                </ThemedText>
                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <ThemedText style={[styles.levelBadgeText, { color: badgeTextColor }]}>
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
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Companion growth XP progress"
                  accessibilityValue={{ min: 0, max: 200, now: xpInCurrentLevel }}
                  style={[
                    styles.progressTrack,
                    { backgroundColor: isDark ? colors.surfaceSecondary : colors.border },
                  ]}
                >
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
                backgroundColor: colors.primarySoft,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.quoteText, { color: colors.text }]}>
              &ldquo;{activeCompanion.quote}&rdquo;
            </ThemedText>
          </View>
        </Pressable>

        {/* Ask LifeBuddy AI Action Trigger */}
        <Pressable
          onPress={() => router.push('/ai' as any)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.aiBar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ask LifeBuddy AI"
          accessibilityHint="Opens AI assistant for planning and responsibility summaries"
        >
          <View style={styles.aiBarLeft}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'smart_toy', web: 'smart_toy' } as any}
              size={14}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.aiBarText, { color: colors.primary }]}>
              Ask LifeBuddy AI
            </ThemedText>
          </View>
          <ThemedText style={[styles.aiBarSubtext, { color: colors.textSecondary }]}>
            Plan & summarize &rarr;
          </ThemedText>
        </Pressable>
      </View>

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
    fontVariant: ['tabular-nums'],
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
    fontFamily: Typography.fontFamilies.editorialItalic,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  aiBar: {
    marginTop: Spacing.two,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  aiBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBarText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  aiBarSubtext: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
  },
});

