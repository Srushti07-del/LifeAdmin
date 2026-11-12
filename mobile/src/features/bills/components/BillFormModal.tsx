/**
 * Bill Create & Edit Modal Sheet
 * Native bottom-sheet form for creating and updating bills.
 * Supports all backend bill metadata:
 * - Name, provider, amount, currency
 * - Due date, category, recurrence
 * - Notes and description
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
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Input, Button, DatePickerField, getButtonForegroundColor } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  CURRENCIES,
  CurrencyCode,
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
} from '@/utils/currency';
import {
  toLocalISODate,
  isValidLocalISODate,
  toUtcMidnightIsoFromLocalDate,
} from '@/utils/dateTimeValidation';
import { Bill, BillFormData } from '../types';

export interface BillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Bill>) => Promise<void>;
  bill?: Bill | null;
  defaultCurrency?: CurrencyCode;
}

const CATEGORIES = ['Finance', 'Home', 'Personal', 'Work', 'Health', 'Education'];
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function BillFormModal({
  isOpen,
  onClose,
  onSubmit,
  bill,
  defaultCurrency = DEFAULT_CURRENCY,
}: BillFormModalProps) {
  const { colors, isDark } = useAppTheme();
  const { showSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<BillFormData>({
    name: '',
    description: '',
    provider: '',
    amount: '',
    currency: normalizeCurrencyCode(defaultCurrency),
    dueDate: toLocalISODate(new Date()),
    category: 'Finance',
    recurrenceType: 'none',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      setFormData({
        name: bill.name || bill.title || '',
        description: bill.description || '',
        provider: bill.provider || '',
        amount: bill.amount ? String(bill.amount) : '',
        currency: normalizeCurrencyCode(bill.currency || defaultCurrency),
        dueDate: bill.dueDate ? bill.dueDate.split('T')[0] : toLocalISODate(new Date()),
        category: bill.category || 'Finance',
        recurrenceType: bill.recurrence?.type || 'none',
        notes: bill.notes || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        provider: '',
        amount: '',
        currency: normalizeCurrencyCode(defaultCurrency),
        dueDate: toLocalISODate(new Date()),
        category: 'Finance',
        recurrenceType: 'none',
        notes: '',
      });
    }
    setErrors({});
  }, [bill, defaultCurrency, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = 'Bill name is required';
    }

    const amt = parseFloat(formData.amount);
    if (!formData.amount.trim() || isNaN(amt) || amt <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }

    if (!formData.dueDate.trim()) {
      errs.dueDate = 'Due date is required';
    } else if (!isValidLocalISODate(formData.dueDate)) {
      errs.dueDate = 'Please select a valid date (YYYY-MM-DD)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: Partial<Bill> = {
        name: formData.name.trim(),
        title: formData.name.trim(),
        provider: formData.provider.trim() || undefined,
        description: formData.description.trim() || undefined,
        amount: parseFloat(formData.amount),
        currency: normalizeCurrencyCode(formData.currency || defaultCurrency),
        dueDate: toUtcMidnightIsoFromLocalDate(formData.dueDate.trim()) ?? undefined,
        category: formData.category,
        recurrence: { type: formData.recurrenceType as any },
        notes: formData.notes.trim() || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Save Failed',
        message: err?.message || 'Failed to save bill.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setDateOffset = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setFormData((prev) => ({ ...prev, dueDate: toLocalISODate(target) }));
    setErrors((prev) => {
      if (!prev.dueDate) return prev;
      const { dueDate: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={bill ? 'Edit Bill' : 'New Bill'}
      description={bill ? 'Update bill details and recurrence rules' : 'Track an upcoming bill, fee, or subscription'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContainer}
      >
        {/* Bill Name */}
        <Input
          label="Bill Name *"
          placeholder="e.g. Electricity, Rent, Spotify"
          value={formData.name}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, name: val }))}
          error={errors.name}
        />

        {/* Provider */}
        <Input
          label="Provider / Company"
          placeholder="e.g. Tata Power, Airtel, Landlord"
          value={formData.provider}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, provider: val }))}
        />

        {/* Amount & Currency Row */}
        <View style={styles.row}>
          <View style={styles.amountInputWrap}>
            <Input
              label="Amount *"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={formData.amount}
              onChangeText={(val) => setFormData((prev) => ({ ...prev, amount: val }))}
              error={errors.amount}
            />
          </View>

          <View style={styles.currencySelectWrap}>
            <ThemedText style={[styles.label, { color: colors.text }]}>Currency</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.currencyChips}
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((cCode) => {
                const isSelected = formData.currency === cCode;
                return (
                  <Pressable
                    key={cCode}
                    onPress={() => setFormData((prev) => ({ ...prev, currency: cCode }))}
                    style={[
                      styles.currencyChip,
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
                        styles.currencyChipText,
                        {
                          color: isSelected
                            ? getButtonForegroundColor('primary', colors, isDark)
                            : colors.text,
                        },
                      ]}
                    >
                      {CURRENCIES[cCode].symbol} {cCode}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Due Date & Quick Presets */}
        <View style={styles.section}>
          <DatePickerField
            label="Due Date *"
            value={formData.dueDate}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, dueDate: val }));
              if (errors.dueDate) {
                setErrors((prev) => {
                  const { dueDate: _, ...rest } = prev;
                  return rest;
                });
              }
            }}
            error={errors.dueDate}
          />

          <View style={styles.quickDateRow}>
            <Pressable
              onPress={() => setDateOffset(0)}
              style={[
                styles.quickDateBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.textSecondary }]}>
                Today
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setDateOffset(7)}
              style={[
                styles.quickDateBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.textSecondary }]}>
                +7 Days
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setDateOffset(30)}
              style={[
                styles.quickDateBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.quickDateText, { color: colors.textSecondary }]}>
                +30 Days
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Category Picker */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.text }]}>Category</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = formData.category.toLowerCase() === cat.toLowerCase();
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: isSelected
                          ? getButtonForegroundColor('primary', colors, isDark)
                          : colors.text,
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Recurrence Option */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.text }]}>Recurrence</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {RECURRENCE_OPTIONS.map((rec) => {
              const isSelected = formData.recurrenceType === rec.value;
              return (
                <Pressable
                  key={rec.value}
                  onPress={() => setFormData((prev) => ({ ...prev, recurrenceType: rec.value }))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: isSelected
                          ? getButtonForegroundColor('primary', colors, isDark)
                          : colors.text,
                      },
                    ]}
                  >
                    {rec.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Notes */}
        <Input
          label="Notes / Description"
          placeholder="Account number, payment link, or notes"
          multiline
          numberOfLines={3}
          value={formData.notes}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Button
            variant="outline"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            loading={submitting}
            style={styles.submitBtn}
          >
            {bill ? 'Update Bill' : 'Save Bill'}
          </Button>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
  },
  row: {
    gap: Spacing.three,
  },
  amountInputWrap: {
    flex: 1,
  },
  currencySelectWrap: {
    marginTop: Spacing.one,
  },
  label: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.two,
  },
  currencyChips: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  currencyChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  currencyChipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  section: {
    gap: Spacing.two,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  quickDateBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  quickDateText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  categoryChips: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
