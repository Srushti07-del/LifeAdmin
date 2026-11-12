/**
 * Task Create & Edit Bottom Sheet Modal
 * Native bottom-sheet form with quick date presets, priority pills, and validation.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { Button, DatePickerField, Input, ModalSheet, TimePickerField } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { isValidHHMMTime, isValidLocalISODate, toLocalISODate } from '@/utils/dateTimeValidation';
import { Priority, Task, TaskFormData, TaskStatus } from '../types';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  task?: Task | null;
}

const CATEGORIES = ['Personal', 'Work', 'Finance', 'Home', 'Health', 'General'];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function formatYMD(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return toLocalISODate(d);
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  task,
}: TaskFormModalProps) {
  const { colors, isDark } = useAppTheme();
  const { showSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: formatYMD(0),
    dueTime: '',
    priority: 'medium',
    status: 'todo',
    category: 'Personal',
  });
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitleError('');
    setDateError('');
    setTimeError('');
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        dueTime: task.dueTime || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        category: task.category || 'Personal',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        dueDate: formatYMD(0),
        dueTime: '',
        priority: 'medium',
        status: 'todo',
        category: 'Personal',
      });
    }
  }, [isOpen, task]);

  const validateAndSave = async () => {
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      setTitleError('Task title is required');
      return;
    }

    const trimmedDate = formData.dueDate.trim();
    if (trimmedDate && !isValidLocalISODate(trimmedDate)) {
      setDateError('Please select a valid calendar date');
      return;
    }

    const trimmedTime = formData.dueTime.trim();
    if (trimmedTime && !isValidHHMMTime(trimmedTime)) {
      setTimeError('Please select a valid time');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Task> = {
        title: trimmedTitle,
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        status: formData.status,
        category: formData.category.trim() || 'Personal',
        dueDate: trimmedDate || undefined,
        dueTime: trimmedTime || undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Could not save task',
        message: err?.message || 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = formatYMD(0);
  const tomorrowStr = formatYMD(1);
  const nextWeekStr = formatYMD(7);

  const datePresets = [
    { label: 'Today', value: todayStr },
    { label: 'Tomorrow', value: tomorrowStr },
    { label: 'Next week', value: nextWeekStr },
    { label: 'No date', value: '' },
  ];

  const getPriorityChipStyle = (p: Priority, selected: boolean) => {
    if (!selected) {
      return {
        bg: colors.surfaceSecondary,
        border: colors.border,
        text: colors.textSecondary,
      };
    }
    if (p === 'urgent') {
      return {
        bg: isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg,
        border: Colors.urgency.critical.accent,
        text: isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText,
      };
    }
    if (p === 'high') {
      return {
        bg: isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg,
        border: Colors.urgency.dueSoon.accent,
        text: isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText,
      };
    }
    return {
      bg: colors.primary,
      border: colors.primary,
      text: isDark ? colors.surfaceSecondary : '#FFFFFF',
    };
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      description={
        task
          ? 'Update details, due date, or workflow stage.'
          : 'Capture a responsibility with clear priority and timing.'
      }
      footer={
        <View style={styles.footerRow}>
          <Button
            variant="outline"
            onPress={onClose}
            disabled={submitting}
            style={styles.footerBtn}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={validateAndSave}
            loading={submitting}
            style={styles.footerBtn}
          >
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </View>
      }
    >
      <View style={styles.formStack}>
        <Input
          label="Title"
          placeholder="e.g., Renew vehicle insurance policy"
          value={formData.title}
          onChangeText={(text) => {
            setFormData((prev) => ({ ...prev, title: text }));
            if (titleError) setTitleError('');
          }}
          error={titleError}
          autoFocus={!task}
        />

        <Input
          label="Notes (optional)"
          placeholder="Checklist steps, account reference, or context..."
          value={formData.description}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          inputStyle={styles.multilineInput}
        />

        {/* Priority Selector */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
            Priority
          </ThemedText>
          <View style={styles.chipsRow}>
            {PRIORITIES.map((p) => {
              const selected = formData.priority === p.value;
              const chipStyle = getPriorityChipStyle(p.value, selected);
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setFormData((prev) => ({ ...prev, priority: p.value }))}
                  style={[
                    styles.choiceChip,
                    {
                      backgroundColor: chipStyle.bg,
                      borderColor: chipStyle.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText style={[styles.choiceText, { color: chipStyle.text }]}>
                    {p.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Workflow Stage (shown on edit) */}
        {task ? (
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
              Status
            </ThemedText>
            <View style={styles.chipsRow}>
              {STATUSES.map((s) => {
                const selected = formData.status === s.value;
                return (
                  <Pressable
                    key={s.value}
                    onPress={() => setFormData((prev) => ({ ...prev, status: s.value }))}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      style={[
                        styles.choiceText,
                        {
                          color: selected
                            ? isDark
                              ? colors.surfaceSecondary
                              : '#FFFFFF'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {s.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Due Date Presets + Input */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
            Due Date
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChips}
          >
            {datePresets.map((preset) => {
              const selected = formData.dueDate === preset.value;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, dueDate: preset.value }));
                    if (dateError) setDateError('');
                  }}
                  style={[
                    styles.choiceChip,
                    {
                      backgroundColor: selected ? colors.primarySoft : colors.surfaceSecondary,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.choiceText,
                      { color: selected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <DatePickerField
            value={formData.dueDate}
            onChange={(nextIso) => {
              setFormData((prev) => ({ ...prev, dueDate: nextIso }));
              if (dateError) setDateError('');
            }}
            placeholder="Optional due date"
            allowClear
            error={dateError}
            accessibilityLabelPrefix="Due date"
          />

          <TimePickerField
            label="Due Time (Optional)"
            value={formData.dueTime}
            onChange={(nextTime) => {
              setFormData((prev) => ({ ...prev, dueTime: nextTime }));
              if (timeError) setTimeError('');
            }}
            placeholder="Optional time"
            allowClear
            error={timeError}
            accessibilityLabelPrefix="Due time"
          />
        </View>

        {/* Category Presets */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
            Category
          </ThemedText>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => {
              const selected = formData.category.toLowerCase() === cat.toLowerCase();
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  style={[
                    styles.choiceChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText
                    style={[
                      styles.choiceText,
                      {
                        color: selected
                          ? isDark
                            ? colors.surfaceSecondary
                            : '#FFFFFF'
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: Spacing.four,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs + 1,
    marginLeft: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  horizontalChips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  choiceChip: {
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  choiceText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  footerBtn: {
    flex: 1,
  },
});

export default TaskFormModal;

