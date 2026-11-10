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
  Alert,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Input, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

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
    const errs: { title?: string; date?: string } = {};
    if (!formData.title.trim()) {
      errs.title = 'Title is required';
    }
    if (!formData.date) {
      errs.date = 'Date is required';
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
      Alert.alert(
        'Save Failed',
        err?.message || 'Could not save appointment. Please try again.'
      );
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
          <Input
            label="Date * (YYYY-MM-DD)"
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChangeText={(val) => {
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

        {/* Time and End Time Inputs */}
        <View style={styles.timesRow}>
          <View style={styles.flexOne}>
            <Input
              label="Start Time (HH:mm)"
              placeholder="10:00"
              value={formData.time}
              onChangeText={(val) => setFormData((prev) => ({ ...prev, time: val }))}
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
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(139, 92, 246, 0.25)'
                          : 'rgba(139, 92, 246, 0.15)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#F1F5F9',
                      borderColor: isSelected ? '#8B5CF6' : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? '#8B5CF6' : colors.textSecondary,
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
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});

