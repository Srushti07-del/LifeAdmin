/**
 * Quick Action Modal Bottom Sheet
 * Allows instant creation of Tasks, Bills, Reminders, and Appointments.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
    return d.toISOString();
  };

  const getMeta = () => {
    switch (type) {
      case 'bill':
        return {
          title: 'Add New Bill',
          placeholder: 'e.g. Electricity, WiFi, Rent',
          buttonLabel: 'Add Bill',
          accent: '#059669',
        };
      case 'appointment':
        return {
          title: 'Add Appointment',
          placeholder: 'e.g. Dr. Sharma Dental Checkup',
          buttonLabel: 'Schedule Appointment',
          accent: '#0284C7',
        };
      case 'reminder':
        return {
          title: 'Add Reminder',
          placeholder: 'e.g. Water plants, Buy groceries',
          buttonLabel: 'Set Reminder',
          accent: '#D97706',
        };
      case 'event':
        return {
          title: 'Add Calendar Event',
          placeholder: 'e.g. Team planning session',
          buttonLabel: 'Save Event',
          accent: '#7C3AED',
        };
      case 'document':
        return {
          title: 'Upload Document',
          placeholder: 'Document title',
          buttonLabel: 'Upload',
          accent: '#0D9488',
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
          currency: '₹',
        });
      } else if (type === 'reminder') {
        await quickCreateReminder({ title: title.trim(), dueDate: targetDate });
      } else if (type === 'appointment') {
        await quickCreateAppointment({ title: title.trim(), date: targetDate });
      }

      setTitle('');
      setAmount('');
      setDatePreset('today');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>
              {meta.title}
            </ThemedText>
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={20}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </View>

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
            </View>
          ) : null}

          {/* Title Input */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Title
            </ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={meta.placeholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              autoFocus
            />
          </View>

          {/* Amount Input for Bills */}
          {type === 'bill' && (
            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Amount (₹ INR)
              </ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="1450"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>
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
                        { color: isSelected ? '#FFFFFF' : colors.text },
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
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            accessible
            accessibilityRole="button"
            accessibilityLabel={meta.buttonLabel}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: meta.accent },
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitText}>{meta.buttonLabel}</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing.six,
    paddingBottom: Spacing.eight,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  sheetTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  errorContainer: {
    padding: Spacing.two + 2,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#EF4444',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  fieldGroup: {
    marginBottom: Spacing.four,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: Typography.fontSize.base,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  presetPill: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
  },
  submitButton: {
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    minHeight: 48,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
});

export default QuickActionModal;
