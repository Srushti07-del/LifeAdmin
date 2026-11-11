/**
 * LifeAdmin Mobile — Document Details Modal Sheet
 * In-depth inspection of document metadata, AI OCR extraction results,
 * preview/download actions, and entity conversion triggers.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { DocumentItem } from '../types';
import {
  formatFileSize,
  formatDocumentDate,
  getExtractionStatusInfo,
} from '../services/documentCalculations';
import { documentService } from '../services/documentService';

export interface DocumentDetailsModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (id: string) => void;
  onConvertToTask: (doc: DocumentItem, date?: string) => void;
  onConvertToBill: (doc: DocumentItem, amount?: number, date?: string) => void;
  onConvertToReminder: (doc: DocumentItem, date?: string) => void;
  onReExtracted?: (updatedDoc: DocumentItem) => void;
}

export function DocumentDetailsModal({
  isOpen,
  document,
  onClose,
  onEdit,
  onDelete,
  onConvertToTask,
  onConvertToBill,
  onConvertToReminder,
  onReExtracted,
}: DocumentDetailsModalProps) {
  const { colors, isDark } = useAppTheme();
  const [isReExtracting, setIsReExtracting] = useState<boolean>(false);

  if (!document) return null;

  const statusInfo = getExtractionStatusInfo(
    document.aiExtractionStatus,
    document.aiProcessed,
    isDark
  );
  const primaryFg = getButtonForegroundColor('primary', colors, isDark);
  const dateColor = isDark ? Colors.urgency.completed.darkText : Colors.urgency.completed.lightText;
  const dateBg = isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg;
  const amountColor = isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText;
  const amountBg = isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg;
  const errColor = isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.lightText;
  const errBg = isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg;

  const importantDates = document.aiExtracted?.importantDates || [];
  const amounts = document.aiExtracted?.amounts || [];
  const identifiers = document.aiExtracted?.identifiers || [];

  const handleOpenFile = async () => {
    try {
      const downloadUrl = documentService.getAuthenticatedDownloadUrl(document._id);
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (err: any) {
      console.warn('Error opening document:', err);
      Alert.alert('Cannot Open Document', 'Unable to launch document preview.');
    }
  };

  const handleReExtract = async () => {
    try {
      setIsReExtracting(true);
      const updated = await documentService.reExtractDocument(document._id);
      if (onReExtracted) {
        onReExtracted(updated);
      }
      Alert.alert('Analysis Complete', 'Document data has been re-extracted.');
    } catch (err: any) {
      console.warn('Re-extract error:', err);
      Alert.alert('Re-extraction Failed', err?.message || 'Unable to re-process document.');
    } finally {
      setIsReExtracting(false);
    }
  };

  const handleDeletePrompt = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.originalName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onClose();
            onDelete(document._id);
          },
        },
      ]
    );
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={document.originalName}
      description={document.documentType || `${document.category} Document`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Action Buttons Header */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={handleOpenFile}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'arrow.up.right.square.fill', android: 'open_in_new' }}
              size={16}
              tintColor={primaryFg}
            />
            <ThemedText style={[styles.actionPillText, { color: primaryFg }]}>
              View / Preview
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onEdit(document);
            }}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'pencil', android: 'edit' }}
              size={16}
              tintColor={colors.text}
            />
            <ThemedText style={[styles.actionPillText, { color: colors.text }]}>
              Edit Info
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDeletePrompt}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: errBg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash.fill', android: 'delete' }}
              size={16}
              tintColor={errColor}
            />
            <ThemedText style={[styles.actionPillText, { color: errColor }]}>
              Delete
            </ThemedText>
          </Pressable>
        </View>

        {/* Metadata Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            FILE SPECIFICATIONS
          </ThemedText>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Category
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {document.category || 'General'}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                File Size
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {formatFileSize(document.fileSize)}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                Uploaded On
              </ThemedText>
              <ThemedText style={[styles.metaCellValue, { color: colors.text }]}>
                {formatDocumentDate(document.createdAt)}
              </ThemedText>
            </View>

            <View style={styles.metaCell}>
              <ThemedText style={[styles.metaCellLabel, { color: colors.textSecondary }]}>
                File Type
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                style={[styles.metaCellValue, { color: colors.text }]}>
                {document.mimeType || 'Unknown'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* AI Extraction Status Card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusInfo.bg,
              borderColor: statusInfo.color,
            },
          ]}
        >
          <View style={styles.statusCardHeader}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome' }}
              size={18}
              tintColor={statusInfo.color}
            />
            <ThemedText style={[styles.statusCardTitle, { color: statusInfo.color }]}>
              {statusInfo.label}
            </ThemedText>
          </View>

          {document.aiExtractionStatus === 'processing' && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={statusInfo.color} />
              <ThemedText style={[styles.statusDescription, { color: colors.textSecondary }]}>
                AI is actively extracting key dates, deadlines, and amounts.
              </ThemedText>
            </View>
          )}

          {document.aiExtractionStatus === 'failed' && (
            <View>
              <ThemedText style={[styles.statusDescription, { color: errColor }]}>
                {document.aiExtractionError || 'Extraction encountered an issue.'}
              </ThemedText>
              <Button
                variant="outline"
                size="sm"
                onPress={handleReExtract}
                loading={isReExtracting}
                style={{ marginTop: Spacing.two }}
              >
                {isReExtracting ? 'Re-analyzing...' : 'Retry AI Extraction'}
              </Button>
            </View>
          )}

          {document.aiExtracted?.summary && (
            <ThemedText style={[styles.summaryQuote, { color: colors.text }]}>
              "{document.aiExtracted.summary}"
            </ThemedText>
          )}
        </View>

        {/* Extracted Important Dates */}
        {importantDates.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              EXTRACTED DATES & DEADLINES
            </ThemedText>

            {importantDates.map((item, idx) => (
              <View
                key={`date-${idx}`}
                style={[styles.extractedRow, { borderBottomColor: colors.borderSubtle }]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.extractedRowLabel, { color: colors.text }]}>
                    {item.label || 'Important Date'}
                  </ThemedText>
                  <ThemedText style={[styles.extractedRowValue, { color: dateColor }]}>
                    {formatDocumentDate(item.date)}
                  </ThemedText>
                </View>

                <View style={styles.convertBtnGroup}>
                  <Pressable
                    onPress={() => onConvertToTask(document, item.date)}
                    hitSlop={6}
                    style={[styles.smallConvertBtn, { backgroundColor: dateBg }]}
                  >
                    <ThemedText style={[styles.smallConvertBtnText, { color: dateColor }]}>
                      + Task
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => onConvertToReminder(document, item.date)}
                    hitSlop={6}
                    style={[styles.smallConvertBtn, { backgroundColor: dateBg }]}
                  >
                    <ThemedText style={[styles.smallConvertBtnText, { color: dateColor }]}>
                      + Reminder
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Extracted Amounts */}
        {amounts.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              EXTRACTED AMOUNTS & CHARGES
            </ThemedText>

            {amounts.map((item, idx) => (
              <View
                key={`amt-${idx}`}
                style={[styles.extractedRow, { borderBottomColor: colors.borderSubtle }]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.extractedRowLabel, { color: colors.text }]}>
                    {item.label || 'Amount Due'}
                  </ThemedText>
                  <ThemedText style={[styles.extractedRowValue, { color: amountColor }]}>
                    ₹{item.amount.toLocaleString('en-IN')}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => onConvertToBill(document, item.amount)}
                  hitSlop={6}
                  style={[styles.smallConvertBtn, { backgroundColor: amountBg }]}
                >
                  <ThemedText style={[styles.smallConvertBtnText, { color: amountColor }]}>
                    + Create Bill
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Extracted Identifiers */}
        {identifiers.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              IDENTIFIERS & ACCOUNT NUMBERS
            </ThemedText>

            {identifiers.map((item, idx) => (
              <View key={`id-${idx}`} style={styles.identifierRow}>
                <ThemedText style={[styles.identifierLabel, { color: colors.textSecondary }]}>
                  {item.label}:
                </ThemedText>
                <ThemedText style={[styles.identifierValue, { color: colors.text }]}>
                  {item.value}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {document.notes ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              NOTES
            </ThemedText>
            <ThemedText style={[styles.notesText, { color: colors.text }]}>
              {document.notes}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.seven,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  actionPillText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  actionPillTextWhite: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    color: '#FFFFFF',
  },
  sectionCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaCell: {
    width: '48%',
  },
  metaCellLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
  },
  metaCellValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: 2,
  },
  statusCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusCardTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statusDescription: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 4,
  },
  summaryQuote: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.editorialItalic,
    lineHeight: 18,
    marginTop: Spacing.two,
  },
  extractedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  extractedRowLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  extractedRowValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  convertBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallConvertBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  smallConvertBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  identifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  identifierLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  identifierValue: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 18,
  },
});
