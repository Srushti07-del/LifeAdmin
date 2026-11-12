import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark } from '@/hooks/use-theme';

export type UrgencyType =
  | 'overdue'
  | 'critical'
  | 'urgent'
  | 'soon'
  | 'dueSoon'
  | 'upcoming'
  | 'completed';

export interface UrgencyTagProps extends ViewProps {
  urgency: UrgencyType;
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

interface TierConfig {
  lightBg: string;
  lightText: string;
  lightDot: string;
  lightBorder: string;
  darkBg: string;
  darkText: string;
  darkDot: string;
  darkBorder: string;
  defaultLabel: string;
}

const config: Record<string, TierConfig> = {
  overdue: {
    lightBg: '#FEE2E2',
    lightText: '#B91C1C',
    lightDot: '#EF4444',
    lightBorder: '#FECACA',
    darkBg: 'rgba(239, 68, 68, 0.2)',
    darkText: '#FFD2D2',
    darkDot: '#F87171',
    darkBorder: 'rgba(239, 68, 68, 0.4)',
    defaultLabel: 'Overdue',
  },
  critical: {
    lightBg: '#FEE2E2',
    lightText: '#B91C1C',
    lightDot: '#EF4444',
    lightBorder: '#FECACA',
    darkBg: 'rgba(239, 68, 68, 0.2)',
    darkText: '#FFD2D2',
    darkDot: '#F87171',
    darkBorder: 'rgba(239, 68, 68, 0.4)',
    defaultLabel: 'Overdue',
  },
  urgent: {
    lightBg: '#FFEDD5',
    lightText: '#C2410C',
    lightDot: '#F97316',
    lightBorder: '#FED7AA',
    darkBg: 'rgba(249, 115, 22, 0.2)',
    darkText: '#FFDEC7',
    darkDot: '#FB923C',
    darkBorder: 'rgba(249, 115, 22, 0.4)',
    defaultLabel: 'Urgent',
  },
  soon: {
    lightBg: '#FEF3C7',
    lightText: '#B45309',
    lightDot: '#F59E0B',
    lightBorder: '#FDE68A',
    darkBg: 'rgba(245, 158, 11, 0.2)',
    darkText: '#FFE8AD',
    darkDot: '#FBBF24',
    darkBorder: 'rgba(245, 158, 11, 0.4)',
    defaultLabel: 'Due Soon',
  },
  dueSoon: {
    lightBg: '#FEF3C7',
    lightText: '#B45309',
    lightDot: '#F59E0B',
    lightBorder: '#FDE68A',
    darkBg: 'rgba(245, 158, 11, 0.2)',
    darkText: '#FFE8AD',
    darkDot: '#FBBF24',
    darkBorder: 'rgba(245, 158, 11, 0.4)',
    defaultLabel: 'Due Soon',
  },
  upcoming: {
    lightBg: '#D3EAE7',
    lightText: '#0E6567',
    lightDot: '#168F91',
    lightBorder: '#B4DDD8',
    darkBg: 'rgba(85, 189, 181, 0.16)',
    darkText: '#8EE0D9',
    darkDot: '#55BDB5',
    darkBorder: 'rgba(85, 189, 181, 0.35)',
    defaultLabel: 'Upcoming',
  },
  completed: {
    lightBg: '#DCFCE7',
    lightText: '#15803D',
    lightDot: '#10B981',
    lightBorder: '#BBF7D0',
    darkBg: 'rgba(16, 185, 129, 0.2)',
    darkText: '#A7F3D0',
    darkDot: '#34D399',
    darkBorder: 'rgba(16, 185, 129, 0.4)',
    defaultLabel: 'Completed',
  },
};

export function UrgencyTag({
  urgency,
  label,
  style,
  textStyle,
  ...props
}: UrgencyTagProps) {
  const isDark = useIsDark();
  const current = config[urgency] || config.upcoming;

  const bg = isDark ? current.darkBg : current.lightBg;
  const textColor = isDark ? current.darkText : current.lightText;
  const dotColor = isDark ? current.darkDot : current.lightDot;
  const borderColor = isDark ? current.darkBorder : current.lightBorder;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor,
        },
        style,
      ]}
      {...props}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text
        style={[
          styles.text,
          { color: textColor },
          textStyle,
        ]}
      >
        {label || current.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
});

export default UrgencyTag;

