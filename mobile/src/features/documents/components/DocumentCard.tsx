/**
 * LifeAdmin Mobile — Document Card Component
 * Presents individual document record with metadata, status, AI insights, and actions
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
    document.aiProcessed
  );

  const hasExtractedDates = (document.aiExtracted?.importantDates?.length || 0) > 0;
  const hasExtractedAmounts = (document.aiExtracted?.amounts?.length || 0) > 0;
  const hasExtractedData = hasExtractedDates || hasExtractedAmounts;

  const firstDate = document.aiExtracted?.importantDates?.[0];
  const firstAmount = document.aiExtracted?.amounts?.[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#1C292D' : colors.surface,
          borderColor: isDark ? '#304247' : colors.border,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      {/* Top Header: File Icon, Name, Category & Action menu */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.fileIconBox,
            {
              backgroundColor: isPdf
                ? isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : '#FEE2E2'
                : isImage
                ? isDark
                  ? 'rgba(59, 130, 246, 0.15)'
                  : '#DBEAFE'
                : isDark
                ? 'rgba(85, 189, 181, 0.15)'
                : 'rgba(13, 110, 110, 0.1)',
            },
          ]}
        >
          <SymbolView
            name={{
              ios: isPdf ? 'doc.text.fill' : isImage ? 'photo.fill' : 'doc.fill',
              android: isPdf ? 'description' : isImage ? 'image' : 'insert_drive_file',
            }}
            size={22}
            tintColor={isPdf ? '#EF4444' : isImage ? '#3B82F6' : colors.primary}
          />
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
                  { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
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
                { backgroundColor: isDark ? 'rgba(85, 189, 181, 0.15)' : 'rgba(13, 110, 110, 0.08)' },
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
            { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : statusInfo.bg },
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
              backgroundColor: isDark ? '#213035' : '#F8FAFC',
              borderColor: isDark ? '#2E434A' : '#E2E8F0',
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
                { backgroundColor: isDark ? '#26383E' : '#F0FDF4' },
              ]}
            >
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_today' }}
                size={12}
                tintColor="#16A34A"
              />
              <ThemedText style={[styles.extractedPillText, { color: '#16A34A' }]}>
                {firstDate.label || 'Date'}: {formatDocumentDate(firstDate.date)}
              </ThemedText>
            </View>
          )}

          {firstAmount && (
            <View
              style={[
                styles.extractedPill,
                { backgroundColor: isDark ? '#26383E' : '#FEF3C7' },
              ]}
            >
              <SymbolView
                name={{ ios: 'creditcard', android: 'payments' }}
                size={12}
                tintColor="#D97706"
              />
              <ThemedText style={[styles.extractedPillText, { color: '#D97706' }]}>
                {firstAmount.label || 'Amount'}: ₹{firstAmount.amount.toLocaleString()}
              </ThemedText>
            </View>
          )}
        </View>
      ) : null}

      {/* Footer: Date, Size and Action Buttons */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: isDark ? '#304247' : colors.border },
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
              { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
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
                { backgroundColor: isDark ? '#26383E' : 'rgba(13, 110, 110, 0.1)' },
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
              { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
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
              { backgroundColor: isDark ? '#26383E' : colors.backgroundElement },
            ]}
          >
            <SymbolView
              name={{ ios: 'trash', android: 'delete' }}
              size={16}
              tintColor="#EF4444"
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
