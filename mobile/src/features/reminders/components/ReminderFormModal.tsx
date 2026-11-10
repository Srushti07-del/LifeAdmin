/**
 * LifeAdmin Mobile — Reminder Create & Edit Modal Sheet
 * Native bottom-sheet supporting title, description, date/time pickers,
 * notification timing offsets, recurrence options, priority, and category.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, Input } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  Reminder,
  ReminderFormData,
  ReminderPriority,
  ReminderRecurrenceType,
} from '../types';
import {
  ALLOWED_OFFSETS,
  OFFSET_LABELS,
  formatOffset,
} from '../services/reminderCalculations';

export interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ReminderFormData>) => Promise<void>;
  reminder?: Reminder | null;
  defaultDate?: string;
}

const CATEGORIES = [
  'Personal',
  'Work',
  'Health',
  'Finance',
  'Education',
  'Housing',
  'General',
];

const RECURRENCE_OPTIONS: Array<{ key: ReminderRecurrenceType; label: string }> = [
  { key: 'none', label: 'None' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const TIME_PRESETS = [
  { label: '9:00 AM', value: '09:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '7:00 PM', value: '19:00' },
];

export function ReminderFormModal({
  isOpen,
  onClose,
  onSubmit,
  reminder,
  defaultDate,
}: ReminderFormModalProps) {
  const { colors, isDark } = useAppTheme();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('09:00');
  const [category, setCategory] = useState<string>('Personal');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([0]);
  const [recurrenceType, setRecurrenceType] = useState<ReminderRecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title || '');
      setDescription(reminder.description || '');
      setDueDate(reminder.dueDate ? reminder.dueDate.slice(0, 10) : '');
      setDueTime(reminder.dueTime || '09:00');
      setCategory(reminder.category || 'Personal');
      setPriority(reminder.priority || 'medium');
      setSelectedOffsets(
        reminder.reminderOffsetMinutes?.length
          ? reminder.reminderOffsetMinutes
          : [0]
      );
      setRecurrenceType(reminder.recurrence?.type || 'none');
      setRecurrenceInterval(reminder.recurrence?.interval || 1);
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayIso = `${y}-${m}-${d}`;

      setTitle('');
      setDescription('');
      setDueDate(defaultDate || todayIso);
      setDueTime('09:00');
      setCategory('Personal');
      setPriority('medium');
      setSelectedOffsets([0]);
      setRecurrenceType('none');
      setRecurrenceInterval(1);
    }
    setError(null);
  }, [reminder, defaultDate, isOpen]);

  const setDatePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    setDueDate(`${y}-${m}-${d}`);
  };

  const toggleOffset = (offset: number) => {
    setSelectedOffsets((prev) => {
      const has = prev.includes(offset);
      const next = has ? prev.filter((o) => o !== offset) : [...prev, offset];
      return next.length > 0 ? next.sort((a, b) => a - b) : [0];
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please provide a title for the reminder.');
      return;
    }
    if (!dueDate.trim()) {
      setError('Please provide a valid due date (YYYY-MM-DD).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate.trim(),
        dueTime: dueTime.trim() || undefined,
        category,
        priority,
        reminderOffsetMinutes: selectedOffsets,
        recurrenceType,
        recurrenceInterval,
      });

      onClose();
    } catch (err: any) {
      console.warn('Save reminder error:', err);
      setError(err?.message || 'Failed to save reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={reminder ? 'Edit Reminder' : 'New Smart Reminder'}
      description="Time-sensitive notification & actionable scheduled cue"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Error Box */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {/* Title */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Reminder Title *
          </ThemedText>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Call dentist, Pay electric bill, Take vitamin"
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Notes & Details (Optional)
          </ThemedText>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Extra details, links, or instructions..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Due Date & Quick Presets */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Due Date * (YYYY-MM-DD)
          </ThemedText>
          <Input
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
          />
          <View style={styles.presetsRow}>
            <Pressable
              onPress={() => setDatePreset(0)}
              style={[
                styles.presetBtn,
                { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
              ]}
            >
              <ThemedText style={[styles.presetBtnText, { color: colors.primary }]}>
                Today
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setDatePreset(1)}
              style={[
                styles.presetBtn,
                { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
              ]}
            >
              <ThemedText style={[styles.presetBtnText, { color: colors.primary }]}>
                Tomorrow
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setDatePreset(7)}
              style={[
                styles.presetBtn,
                { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
              ]}
            >
              <ThemedText style={[styles.presetBtnText, { color: colors.primary }]}>
                +7 Days
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Due Time & Time Presets */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Due Time (HH:mm 24-hour)
          </ThemedText>
          <Input
            value={dueTime}
            onChangeText={setDueTime}
            placeholder="09:00"
          />
          <View style={styles.presetsRow}>
            {TIME_PRESETS.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => setDueTime(t.value)}
                style={[
                  styles.presetBtn,
                  dueTime === t.value && {
                    backgroundColor: colors.primary,
                  },
                  dueTime !== t.value && {
                    backgroundColor: isDark ? '#26383E' : colors.backgroundElement,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.presetBtnText,
                    { color: dueTime === t.value ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notification Timing / Offsets */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Native Device Alerts (Select all that apply)
          </ThemedText>
          <View style={styles.offsetGrid}>
            {ALLOWED_OFFSETS.map((offset) => {
              const isSelected = selectedOffsets.includes(offset);
              return (
                <Pressable
                  key={offset}
                  onPress={() => toggleOffset(offset)}
                  style={[
                    styles.offsetChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#26383E'
                        : colors.backgroundElement,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#354E57'
                        : colors.border,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'bell.fill', android: 'notifications' }}
                    size={12}
                    tintColor={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.offsetChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {OFFSET_LABELS[offset]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Recurrence
          </ThemedText>
          <View style={styles.recurrenceRow}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const isSelected = recurrenceType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setRecurrenceType(opt.key)}
                  style={[
                    styles.recurrencePill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#26383E'
                        : colors.backgroundElement,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#354E57'
                        : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.recurrencePillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Priority Level
          </ThemedText>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
              const isSelected = priority === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#26383E'
                        : colors.backgroundElement,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#354E57'
                        : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.priorityPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {p.toUpperCase()}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPills}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#26383E'
                        : colors.backgroundElement,
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#354E57'
                        : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Buttons */}
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
            style={styles.submitBtn}
          >
            {reminder ? 'Update Reminder' : 'Set Reminder'}
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
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  presetBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  presetBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  offsetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  offsetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  offsetChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  recurrenceRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  recurrencePill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  recurrencePillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
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
  categoryPills: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
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
  submitBtn: {
    flex: 2,
  },
});

