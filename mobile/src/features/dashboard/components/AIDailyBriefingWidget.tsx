/**
 * AI Daily Briefing Widget
 * Displays real database-derived pending responsibilities, upcoming deadlines,
 * bills requiring attention, and on-demand LifeBuddy AI summary via /api/ai/chat.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { CurrencyCode, convertAmountTo, formatCurrency } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import { aiService } from '@/features/ai';
import { DashboardOverview } from '../types';
import { buildDailyBriefing } from '../services/dashboardLayout';

interface AIDailyBriefingWidgetProps {
  overview: DashboardOverview | null;
  preferredCurrency: CurrencyCode;
  exchangeRates?: Record<string, number>;
  isLoadingOverview?: boolean;
  onOpenAssistant: () => void;
  onPressItem?: (type: string, id: string) => void;
}

export function AIDailyBriefingWidget({
  overview,
  preferredCurrency,
  exchangeRates = {},
  isLoadingOverview = false,
  onOpenAssistant,
  onPressItem,
}: AIDailyBriefingWidgetProps) {
  const { colors, isDark } = useAppTheme();

  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'ai' | 'fallback' | null>(null);
  const [aiConversationId, setAiConversationId] = useState<string | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const briefing = useMemo(
    () => buildDailyBriefing(overview, preferredCurrency, exchangeRates),
    [overview, preferredCurrency, exchangeRates]
  );

  const handleFetchAIBriefing = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await aiService.chat(
        'What should I focus on today?',
        aiConversationId
      );
      setAiReply(res.reply);
      setAiSource(res.source || 'fallback');
      if (res.conversationId) {
        setAiConversationId(res.conversationId);
      }
    } catch (err: any) {
      setAiError(
        err?.message || 'Unable to generate AI briefing right now. Check connection and retry.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const isAllClear =
    briefing.pendingResponsibilities.length === 0 &&
    briefing.billsRequiringAttention.length === 0 &&
    briefing.upcomingDeadlines.length === 0 &&
    !overview?.stats?.overdueCount &&
    !overview?.stats?.dueSoonCount;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          createShadow(isDark, 'card'),
        ]}
      >
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.primarySoft,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                size={18}
                tintColor={colors.primary}
              />
            </View>
            <View style={styles.headerTitles}>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                AI Daily Briefing
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                {briefing.headline}
              </ThemedText>
            </View>
          </View>

          <Pressable
            onPress={onOpenAssistant}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open AI Planning Assistant"
            style={({ pressed }) => [styles.openLinkBtn, pressed && { opacity: 0.7 }]}
          >
            <ThemedText style={[styles.openLinkText, { color: colors.primary }]}>
              Assistant
            </ThemedText>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={14}
              tintColor={colors.primary}
            />
          </Pressable>
        </View>

        {isLoadingOverview ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={[styles.loadingLabel, { color: colors.textSecondary }]}>
              Summarizing your workspace...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.body}>
            {/* Real-data breakdown grid */}
            {briefing.pendingResponsibilities.length > 0 && (
              <View style={styles.groupBlock}>
                <ThemedText style={[styles.groupTitle, { color: colors.textSecondary }]}>
                  PENDING RESPONSIBILITIES
                </ThemedText>
                {briefing.pendingResponsibilities.map((item) => (
                  <Pressable
                    key={`pending-${item.id}`}
                    onPress={() => onPressItem?.(item.type, item.id)}
                    style={[
                      styles.summaryItemRow,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.summaryItemTitle, { color: colors.text }]}
                    >
                      {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.summaryItemMeta, { color: colors.primary }]}>
                      {item.urgencyLabel}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            {briefing.billsRequiringAttention.length > 0 && (
              <View style={styles.groupBlock}>
                <View style={styles.groupHeaderRow}>
                  <ThemedText style={[styles.groupTitle, { color: colors.textSecondary }]}>
                    BILLS REQUIRING ATTENTION
                  </ThemedText>
                  <ThemedText style={[styles.groupMetric, { color: colors.primary }]}>
                    {briefing.totalUrgentBillsFormatted}
                  </ThemedText>
                </View>
                {briefing.billsRequiringAttention.map((bill) => {
                  const converted = convertAmountTo(
                    bill.amount || 0,
                    bill.currency,
                    preferredCurrency,
                    exchangeRates
                  );
                  return (
                    <Pressable
                      key={`bill-${bill.id}`}
                      onPress={() => onPressItem?.('bill', bill.id)}
                      style={[
                        styles.summaryItemRow,
                        { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={[styles.summaryItemTitle, { color: colors.text }]}
                      >
                        {bill.title} · {bill.urgencyLabel}
                      </ThemedText>
                      <ThemedText style={[styles.summaryItemMeta, { color: colors.text }]}>
                        {formatCurrency(converted, preferredCurrency)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {briefing.upcomingDeadlines.length > 0 && (
              <View style={styles.groupBlock}>
                <ThemedText style={[styles.groupTitle, { color: colors.textSecondary }]}>
                  UPCOMING DEADLINES
                </ThemedText>
                {briefing.upcomingDeadlines.map((item) => (
                  <Pressable
                    key={`deadline-${item.id}`}
                    onPress={() => onPressItem?.(item.type, item.id)}
                    style={[
                      styles.summaryItemRow,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.summaryItemTitle, { color: colors.text }]}
                    >
                      {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.summaryItemMeta, { color: colors.textSecondary }]}>
                      {formatShortDate(item.date)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Contextual suggestion derived strictly from real counts/items.
                Hidden when everything is clear: the headline and Needs Attention already say so. */}
            {!isAllClear && (
              <View
                style={[
                  styles.suggestionBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <ThemedText style={[styles.suggestionText, { color: colors.text }]}>
                  {briefing.suggestion}
                </ThemedText>
              </View>
            )}

            {/* Optional Live AI Summary section (via existing /api/ai/chat endpoint) */}
            {aiLoading && (
              <View style={styles.aiStateBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText style={[styles.aiStateText, { color: colors.textSecondary }]}>
                  Asking LifeBuddy AI for today&apos;s personalized focus plan...
                </ThemedText>
              </View>
            )}

            {aiError && !aiLoading && (
              <View
                style={[
                  styles.aiErrorBox,
                  {
                    backgroundColor: isDark
                      ? Colors.urgency.critical.darkBg
                      : Colors.urgency.critical.lightBg,
                    borderColor: Colors.urgency.critical.accent,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.aiErrorText,
                    {
                      color: isDark
                        ? Colors.urgency.critical.darkText
                        : Colors.urgency.critical.lightText,
                    },
                  ]}
                >
                  {aiError}
                </ThemedText>
                <Pressable
                  onPress={handleFetchAIBriefing}
                  hitSlop={6}
                  style={styles.retryPill}
                  accessibilityRole="button"
                  accessibilityLabel="Retry AI briefing"
                >
                  <ThemedText
                    style={[
                      styles.retryPillText,
                      {
                        color: isDark
                          ? Colors.urgency.critical.darkText
                          : Colors.urgency.critical.lightText,
                      },
                    ]}
                  >
                    Retry
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {aiReply && !aiLoading && !aiError && (
              <View
                style={[
                  styles.aiReplyCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.aiReplyHeader}>
                  <ThemedText style={[styles.aiReplyLabel, { color: colors.primary }]}>
                    {aiSource === 'ai' ? 'Gemini AI Summary' : 'LifeBuddy Context Summary'}
                  </ThemedText>
                  <Pressable onPress={() => setAiReply(null)} hitSlop={8}>
                    <ThemedText style={[styles.clearText, { color: colors.textMuted }]}>
                      Hide
                    </ThemedText>
                  </Pressable>
                </View>
                <ThemedText style={[styles.aiReplyBody, { color: colors.text }]}>
                  {aiReply}
                </ThemedText>
              </View>
            )}

            {/* Action Buttons Row */}
            <View style={styles.actionsFooter}>
              <Pressable
                onPress={handleFetchAIBriefing}
                disabled={aiLoading}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Generate AI focus summary"
              >
                <SymbolView
                  name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
                  size={13}
                  tintColor={colors.primary}
                />
                <ThemedText style={[styles.actionBtnText, { color: colors.primary }]}>
                  {aiReply ? 'Refresh AI Brief' : 'Generate AI Brief'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={onOpenAssistant}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open AI Chat and Goal Planner"
              >
                <SymbolView
                  name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'smart_toy', web: 'smart_toy' }}
                  size={13}
                  tintColor={getButtonForegroundColor('primary', colors, isDark)}
                />
                <ThemedText
                  style={[
                    styles.actionBtnText,
                    { color: getButtonForegroundColor('primary', colors, isDark) },
                  ]}
                >
                  Open AI Assistant
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.three + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two + 2,
    gap: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openLinkText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  loadingLabel: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  body: {
    gap: Spacing.two + 2,
  },
  groupBlock: {
    gap: 6,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    letterSpacing: 0.7,
  },
  groupMetric: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  summaryItemTitle: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    flex: 1,
    minWidth: 0,
  },
  summaryItemMeta: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  suggestionBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.two + 2,
  },
  suggestionText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  aiStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  aiStateText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  aiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  aiErrorText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  retryPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  retryPillText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
  },
  aiReplyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
  },
  aiReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiReplyLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  clearText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  aiReplyBody: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

export default AIDailyBriefingWidget;

