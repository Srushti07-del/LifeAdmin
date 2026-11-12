/**
 * LifeAdmin Mobile — Action Confirmation Modal Sheet
 * Enforces explicit review, editing, and confirmation safeguards before
 * creating any AI-suggested task, bill, appointment, or reminder.
 */

import React, { useState, useEffect } from 'react';
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
import {
  ModalSheet,
  Button,
  Input,
  DatePickerField,
  TimePickerField,
  getButtonForegroundColor,
} from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  getCurrencyInfo,
  resolveTransactionCurrency,
} from '@/utils/currency';
import { ProposedAction } from '../types';
import {
  getActionTypeBadge,
  getActionTypeIcon,
  validateProposedAction,
} from '../services/aiCalculations';

interface ActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ProposedAction | null;
  onConfirm: (modifiedAction: ProposedAction) => Promise<void>;
  isSubmitting?: boolean;
  preferredCurrency?: CurrencyCode;
}

const PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'urgent', label: 'Urgent' },
] as const;

export function ActionConfirmationModal({
  isOpen,
  onClose,
  action,
  onConfirm,
  isSubmitting = false,
  preferredCurrency = DEFAULT_CURRENCY,
}: ActionConfirmationModalProps) {
  const { colors, isDark } = useAppTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('Personal');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (action) {
      setTitle(action.title || '');
      setDescription(action.description || '');
      setDueDate(action.dueDate || action.date || '');
      setDueTime(action.dueTime || action.time || '');
      setAmount(action.amount != null ? String(action.amount) : '');
      setPriority((action.priority as any) || 'medium');
      setCategory(action.category || (action.type === 'bill' ? 'Finance' : 'Personal'));
      setValidationError(null);
    }
  }, [action]);

  if (!action) return null;

  const badge = getActionTypeBadge(action.type, isDark);
  const icon = getActionTypeIcon(action.type);
  const resolvedCurrency = resolveTransactionCurrency(action.currency, preferredCurrency);
  const currencyInfo = getCurrencyInfo(resolvedCurrency);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const modified: ProposedAction = {
      ...action,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
      date: dueDate.trim() || undefined,
      dueTime: dueTime.trim() || undefined,
      time: dueTime.trim() || undefined,
      amount: amount.trim() ? parseFloat(amount) : undefined,
      currency:
        action.type === 'bill' || action.amount != null || action.currency
          ? resolvedCurrency
          : undefined,
      priority,
      category: category.trim() || 'Personal',
      requiresConfirmation: true,
    };

    const val = validateProposedAction(modified);
    if (!val.valid) {
      setValidationError(val.errors.join(' '));
      return;
    }

    setValidationError(null);
    await onConfirm(modified);
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm & Review Action"
      description="LifeBuddy prepares suggestions, but never saves records without your review."
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Safety Banner */}
        <View
          style={[
            styles.safetyBanner,
            {
              backgroundColor: isDark
                ? Colors.urgency.dueSoon.darkBg
                : Colors.urgency.dueSoon.lightBg,
              borderColor: isDark
                ? 'rgba(245, 158, 11, 0.35)'
                : Colors.urgency.dueSoon.accent,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning' }}
            size={18}
            tintColor={
              isDark
                ? Colors.urgency.dueSoon.darkText
                : Colors.urgency.dueSoon.accent
            }
          />
          <ThemedText
            style={[
              styles.safetyBannerText,
              {
                color: isDark
                  ? Colors.urgency.dueSoon.darkText
                  : Colors.urgency.dueSoon.lightText,
              },
            ]}
          >
            Review and adjust details carefully. Confirming will create a permanent{' '}
            {action.type} in your LifeAdmin account.
          </ThemedText>
        </View>

        {/* Validation Error Message */}
        {validationError && (
          <View
            style={[
              styles.errorBox,
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
                styles.errorText,
                {
                  color: isDark
                    ? Colors.urgency.critical.darkText
                    : Colors.urgency.critical.lightText,
                },
              ]}
            >
              {validationError}
            </ThemedText>
          </View>
        )}

        {/* Type Badge Card */}
        <View
          style={[
            styles.typeCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.typeRow}>
            <View
              style={[
                styles.typePill,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              <SymbolView
                name={icon as any}
                size={14}
                tintColor={badge.color}
              />
              <ThemedText style={[styles.typePillText, { color: badge.color }]}>
                {badge.label.toUpperCase()}
              </ThemedText>
            </View>

            {action.confidence && (
              <View
                style={[
                  styles.confidencePill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <ThemedText style={[styles.confidenceText, { color: colors.textSecondary }]}>
                  {action.confidence} confidence
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Title *
          </ThemedText>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Pay electricity bill or doctor follow-up"
            autoCapitalize="sentences"
          />
        </View>

        {/* Due Date & Time */}
        <View style={styles.formGroup}>
          <DatePickerField
            label="Date (Optional)"
            placeholder="Select date"
            value={dueDate}
            onChange={(val) => {
              setDueDate(val);
              if (validationError) setValidationError(null);
            }}
            allowClear
          />
        </View>

        <View style={styles.formGroup}>
          <TimePickerField
            label="Time (Optional)"
            placeholder="Select time"
            value={dueTime}
            onChange={(val) => {
              setDueTime(val);
              if (validationError) setValidationError(null);
            }}
            allowClear
          />
        </View>

        {/* Amount for Bills */}
        {(action.type === 'bill' || action.amount != null) && (
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
              Amount ({currencyInfo.symbol} {currencyInfo.code})
            </ThemedText>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 1500"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Priority Selector */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Priority
          </ThemedText>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPriority(p.key)}
                  hitSlop={4}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.priorityChipText,
                      {
                        color: isSelected
                          ? getButtonForegroundColor('primary', colors, isDark)
                          : colors.text,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansBold
                          : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {p.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Category
          </ThemedText>
          <Input
            value={category}
            onChangeText={setCategory}
            placeholder="Personal, Work, Health, Finance, Home"
          />
        </View>

        {/* Notes / Description */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Notes / Details
          </ThemedText>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Additional context or AI extraction snippet"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </View>

        {/* Actions */}
        <View style={styles.buttonRow}>
          <Button
            variant="outline"
            onPress={onClose}
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onPress={handleConfirm}
            disabled={isSubmitting || !title.trim()}
            style={{ flex: 1.6 }}
          >
            {isSubmitting ? 'Creating...' : `Confirm & Create ${badge.label}`}
          </Button>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  safetyBannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
  },
  errorBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  typeCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
  },
  confidencePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    textTransform: 'capitalize',
  },
  formGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: Spacing.one,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priorityChip: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityChipText: {
    fontSize: Typography.fontSize.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});

