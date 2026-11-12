/**
 * Quick Action Modal Bottom Sheet
 * Allows instant creation of Tasks, Bills, Reminders, and Appointments.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import {
  ModalSheet,
  Input,
  Button,
  getButtonForegroundColor,
} from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { getCurrencyInfo, normalizeCurrencyCode } from '@/utils/currency';
import { toLocalISODate, toUtcMidnightIsoFromLocalDate } from '@/utils/dateTimeValidation';
import { QuickActionType } from '../types';
import {
  quickCreateTask,
  quickCreateBill,
  quickCreateReminder,
  quickCreateAppointment,
} from '../api';

interface QuickActionModalProps {
  visible: boolean;
  type: QuickActionType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickActionModal({
  visible,
  type,
  onClose,
  onSuccess,
}: QuickActionModalProps) {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const preferredCurrency = normalizeCurrencyCode(user?.preferredCurrency);
  const currencyInfo = getCurrencyInfo(preferredCurrency);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | '3days' | 'week'>('today');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!type) return null;

  const getTargetDate = () => {
    const d = new Date();
    if (datePreset === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (datePreset === '3days') d.setDate(d.getDate() + 3);
    else if (datePreset === 'week') d.setDate(d.getDate() + 7);
    return toUtcMidnightIsoFromLocalDate(toLocalISODate(d)) ?? d.toISOString();
  };

  const getMeta = () => {
    switch (type) {
      case 'bill':
        return {
          title: 'Add New Bill',
          placeholder: 'e.g. Electricity, WiFi, Rent',
          buttonLabel: 'Add Bill',
          accent: isDark ? '#34D399' : '#059669',
        };
      case 'appointment':
        return {
          title: 'Add Appointment',
          placeholder: 'e.g. Dr. Sharma Dental Checkup',
          buttonLabel: 'Schedule Appointment',
          accent: isDark ? '#38BDF8' : '#0284C7',
        };
      case 'reminder':
        return {
          title: 'Add Reminder',
          placeholder: 'e.g. Water plants, Buy groceries',
          buttonLabel: 'Set Reminder',
          accent: isDark ? '#FBBF24' : '#D97706',
        };
      case 'event':
        return {
          title: 'Add Calendar Event',
          placeholder: 'e.g. Team planning session',
          buttonLabel: 'Save Event',
          accent: isDark ? '#A78BFA' : '#7C3AED',
        };
      case 'document':
        return {
          title: 'Upload Document',
          placeholder: 'Document title',
          buttonLabel: 'Upload',
          accent: isDark ? '#2DD4BF' : '#0D9488',
        };
      case 'task':
      default:
        return {
          title: 'Add New Task',
          placeholder: 'e.g. Finish quarterly tax filing',
          buttonLabel: 'Create Task',
          accent: colors.primary,
        };
    }
  };

  const meta = getMeta();

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a title');
      return;
    }

    if (type === 'bill' && (!amount || isNaN(Number(amount)))) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const targetDate = getTargetDate();

      if (type === 'task') {
        await quickCreateTask({ title: title.trim(), dueDate: targetDate });
      } else if (type === 'bill') {
        await quickCreateBill({
          name: title.trim(),
          amount: parseFloat(amount),
          dueDate: targetDate,
          currency: preferredCurrency,
        });
      } else if (type === 'reminder') {
        await quickCreateReminder({ title: title.trim(), dueDate: targetDate });
      } else if (type === 'appointment') {
        await quickCreateAppointment({ title: title.trim(), date: targetDate });
      }

      const createdTitle = title.trim();
      const typeLabel =
        type === 'bill'
          ? 'Bill'
          : type === 'reminder'
            ? 'Reminder'
            : type === 'appointment'
              ? 'Appointment'
              : 'Task';

      setTitle('');
      setAmount('');
      setDatePreset('today');
      onSuccess();
      onClose();
      showSnackbar({
        variant: 'success',
        title: `${typeLabel} Created`,
        message: `"${createdTitle}" added.`,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const selectedFg = getButtonForegroundColor('primary', colors, isDark);

  return (
    <ModalSheet isOpen={visible} onClose={onClose} title={meta.title}>
      <View style={styles.formBody}>
        {errorMsg ? (
          <View
            style={[
              styles.errorContainer,
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
              {errorMsg}
            </ThemedText>
          </View>
        ) : null}

        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder={meta.placeholder}
          autoFocus
        />

        {type === 'bill' && (
          <Input
            label={`Amount (${currencyInfo.symbol} ${currencyInfo.code})`}
            value={amount}
            onChangeText={setAmount}
            placeholder="1450"
            keyboardType="numeric"
          />
        )}

        {/* Date Presets */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Due / Target Date
          </ThemedText>
          <View style={styles.presetRow}>
            {(['today', 'tomorrow', '3days', 'week'] as const).map((preset) => {
              const isSelected = datePreset === preset;
              const label =
                preset === 'today'
                  ? 'Today'
                  : preset === 'tomorrow'
                  ? 'Tomorrow'
                  : preset === '3days'
                  ? 'In 3 Days'
                  : 'Next Week';

              return (
                <Pressable
                  key={preset}
                  onPress={() => setDatePreset(preset)}
                  hitSlop={4}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.presetText,
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

        {/* Submit Button */}
        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={loading}
          disabled={loading}
          onPress={handleSubmit}
        >
          {meta.buttonLabel}
        </Button>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formBody: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  errorContainer: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  fieldGroup: {
    marginBottom: Spacing.one,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    marginBottom: Spacing.one + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  presetPill: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  presetText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
});

export default QuickActionModal;
