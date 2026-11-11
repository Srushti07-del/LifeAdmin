/**
 * LifeAdmin Mobile — Searchable Preferred Currency Picker Bottom Sheet
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ModalSheet, Input } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CurrencyCode } from '@/utils/currency';
import { filterCurrencies } from '../services/settingsCalculations';

export interface CurrencyPickerModalProps {
  isOpen: boolean;
  selectedCurrency: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function CurrencyPickerModal({
  isOpen,
  selectedCurrency,
  onSelect,
  onClose,
  isSaving = false,
}: CurrencyPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filtered = useMemo(() => filterCurrencies(searchQuery), [searchQuery]);

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Preferred Currency"
      description="Applies immediately to dashboard metrics, bills, and currency labels across devices."
      scrollable={false}
    >
      <View style={styles.container}>
        <Input
          placeholder="Search currency (INR, USD, Euro, ¥...)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any}
              size={18}
              tintColor={colors.textMuted}
            />
          }
          rightIcon={
            searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                  size={18}
                  tintColor={colors.textMuted}
                />
              </Pressable>
            ) : undefined
          }
        />

        <View
          style={[
            styles.infoNote,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'info.circle', android: 'info', web: 'info' } as any}
            size={15}
            tintColor={colors.primary}
          />
          <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
            Updates display formatting & symbol only — stored numeric bill amounts are preserved.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                No currencies match "{searchQuery}"
              </ThemedText>
            </View>
          ) : (
            filtered.map((item) => {
              const isSelected = item.code === selectedCurrency;
              return (
                <Pressable
                  key={item.code}
                  disabled={isSaving}
                  onPress={() => onSelect(item.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(85, 189, 181, 0.14)'
                          : colors.primarySoft
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View
                    style={[
                      styles.symbolBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.symbolText,
                        { color: isSelected ? (isDark ? '#143440' : '#FFFFFF') : colors.text },
                      ]}
                    >
                      {item.symbol}
                    </ThemedText>
                  </View>

                  <View style={styles.textCol}>
                    <View style={styles.codeRow}>
                      <ThemedText style={[styles.codeText, { color: colors.text }]}>
                        {item.code}
                      </ThemedText>
                      <ThemedText style={[styles.localeText, { color: colors.textMuted }]}>
                        • {item.locale}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.nameText, { color: colors.textSecondary }]}>
                      {item.name}
                    </ThemedText>
                  </View>

                  {isSelected ? (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                      size={22}
                      tintColor={colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  infoText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  symbolBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.base,
  },
  textCol: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  codeText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  localeText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  nameText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
  },
});

export default CurrencyPickerModal;
