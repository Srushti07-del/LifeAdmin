/**
 * LifeAdmin Mobile — Document Entity Conversion Modal
 * Allows user to review and convert extracted document data into
 * actionable Tasks, Bills, or Reminders with explicit confirmation.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, Input, DatePickerField, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  getCurrencyInfo,
  resolveTransactionCurrency,
} from '@/utils/currency';
import { isValidLocalISODate } from '@/utils/dateTimeValidation';
import { DocumentItem, CreateEntityFromDocParams } from '../types';
import { prepareEntityFromExtraction } from '../services/documentCalculations';

export interface DocumentEntityConversionModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  preferredCurrency?: CurrencyCode;
  initialType?: 'task' | 'bill' | 'reminder';
  initialAmount?: number;
  initialDate?: string;
  initialCurrency?: string;
  onClose: () => void;
  onConfirm: (docId: string, params: CreateEntityFromDocParams) => Promise<void>;
}

export function DocumentEntityConversionModal({
  isOpen,
  document,
  preferredCurrency = DEFAULT_CURRENCY,
  initialType = 'task',
  initialAmount,
  initialDate,
  initialCurrency,
  onClose,
  onConfirm,
}: DocumentEntityConversionModalProps) {
  const { colors, isDark } = useAppTheme();

  const [entityType, setEntityType] = useState<'task' | 'bill' | 'reminder'>(initialType);
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when document or initial parameters change
  useEffect(() => {
    if (document) {
      const defaults = prepareEntityFromExtraction(document, initialType);
      const resolvedCurrency = resolveTransactionCurrency(
        initialCurrency || defaults.currency || document.aiExtracted?.amounts?.[0]?.currency,
        preferredCurrency
      );
      setEntityType(initialType);
      setTitle(defaults.title);
      setDueDate(initialDate || defaults.dueDate || '');
      setAmount(initialAmount ? String(initialAmount) : defaults.amount ? String(defaults.amount) : '');
      setCurrency(resolvedCurrency);
      setPriority(defaults.priority || 'medium');
      setDescription(defaults.description || '');
      setError(null);
    }
  }, [document, initialType, initialAmount, initialDate, initialCurrency, preferredCurrency]);

  // When user switches entity type tab, re-adjust default title
  const handleTypeChange = (newType: 'task' | 'bill' | 'reminder') => {
    setEntityType(newType);
    if (document) {
      const defaults = prepareEntityFromExtraction(document, newType);
      setTitle(defaults.title);
      if (newType === 'bill' && defaults.amount && !amount) {
        setAmount(String(defaults.amount));
      }
    }
  };

  if (!document) return null;

  const currencyInfo = getCurrencyInfo(currency);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required to create a record.');
      return;
    }

    const trimmedDueDate = dueDate.trim();
    if (trimmedDueDate && !isValidLocalISODate(trimmedDueDate)) {
      setError('Please select a valid due date (YYYY-MM-DD).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const params: CreateEntityFromDocParams = {
        type: entityType,
        title: title.trim(),
        dueDate: trimmedDueDate || undefined,
        amount: entityType === 'bill' && amount ? parseFloat(amount) : undefined,
        currency: entityType === 'bill' ? currency : undefined,
        priority: entityType === 'task' ? priority : undefined,
        description: description.trim() || undefined,
      };

      await onConfirm(document._id, params);
      onClose();
    } catch (err: any) {
      console.warn('Entity conversion error:', err);
      setError(err?.message || 'Failed to generate record from document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Convert to LifeAdmin Record"
      description={`Turn extracted data from ${document.originalName} into an active item`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Error Box */}
        {error && (
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
              {error}
            </ThemedText>
          </View>
        )}

        {/* Entity Type Selector */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
            TARGET RECORD TYPE
          </ThemedText>
          <View style={styles.typeSelectorRow}>
            {(['task', 'bill', 'reminder'] as const).map((type) => {
              const isSelected = entityType === type;
              const selectedFg = getButtonForegroundColor('primary', colors, isDark);
              const label = type === 'task' ? 'Task' : type === 'bill' ? 'Bill' : 'Reminder';
              const icon = type === 'task' ? 'checklist' : type === 'bill' ? 'payments' : 'notifications';

              return (
                <Pressable
                  key={type}
                  onPress={() => handleTypeChange(type)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: icon as any, android: icon as any }}
                    size={16}
                    tintColor={isSelected ? selectedFg : colors.text}
                  />
                  <ThemedText
                    style={[
                      styles.typeBtnText,
                      { color: isSelected ? selectedFg : colors.text },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
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
            placeholder="e.g. Pay Electricity Bill, Renew Lease"
          />
        </View>

        {/* Amount Input (only for Bill) */}
        {entityType === 'bill' && (
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
              Amount Due ({currencyInfo.symbol} {currencyInfo.code})
            </ThemedText>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 1500"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Due Date */}
        <View style={styles.formGroup}>
          <DatePickerField
            label="Due Date (Optional)"
            placeholder="Select due date"
            value={dueDate}
            onChange={(val) => {
              setDueDate(val);
              if (error) setError(null);
            }}
            allowClear
          />
        </View>

        {/* Priority (only for Task) */}
        {entityType === 'task' && (
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
              Priority
            </ThemedText>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                const isSelected = priority === p;
                const selectedFg = getButtonForegroundColor('primary', colors, isDark);
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    hitSlop={6}
                    style={[
                      styles.priorityPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.priorityPillText,
                        { color: isSelected ? selectedFg : colors.textSecondary },
                      ]}
                    >
                      {p.toUpperCase()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Description / Reference */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Notes / Description
          </ThemedText>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Additional notes or references from document..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Confirmation Buttons */}
        <View style={styles.buttonRow}>
          <Button
            variant="ghost"
            onPress={onClose}
            disabled={isSubmitting}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.confirmBtn}
          >
            {isSubmitting ? 'Creating...' : `Confirm & Create ${entityType.toUpperCase()}`}
          </Button>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.seven,
  },
  errorBox: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    color: '#B91C1C',
  },
  formGroup: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: Spacing.one,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityPillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 2,
  },
});
