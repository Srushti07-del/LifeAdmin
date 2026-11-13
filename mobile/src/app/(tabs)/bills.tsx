/**
 * LifeAdmin Mobile — Bills & Payments Screen
 * Complete production-ready implementation of native bills management:
 * - Summary dashboard (Monthly total due, Settled progress bar, Paid, Due soon, Overdue)
 * - Preferred currency normalization (defaults to INR ₹)
 * - Multi-criteria organization (Status tabs, Category pills, Search, Sort)
 * - Native bottom-sheet modals for Create, Edit, and Details inspection
 * - Quick Mark-as-Paid / Unpay actions and deletion confirmation
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SearchInput,
  FilterBar,
  FilterItem,
  EmptyState,
  FloatingActionButton,
  getButtonForegroundColor,
} from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { useFabBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { parseBillFilterParam } from '@/utils/routeFilters';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
  CURRENCIES,
} from '@/utils/currency';
import {
  Bill,
  BillFilterKey,
  BillSortKey,
  billService,
  calculateBillTotals,
  filterAndSortBills,
  BillCard,
  BillSummaryCard,
  BillFormModal,
  BillDetailsModal,
} from '@/features/bills';
import { canUndoBillStatusToggle } from '@/utils/undoActions';

const CATEGORIES = ['All', 'Finance', 'Home', 'Personal', 'Work', 'Health', 'Education'];

interface SortOption {
  key: BillSortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'dueDate', label: 'Earliest Due' },
  { key: '-dueDate', label: 'Latest Due' },
  { key: '-amount', label: 'Highest Amount' },
  { key: 'amount', label: 'Lowest Amount' },
];

export default function BillsScreen() {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const bottomPadding = useFabBottomPadding(Spacing.nine, true);
  const primaryFg = getButtonForegroundColor('primary', colors, isDark);

  // Data state
  const [bills, setBills] = useState<Bill[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Layout, Filter & Search state
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<BillFilterKey>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSort, setActiveSort] = useState<BillSortKey>('dueDate');
  const [showSortPicker, setShowSortPicker] = useState<boolean>(false);

  useEffect(() => {
    const parsedFilter = parseBillFilterParam(params.filter);
    if (!parsedFilter) return;
    setActiveFilter(parsedFilter);
    if (typeof (router as any).setParams === 'function') {
      (router as any).setParams({ filter: undefined });
    }
  }, [params.filter, router]);

  const numColumns = layoutMode === 'list' ? 1 : width >= 768 ? 3 : width >= 360 ? 2 : 1;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [actionLoadingBillId, setActionLoadingBillId] = useState<string | null>(null);

  // User preferred currency
  const preferredCurrency = normalizeCurrencyCode(user?.preferredCurrency || DEFAULT_CURRENCY);
  const currencyMeta = CURRENCIES[preferredCurrency];

  // Load bills and currency exchange rates
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setError(null);

      const [billsResponse, ratesResponse] = await Promise.allSettled([
        billService.fetchBills({ limit: 300 }),
        billService.fetchRates(),
      ]);

      if (billsResponse.status === 'fulfilled') {
        const fetchedBills = billsResponse.value?.bills || [];
        setBills(fetchedBills);
      } else {
        throw new Error('Failed to load bills.');
      }

      if (ratesResponse.status === 'fulfilled') {
        setRates(ratesResponse.value?.rates || {});
      }
    } catch (err: any) {
      console.warn('Error loading bills:', err);
      setError(err?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Derived calculations
  const totals = useMemo(() => {
    return calculateBillTotals(bills, preferredCurrency, rates);
  }, [bills, preferredCurrency, rates]);

  const filteredBills = useMemo(() => {
    return filterAndSortBills(
      bills,
      activeFilter,
      searchQuery,
      activeSort,
      selectedCategory
    );
  }, [bills, activeFilter, searchQuery, activeSort, selectedCategory]);

  // Status Filter Tabs with dynamic counters
  const filterItems: FilterItem<BillFilterKey>[] = useMemo(
    () => [
      { value: 'all', label: 'All', count: totals.totalBillsCount },
      { value: 'upcoming', label: 'Upcoming', count: totals.upcomingCount },
      { value: 'paid', label: 'Paid', count: totals.paidCount },
      { value: 'overdue', label: 'Overdue', count: totals.overdueCount },
    ],
    [totals]
  );

  // Toggle Mark as Paid / Unpaid
  const handleTogglePaid = async (bill: Bill, isUndo = false) => {
    const isPaid = bill.paymentStatus === 'paid' || bill.status === 'paid';
    const billLabel = bill.name || bill.title || 'Bill';
    setActionLoadingBillId(bill._id);

    try {
      if (isPaid) {
        const res = await billService.markBillUnpaid(bill._id);
        const updated = res.bill;
        setBills((prev) => prev.map((b) => (b._id === bill._id ? updated : b)));
        if (selectedBillForDetails?._id === bill._id) {
          setSelectedBillForDetails(updated);
        }

        if (isUndo) {
          showSnackbar({
            variant: 'info',
            title: 'Action Undone',
            message: `"${billLabel}" restored to unpaid.`,
            duration: 2800,
          });
        } else {
          showSnackbar({
            variant: 'info',
            title: 'Marked Unpaid',
            message: `"${billLabel}" moved back to unpaid.`,
            action: canUndoBillStatusToggle(bill)
              ? {
                  label: 'Undo',
                  accessibilityLabel: `Undo marking ${billLabel} unpaid`,
                  onPress: () => void handleTogglePaid(updated, true),
                }
              : undefined,
          });
        }
      } else {
        const res = await billService.markBillPaid(bill._id);
        const updated = res.bill;
        const nextOccurrence = res.nextOccurrence;
        setBills((prev) => prev.map((b) => (b._id === bill._id ? updated : b)));
        if (selectedBillForDetails?._id === bill._id) {
          setSelectedBillForDetails(updated);
        }
        if (nextOccurrence) {
          await loadData(true);
        }

        if (isUndo) {
          showSnackbar({
            variant: 'info',
            title: 'Action Undone',
            message: `"${billLabel}" marked paid again.`,
            duration: 2800,
          });
        } else {
          showSnackbar({
            variant: 'success',
            title: nextOccurrence ? 'Bill Paid & Next Scheduled' : 'Bill Paid',
            message: nextOccurrence
              ? `Payment for "${billLabel}" recorded and next cycle scheduled.`
              : `Payment for "${billLabel}" recorded.`,
            action: canUndoBillStatusToggle(bill, nextOccurrence)
              ? {
                  label: 'Undo',
                  accessibilityLabel: `Undo payment for ${billLabel}`,
                  onPress: () => void handleTogglePaid(updated, true),
                }
              : undefined,
          });
        }
      }
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Action Failed',
        message: err?.message || 'Could not update bill payment status. Please try again.',
      });
    } finally {
      setActionLoadingBillId(null);
    }
  };

  // Submit Create or Edit form
  const handleFormSubmit = async (billData: Partial<Bill>) => {
    if (editingBill) {
      const res = await billService.updateBill(editingBill._id, billData);
      setBills((prev) => prev.map((b) => (b._id === editingBill._id ? res.bill : b)));
      if (selectedBillForDetails?._id === editingBill._id) {
        setSelectedBillForDetails(res.bill);
      }
      setEditingBill(null);
      showSnackbar({
        variant: 'success',
        title: 'Bill Updated',
        message: `"${res.bill.name || res.bill.title || 'Bill'}" saved.`,
      });
    } else {
      const res = await billService.createBill(billData);
      setBills((prev) => [res.bill, ...prev]);
      showSnackbar({
        variant: 'success',
        title: 'Bill Added',
        message: `"${res.bill.name || res.bill.title || 'Bill'}" created.`,
      });
    }
  };

  // Delete Bill
  const handleDeleteBill = async (billId: string) => {
    const existing = bills.find((b) => b._id === billId);
    const billLabel = existing?.name || existing?.title || 'Bill';
    await billService.deleteBill(billId);
    setBills((prev) => prev.filter((b) => b._id !== billId));
    if (selectedBillForDetails?._id === billId) {
      setSelectedBillForDetails(null);
    }
    showSnackbar({
      variant: 'info',
      title: 'Bill Deleted',
      message: `"${billLabel}" removed.`,
    });
  };

  // Open Form in Create Mode
  const handleOpenCreateModal = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  // Open Form in Edit Mode
  const handleOpenEditModal = (bill: Bill) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setActiveFilter('all');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === activeSort)?.label || 'Sort';

  const billKeyExtractor = useCallback((item: Bill) => item._id, []);

  const renderBillItem = useCallback(
    ({ item }: { item: Bill }) => (
      <BillCard
        bill={item}
        compact={numColumns > 1}
        style={
          numColumns === 3
            ? styles.gridItem3
            : numColumns === 2
              ? styles.gridItem2
              : undefined
        }
        onPress={(b) => setSelectedBillForDetails(b)}
        onTogglePaid={handleTogglePaid}
        isActionLoading={actionLoadingBillId === item._id}
      />
    ),
    [numColumns, handleTogglePaid, actionLoadingBillId]
  );

  const renderHeader = (
    <View style={styles.headerContainer}>
      {/* Summary Dashboard Card */}
      <BillSummaryCard totals={totals} preferredCurrency={preferredCurrency} />

      {/* Search Bar, Layout Toggle & Sort Row */}
      <View style={styles.searchSortRow}>
        <View style={styles.searchWrapper}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bills, providers..."
          />
        </View>

        <Pressable
          onPress={() => setLayoutMode((m) => (m === 'grid' ? 'list' : 'grid'))}
          style={[
            styles.sortButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${layoutMode === 'grid' ? 'list' : 'grid'} view`}
        >
          <SymbolView
            name={
              layoutMode === 'grid'
                ? { ios: 'list.bullet', android: 'view_list', web: 'view_list' }
                : { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }
            }
            size={16}
            tintColor={colors.primary}
          />
        </Pressable>

        <Pressable
          onPress={() => setShowSortPicker((prev) => !prev)}
          style={[
            styles.sortButton,
            {
              backgroundColor: showSortPicker ? colors.primary : colors.surface,
              borderColor: showSortPicker ? colors.primary : colors.border,
            },
          ]}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Sort by: ${currentSortLabel}`}
        >
          <SymbolView
            name={{
              ios: 'arrow.up.arrow.down',
              android: 'sort',
              web: 'sort',
            }}
            size={16}
            tintColor={showSortPicker ? primaryFg : colors.text}
          />
        </Pressable>
      </View>

      {/* Sort Options Tray (When opened) */}
      {showSortPicker && (
        <View
          style={[
            styles.sortTray,
            {
              backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.sortTrayTitle, { color: colors.textSecondary }]}>
            Sort Bills By
          </ThemedText>
          <View style={styles.sortOptionsGrid}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeSort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setActiveSort(opt.key);
                    setShowSortPicker(false);
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  style={[
                    styles.sortOptionChip,
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
                      styles.sortOptionText,
                      {
                        color: isSelected ? primaryFg : colors.text,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansSemiBold
                          : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Status + category filters: only meaningful once bills exist */}
      {bills.length > 0 ? (
        <>
          {/* Status Tabs Filter */}
          <View style={styles.filterSection}>
            <FilterBar
              items={filterItems}
              selected={activeFilter}
              onSelect={setActiveFilter}
            />
          </View>

          {/* Category Chip Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : isDark
                        ? colors.surface
                        : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontFamily: isSelected
                          ? Typography.fontFamilies.sansSemiBold
                          : Typography.fontFamilies.sans,
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {/* Loading Skeleton / State */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your bills & payment status...
          </ThemedText>
        </View>
      ) : error ? (
        /* Error State */
        <EmptyState
          icon={
            <SymbolView
              name={{
                ios: 'exclamationmark.triangle',
                android: 'warning',
                web: 'warning',
              }}
              size={36}
              tintColor={colors.notification || '#EF4444'}
            />
          }
          title="Unable to Load Bills"
          description={error}
          actionLabel="Retry"
          onAction={() => loadData(false)}
        />
      ) : bills.length === 0 ? (
        /* Empty State: No Bills Added */
        <EmptyState
          icon={
            <SymbolView
              name={{
                ios: 'receipt',
                android: 'receipt_long',
                web: 'receipt_long',
              }}
              size={28}
              tintColor={colors.primary}
            />
          }
          title="No bills or obligations"
          description="Keep track of recurring utilities, subscriptions, credit cards, and rent in one calm place."
          actionLabel="Add Your First Bill"
          onAction={handleOpenCreateModal}
          style={{ paddingVertical: Spacing.four }}
          descriptionStyle={{ marginBottom: Spacing.three }}
        />
      ) : filteredBills.length === 0 ? (
        /* Empty State: Filters Matched Nothing */
        <EmptyState
          icon={
            <SymbolView
              name={{
                ios: 'line.3.horizontal.decrease.circle',
                android: 'filter_alt_off',
                web: 'filter_alt_off',
              }}
              size={36}
              tintColor={colors.textSecondary}
            />
          }
          title="No matching bills"
          description="We couldn't find any bills matching your current search or filter criteria."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <View style={styles.listHeaderRow}>
          <ThemedText style={[styles.listCountText, { color: colors.textSecondary }]}>
            Showing {filteredBills.length} of {bills.length} bills
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Bills & Payments
            </ThemedText>
            <View style={styles.currencyBadge}>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tracking in {currencyMeta.name} ({currencyMeta.symbol})
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Virtualized Bills List */}
        <FlatList
          key={numColumns > 1 ? `bills-grid-${numColumns}` : 'bills-list'}
          data={isLoading || error || bills.length === 0 || filteredBills.length === 0 ? [] : filteredBills}
          renderItem={renderBillItem}
          keyExtractor={billKeyExtractor}
          numColumns={numColumns}
          columnWrapperStyle={
            numColumns > 1
              ? { gap: Spacing.three, marginBottom: Spacing.three }
              : undefined
          }
          ItemSeparatorComponent={
            numColumns === 1
              ? () => <View style={{ height: Spacing.three }} />
              : undefined
          }
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
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
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />

        {!isLoading && !error && bills.length > 0 && (
          <FloatingActionButton
            label="Add Bill"
            accessibilityLabel="Add new bill"
            onPress={handleOpenCreateModal}
            isTabScreen
          />
        )}
      </SafeAreaView>

      {/* Create & Edit Modal Sheet */}
      <BillFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBill(null);
        }}
        onSubmit={handleFormSubmit}
        bill={editingBill}
        defaultCurrency={preferredCurrency}
      />

      {/* Bill Details Inspection Modal Sheet */}
      <BillDetailsModal
        isOpen={!!selectedBillForDetails}
        onClose={() => setSelectedBillForDetails(null)}
        bill={selectedBillForDetails}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteBill}
        onTogglePaid={handleTogglePaid}
        preferredCurrency={preferredCurrency}
        rates={rates}
        isActionLoading={actionLoadingBillId === selectedBillForDetails?._id}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two + 2,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.editorial,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.two,
  },
  searchWrapper: {
    flex: 1,
    minWidth: 0,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortTray: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  sortTrayTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sortOptionChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: Typography.fontSize.xs,
  },
  filterSection: {
    marginTop: -Spacing.one,
  },
  categoryScroll: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  categoryChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
  },
  headerContainer: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  billsList: {
    gap: Spacing.three,
  },
  billsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  gridItem2: {
    width: '48.4%',
  },
  gridItem3: {
    width: '31.8%',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  listCountText: {
    fontSize: Typography.fontSize.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.ten,
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
  },
});
