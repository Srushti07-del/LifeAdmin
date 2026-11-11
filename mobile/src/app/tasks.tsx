/**
 * LifeAdmin Mobile — Tasks Screen
 * Full native implementation of List and Board task management:
 * - Scannable progress summary card with tap-to-filter counters
 * - Segmented List / Board view switcher (phone stage tabs, tablet 3-column grid)
 * - Search, status filter pills, category chips, and sort cycle
 * - Single-tap completion toggle, bottom-sheet create/edit/details modals
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  EmptyState,
  FilterBar,
  FilterItem,
  SearchInput,
  SegmentedControl,
  getButtonForegroundColor,
} from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { BottomTabInset } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import {
  Task,
  TaskBoardView,
  TaskCard,
  TaskDetailsModal,
  TaskFilterMode,
  TaskFormModal,
  TaskSortOption,
  TaskStatus,
  TaskSummaryCard,
  TaskViewMode,
  calculateTaskSummary,
  extractTaskCategories,
  filterAndSortTasks,
  getToggledCompletionStatus,
  taskService,
} from '@/features/tasks';

const SORT_LABELS: Record<TaskSortOption, string> = {
  dueDate: 'Due Date',
  priority: 'Priority',
  recent: 'Newest',
};

const SORT_CYCLE: TaskSortOption[] = ['dueDate', 'priority', 'recent'];

export default function TasksScreen() {
  const { colors, isDark } = useAppTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<TaskFilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TaskSortOption>('dueDate');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const res = await taskService.fetchTasks({ limit: 200, sort: 'dueDate' });
      setTasks(res?.tasks || []);
    } catch (err: any) {
      console.warn('Error loading tasks:', err);
      setError(err?.message || 'Unable to load tasks right now.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks(tasks.length > 0);
    }, [loadTasks, tasks.length])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTasks(true);
  }, [loadTasks]);

  const summary = useMemo(() => calculateTaskSummary(tasks), [tasks]);
  const categories = useMemo(() => extractTaskCategories(tasks), [tasks]);

  const filteredTasks = useMemo(
    () =>
      filterAndSortTasks(tasks, {
        statusFilter,
        categoryFilter,
        searchQuery,
        sortBy,
      }),
    [tasks, statusFilter, categoryFilter, searchQuery, sortBy]
  );

  const filterItems: FilterItem<TaskFilterMode>[] = useMemo(
    () => [
      { value: 'all', label: 'All', count: summary.total },
      { value: 'todo', label: 'To Do', count: summary.todo },
      { value: 'in_progress', label: 'In Progress', count: summary.inProgress },
      { value: 'overdue', label: 'Overdue', count: summary.overdue },
      { value: 'completed', label: 'Completed', count: summary.completed },
    ],
    [summary]
  );

  const handleToggleComplete = async (task: Task) => {
    const nextStatus = getToggledCompletionStatus(task.status);
    await handleChangeStatus(task, nextStatus);
  };

  const handleChangeStatus = async (task: Task, nextStatus: TaskStatus) => {
    setUpdatingTaskId(task._id);
    // Optimistic update for responsive native feel
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
    );
    if (selectedTask?._id === task._id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }

    try {
      const res = await taskService.updateTaskStatus(task._id, nextStatus);
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? res.task : t)));
        if (selectedTask?._id === task._id) {
          setSelectedTask(res.task);
        }
      }
    } catch (err: any) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      if (selectedTask?._id === task._id) {
        setSelectedTask(task);
      }
      Alert.alert('Update Failed', err?.message || 'Could not update task status.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSaveTask = async (payload: Partial<Task>) => {
    if (editingTask) {
      const res = await taskService.updateTask(editingTask._id, payload);
      if (res?.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.task : t))
        );
      } else {
        await loadTasks(true);
      }
    } else {
      const res = await taskService.createTask(payload);
      if (res?.task) {
        setTasks((prev) => [res.task, ...prev]);
      } else {
        await loadTasks(true);
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.message || 'Could not remove this task.');
    }
  };

  const handleCycleSort = () => {
    const nextIdx = (SORT_CYCLE.indexOf(sortBy) + 1) % SORT_CYCLE.length;
    setSortBy(SORT_CYCLE[nextIdx]);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.six },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Editorial Page Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText style={[styles.title, { color: colors.text }]}>
                Tasks
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Calm, structured tracking for what matters next
              </ThemedText>
            </View>

            <Button
              variant="primary"
              size="sm"
              onPress={openCreateModal}
              icon={
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  size={15}
                  tintColor={getButtonForegroundColor('primary', colors, isDark)}
                  weight="semibold"
                />
              }
            >
              New Task
            </Button>
          </View>

          {/* View Switcher (List / Board) */}
          <SegmentedControl
            options={[
              { value: 'list', label: 'List View' },
              { value: 'board', label: 'Board View' },
            ]}
            value={viewMode}
            onChange={setViewMode}
            style={styles.viewSwitcher}
          />

          {/* Summary Overview */}
          <TaskSummaryCard
            metrics={summary}
            activeFilter={statusFilter}
            onSelectFilter={(next) => setStatusFilter(next)}
          />

          {/* Search & Sort Controls */}
          <View style={styles.searchRow}>
            <SearchInput
              placeholder="Search tasks or notes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              containerStyle={styles.searchInput}
            />

            <Pressable
              onPress={handleCycleSort}
              style={[
                styles.sortButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${SORT_LABELS[sortBy]}`}
            >
              <SymbolView
                name={{ ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' }}
                size={15}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.sortLabel, { color: colors.text }]}>
                {SORT_LABELS[sortBy]}
              </ThemedText>
            </Pressable>
          </View>

          {/* Status Filter Bar (for List mode; Board displays all stages) */}
          {viewMode === 'list' ? (
            <FilterBar
              items={filterItems}
              selected={statusFilter}
              onSelect={setStatusFilter}
              style={styles.filterBar}
            />
          ) : null}

          {/* Dynamic Category Filter Pills */}
          {categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {['all', ...categories].map((cat) => {
                const selected = categoryFilter === cat;
                const label = cat === 'all' ? 'All Categories' : cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategoryFilter(cat)}
                    hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: selected ? colors.primarySoft : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.categoryPillText,
                        { color: selected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Error Recovery Banner */}
          {error ? (
            <View
              style={[
                styles.errorBanner,
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
              <Button variant="outline" size="sm" onPress={() => loadTasks(false)}>
                Retry
              </Button>
            </View>
          ) : null}

          {/* Task Content */}
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading your tasks...
              </ThemedText>
            </View>
          ) : filteredTasks.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                icon={
                  <SymbolView
                    name={{ ios: 'line.3.horizontal.decrease.circle', android: 'filter_list_off', web: 'filter_list_off' }}
                    size={26}
                    tintColor={colors.primary}
                  />
                }
                title="No matching tasks"
                description="Try clearing your search or status filter to view all responsibilities."
                actionLabel="Clear Filters"
                onAction={resetFilters}
              />
            ) : (
              <EmptyState
                icon={
                  <SymbolView
                    name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }}
                    size={26}
                    tintColor={colors.primary}
                  />
                }
                title="Your task list is clear"
                description="Add an assignment, errand, or personal milestone with due dates and priority."
                actionLabel="Add First Task"
                onAction={openCreateModal}
              />
            )
          ) : viewMode === 'board' ? (
            <TaskBoardView
              tasks={filterAndSortTasks(tasks, {
                statusFilter: 'all',
                categoryFilter,
                searchQuery,
                sortBy,
              })}
              onSelectTask={setSelectedTask}
              onMoveStatus={handleChangeStatus}
              updatingId={updatingTaskId}
            />
          ) : (
            <View style={styles.listSection}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onPress={setSelectedTask}
                  onToggleComplete={handleToggleComplete}
                  isUpdating={updatingTaskId === task._id}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <TaskFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSaveTask}
          task={editingTask}
        />

        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={(t) => {
            setEditingTask(t);
            setIsFormOpen(true);
          }}
          onChangeStatus={handleChangeStatus}
          onDelete={handleDeleteTask}
          isUpdating={updatingTaskId === selectedTask?._id}
        />
      </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs + 1,
    lineHeight: 18,
  },
  viewSwitcher: {
    marginBottom: Spacing.four,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  sortLabel: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  filterBar: {
    marginBottom: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  categoryPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  errorText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs + 1,
  },
  loadingState: {
    paddingVertical: Spacing.nine,
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
  },
  listSection: {
    marginTop: Spacing.one,
  },
});
