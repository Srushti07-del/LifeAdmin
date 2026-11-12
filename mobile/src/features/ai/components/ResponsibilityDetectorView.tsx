/**
 * LifeAdmin Mobile — Responsibility Detector View Component
 * Parses unstructured text snippets to identify tasks, bills, appointments, and reminders.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Button, Input, getButtonForegroundColor } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { BottomTabInset } from '@/constants/theme';
import { CurrencyCode, DEFAULT_CURRENCY } from '@/utils/currency';
import { DetectResponse, ProposedAction } from '../types';
import {
  SAMPLE_TEXT_SNIPPETS,
  getActionTypeBadge,
  getActionTypeIcon,
  formatActionSubtitle,
} from '../services/aiCalculations';

interface ResponsibilityDetectorViewProps {
  onDetectResponsibilities: (text: string) => Promise<void>;
  isLoading: boolean;
  detectResult: DetectResponse | null;
  onReviewItem: (item: ProposedAction) => void;
  onAcceptAllItems: (items: ProposedAction[]) => Promise<void>;
  isActionBusy: boolean;
  preferredCurrency?: CurrencyCode;
}

export function ResponsibilityDetectorView({
  onDetectResponsibilities,
  isLoading,
  detectResult,
  onReviewItem,
  onAcceptAllItems,
  isActionBusy,
  preferredCurrency = DEFAULT_CURRENCY,
}: ResponsibilityDetectorViewProps) {
  const { colors, isDark } = useAppTheme();

  const [text, setText] = useState('');

  const handleApplySnippet = (snippetText: string) => {
    setText(snippetText);
  };

  const handleDetect = async () => {
    if (!text.trim() || isLoading) return;
    await onDetectResponsibilities(text.trim());
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: BottomTabInset + Spacing.eight },
      ]}
    >
      {/* Input Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <SymbolView
            name={{ ios: 'doc.text.magnifyingglass', android: 'search' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
            Text Extractor & Detector
          </ThemedText>
        </View>

        <ThemedText style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Paste an email, message, lease notice, syllabus, or medical receipt.
          LifeBuddy will extract dates, amounts, and actionable items for your confirmation.
        </ThemedText>

        {/* Text Area Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Text to analyze *
          </ThemedText>
          <Input
            value={text}
            onChangeText={setText}
            placeholder="Paste text containing dates, deadlines, bills, or appointments..."
            multiline
            numberOfLines={6}
            style={styles.textArea}
          />
        </View>

        {/* Sample Text Presets */}
        <ThemedText style={[styles.presetLabel, { color: colors.textSecondary }]}>
          Try sample text:
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {SAMPLE_TEXT_SNIPPETS.map((snippet) => (
            <Pressable
              key={snippet.title}
              onPress={() => handleApplySnippet(snippet.text)}
              hitSlop={4}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.presetChipText, { color: colors.text }]}>
                {snippet.title}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Detect Action Button */}
        <Button
          variant="primary"
          onPress={handleDetect}
          disabled={isLoading || !text.trim()}
          icon={
            isLoading ? (
              <ActivityIndicator
                size="small"
                color={getButtonForegroundColor('primary', colors, isDark)}
              />
            ) : (
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome' }}
                size={16}
                tintColor={getButtonForegroundColor('primary', colors, isDark)}
              />
            )
          }
          style={styles.detectBtn}
        >
          {isLoading ? 'Analyzing Text...' : 'Detect Items'}
        </Button>
      </View>

      {/* Extracted Suggestions Result Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <SymbolView
            name={{ ios: 'tray.full.fill', android: 'inbox' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
            Detected Suggestions
          </ThemedText>
          {detectResult?.source && (
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.sourceBadgeText, { color: colors.textSecondary }]}>
                {detectResult.source}
              </ThemedText>
            </View>
          )}
        </View>

        {detectResult ? (
          <View style={styles.resultContent}>
            {/* Extraction Summary */}
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <ThemedText style={[styles.summaryText, { color: colors.text }]}>
                {detectResult.summary}
              </ThemedText>
            </View>

            {/* Extracted Items List */}
            {detectResult.detectedItems.length > 0 ? (
              <View style={styles.itemsList}>
                {detectResult.detectedItems.map((item, idx) => {
                  const badge = getActionTypeBadge(item.type, isDark);
                  const icon = getActionTypeIcon(item.type);
                  const subtitle = formatActionSubtitle(item, preferredCurrency);

                  return (
                    <View
                      key={`${item.title}-${idx}`}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.itemCardHeader}>
                        <View
                          style={[
                            styles.itemTypeBadge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <SymbolView
                            name={icon as any}
                            size={12}
                            tintColor={badge.color}
                          />
                          <ThemedText style={[styles.itemTypeBadgeText, { color: badge.color }]}>
                            {badge.label.toUpperCase()}
                          </ThemedText>
                        </View>

                        {item.confidence && (
                          <ThemedText style={[styles.confidenceLabel, { color: colors.textSecondary }]}>
                            {item.confidence} confidence
                          </ThemedText>
                        )}
                      </View>

                      <ThemedText style={[styles.itemTitle, { color: colors.text }]}>
                        {item.title}
                      </ThemedText>

                      {subtitle ? (
                        <ThemedText style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                          {subtitle}
                        </ThemedText>
                      ) : null}

                      {item.description ? (
                        <ThemedText
                          style={[styles.itemSnippet, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          "{item.description}"
                        </ThemedText>
                      ) : null}

                      <View style={styles.itemActionRow}>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => onReviewItem(item)}
                          disabled={isActionBusy}
                          style={{ flex: 1 }}
                        >
                          Review & Confirm
                        </Button>
                      </View>
                    </View>
                  );
                })}

                {/* Bulk Confirm Option */}
                {detectResult.detectedItems.length > 1 && (
                  <Button
                    variant="outline"
                    onPress={() => onAcceptAllItems(detectResult.detectedItems)}
                    disabled={isActionBusy}
                    icon={
                      isActionBusy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <SymbolView
                          name={{ ios: 'checkmark.circle', android: 'done_all' }}
                          size={16}
                          tintColor={colors.primary}
                        />
                      )
                    }
                    style={styles.batchBtn}
                  >
                    {isActionBusy ? 'Creating Items...' : `Confirm & Add All ${detectResult.detectedItems.length} Items`}
                  </Button>
                )}
              </View>
            ) : (
              <View style={styles.emptyDetectBox}>
                <ThemedText style={[styles.emptyDetectText, { color: colors.textSecondary }]}>
                  No actionable items detected from the provided text. Try entering text with explicit dates, times, or amounts.
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyDetectBox}>
            <SymbolView
              name={{ ios: 'doc.text.magnifyingglass', android: 'document_scanner' }}
              size={36}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.emptyDetectTitle, { color: colors.text }]}>
              No Text Analyzed Yet
            </ThemedText>
            <ThemedText style={[styles.emptyDetectText, { color: colors.textSecondary }]}>
              Paste any unstructured text snippet above and tap "Detect Items" to extract deadlines, bills, and responsibilities.
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.eight,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamilies.sansBold,
    flex: 1,
  },
  cardDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 18,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  presetLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  presetsScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  presetChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
  },
  detectBtn: {
    marginTop: Spacing.two,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    textTransform: 'capitalize',
  },
  resultContent: {
    gap: Spacing.three,
  },
  summaryBox: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 18,
  },
  itemsList: {
    gap: Spacing.three,
  },
  itemCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  itemTypeBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
  },
  confidenceLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    textTransform: 'capitalize',
  },
  itemTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  itemSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontVariant: ['tabular-nums'],
  },
  itemSnippet: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  itemActionRow: {
    marginTop: Spacing.one,
  },
  batchBtn: {
    marginTop: Spacing.two,
  },
  emptyDetectBox: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyDetectTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: Spacing.one,
  },
  emptyDetectText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    paddingHorizontal: Spacing.six,
    lineHeight: 18,
  },
});

