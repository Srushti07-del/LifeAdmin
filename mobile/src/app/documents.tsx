/**
 * LifeAdmin Mobile — Documents Vault Screen
 * Complete production-ready document management screen:
 * - Aggregate overview (Total files, AI analyzed, processing count, storage used)
 * - Category filters & deep search across filename, type, notes, and AI extractions
 * - Native bottom-sheet modals for Upload (PDF/Image/Docs), Edit metadata, and Details inspection
 * - AI OCR extraction preview, re-extraction trigger, and entity conversion flows (Task/Bill/Reminder)
 * - Deletion with confirmation and pull-to-refresh
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SearchInput,
  Button,
  EmptyState,
} from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { BottomTabInset } from '@/constants/theme';
import {
  DocumentItem,
  DocumentSortKey,
  UploadDocumentParams,
  EditDocumentParams,
  CreateEntityFromDocParams,
  documentService,
  calculateDocumentTotals,
  filterAndSortDocuments,
  DocumentSummaryCard,
  DocumentCard,
  DocumentUploadModal,
  DocumentDetailsModal,
  DocumentEntityConversionModal,
  DocumentEditModal,
} from '@/features/documents';

const CATEGORIES = [
  'All',
  'General',
  'Utilities',
  'Housing',
  'Medical',
  'Education',
  'Financial',
  'Legal',
];

interface SortOption {
  key: DocumentSortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: '-createdAt', label: 'Newest First' },
  { key: 'createdAt', label: 'Oldest First' },
  { key: 'originalName', label: 'Name (A–Z)' },
  { key: '-fileSize', label: 'Largest Size' },
];

export default function DocumentsScreen() {
  const { colors, isDark } = useAppTheme();

  // Data state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSort, setActiveSort] = useState<DocumentSortKey>('-createdAt');
  const [showSortPicker, setShowSortPicker] = useState<boolean>(false);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  // Conversion modal state
  const [conversionDoc, setConversionDoc] = useState<DocumentItem | null>(null);
  const [conversionType, setConversionType] = useState<'task' | 'bill' | 'reminder'>('task');
  const [conversionAmount, setConversionAmount] = useState<number | undefined>(undefined);
  const [conversionDate, setConversionDate] = useState<string | undefined>(undefined);

  // Fetch documents from server
  const loadDocuments = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setError(null);

      const res = await documentService.fetchDocuments({ limit: 200 });
      setDocuments(res?.documents || []);
    } catch (err: any) {
      console.warn('Error loading documents:', err);
      setError(err?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDocuments(true);
  }, [loadDocuments]);

  // Derived filtered & sorted list
  const filteredDocuments = useMemo(() => {
    return filterAndSortDocuments(documents, selectedCategory, searchQuery, activeSort);
  }, [documents, selectedCategory, searchQuery, activeSort]);

  // Aggregate totals
  const totals = useMemo(() => {
    return calculateDocumentTotals(documents);
  }, [documents]);

  // Upload handler
  const handleUploadDocument = async (params: UploadDocumentParams) => {
    const newDoc = await documentService.uploadDocument(params);
    setDocuments((prev) => [newDoc, ...prev]);
    Alert.alert('Upload Successful', 'Your document has been analyzed and stored in the vault.');
  };

  // Edit metadata handler
  const handleSaveEdit = async (id: string, updates: EditDocumentParams) => {
    const updated = await documentService.updateDocument(id, updates);
    setDocuments((prev) => prev.map((d) => (d._id === id ? updated : d)));
    if (selectedDocForDetails?._id === id) {
      setSelectedDocForDetails(updated);
    }
    Alert.alert('Updated', 'Document details have been saved.');
  };

  // Delete handler
  const handleDeleteDocument = async (id: string) => {
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      if (selectedDocForDetails?._id === id) {
        setSelectedDocForDetails(null);
      }
    } catch (err: any) {
      console.warn('Delete document error:', err);
      Alert.alert('Delete Failed', err?.message || 'Unable to remove document.');
    }
  };

  // Confirm delete alert
  const confirmDelete = (doc: DocumentItem) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.originalName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteDocument(doc._id),
        },
      ]
    );
  };

  // Open file in browser / viewer
  const handleOpenFile = async (doc: DocumentItem) => {
    try {
      const downloadUrl = documentService.getAuthenticatedDownloadUrl(doc._id);
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (err: any) {
      console.warn('Open file error:', err);
      Alert.alert('Preview Error', 'Could not open document viewer.');
    }
  };

  // Trigger conversion modal
  const handleOpenConversion = (
    doc: DocumentItem,
    type: 'task' | 'bill' | 'reminder',
    amount?: number,
    date?: string
  ) => {
    setConversionDoc(doc);
    setConversionType(type);
    setConversionAmount(amount);
    setConversionDate(date);
  };

  // Confirm entity conversion
  const handleConfirmConversion = async (
    docId: string,
    params: CreateEntityFromDocParams
  ) => {
    const res = await documentService.createEntityFromDocument(docId, params);
    // Update document aiConfirmed flag
    if (res?.document) {
      setDocuments((prev) =>
        prev.map((d) => (d._id === docId ? res.document : d))
      );
    }
    Alert.alert(
      'Record Created',
      `Successfully generated ${params.type.toUpperCase()} from document!`
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + Spacing.eight }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Documents Vault
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Secure file repository with AI deadline extraction
            </ThemedText>
          </View>

          <Button
            variant="primary"
            size="sm"
            onPress={() => setIsUploadModalOpen(true)}
            style={styles.uploadBtn}
            icon={
              <SymbolView
                name={{ ios: 'plus', android: 'add' }}
                size={16}
                tintColor="#FFFFFF"
              />
            }
          >
            Upload
          </Button>
        </View>

        {/* Aggregate Summary Card */}
        <DocumentSummaryCard totals={totals} />

        {/* Search and Sort Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, provider, type, notes..."
            />
          </View>

          <Pressable
            onPress={() => setShowSortPicker((prev) => !prev)}
            style={[
              styles.sortBtn,
              {
                backgroundColor: isDark ? '#1C292D' : colors.surface,
                borderColor: showSortPicker ? colors.primary : isDark ? '#304247' : colors.border,
              },
            ]}
          >
            <SymbolView
              name={{ ios: 'arrow.up.arrow.down', android: 'sort' }}
              size={18}
              tintColor={showSortPicker ? colors.primary : colors.text}
            />
          </Pressable>
        </View>

        {/* Collapsible Sort Options Tray */}
        {showSortPicker && (
          <ThemedView
            style={[
              styles.sortTray,
              {
                backgroundColor: isDark ? '#1C292D' : colors.surface,
                borderColor: isDark ? '#304247' : colors.border,
              },
            ]}
          >
            <ThemedText style={[styles.sortTrayTitle, { color: colors.textSecondary }]}>
              SORT DOCUMENTS BY
            </ThemedText>
            <View style={styles.sortChips}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = activeSort === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      setActiveSort(opt.key);
                      setShowSortPicker(false);
                    }}
                    style={[
                      styles.sortChip,
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
                        styles.sortChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>
        )}

        {/* Category Pills Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? '#1C292D'
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary
                      : isDark
                      ? '#304247'
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

        {/* Error Banner */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Button
              variant="outline"
              size="sm"
              onPress={() => loadDocuments()}
            >
              Retry
            </Button>
          </View>
        )}

        {/* Content States */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
              Opening Document Vault...
            </ThemedText>
          </View>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            title={
              searchQuery || selectedCategory !== 'All'
                ? 'No matching documents'
                : 'No documents yet'
            }
            description={
              searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search criteria or category filter.'
                : 'Upload insurance policies, lease agreements, receipts, or medical records. LifeAdmin will extract critical deadlines and charges automatically.'
            }
            actionLabel={searchQuery || selectedCategory !== 'All' ? 'Clear Filters' : 'Upload First Document'}
            onAction={
              searchQuery || selectedCategory !== 'All'
                ? () => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }
                : () => setIsUploadModalOpen(true)}
            icon="folder"
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc._id}
                document={doc}
                onPress={() => setSelectedDocForDetails(doc)}
                onOpen={() => handleOpenFile(doc)}
                onConvert={() => handleOpenConversion(doc, 'task')}
                onEdit={() => setEditingDoc(doc)}
                onDelete={() => confirmDelete(doc)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />

      {/* Details Modal */}
      <DocumentDetailsModal
        isOpen={Boolean(selectedDocForDetails)}
        document={selectedDocForDetails}
        onClose={() => setSelectedDocForDetails(null)}
        onEdit={(doc) => {
          setSelectedDocForDetails(null);
          setEditingDoc(doc);
        }}
        onDelete={handleDeleteDocument}
        onConvertToTask={(doc, date) => handleOpenConversion(doc, 'task', undefined, date)}
        onConvertToBill={(doc, amount, date) => handleOpenConversion(doc, 'bill', amount, date)}
        onConvertToReminder={(doc, date) => handleOpenConversion(doc, 'reminder', undefined, date)}
        onReExtracted={(updated) => {
          setDocuments((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
          setSelectedDocForDetails(updated);
        }}
      />

      {/* Edit Metadata Modal */}
      <DocumentEditModal
        isOpen={Boolean(editingDoc)}
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSave={handleSaveEdit}
      />

      {/* Entity Conversion Modal */}
      <DocumentEntityConversionModal
        isOpen={Boolean(conversionDoc)}
        document={conversionDoc}
        initialType={conversionType}
        initialAmount={conversionAmount}
        initialDate={conversionDate}
        onClose={() => setConversionDoc(null)}
        onConfirm={handleConfirmConversion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
  },
  uploadBtn: {
    marginLeft: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInputWrap: {
    flex: 1,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortTray: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  sortTrayTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  sortChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  sortChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  categoryPillsScroll: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.four,
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
  errorBox: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    color: '#B91C1C',
    marginRight: Spacing.two,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.eight,
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
  },
  listContainer: {
    marginTop: Spacing.one,
  },
});
