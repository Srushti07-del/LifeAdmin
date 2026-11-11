/**
 * LifeAdmin Mobile — Document Edit Metadata Modal Sheet
 * Allows updating document type, category, and personal notes
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, Input } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { DocumentItem, EditDocumentParams } from '../types';

export interface DocumentEditModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onSave: (id: string, updates: EditDocumentParams) => Promise<void>;
}

const CATEGORIES = [
  'General',
  'Utilities',
  'Housing',
  'Medical',
  'Education',
  'Financial',
  'Legal',
];

export function DocumentEditModal({
  isOpen,
  document,
  onClose,
  onSave,
}: DocumentEditModalProps) {
  const { colors, isDark } = useAppTheme();

  const [documentType, setDocumentType] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setDocumentType(document.documentType || '');
      setCategory(document.category || 'General');
      setNotes(document.notes || '');
      setError(null);
    }
  }, [document]);

  if (!document) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await onSave(document._id, {
        documentType: documentType.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      console.warn('Error saving document metadata:', err);
      setError(err?.message || 'Failed to update document metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Document Details"
      description={`Update classification and notes for ${document.originalName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

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

        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Document Type / Title
          </ThemedText>
          <Input
            value={documentType}
            onChangeText={setDocumentType}
            placeholder="e.g. Electricity Bill, Lease Agreement, Health Insurance"
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Notes
          </ThemedText>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Account numbers, policy terms, or reference notes..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            variant="ghost"
            onPress={onClose}
            disabled={isSaving}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={styles.saveBtn}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
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
  saveBtn: {
    flex: 2,
  },
});
