/**
 * Calendar Item Details Inspection Modal Sheet
 * Displays full item information, date/time, location, notes, and source attribution.
 * Supports Edit/Delete for original manual events, and navigation for integrated module items.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CalendarEventItem } from '../types';
import { formatTimeRange } from '../services/calendarCalculations';
import { ENTITY_CONFIG } from './CalendarItemCard';

export interface CalendarItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalendarEventItem | null;
  onEdit: (item: CalendarEventItem) => void;
  onDelete: (item: CalendarEventItem) => Promise<void>;
}

export function CalendarItemDetailsModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
}: CalendarItemDetailsModalProps) {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const config = ENTITY_CONFIG[item.type] || ENTITY_CONFIG.event;
  const itemColor = item.color || config.color;

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await onDelete(item);
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    onClose();
    onEdit(item);
  };

  const handleNavigateToSource = () => {
    onClose();
    if (item.type === 'bill') {
      router.push('/bills');
    } else if (item.type === 'task') {
      router.push('/tasks');
    } else if (item.source === 'appointment') {
      router.push('/appointments' as any);
    } else {
      router.push('/more');
    }
  };

  const formattedDate = item.date
    ? new Date(item.date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Calendar Details"
      description={`${config.label} Schedule Record`}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
              borderColor: colors.border,
              borderLeftColor: itemColor,
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: `${itemColor}20` },
              ]}
            >
              <ThemedText style={[styles.typeText, { color: itemColor }]}>
                {config.label}
              </ThemedText>
            </View>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
              ]}
            >
              <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
                {item.category || 'General'}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.title, { color: colors.text }]}>
            {item.title}
          </ThemedText>
        </View>

        {/* Detailed Attributes */}
        <View style={[styles.detailsSection, { borderColor: colors.border }]}>
          {/* Date Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {formattedDate}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Time Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelCol}>
              <SymbolView
                name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                size={16}
                tintColor={colors.textSecondary}
              />
              <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Time
              </ThemedText>
            </View>
            <ThemedText style={[styles.detailValue, { color: colors.text }]}>
              {formatTimeRange(item)}
            </ThemedText>
          </View>

          {/* Location Row (if present) */}
          {Boolean(item.location) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Location
                  </ThemedText>
                </View>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {item.location}
                </ThemedText>
              </View>
            </>
          )}

          {/* Status Row */}
          {Boolean(item.status) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCol}>
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={16}
                    tintColor={colors.textSecondary}
                  />
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Status
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.detailValue,
                    {
                      color:
                        item.status === 'completed' || item.status === 'paid'
                          ? '#10B981'
                          : colors.text,
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {item.status}
                </ThemedText>
              </View>
            </>
          )}
        </View>

        {/* Notes / Details Description */}
        {Boolean(item.details) && (
          <View
            style={[
              styles.notesBox,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.notesLabel, { color: colors.textSecondary }]}>
              Details & Notes
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {item.details}
            </ThemedText>
          </View>
        )}

        {/* Source Attribution Notice */}
        {!item.isOriginalEvent && (
          <View
            style={[
              styles.sourceNotice,
              {
                backgroundColor: isDark ? 'rgba(22, 143, 145, 0.1)' : 'rgba(22, 143, 145, 0.05)',
                borderColor: isDark ? 'rgba(22, 143, 145, 0.3)' : 'rgba(22, 143, 145, 0.2)',
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'link', android: 'link', web: 'link' }}
              size={16}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.sourceNoticeText, { color: colors.textSecondary }]}>
              Synced from the {item.source} module. Open the {item.source} section to edit or manage this record.
            </ThemedText>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {item.isOriginalEvent ? (
            <View style={styles.originalActionsRow}>
              <Button
                variant="outline"
                size="md"
                style={styles.flexOne}
                onPress={handleEdit}
                icon={
                  <SymbolView
                    name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                    size={16}
                    tintColor={colors.primary}
                  />
                }
              >
                Edit Event
              </Button>

              <Button
                variant="danger"
                size="md"
                style={styles.flexOne}
                loading={deleting}
                onPress={handleDelete}
                icon={
                  <SymbolView
                    name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                    size={16}
                    tintColor="#EF4444"
                  />
                }
              >
                Delete
              </Button>
            </View>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onPress={handleNavigateToSource}
              icon={
                <SymbolView
                  name={{ ios: 'arrow.right.circle', android: 'open_in_new', web: 'open_in_new' }}
                  size={16}
                  tintColor="#FFFFFF"
                />
              }
            >
              Open in {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
            </Button>
          )}

          <Button variant="ghost" size="md" fullWidth onPress={onClose}>
            Close
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
  heroCard: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 24,
  },
  detailsSection: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  notesBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  sourceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  sourceNoticeText: {
    fontSize: Typography.fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  originalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flexOne: {
    flex: 1,
  },
});

