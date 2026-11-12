/**
 * Event Date Picker Field
 * Thin backwards-compatible wrapper around the shared Ocean Teal DatePickerField primitive.
 */

import React from 'react';
import { DatePickerField, DatePickerFieldProps } from '@/components/ui/DatePickerField';

export type EventDatePickerFieldProps = DatePickerFieldProps;

export function EventDatePickerField({
  label = 'Start Date *',
  placeholder = 'Choose date',
  accessibilityLabelPrefix = 'Start date',
  ...props
}: EventDatePickerFieldProps) {
  return (
    <DatePickerField
      label={label}
      placeholder={placeholder}
      accessibilityLabelPrefix={accessibilityLabelPrefix}
      {...props}
    />
  );
}
