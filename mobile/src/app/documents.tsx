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
  FlatList,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { useFabBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { CurrencyCode, normalizeCurrencyCode } from '@/utils/currency';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SearchInput,
  Button,
  EmptyState,
  FloatingActionButton,
  HeaderBackButton,
  OfflineBanner,
  getButtonForegroundColor,
} from '@/components/ui';
import { offlineCache } from '@/services/offlineCache';
import { useNetwork } from '@/context/NetworkContext';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
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
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { isOnline, registerSyncTask, notifyActionRequiresNetwork } = useNetwork();
  const bottomPadding = useFabBottomPadding(Spacing.six, false);
  const preferredCurrency = useMemo(
    () => normalizeCurrencyCode(user?.preferredCurrency),
    [user?.preferredCurrency]
  );

  // Data state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Background sync registration on network reconnection
  useEffect(() => {
    return registerSyncTask('documents', async () => {
      try {
        const res = await documentService.fetchDocuments({ limit: 200 });
        const fetchedDocs = res?.documents || [];
        setDocuments(fetchedDocs);
        await offlineCache.setCachedData('documents', fetchedDocs, user?.id);
      } catch (e) {
        console.warn('[Documents] Background sync failed:', e);
      }
    });
  }, [registerSyncTask, user?.id]);

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
  const [conversionCurrency, setConversionCurrency] = useState<CurrencyCode | undefined>(undefined);

  // Fetch documents from server
  const loadDocuments = useCallback(async (isSilent = false) => {
    // 1. Immediately hydrate from cache if state is empty
    if (documents.length === 0) {
      const cached = await offlineCache.getCachedData<DocumentItem[]>('documents', user?.id);
      if (cached?.data && cached.data.length > 0) {
        setDocuments(cached.data);
        setIsLoading(false);
      }
    }

    try {
      if (!isSilent && documents.length === 0) setIsLoading(true);
      setError(null);

      const res = await documentService.fetchDocuments({ limit: 200 });
      const fetchedDocs = res?.documents || [];
      setDocuments(fetchedDocs);
      await offlineCache.setCachedData('documents', fetchedDocs, user?.id);
    } catch (err: any) {
      console.warn('Error loading documents:', err);
      const cached = await offlineCache.getCachedData<DocumentItem[]>('documents', user?.id);
      if (cached?.data && cached.data.length > 0) {
        setDocuments(cached.data);
      } else if (documents.length === 0) {
        setError(err?.message || 'Unable to connect to server. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [documents.length, user?.id]);

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
    if (!isOnline) {
      notifyActionRequiresNetwork('upload document');
      return;
    }
    const newDoc = await documentService.uploadDocument(params);
    setDocuments((prev) => [newDoc, ...prev]);
    showSnackbar({
      variant: 'success',
      title: 'Upload Successful',
      message: 'Your document has been analyzed and stored in the vault.',
    });
  };

  // Edit metadata handler
  const handleSaveEdit = async (id: string, updates: EditDocumentParams) => {
    if (!isOnline) {
      notifyActionRequiresNetwork('edit document');
      return;
    }
    const updated = await documentService.updateDocument(id, updates);
    setDocuments((prev) => prev.map((d) => (d._id === id ? updated : d)));
    if (selectedDocForDetails?._id === id) {
      setSelectedDocForDetails(updated);
    }
    showSnackbar({
      variant: 'success',
      title: 'Updated',
      message: 'Document details have been saved.',
    });
  };

  // Delete handler
  const handleDeleteDocument = async (id: string) => {
    if (!isOnline) {
      notifyActionRequiresNetwork('delete document');
      return;
    }
    const docName = documents.find((d) => d._id === id)?.originalName;
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      if (selectedDocForDetails?._id === id) {
        setSelectedDocForDetails(null);
      }
      showSnackbar({
        variant: 'info',
        title: 'Document Deleted',
        message: docName ? `"${docName}" removed from vault.` : 'Document removed from vault.',
      });
    } catch (err: any) {
      console.warn('Delete document error:', err);
      showSnackbar({
        variant: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Unable to remove document.',
      });
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
    if (!isOnline) {
      notifyActionRequiresNetwork('view document');
      return;
    }
    try {
      const downloadUrl = documentService.getAuthenticatedDownloadUrl(doc._id);
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (err: any) {
      console.warn('Open file error:', err);
      showSnackbar({
        variant: 'error',
        title: 'Preview Error',
        message: 'Could not open document viewer.',
      });
    }
  };

  // Trigger conversion modal
  const handleOpenConversion = (
    doc: DocumentItem,
    type: 'task' | 'bill' | 'reminder',
    amount?: number,
    date?: string,
    currency?: CurrencyCode
  ) => {
    setConversionDoc(doc);
    setConversionType(type);
    setConversionAmount(amount);
    setConversionDate(date);
    setConversionCurrency(currency);
  };

  // Confirm entity conversion
  const handleConfirmConversion = async (
    docId: string,
    params: CreateEntityFromDocParams
  ) => {
    if (!isOnline) {
      notifyActionRequiresNetwork('convert document');
      return;
    }
    const res = await documentService.createEntityFromDocument(docId, params);
    // Update document aiConfirmed flag
    if (res?.document) {
      setDocuments((prev) =>
        prev.map((d) => (d._id === docId ? res.document : d))
      );
    }
    showSnackbar({
      variant: 'success',
      title: 'Record Created',
      message: `Successfully generated ${params.type.toUpperCase()} from document.`,
    });
  };

  const docKeyExtractor = useCallback((item: DocumentItem) => item._id, []);

  const renderDocItem = useCallback(
    ({ item }: { item: DocumentItem }) => (
      <DocumentCard
        document={item}
        preferredCurrency={preferredCurrency}
        onPress={() => setSelectedDocForDetails(item)}
        onOpen={() => handleOpenFile(item)}
        onConvert={() => handleOpenConversion(item, 'task')}
        onEdit={() => setEditingDoc(item)}
        onDelete={() => confirmDelete(item)}
      />
    ),
    [preferredCurrency, handleOpenFile, handleOpenConversion, confirmDelete]
  );

  const renderHeader = (
    <View style={styles.headerContainer}>
      <OfflineBanner onRetry={() => loadDocuments(false)} />
      {/* Header */}
      <View style={styles.header}>
        <HeaderBackButton fallbackHref="/more" />
        <View style={styles.headerTitles}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Documents Vault
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Secure file repository with AI deadline extraction
          </ThemedText>
        </View>
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
            accessibilityLabel="Search documents"
          />
        </View>

        <Pressable
          onPress={() => setShowSortPicker((prev) => !prev)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Sort documents"
          accessibilityHint="Shows or hides document sort options"
          accessibilityState={{ expanded: showSortPicker }}
          style={[
            styles.sortBtn,
            {
              backgroundColor: showSortPicker ? colors.primary : colors.surface,
              borderColor: showSortPicker ? colors.primary : colors.border,
            },
          ]}
        >
          <SymbolView
            name={{ ios: 'arrow.up.arrow.down', android: 'sort' }}
            size={18}
            tintColor={
              showSortPicker
                ? getButtonForegroundColor('primary', colors, isDark)
                : colors.text
            }
          />
        </Pressable>
      </View>

      {/* Collapsible Sort Options Tray */}
      {showSortPicker && (
        <ThemedView
          style={[
            styles.sortTray,
            {
              backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.sortTrayTitle, { color: colors.textSecondary }]}>
            SORT DOCUMENTS BY
          </ThemedText>
          <View style={styles.sortChips}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeSort === opt.key;
              const selectedFg = getButtonForegroundColor('primary', colors, isDark);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setActiveSort(opt.key);
                    setShowSortPicker(false);
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${opt.label}`}
                  accessibilityState={{ selected: activeSort === opt.key }}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? colors.surfaceElevated
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sortChipText,
                      { color: isSelected ? selectedFg : colors.text },
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
          const selectedFg = getButtonForegroundColor('primary', colors, isDark);
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={cat === 'All' ? 'All document categories' : `${cat} category`}
              accessibilityState={{ selected: selectedCategory === cat }}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.categoryPillText,
                  { color: isSelected ? selectedFg : colors.textSecondary },
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
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: isDark
                ? Colors.urgency.critical.darkBg
                : Colors.urgency.critical.lightBg,
              borderColor: Colors.urgency.critical.accent,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.errorText,
              {
                color: isDark
                  ? Colors.urgency.critical.darkText
                  : Colors.urgency.critical.lightText,
              },
            ]}
          >
            {error}
          </ThemedText>
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
          icon={
            <SymbolView
              name={{
                ios: searchQuery || selectedCategory !== 'All' ? 'magnifyingglass' : 'folder',
                android: searchQuery || selectedCategory !== 'All' ? 'search_off' : 'folder_open',
                web: searchQuery || selectedCategory !== 'All' ? 'search_off' : 'folder_open',
              }}
              size={28}
              tintColor={colors.primary}
            />
          }
        />
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.screen}
      >
        <FlatList
          data={isLoading || filteredDocuments.length === 0 ? [] : filteredDocuments}
          renderItem={renderDocItem}
          keyExtractor={docKeyExtractor}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />

      <FloatingActionButton
        label="Upload"
        accessibilityLabel="Upload document"
        icon={{ ios: 'doc.badge.plus', android: 'upload_file', web: 'upload_file' }}
        onPress={() => setIsUploadModalOpen(true)}
        isTabScreen={false}
      />

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
        preferredCurrency={preferredCurrency}
        onClose={() => setSelectedDocForDetails(null)}
        onEdit={(doc) => {
          setSelectedDocForDetails(null);
          setEditingDoc(doc);
        }}
        onDelete={handleDeleteDocument}
        onConvertToTask={(doc, date) => handleOpenConversion(doc, 'task', undefined, date)}
        onConvertToBill={(doc, amount, date, currency) =>
          handleOpenConversion(doc, 'bill', amount, date, currency)
        }
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
        preferredCurrency={preferredCurrency}
        initialType={conversionType}
        initialAmount={conversionAmount}
        initialDate={conversionDate}
        initialCurrency={conversionCurrency}
        onClose={() => setConversionDoc(null)}
        onConfirm={handleConfirmConversion}
      />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.two,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.editorial,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    marginTop: 2,
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
    gap: Spacing.two,
  },
  sortChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.three,
  },
  categoryPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
