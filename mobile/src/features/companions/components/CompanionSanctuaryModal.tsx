/**
 * LifeBuddy Companion Sanctuary Modal
 * Full sanctuary experience for mobile:
 * - Active companion spotlight with inline name customization
 * - Growth stage, level, and XP progression
 * - Companion Collection for adopting/inspecting canonical companions (Aura, Mossy, Nori, Zephyr)
 * - Companion details inspection
 * - LifeBuddy Guilt-Free Philosophy
 * Synchronizes with backend and SecureStore via companionService.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { COMPANIONS, getCompanionById, getGrowthStage } from '../catalog';
import { Companion, CompanionState } from '../types';
import { CompanionAvatar } from './CompanionAvatar';
import { companionService } from '../services/companionService';

export interface CompanionSanctuaryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CompanionSanctuaryModal({
  visible,
  onClose,
}: CompanionSanctuaryModalProps) {
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

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedDetailCompanion, setSelectedDetailCompanion] = useState<Companion | null>(null);

  // Load and subscribe to companion state
  useEffect(() => {
    let isMounted = true;
    const userId = user?.id || (user as any)?._id || 'guest';

    companionService.getCompanionState(userId).then((state) => {
      if (isMounted) {
        setCompanionState(state);
        setNameInput(state.customName || getCompanionById(state.activeId).name);
      }
    });

    const unsubscribe = companionService.subscribe((state) => {
      if (isMounted) {
        setCompanionState(state);
        setNameInput(state.customName || getCompanionById(state.activeId).name);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, (user as any)?._id, visible]);

  const activeCompanion = getCompanionById(companionState.activeId);
  const stage = companionState.growthStage || getGrowthStage(companionState.level);
  const xpInCurrentLevel = companionState.xp % 200;
  const xpPercentage = Math.min(100, Math.round((xpInCurrentLevel / 200) * 100));

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Companion name cannot be empty.');
      return;
    }

    const userId = user?.id || (user as any)?._id || 'guest';
    const updated: CompanionState = {
      ...companionState,
      customName: trimmed,
    };

    setCompanionState(updated);
    setEditingName(false);
    await companionService.saveCompanionState(userId, updated, true);
  };

  const handleSwitchCompanion = async (companionId: string) => {
    const target = getCompanionById(companionId);
    const userId = user?.id || (user as any)?._id || 'guest';

    const updated: CompanionState = {
      ...companionState,
      activeId: target.id,
      customName: target.defaultName,
    };

    setCompanionState(updated);
    setNameInput(target.defaultName);
    setSelectedDetailCompanion(null);

    await companionService.saveCompanionState(userId, updated, true);
    Alert.alert(
      'Companion Adopted',
      `${target.name} is now your active LifeBuddy companion!`
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconContainer,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  size={18}
                  tintColor={colors.primary}
                />
              </View>
              <View>
                <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
                  LifeBuddy Sanctuary
                </ThemedText>
                <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Positive reinforcement & companion collection
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={8}
              accessibilityLabel="Close sanctuary"
              accessibilityRole="button"
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={16}
                tintColor={colors.text}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Active Companion Spotlight Card */}
            <View
              style={[
                styles.spotlightCard,
                createShadow(isDark, 'card'),
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.spotlightHeader}>
                <View style={styles.activeTag}>
                  <View style={styles.activeIndicatorDot} />
                  <ThemedText style={[styles.activeTagText, { color: colors.text }]}>
                    Active & Thriving
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.levelPill,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <ThemedText style={[styles.levelPillText, { color: colors.primary }]}>
                    Level {companionState.level} · {stage}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.avatarSection}>
                <CompanionAvatar id={activeCompanion.id} size="xl" />
              </View>

              {/* Custom Name / Rename Row */}
              <View style={styles.nameSection}>
                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      style={[
                        styles.nameInput,
                        {
                          color: colors.text,
                          borderColor: colors.primary,
                          backgroundColor: colors.surfaceElevated || colors.background,
                        },
                      ]}
                      autoFocus
                      maxLength={24}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveName}
                    />
                    <Pressable
                      onPress={handleSaveName}
                      style={[styles.saveNameBtn, { backgroundColor: colors.primary }]}
                      hitSlop={6}
                    >
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={16}
                        tintColor={getButtonForegroundColor('primary', colors, isDark)}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.nameDisplayRow}>
                    <ThemedText style={[styles.companionName, { color: colors.text }]}>
                      {companionState.customName || activeCompanion.name}
                    </ThemedText>
                    <Pressable
                      onPress={() => setEditingName(true)}
                      style={[
                        styles.editNameBtn,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                      hitSlop={8}
                    >
                      <SymbolView
                        name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        size={14}
                        tintColor={colors.primary}
                      />
                    </Pressable>
                  </View>
                )}

                <ThemedText style={[styles.companionTitle, { color: colors.textSecondary }]}>
                  {activeCompanion.title} · {activeCompanion.species} ({activeCompanion.element} Element)
                </ThemedText>
              </View>

              {/* Quote */}
              <View
                style={[
                  styles.quoteBox,
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

              {/* Growth Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <ThemedText style={[styles.progressLabel, { color: colors.text }]}>
                    Growth Progress
                  </ThemedText>
                  <ThemedText style={[styles.progressValues, { color: colors.textSecondary }]}>
                    {xpInCurrentLevel} / 200 XP to next level
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: isDark ? colors.surfaceSecondary : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${xpPercentage}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={[styles.progressHint, { color: colors.textSecondary }]}>
                  XP is earned naturally by completing tasks, paying bills on time, and staying organized.
                </ThemedText>
              </View>

              {/* 3 Metric Badges */}
              <View style={styles.metricsRow}>
                <View
                  style={[
                    styles.metricBadge,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    Stage
                  </ThemedText>
                  <ThemedText style={[styles.metricValue, { color: colors.primary }]}>
                    {stage}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.metricBadge,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    Total XP
                  </ThemedText>
                  <ThemedText style={[styles.metricValue, { color: colors.text }]}>
                    {companionState.xp}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.metricBadge,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    Well-being
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.metricValue,
                      {
                        color: isDark
                          ? Colors.urgency.completed.darkText
                          : Colors.urgency.completed.accent,
                      },
                    ]}
                  >
                    100%
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Companion Collection Section */}
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                Companion Collection
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Choose your active partner or inspect another spirit.
              </ThemedText>
            </View>

            <View style={styles.collectionGrid}>
              {COMPANIONS.map((companion) => {
                const isActive = companion.id === companionState.activeId;
                return (
                  <View
                    key={companion.id}
                    style={[
                      styles.companionCard,
                      createShadow(isDark, 'card'),
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.elementBadge,
                          {
                            backgroundColor: colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <ThemedText style={[styles.elementBadgeText, { color: colors.textSecondary }]}>
                          {companion.element}
                        </ThemedText>
                      </View>
                      {isActive && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: colors.primarySoft },
                          ]}
                        >
                          <ThemedText style={[styles.activeBadgeText, { color: colors.primary }]}>
                            Active
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.collectionAvatarWrap}>
                      <CompanionAvatar id={companion.id} size="lg" />
                    </View>

                    <ThemedText style={[styles.collectionName, { color: colors.text }]}>
                      {companion.name}
                    </ThemedText>
                    <ThemedText style={[styles.collectionTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      {companion.title}
                    </ThemedText>
                    <ThemedText style={[styles.collectionBio, { color: colors.textSecondary }]} numberOfLines={2}>
                      {companion.bio}
                    </ThemedText>

                    <View style={styles.cardActionsRow}>
                      <Pressable
                        onPress={() => setSelectedDetailCompanion(companion)}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.detailsBtn,
                          {
                            backgroundColor: colors.surfaceSecondary,
                            borderColor: colors.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                        hitSlop={4}
                      >
                        <SymbolView
                          name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                          size={14}
                          tintColor={colors.text}
                        />
                        <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>
                          Details
                        </ThemedText>
                      </Pressable>

                      {!isActive && (
                        <Pressable
                          onPress={() => handleSwitchCompanion(companion.id)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.adoptBtn,
                            { backgroundColor: colors.primary },
                            pressed && { opacity: 0.8 },
                          ]}
                          hitSlop={4}
                        >
                          <ThemedText
                            style={[
                              styles.adoptBtnText,
                              { color: getButtonForegroundColor('primary', colors, isDark) },
                            ]}
                          >
                            Adopt
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* LifeBuddy Guilt-Free Philosophy Card */}
            <View
              style={[
                styles.philosophyCard,
                {
                  backgroundColor: isDark
                    ? Colors.urgency.completed.darkBg
                    : Colors.urgency.completed.lightBg,
                  borderColor: isDark
                    ? 'rgba(52, 211, 153, 0.28)'
                    : 'rgba(16, 185, 129, 0.35)',
                },
              ]}
            >
              <View style={styles.philosophyIconWrap}>
                <SymbolView
                  name={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
                  size={22}
                  tintColor={
                    isDark
                      ? Colors.urgency.completed.darkText
                      : Colors.urgency.completed.accent
                  }
                />
              </View>
              <View style={styles.philosophyContent}>
                <ThemedText style={[styles.philosophyTitle, { color: colors.text }]}>
                  LifeBuddy Guilt-Free Philosophy
                </ThemedText>
                <ThemedText style={[styles.philosophyDesc, { color: colors.textSecondary }]}>
                  Life gets busy. Your LifeBuddy will never become sick, sad, or disappear if you take a break. When you return, your companion welcomes you back warmly with zero guilt.
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Companion Details Inspection Sub-Modal */}
          {selectedDetailCompanion && (
            <Modal
              visible={!!selectedDetailCompanion}
              transparent
              animationType="fade"
              onRequestClose={() => setSelectedDetailCompanion(null)}
            >
              <Pressable
                style={styles.detailOverlay}
                onPress={() => setSelectedDetailCompanion(null)}
              >
                <Pressable
                  style={[
                    styles.detailCard,
                    createShadow(isDark, 'modal'),
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.detailAvatarWrap}>
                    <CompanionAvatar id={selectedDetailCompanion.id} size="xl" />
                  </View>
                  <ThemedText style={[styles.detailName, { color: colors.text }]}>
                    {selectedDetailCompanion.name}
                  </ThemedText>
                  <ThemedText style={[styles.detailTitle, { color: colors.primary }]}>
                    {selectedDetailCompanion.title}
                  </ThemedText>

                  <View
                    style={[
                      styles.detailInfoBox,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.detailItemText, { color: colors.text }]}>
                      <ThemedText style={styles.detailLabel}>Species: </ThemedText>
                      {selectedDetailCompanion.species}
                    </ThemedText>
                    <ThemedText style={[styles.detailItemText, { color: colors.text }]}>
                      <ThemedText style={styles.detailLabel}>Element: </ThemedText>
                      {selectedDetailCompanion.element}
                    </ThemedText>
                    <ThemedText style={[styles.detailItemText, { color: colors.text }]}>
                      <ThemedText style={styles.detailLabel}>Personality: </ThemedText>
                      {selectedDetailCompanion.personality}
                    </ThemedText>
                    <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                    <ThemedText style={[styles.detailBioText, { color: colors.textSecondary }]}>
                      {selectedDetailCompanion.bio}
                    </ThemedText>
                  </View>

                  <View style={styles.detailActionsRow}>
                    <Pressable
                      onPress={() => setSelectedDetailCompanion(null)}
                      style={[
                        styles.detailCloseBtn,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <ThemedText style={[styles.detailCloseBtnText, { color: colors.text }]}>
                        Close
                      </ThemedText>
                    </Pressable>

                    {selectedDetailCompanion.id !== companionState.activeId && (
                      <Pressable
                        onPress={() => handleSwitchCompanion(selectedDetailCompanion.id)}
                        style={[styles.detailAdoptBtn, { backgroundColor: colors.primary }]}
                      >
                        <ThemedText
                          style={[
                            styles.detailAdoptBtnText,
                            { color: getButtonForegroundColor('primary', colors, isDark) },
                          ]}
                        >
                          Make Active
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.xl,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.five,
    paddingBottom: Spacing.eight,
  },
  spotlightCard: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
  },
  spotlightHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeTagText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  levelPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  levelPillText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    fontVariant: ['tabular-nums'],
  },
  avatarSection: {
    marginVertical: Spacing.two,
  },
  nameSection: {
    alignItems: 'center',
    marginTop: Spacing.two,
    width: '100%',
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  companionName: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['3xl'],
  },
  editNameBtn: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: Radius.md,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 260,
  },
  nameInput: {
    flex: 1,
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    textAlign: 'center',
  },
  saveNameBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionTitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
    textAlign: 'center',
  },
  quoteBox: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    width: '100%',
  },
  quoteText: {
    fontFamily: Typography.fontFamilies.editorialItalic,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressSection: {
    width: '100%',
    marginTop: Spacing.four,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  progressLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  progressValues: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
    marginTop: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    width: '100%',
  },
  metricBadge: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
  },
  metricValue: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.sm,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.xl,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  collectionGrid: {
    gap: Spacing.three,
  },
  companionCard: {
    borderRadius: Radius['2xl'],
    padding: Spacing.four,
    alignItems: 'center',
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  elementBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  elementBadgeText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  activeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
  },
  collectionAvatarWrap: {
    marginVertical: Spacing.two,
  },
  collectionName: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
  },
  collectionTitle: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
    marginTop: 1,
  },
  collectionBio: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtn: {
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  adoptBtn: {},
  adoptBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
  },
  philosophyCard: {
    flexDirection: 'row',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  philosophyIconWrap: {
    marginTop: 2,
  },
  philosophyContent: {
    flex: 1,
  },
  philosophyTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.base,
  },
  philosophyDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
    lineHeight: 18,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  detailCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
  },
  detailAvatarWrap: {
    marginBottom: Spacing.three,
  },
  detailName: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
  },
  detailTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  detailInfoBox: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three,
    marginTop: Spacing.four,
    gap: 4,
  },
  detailItemText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  detailLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  detailBioText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
    marginTop: Spacing.five,
  },
  detailCloseBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  detailAdoptBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAdoptBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
  },
});
