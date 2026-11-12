/**
 * Appointment Create & Edit Modal Sheet
 * Native bottom-sheet form supporting all fields: title, date, time, location,
 * specialist/person, organization, category, and preparation notes.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Input, Button, DatePickerField, TimePickerField } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  isValidLocalISODate,
  isValidHHMMTime,
  validateTimeRangeOrder,
} from '@/utils/dateTimeValidation';
import { Appointment, AppointmentFormData } from '../types';
import { toLocalISODate } from '../services/appointmentCalculations';

const CATEGORIES = ['Health', 'Personal', 'Work', 'Education', 'Legal', 'Finance'];

export interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AppointmentFormData>) => Promise<void>;
  appointment?: Appointment | null;
  defaultDate?: Date;
}

export function AppointmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  defaultDate,
}: AppointmentFormModalProps) {
  const { colors, isDark } = useAppTheme();
  const { showSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<AppointmentFormData>({
    title: '',
    date: toLocalISODate(defaultDate || new Date()),
    time: '10:00',
    endTime: '',
    location: '',
    relatedPerson: '',
    relatedOrganization: '',
    category: 'Health',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    time?: string;
    endTime?: string;
  }>({});

  useEffect(() => {
    if (appointment) {
      setFormData({
        title: appointment.title || '',
        date: appointment.date ? appointment.date.slice(0, 10) : toLocalISODate(new Date()),
        time: appointment.time || '10:00',
        endTime: appointment.endTime || '',
        location: appointment.location || '',
        relatedPerson: appointment.relatedPerson || '',
        relatedOrganization: appointment.relatedOrganization || '',
        category: appointment.category || 'Health',
        notes: appointment.notes || '',
      });
    } else {
      setFormData({
        title: '',
        date: toLocalISODate(defaultDate || new Date()),
        time: '10:00',
        endTime: '',
        location: '',
        relatedPerson: '',
        relatedOrganization: '',
        category: 'Health',
        notes: '',
      });
    }
    setErrors({});
  }, [appointment, defaultDate, isOpen]);

  const validate = (): boolean => {
    const errs: {
      title?: string;
      date?: string;
      time?: string;
      endTime?: string;
    } = {};
    if (!formData.title.trim()) {
      errs.title = 'Title is required';
    }
    if (!formData.date) {
      errs.date = 'Date is required';
    } else if (!isValidLocalISODate(formData.date)) {
      errs.date = 'Please select a valid date';
    }
    if (formData.time && !isValidHHMMTime(formData.time)) {
      errs.time = 'Invalid start time';
    }
    if (formData.endTime && !isValidHHMMTime(formData.endTime)) {
      errs.endTime = 'Invalid end time';
    }
    if (!errs.time && !errs.endTime) {
      const range = validateTimeRangeOrder(formData.time, formData.endTime, {
        requireStartWhenEndSet: true,
      });
      if (!range.valid) {
        if (range.startError) errs.time = range.startError;
        if (range.endError) errs.endTime = range.endError;
      }
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
        date: formData.date,
        time: formData.time.trim() || undefined,
        endTime: formData.endTime.trim() || undefined,
        location: formData.location.trim() || undefined,
        relatedPerson: formData.relatedPerson.trim() || undefined,
        relatedOrganization: formData.relatedOrganization.trim() || undefined,
        category: formData.category,
        notes: formData.notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save appointment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDatePreset = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setFormData((prev) => ({ ...prev, date: toLocalISODate(d) }));
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={appointment ? 'Edit Appointment' : 'New Appointment'}
      description="Consultations, doctor visits, and official meetings"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <Input
          label="Appointment Title *"
          placeholder="e.g., Annual Health Checkup, Dentist Visit"
          value={formData.title}
          onChangeText={(val) => {
            setFormData((prev) => ({ ...prev, title: val }));
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
        />

        {/* Date Input with Quick Presets */}
        <View style={styles.fieldWrapper}>
          <DatePickerField
            label="Date *"
            value={formData.date}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, date: val }));
              if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
            }}
            error={errors.date}
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
                hitSlop={6}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: colors.surfaceSecondary,
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

        {/* Time and End Time Inputs */}
        <View style={styles.fieldWrapper}>
          <TimePickerField
            label="Start Time"
            placeholder="Select start time"
            value={formData.time}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, time: val }));
              if (errors.time || errors.endTime) {
                setErrors((prev) => ({ ...prev, time: undefined, endTime: undefined }));
              }
            }}
            allowClear
            error={errors.time}
          />
          <TimePickerField
            label="End Time (Optional)"
            placeholder="Select end time"
            value={formData.endTime}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, endTime: val }));
              if (errors.endTime) {
                setErrors((prev) => ({ ...prev, endTime: undefined }));
              }
            }}
            allowClear
            error={errors.endTime}
          />
        </View>

        {/* Specialist & Organization */}
        <View style={styles.timesRow}>
          <View style={styles.flexOne}>
            <Input
              label="With Person / Specialist"
              placeholder="Dr. Smith, Advisor Jones"
              value={formData.relatedPerson}
              onChangeText={(val) => setFormData((prev) => ({ ...prev, relatedPerson: val }))}
            />
          </View>
          <View style={styles.flexOne}>
            <Input
              label="Clinic / Organization"
              placeholder="Apollo Hospital, University"
              value={formData.relatedOrganization}
              onChangeText={(val) => setFormData((prev) => ({ ...prev, relatedOrganization: val }))}
            />
          </View>
        </View>

        {/* Location Input */}
        <Input
          label="Location or Meeting Link"
          placeholder="Clinic address, Room 302, or Zoom link"
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
                  hitSlop={6}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansSemiBold
                          : Typography.fontFamilies.sans,
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

        {/* Preparation Notes */}
        <Input
          label="Preparation Notes / Details"
          placeholder="Bring insurance card, previous reports, questions to ask..."
          value={formData.notes}
          multiline
          numberOfLines={3}
          onChangeText={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        {/* Action Buttons */}
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
            {appointment ? 'Update Appointment' : 'Save Appointment'}
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
    fontFamily: Typography.fontFamilies.sansMedium,
    marginBottom: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  presetChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  presetText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
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
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});

