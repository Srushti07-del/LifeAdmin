/**
 * LifeAdmin Mobile — Goal Planner View Component
 * Transforms high-level goals into structured milestones and reviewable tasks.
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
import { Button, Input } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { PlanResponse, ProposedAction } from '../types';
import {
  GOAL_TEMPLATES,
  getActionTypeBadge,
  formatActionSubtitle,
} from '../services/aiCalculations';

interface GoalPlannerViewProps {
  onGeneratePlan: (goal: string, targetDate?: string) => Promise<void>;
  isLoading: boolean;
  planResult: PlanResponse | null;
  onReviewTask: (task: ProposedAction) => void;
  onAcceptAllTasks: (tasks: ProposedAction[]) => Promise<void>;
  isActionBusy: boolean;
}

export function GoalPlannerView({
  onGeneratePlan,
  isLoading,
  planResult,
  onReviewTask,
  onAcceptAllTasks,
  isActionBusy,
}: GoalPlannerViewProps) {
  const { colors, isDark } = useAppTheme();

  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleApplyTemplate = (tmpl: string) => {
    setGoal(tmpl);
  };

  const handleSetQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    if (!goal.trim() || isLoading) return;
    await onGeneratePlan(goal.trim(), targetDate.trim() || undefined);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Goal Input Card */}
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
            name={{ ios: 'target', android: 'track_changes' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
            AI Goal Planner
          </ThemedText>
        </View>

        <ThemedText style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Enter a personal, financial, academic, or work goal. LifeBuddy will draft
          structured milestones and action items for your review.
        </ThemedText>

        {/* Goal Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            What is your goal? *
          </ThemedText>
          <Input
            value={goal}
            onChangeText={setGoal}
            placeholder="e.g. Prepare for final exams or move into new apartment"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Quick Goal Presets */}
        <ThemedText style={[styles.presetLabel, { color: colors.textSecondary }]}>
          Sample goals:
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {GOAL_TEMPLATES.map((tmpl) => (
            <Pressable
              key={tmpl}
              onPress={() => handleApplyTemplate(tmpl)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isDark ? '#1C292D' : '#F1F5F9',
                  borderColor: isDark ? '#304247' : colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.presetChipText, { color: colors.text }]}>
                {tmpl}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Target Date */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Target completion date (optional)
          </ThemedText>
          <Input
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
          />

          <View style={styles.quickDateRow}>
            <Pressable
              onPress={() => handleSetQuickDate(7)}
              style={[styles.quickDateChip, { borderColor: colors.border }]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.primary }]}>
                +1 Week
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleSetQuickDate(14)}
              style={[styles.quickDateChip, { borderColor: colors.border }]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.primary }]}>
                +2 Weeks
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleSetQuickDate(30)}
              style={[styles.quickDateChip, { borderColor: colors.border }]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.primary }]}>
                +1 Month
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Generate Button */}
        <Button
          variant="primary"
          onPress={handleSubmit}
          disabled={isLoading || !goal.trim()}
          icon={
            isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome' }}
                size={16}
                tintColor="#FFFFFF"
              />
            )
          }
          style={styles.generateBtn}
        >
          {isLoading ? 'Generating Action Plan...' : 'Generate Action Plan'}
        </Button>
      </View>

      {/* Suggested Plan Results Card */}
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
            name={{ ios: 'checklist', android: 'format_list_bulleted' }}
            size={18}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
            Suggested Plan
          </ThemedText>
          {planResult?.source && (
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: isDark ? '#1C292D' : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.sourceBadgeText, { color: colors.textSecondary }]}>
                {planResult.source}
              </ThemedText>
            </View>
          )}
        </View>

        {planResult ? (
          <View style={styles.planResultContent}>
            {/* Overview / Strategy Text */}
            <View
              style={[
                styles.planSummaryBox,
                {
                  backgroundColor: isDark ? '#141F23' : '#F8FAFA',
                  borderColor: colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.planSummaryText, { color: colors.text }]}>
                {planResult.plan}
              </ThemedText>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksList}>
              {planResult.tasks.map((task, idx) => {
                const badge = getActionTypeBadge(task.type, isDark);
                const subtitle = formatActionSubtitle(task);

                return (
                  <View
                    key={`${task.title}-${idx}`}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: isDark ? '#1C292D' : colors.surface,
                        borderColor: isDark ? '#304247' : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.taskCardLeft}>
                      <ThemedText style={[styles.taskIndexText, { color: colors.primary }]}>
                        {idx + 1}.
                      </ThemedText>
                      <View style={styles.taskTextCol}>
                        <ThemedText style={[styles.taskTitle, { color: colors.text }]}>
                          {task.title}
                        </ThemedText>
                        {subtitle ? (
                          <ThemedText
                            style={[styles.taskSubtitle, { color: colors.textSecondary }]}
                          >
                            {subtitle}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>

                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => onReviewTask(task)}
                      disabled={isActionBusy}
                    >
                      Review
                    </Button>
                  </View>
                );
              })}
            </View>

            {/* Batch Confirm Button */}
            {planResult.tasks.length > 1 && (
              <Button
                variant="primary"
                onPress={() => onAcceptAllTasks(planResult.tasks)}
                disabled={isActionBusy}
                icon={
                  isActionBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }}
                      size={16}
                      tintColor="#FFFFFF"
                    />
                  )
                }
                style={styles.batchBtn}
              >
                {isActionBusy ? 'Creating Tasks...' : `Confirm & Add All ${planResult.tasks.length} Tasks`}
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.emptyPlanBox}>
            <SymbolView
              name={{ ios: 'lightbulb', android: 'tips_and_updates' }}
              size={36}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.emptyPlanTitle, { color: colors.text }]}>
              No Plan Generated Yet
            </ThemedText>
            <ThemedText style={[styles.emptyPlanDesc, { color: colors.textSecondary }]}>
              Type your goal above and tap "Generate Action Plan" to preview suggested tasks.
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
  presetLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  presetsScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  presetChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  quickDateChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  generateBtn: {
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
  planResultContent: {
    gap: Spacing.three,
  },
  planSummaryBox: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  planSummaryText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 18,
  },
  tasksList: {
    gap: Spacing.two,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  taskIndexText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  taskSubtitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  batchBtn: {
    marginTop: Spacing.two,
  },
  emptyPlanBox: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyPlanTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: Spacing.one,
  },
  emptyPlanDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    paddingHorizontal: Spacing.six,
    lineHeight: 18,
  },
});

