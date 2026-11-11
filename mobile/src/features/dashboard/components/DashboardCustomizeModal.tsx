/**
 * Dashboard Customization Bottom Sheet
 * Supports layout presets (Standard, Focus, Finance), widget enable/disable toggles,
 * up/down reordering, live layout preview, and Reset to Default.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { LayoutPresetKey, WidgetConfig, WidgetId } from '../types';
import {
  DASHBOARD_PRESETS,
  applyLayoutPreset,
  detectActivePreset,
  moveWidget,
  resetWidgets,
  toggleWidgetVisibility,
} from '../services/dashboardLayout';

interface DashboardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onSave: (nextWidgets: WidgetConfig[]) => Promise<void> | void;
}

const PRESET_ORDER: LayoutPresetKey[] = ['standard', 'focus', 'finance'];

function getShortWidgetLabel(id: WidgetId): string {
  switch (id) {
    case 'needs_attention':
      return 'Needs Attention';
    case 'lifebuddy':
      return 'LifeBuddy';
    case 'ai_briefing':
      return 'AI Briefing';
    case 'tasks':
      return 'Tasks';
    case 'bills':
      return 'Bills';
    case 'schedule':
      return 'Schedule';
    case 'reminders':
      return 'Reminders';
    default:
      return id;
  }
}

export function DashboardCustomizeModal({
  isOpen,
  onClose,
  widgets,
  onSave,
}: DashboardCustomizeModalProps) {
  const { colors, isDark } = useAppTheme();
  const [draftWidgets, setDraftWidgets] = useState<WidgetConfig[]>(widgets);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftWidgets(widgets.map((w) => ({ ...w })));
    }
  }, [isOpen, widgets]);

  const activePreset = useMemo(
    () => detectActivePreset(draftWidgets),
    [draftWidgets]
  );

  const visibleDraftWidgets = useMemo(
    () => draftWidgets.filter((w) => w.visible),
    [draftWidgets]
  );

  const hiddenCount = draftWidgets.length - visibleDraftWidgets.length;

  const handleSelectPreset = (key: LayoutPresetKey) => {
    setDraftWidgets((prev) => applyLayoutPreset(prev, key));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    setDraftWidgets((prev) => moveWidget(prev, index, direction));
  };

  const handleToggleVisibility = (id: WidgetId) => {
    setDraftWidgets((prev) => toggleWidgetVisibility(prev, id));
  };

  const handleReset = () => {
    setDraftWidgets(resetWidgets());
  };

  const handleApply = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draftWidgets);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const presetMeta =
    activePreset !== 'custom'
      ? DASHBOARD_PRESETS[activePreset]
      : {
          label: 'Custom Order',
          description: 'Personalized widget arrangement tailored to your workflow',
        };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dashboard"
      description="Choose a layout preset, reorder widgets, or toggle visibility."
    >
      <View style={styles.container}>
        {/* 1. Layout Presets */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              LAYOUT PRESETS
            </ThemedText>
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Reset dashboard to default layout"
            >
              <SymbolView
                name={{
                  ios: 'arrow.counterclockwise',
                  android: 'restart_alt',
                  web: 'restart_alt',
                }}
                size={13}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.resetText, { color: colors.primary }]}>
                Reset Default
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.presetRow}>
            {PRESET_ORDER.map((presetKey) => {
              const preset = DASHBOARD_PRESETS[presetKey];
              const isSelected = activePreset === presetKey;
              return (
                <Pressable
                  key={presetKey}
                  onPress={() => handleSelectPreset(presetKey)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.presetPill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(85, 189, 181, 0.2)'
                          : '#E6F6F6'
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.presetLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansBold
                          : Typography.fontFamilies.sansSemiBold,
                      },
                    ]}
                  >
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.presetDesc, { color: colors.textSecondary }]}>
            {presetMeta.description}
          </ThemedText>
        </View>

        {/* 2. Live Layout Preview */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: isDark ? 'rgba(20, 52, 64, 0.6)' : '#F5FAFA',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.previewHeader}>
            <ThemedText style={[styles.previewTitle, { color: colors.textSecondary }]}>
              LAYOUT PREVIEW
            </ThemedText>
            <ThemedText style={[styles.previewCount, { color: colors.primary }]}>
              {visibleDraftWidgets.length} active
              {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}
            </ThemedText>
          </View>

          {visibleDraftWidgets.length > 0 ? (
            <View style={styles.previewChips}>
              {visibleDraftWidgets.map((w, idx) => (
                <View
                  key={w.id}
                  style={[
                    styles.previewChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.previewIndexDot,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <ThemedText style={styles.previewIndexText}>
                      {idx + 1}
                    </ThemedText>
                  </View>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.previewChipLabel, { color: colors.text }]}
                  >
                    {getShortWidgetLabel(w.id)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={[styles.emptyPreviewText, { color: colors.textMuted }]}>
              All optional widgets are hidden. Enable at least one widget below.
            </ThemedText>
          )}
        </View>

        {/* 3. Widget Order & Visibility Controls */}
        <View style={styles.section}>
          <ThemedText
            style={[
              styles.sectionLabel,
              { color: colors.textSecondary, marginBottom: Spacing.two },
            ]}
          >
            WIDGET ORDER & VISIBILITY
          </ThemedText>

          <View style={styles.widgetList}>
            {draftWidgets.map((widget, index) => (
              <View
                key={widget.id}
                style={[
                  styles.widgetRow,
                  {
                    backgroundColor: widget.visible
                      ? colors.surfaceSecondary
                      : isDark
                      ? 'rgba(20, 52, 64, 0.35)'
                      : '#F8FAFC',
                    borderColor: colors.border,
                    opacity: widget.visible ? 1 : 0.72,
                  },
                ]}
              >
                <View style={styles.widgetInfoCol}>
                  <ThemedText
                    numberOfLines={1}
                    style={[
                      styles.widgetLabel,
                      {
                        color: widget.visible ? colors.text : colors.textMuted,
                        textDecorationLine: widget.visible ? 'none' : 'line-through',
                      },
                    ]}
                  >
                    {widget.label}
                  </ThemedText>
                </View>

                <View style={styles.widgetControls}>
                  <Pressable
                    onPress={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${widget.label} up`}
                    style={[
                      styles.controlBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: index === 0 ? 0.32 : 1,
                      },
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: 'chevron.up',
                        android: 'keyboard_arrow_up',
                        web: 'keyboard_arrow_up',
                      }}
                      size={16}
                      tintColor={colors.text}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => handleMove(index, 'down')}
                    disabled={index === draftWidgets.length - 1}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${widget.label} down`}
                    style={[
                      styles.controlBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: index === draftWidgets.length - 1 ? 0.32 : 1,
                      },
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: 'chevron.down',
                        android: 'keyboard_arrow_down',
                        web: 'keyboard_arrow_down',
                      }}
                      size={16}
                      tintColor={colors.text}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleVisibility(widget.id)}
                    hitSlop={6}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: widget.visible }}
                    accessibilityLabel={`Toggle ${widget.label} visibility`}
                    style={[
                      styles.visibilityBtn,
                      {
                        backgroundColor: widget.visible
                          ? isDark
                            ? 'rgba(85, 189, 181, 0.2)'
                            : '#E0F2F1'
                          : colors.surface,
                        borderColor: widget.visible
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <SymbolView
                      name={
                        (widget.visible
                          ? { ios: 'eye.fill', android: 'visibility', web: 'visibility' }
                          : {
                              ios: 'eye.slash.fill',
                              android: 'visibility_off',
                              web: 'visibility_off',
                            }) as any
                      }
                      size={16}
                      tintColor={
                        widget.visible ? colors.primary : colors.textMuted
                      }
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Actions Footer */}
        <View style={styles.footerRow}>
          <Button
            variant="secondary"
            onPress={onClose}
            style={styles.footerBtn}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleApply}
            style={styles.footerBtn}
            loading={isSaving}
          >
            Apply Layout
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    letterSpacing: 0.8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  resetText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  presetPill: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetLabel: {
    fontSize: Typography.fontSize.xs,
  },
  presetDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  previewCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    letterSpacing: 0.8,
  },
  previewCount: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: Spacing.two + 2,
    paddingLeft: 5,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  previewIndexDot: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIndexText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 10,
  },
  previewChipLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.micro,
  },
  emptyPreviewText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
  },
  widgetList: {
    gap: Spacing.two,
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  widgetInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  widgetLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  widgetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityBtn: {
    width: 34,
    height: 32,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  footerBtn: {
    flex: 1,
  },
});

export default DashboardCustomizeModal;

