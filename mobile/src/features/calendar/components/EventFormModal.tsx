/**
 * Event Create & Edit Modal Sheet
 * Native bottom-sheet form for scheduling and modifying manual calendar events.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Input, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarEventItem, EventFormData } from '../types';
import { toLocalISODate } from '../services/calendarCalculations';

const CATEGORIES = ['Personal', 'Work/Study', 'Health', 'Household', 'Finance'];

const COLOR_SWATCHES = [
  '#168F91', // Ocean Teal primary
  '#087E83', // Deep Teal
  '#0284C7', // Sky Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose
];

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<EventFormData>) => Promise<void>;
  event?: CalendarEventItem | null;
  defaultDate?: Date;
}

export function EventFormModal({
  isOpen,
  onClose,
  onSubmit,
  event,
  defaultDate,
}: EventFormModalProps) {
  const { colors, isDark } = useAppTheme();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    startDate: toLocalISODate(defaultDate || new Date()),
    endDate: '',
    startTime: '10:00',
    endTime: '11:00',
    allDay: false,
    location: '',
    category: 'Personal',
    description: '',
    color: '#168F91',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; startDate?: string }>({});

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        startDate: event.date ? event.date.slice(0, 10) : toLocalISODate(new Date()),
        endDate: '',
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '11:00',
        allDay: Boolean(event.allDay),
        location: event.location || '',
        category: event.category || 'Personal',
        description: event.details || '',
        color: event.color || '#168F91',
      });
    } else {
      setFormData({
        title: '',
        startDate: toLocalISODate(defaultDate || new Date()),
        endDate: '',
        startTime: '10:00',
        endTime: '11:00',
        allDay: false,
        location: '',
        category: 'Personal',
        description: '',
        color: '#168F91',
      });
    }
    setErrors({});
  }, [event, defaultDate, isOpen]);

  const validate = (): boolean => {
    const errs: { title?: string; startDate?: string } = {};
    if (!formData.title.trim()) {
      errs.title = 'Title is required';
    }
    if (!formData.startDate) {
      errs.startDate = 'Start date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        title: formData.title.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        startTime: formData.allDay ? undefined : formData.startTime || undefined,
        endTime: formData.allDay ? undefined : formData.endTime || undefined,
        allDay: formData.allDay,
        location: formData.location.trim() || undefined,
        category: formData.category,
        description: formData.description.trim() || undefined,
        color: formData.color,
      });
      onClose();
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.message || 'Could not save calendar event. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDatePreset = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setFormData((prev) => ({ ...prev, startDate: toLocalISODate(d) }));
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Edit Calendar Event' : 'Schedule New Event'}
      description="Personal events integrate seamlessly with your unified schedule"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <Input
          label="Event Title"
          placeholder="e.g., Team Sync, Doctor Visit, Exam"
          value={formData.title}
          onChangeText={(val) => {
            setFormData((prev) => ({ ...prev, title: val }));
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
        />

        {/* Date Input with Quick Presets */}
        <View style={styles.fieldWrapper}>
          <Input
            label="Start Date (YYYY-MM-DD)"
            placeholder="YYYY-MM-DD"
            value={formData.startDate}
            onChangeText={(val) => {
              setFormData((prev) => ({ ...prev, startDate: val }));
              if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: undefined }));
            }}
            error={errors.startDate}
          />
          <View style={styles.presetsRow}>
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: '+7 Days', days: 7 },
            ].map((p) => (
              <Pressable
                key={p.label}
                onPress={() => handleQuickDatePreset(p.days)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <ThemedText style={[styles.presetText, { color: colors.primary }]}>
                  {p.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* All-Day Switch */}
        <View
          style={[
            styles.switchRow,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.switchInfoCol}>
            <ThemedText style={[styles.switchLabel, { color: colors.text }]}>
              All-Day Event
            </ThemedText>
            <ThemedText style={[styles.switchSub, { color: colors.textSecondary }]}>
              Does not require specific start and end times
            </ThemedText>
          </View>
          <Switch
            value={formData.allDay}
            onValueChange={(val) => setFormData((prev) => ({ ...prev, allDay: val }))}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Time Inputs (when not all day) */}
        {!formData.allDay && (
          <View style={styles.timesRow}>
            <View style={styles.flexOne}>
              <Input
                label="Start Time (HH:mm)"
                placeholder="10:00"
                value={formData.startTime}
                onChangeText={(val) => setFormData((prev) => ({ ...prev, startTime: val }))}
              />
            </View>
            <View style={styles.flexOne}>
              <Input
                label="End Time (HH:mm)"
                placeholder="11:00"
                value={formData.endTime}
                onChangeText={(val) => setFormData((prev) => ({ ...prev, endTime: val }))}
              />
            </View>
          </View>
        )}

        {/* Location Input */}
        <Input
          label="Location (Optional)"
          placeholder="e.g. Conference Room B, Zoom, 123 Main St"
          value={formData.location}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, location: val }))}
        />

        {/* Category Selector */}
        <View style={styles.fieldWrapper}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            Category
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(22, 143, 145, 0.25)'
                          : '#D3EAE7'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#F1F5F9',
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected
                          ? Typography.fontWeight.semibold
                          : Typography.fontWeight.normal,
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

        {/* Color Palette Selector */}
        <View style={styles.fieldWrapper}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            Color Theme
          </ThemedText>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map((color) => {
              const isSelected = formData.color.toLowerCase() === color.toLowerCase();
              return (
                <Pressable
                  key={color}
                  onPress={() => setFormData((prev) => ({ ...prev, color }))}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    isSelected && styles.swatchSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${color}`}
                >
                  {isSelected && (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={14}
                      tintColor="#FFFFFF"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description / Notes */}
        <Input
          label="Description / Notes"
          placeholder="Add agenda, preparation notes, or links..."
          value={formData.description}
          multiline
          numberOfLines={3}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, description: val }))}
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <Button
            variant="outline"
            onPress={onClose}
            style={styles.flexOne}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            loading={submitting}
            style={styles.flexOne}
          >
            {event ? 'Update Event' : 'Save Event'}
          </Button>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
  },
  fieldWrapper: {
    gap: Spacing.one,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  presetChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  presetText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  switchInfoCol: {
    flex: 1,
    marginRight: Spacing.two,
  },
  switchLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  switchSub: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  timesRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flexOne: {
    flex: 1,
  },
  categoryScroll: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 4,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});

