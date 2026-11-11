/**
 * LifeAdmin Mobile — Document Card Component
 * Presents individual document record with metadata, status, AI insights, and actions
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import { DocumentItem } from '../types';
import {
  formatFileSize,
  formatDocumentDate,
  getExtractionStatusInfo,
} from '../services/documentCalculations';

interface DocumentCardProps {
  document: DocumentItem;
  onPress: () => void;
  onOpen: () => void;
  onConvert?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DocumentCard({
  document,
  onPress,
  onOpen,
  onConvert,
  onEdit,
  onDelete,
}: DocumentCardProps) {
  const { colors, isDark } = useAppTheme();

  const isPdf =
    document.mimeType?.includes('pdf') ||
    document.originalName?.toLowerCase().endsWith('.pdf');
  const isImage =
    document.mimeType?.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(document.originalName);

  const statusInfo = getExtractionStatusInfo(
    document.aiExtractionStatus,
    document.aiProcessed,
    isDark
  );

  const isFailed = document.aiExtractionStatus === 'failed';
  const isProcessing = document.aiExtractionStatus === 'processing';

  const ext = document.originalName?.split('.').pop()?.toUpperCase();
  const fileBadgeLabel = isPdf
    ? 'PDF'
    : isImage
    ? 'IMG'
    : ext && ext.length <= 4
    ? ext
    : 'DOC';

  const hasExtractedDates = (document.aiExtracted?.importantDates?.length || 0) > 0;
  const hasExtractedAmounts = (document.aiExtracted?.amounts?.length || 0) > 0;
  const hasExtractedData = hasExtractedDates || hasExtractedAmounts;

  const firstDate = document.aiExtracted?.importantDates?.[0];
  const firstAmount = document.aiExtracted?.amounts?.[0];

  const dateColor = isDark ? Colors.urgency.completed.darkText : Colors.urgency.completed.lightText;
  const dateBg = isDark ? Colors.urgency.completed.darkBg : Colors.urgency.completed.lightBg;
  const amountColor = isDark ? Colors.urgency.dueSoon.darkText : Colors.urgency.dueSoon.lightText;
  const amountBg = isDark ? Colors.urgency.dueSoon.darkBg : Colors.urgency.dueSoon.lightBg;
  const pdfColor = isDark ? Colors.urgency.critical.darkText : Colors.urgency.critical.accent;
  const pdfBg = isDark ? Colors.urgency.critical.darkBg : Colors.urgency.critical.lightBg;
  const imgColor = isDark ? '#93C5FD' : '#2563EB';
  const imgBg = isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: isFailed
            ? Colors.urgency.critical.accent
            : isProcessing
            ? Colors.urgency.dueSoon.accent
            : colors.border,
          opacity: pressed ? 0.94 : 1,
        },
        createShadow(isDark, 'card'),
      ]}
    >
      {/* Top Header: File Icon, Name, Category & Action menu */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.fileIconBox,
            {
              backgroundColor: isPdf ? pdfBg : isImage ? imgBg : colors.primarySoft,
            },
          ]}
        >
          <SymbolView
            name={{
              ios: isPdf ? 'doc.text.fill' : isImage ? 'photo.fill' : 'doc.fill',
              android: isPdf ? 'description' : isImage ? 'image' : 'insert_drive_file',
            }}
            size={20}
            tintColor={isPdf ? pdfColor : isImage ? imgColor : colors.primary}
          />
          <ThemedText
            style={[
              styles.fileExtLabel,
              { color: isPdf ? pdfColor : isImage ? imgColor : colors.primary },
            ]}
          >
            {fileBadgeLabel}
          </ThemedText>
        </View>

        <View style={styles.nameContainer}>
          <ThemedText
            numberOfLines={1}
            style={[styles.fileName, { color: colors.text }]}
          >
            {document.originalName}
          </ThemedText>

          <View style={styles.metaRow}>
            {document.documentType ? (
              <View
                style={[
                  styles.typeChip,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <ThemedText
                  style={[styles.typeChipText, { color: colors.textSecondary }]}
                >
                  {document.documentType}
                </ThemedText>
              </View>
            ) : null}

            <View
              style={[
                styles.categoryChip,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <ThemedText style={[styles.categoryChipText, { color: colors.primary }]}>
                {document.category || 'General'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusInfo.bg,
              borderColor: isFailed || isProcessing ? statusInfo.color : 'transparent',
              borderWidth: isFailed || isProcessing ? 1 : 0,
            },
          ]}
        >
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </View>
      </View>

      {/* AI Summary / Insights Preview if available */}
      {document.aiExtracted?.summary ? (
        <View
          style={[
            styles.summaryBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.summaryHeader}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome' }}
              size={14}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.summaryTitle, { color: colors.primary }]}>
              {document.aiExtracted.provider
                ? `${document.aiExtracted.provider}`
                : 'AI Insight'}
            </ThemedText>
          </View>
          <ThemedText
            numberOfLines={2}
            style={[styles.summaryText, { color: colors.textSecondary }]}
          >
            {document.aiExtracted.summary}
          </ThemedText>
        </View>
      ) : null}

      {/* Extracted Key Dates & Amounts Pill Bar */}
      {hasExtractedData ? (
        <View style={styles.extractedBar}>
          {firstDate && (
            <View
              style={[
                styles.extractedPill,
                { backgroundColor: dateBg },
              ]}
            >
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_today' }}
                size={12}
                tintColor={dateColor}
              />
              <ThemedText style={[styles.extractedPillText, { color: dateColor }]}>
                {firstDate.label || 'Date'}: {formatDocumentDate(firstDate.date)}
              </ThemedText>
            </View>
          )}

          {firstAmount && (
            <View
              style={[
                styles.extractedPill,
                { backgroundColor: amountBg },
              ]}
            >
              <SymbolView
                name={{ ios: 'creditcard', android: 'payments' }}
                size={12}
                tintColor={amountColor}
              />
              <ThemedText style={[styles.extractedPillText, { color: amountColor }]}>
                {firstAmount.label || 'Amount'}: ₹{firstAmount.amount.toLocaleString('en-IN')}
              </ThemedText>
            </View>
          )}
        </View>
      ) : null}

      {/* Footer: Date, Size and Action Buttons */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: colors.borderSubtle },
        ]}
      >
        <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
          {formatFileSize(document.fileSize)} • {formatDocumentDate(document.createdAt)}
        </ThemedText>

        <View style={styles.actionButtons}>
          {/* Quick Open File */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'arrow.up.right.square', android: 'open_in_new' }}
              size={16}
              tintColor={colors.primary}
            />
          </Pressable>

          {/* Quick Convert to Task/Bill if data extracted */}
          {hasExtractedData && onConvert && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onConvert();
              }}
              hitSlop={8}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome' }}
                size={16}
                tintColor={colors.primary}
              />
            </Pressable>
          )}

          {/* Edit Metadata */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'pencil', android: 'edit' }}
              size={16}
              tintColor={colors.textSecondary}
            />
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash', android: 'delete' }}
              size={16}
              tintColor={Colors.urgency.critical.accent}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  fileExtLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.4,
  },
  nameContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  summaryBox: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  summaryTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.2,
  },
  summaryText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 16,
  },
  extractedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    flexWrap: 'wrap',
  },
  extractedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  extractedPillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontVariant: ['tabular-nums'],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    fontVariant: ['tabular-nums'],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
