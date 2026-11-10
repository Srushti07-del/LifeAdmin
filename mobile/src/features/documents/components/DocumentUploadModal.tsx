/**
 * LifeAdmin Mobile — Document Upload Modal Sheet
 * Native file picking (PDF, Image, All documents) via Expo DocumentPicker,
 * validation, metadata input, and upload progress feedback.
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
import * as DocumentPicker from 'expo-document-picker';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button, Input } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import {
  formatFileSize,
  validateUploadFile,
} from '../services/documentCalculations';
import { UploadDocumentParams } from '../types';

export interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (params: UploadDocumentParams) => Promise<void>;
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

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUpload,
}: DocumentUploadModalProps) {
  const { colors, isDark } = useAppTheme();

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  } | null>(null);

  const [documentType, setDocumentType] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [notes, setNotes] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setDocumentType('');
    setCategory('General');
    setNotes('');
    setExpiryDate('');
    setIsUploading(false);
    setUploadError(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const pickFile = async (typeFilter: string | string[]) => {
    try {
      setUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: typeFilter,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const validation = validateUploadFile({
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
      });

      if (!validation.valid) {
        Alert.alert('Unsupported File', validation.error);
        return;
      }

      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      });

      // Guess document type if unset
      if (!documentType) {
        const lowerName = asset.name.toLowerCase();
        if (lowerName.includes('bill') || lowerName.includes('invoice')) {
          setDocumentType('Bill / Invoice');
          setCategory('Utilities');
        } else if (lowerName.includes('lease') || lowerName.includes('rent')) {
          setDocumentType('Lease Agreement');
          setCategory('Housing');
        } else if (lowerName.includes('insurance') || lowerName.includes('policy')) {
          setDocumentType('Insurance Policy');
          setCategory('Financial');
        } else if (lowerName.includes('id') || lowerName.includes('passport') || lowerName.includes('license')) {
          setDocumentType('Identity Document');
          setCategory('Legal');
        } else if (lowerName.includes('medical') || lowerName.includes('health')) {
          setDocumentType('Medical Record');
          setCategory('Medical');
        }
      }
    } catch (err: any) {
      console.warn('Error selecting document:', err);
      Alert.alert('Selection Error', 'Failed to pick file from device.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      await onUpload({
        file: selectedFile,
        documentType: documentType.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
      });

      resetState();
      onClose();
    } catch (err: any) {
      console.warn('Upload error:', err);
      setUploadError(err?.message || 'Failed to upload document. Please check file type and size.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Document"
      description="Store files securely with automated AI deadline & data extraction"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Error Banner */}
        {uploadError && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <SymbolView
              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning' }}
              size={18}
              tintColor="#EF4444"
            />
            <ThemedText style={styles.errorText}>{uploadError}</ThemedText>
          </View>
        )}

        {/* File Picker Section */}
        {!selectedFile ? (
          <View style={styles.pickerSection}>
            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              SELECT FILE
            </ThemedText>

            <View style={styles.pickerGrid}>
              {/* Option 1: PDF */}
              <Pressable
                onPress={() => pickFile('application/pdf')}
                style={({ pressed }) => [
                  styles.pickerButton,
                  {
                    backgroundColor: isDark ? '#26383E' : '#F8FAFC',
                    borderColor: isDark ? '#354E57' : '#E2E8F0',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <SymbolView
                    name={{ ios: 'doc.text.fill', android: 'description' }}
                    size={22}
                    tintColor="#EF4444"
                  />
                </View>
                <ThemedText style={[styles.pickerBtnTitle, { color: colors.text }]}>
                  Choose PDF
                </ThemedText>
                <ThemedText style={[styles.pickerBtnSub, { color: colors.textSecondary }]}>
                  Contracts, Bills, Receipts
                </ThemedText>
              </Pressable>

              {/* Option 2: Image */}
              <Pressable
                onPress={() => pickFile('image/*')}
                style={({ pressed }) => [
                  styles.pickerButton,
                  {
                    backgroundColor: isDark ? '#26383E' : '#F8FAFC',
                    borderColor: isDark ? '#354E57' : '#E2E8F0',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#DBEAFE' }]}>
                  <SymbolView
                    name={{ ios: 'photo.fill', android: 'image' }}
                    size={22}
                    tintColor="#3B82F6"
                  />
                </View>
                <ThemedText style={[styles.pickerBtnTitle, { color: colors.text }]}>
                  Choose Image
                </ThemedText>
                <ThemedText style={[styles.pickerBtnSub, { color: colors.textSecondary }]}>
                  Photos, Scans, IDs
                </ThemedText>
              </Pressable>
            </View>

            {/* Option 3: All Files */}
            <Pressable
              onPress={() =>
                pickFile([
                  'application/pdf',
                  'image/*',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain',
                ])
              }
              style={({ pressed }) => [
                styles.browseAllButton,
                {
                  backgroundColor: isDark ? '#1C292D' : colors.surface,
                  borderColor: isDark ? '#304247' : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'folder', android: 'folder_open' }}
                size={18}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.browseAllText, { color: colors.primary }]}>
                Browse All Supported Documents (up to 10 MB)
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          /* Chosen File Preview Card */
          <View
            style={[
              styles.selectedCard,
              {
                backgroundColor: isDark ? '#26383E' : '#F0FDFA',
                borderColor: isDark ? '#354E57' : '#99F6E4',
              },
            ]}
          >
            <View style={styles.selectedLeft}>
              <View style={[styles.selectedIconBox, { backgroundColor: '#0D9488' }]}>
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }}
                  size={20}
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  numberOfLines={1}
                  style={[styles.selectedFileName, { color: colors.text }]}
                >
                  {selectedFile.name}
                </ThemedText>
                <ThemedText style={[styles.selectedFileSize, { color: colors.textSecondary }]}>
                  {formatFileSize(selectedFile.size || 0)}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={() => setSelectedFile(null)}
              hitSlop={8}
              style={[styles.changeFileBtn, { backgroundColor: isDark ? '#1C292D' : '#E2E8F0' }]}
            >
              <ThemedText style={[styles.changeFileText, { color: colors.text }]}>
                Change
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Metadata Inputs */}
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
            Document Type (Optional)
          </ThemedText>
          <Input
            value={documentType}
            onChangeText={setDocumentType}
            placeholder="e.g. Electric Bill, Lease Agreement, Insurance"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Expiry / Renewal Date (Optional)
          </ThemedText>
          <Input
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
            Notes (Optional)
          </ThemedText>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Key policy numbers, account numbers, or notes..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            variant="ghost"
            onPress={handleClose}
            disabled={isUploading}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={!selectedFile || isUploading}
            loading={isUploading}
            style={styles.submitBtn}
          >
            {isUploading ? 'Analyzing...' : 'Upload & Analyze'}
          </Button>
        </View>

        {isUploading && (
          <View style={styles.uploadingNotice}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={[styles.uploadingNoticeText, { color: colors.textSecondary }]}>
              Uploading document and running AI OCR extraction...
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.seven,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    color: '#B91C1C',
  },
  pickerSection: {
    marginBottom: Spacing.five,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  pickerGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pickerButton: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  pickerBtnTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  pickerBtnSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
    textAlign: 'center',
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.two,
  },
  browseAllText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.five,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  selectedIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFileName: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  selectedFileSize: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  changeFileBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginLeft: Spacing.two,
  },
  changeFileText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
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
  submitBtn: {
    flex: 2,
  },
  uploadingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  uploadingNoticeText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
  },
});
