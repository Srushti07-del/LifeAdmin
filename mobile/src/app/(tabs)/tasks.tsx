/**
 * LifeAdmin Mobile — Tasks Screen
 * Full native implementation of List and Board task management:
 * - Scannable progress summary card with tap-to-filter counters
 * - Segmented List / Board view switcher (phone stage tabs, tablet 3-column grid)
 * - Search, status filter pills, category chips, and sort cycle
 * - Single-tap completion toggle, bottom-sheet create/edit/details modals
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  EmptyState,
  FilterBar,
  FilterItem,
  FloatingActionButton,
  OfflineBanner,
  SearchInput,
  SegmentedControl,
} from '@/components/ui';
import { offlineCache } from '@/services/offlineCache';
import { useNetwork } from '@/context/NetworkContext';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useFabBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { parseTaskFilterParam } from '@/utils/routeFilters';
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
import { getTaskStatusFeedback } from '@/utils/undoActions';

const SORT_LABELS: Record<TaskSortOption, string> = {
  dueDate: 'Due Date',
  priority: 'Priority',
  recent: 'Newest',
};

const SORT_CYCLE: TaskSortOption[] = ['dueDate', 'priority', 'recent'];

export default function TasksScreen() {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { isOnline, registerSyncTask, notifyActionRequiresNetwork } = useNetwork();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const bottomPadding = useFabBottomPadding(Spacing.nine, true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<TaskFilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TaskSortOption>('dueDate');

  useEffect(() => {
    const parsedFilter = parseTaskFilterParam(params.filter);
    if (!parsedFilter) return;
    setStatusFilter(parsedFilter);
    setViewMode('list');
    if (typeof (router as any).setParams === 'function') {
      (router as any).setParams({ filter: undefined });
    }
  }, [params.filter, router]);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Background sync registration on network reconnection
  useEffect(() => {
    return registerSyncTask('tasks', async () => {
      try {
        const res = await taskService.fetchTasks({ limit: 200, sort: 'dueDate' });
        if (res?.tasks) {
          setTasks(res.tasks);
          await offlineCache.setCachedData('tasks', res.tasks, user?.id);
        }
      } catch (e) {
        console.warn('[Tasks] Background sync failed:', e);
      }
    });
  }, [registerSyncTask, user?.id]);

  const loadTasks = useCallback(async (silent = false) => {
    // 1. Immediately hydrate from persistent cache if in-memory list is empty
    if (tasks.length === 0) {
      const cached = await offlineCache.getCachedData<Task[]>('tasks', user?.id);
      if (cached?.data && cached.data.length > 0) {
        setTasks(cached.data);
        setIsLoading(false);
      }
    }

    try {
      if (!silent && tasks.length === 0) setIsLoading(true);
      setError(null);
      const res = await taskService.fetchTasks({ limit: 200, sort: 'dueDate' });
      const fetchedTasks = res?.tasks || [];
      setTasks(fetchedTasks);
      await offlineCache.setCachedData('tasks', fetchedTasks, user?.id);
    } catch (err: any) {
      console.warn('Error loading tasks:', err);
      // If we have cached tasks in memory or storage, preserve them and suppress fatal error screen
      const cached = await offlineCache.getCachedData<Task[]>('tasks', user?.id);
      if (cached?.data && cached.data.length > 0) {
        setTasks(cached.data);
      } else if (tasks.length === 0) {
        setError(err?.message || 'Unable to load tasks right now.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tasks.length, user?.id]);

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

  const activeTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'completed'),
    [filteredTasks]
  );
  const doneTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'completed'),
    [filteredTasks]
  );

  const handleToggleComplete = async (task: Task) => {
    const nextStatus = getToggledCompletionStatus(task.status);
    await handleChangeStatus(task, nextStatus);
  };

  const handleChangeStatus = async (task: Task, nextStatus: TaskStatus, isUndo = false) => {
    if (!isOnline) {
      notifyActionRequiresNetwork('update task status');
      return;
    }
    const previousStatus = task.status;
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
      const updatedTask = res?.task || { ...task, status: nextStatus };
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? res.task : t)));
        if (selectedTask?._id === task._id) {
          setSelectedTask(res.task);
        }
      }

      const feedback = getTaskStatusFeedback(nextStatus, task.title);
      if (isUndo) {
        showSnackbar({
          variant: 'info',
          title: 'Action Undone',
          message: feedback.message,
          duration: 2800,
        });
      } else {
        showSnackbar({
          variant: 'success',
          title: feedback.title,
          message: feedback.message,
          action:
            previousStatus !== nextStatus
              ? {
                  label: 'Undo',
                  accessibilityLabel: `Undo status change for ${task.title}`,
                  onPress: () => void handleChangeStatus(updatedTask, previousStatus, true),
                }
              : undefined,
        });
      }
    } catch (err: any) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      if (selectedTask?._id === task._id) {
        setSelectedTask(task);
      }
      showSnackbar({
        variant: 'error',
        title: 'Update Failed',
        message: err?.message || 'Could not update task status.',
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSaveTask = async (payload: Partial<Task>) => {
    if (!isOnline) {
      notifyActionRequiresNetwork(editingTask ? 'update this task' : 'create tasks');
      return;
    }
    if (editingTask) {
      const res = await taskService.updateTask(editingTask._id, payload);
      if (res?.task) {
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.task : t))
        );
      } else {
        await loadTasks(true);
      }
      showSnackbar({
        variant: 'success',
        title: 'Task Updated',
        message: `"${res?.task?.title || payload.title || editingTask.title}" saved.`,
      });
    } else {
      const res = await taskService.createTask(payload);
      if (res?.task) {
        setTasks((prev) => [res.task, ...prev]);
      } else {
        await loadTasks(true);
      }
      showSnackbar({
        variant: 'success',
        title: 'Task Created',
        message: `"${res?.task?.title || payload.title || 'New task'}" added.`,
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!isOnline) {
      notifyActionRequiresNetwork('delete tasks');
      return;
    }
    const deletedTitle = tasks.find((t) => t._id === id)?.title;
    try {
      await taskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      showSnackbar({
        variant: 'info',
        title: 'Task Deleted',
        message: deletedTitle ? `"${deletedTitle}" removed.` : 'Task removed.',
      });
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Could not remove this task.',
      });
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

  type TaskListItem =
    | { type: 'task'; task: Task }
    | { type: 'completed_header'; count: number };

  const listData: TaskListItem[] = useMemo(() => {
    if (viewMode !== 'list' || isLoading || filteredTasks.length === 0) return [];
    const items: TaskListItem[] = [];
    for (const task of activeTasks) {
      items.push({ type: 'task', task });
    }
    if (doneTasks.length > 0) {
      items.push({ type: 'completed_header', count: doneTasks.length });
      for (const task of doneTasks) {
        items.push({ type: 'task', task });
      }
    }
    return items;
  }, [viewMode, isLoading, filteredTasks.length, activeTasks, doneTasks]);

  const renderTaskItem = useCallback(
    ({ item }: { item: TaskListItem }) => {
      if (item.type === 'completed_header') {
        return (
          <ThemedText style={[styles.completedLabel, { color: colors.textMuted }]}>
            Completed · {item.count}
          </ThemedText>
        );
      }
      return (
        <TaskCard
          task={item.task}
          onPress={setSelectedTask}
          onToggleComplete={handleToggleComplete}
          isUpdating={updatingTaskId === item.task._id}
        />
      );
    },
    [colors.textMuted, handleToggleComplete, updatingTaskId]
  );

  const taskKeyExtractor = useCallback((item: TaskListItem) => {
    return item.type === 'completed_header' ? 'completed_section_header' : item.task._id;
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
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
      </View>

      <OfflineBanner onRetry={() => loadTasks(false)} />

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
      <TaskSummaryCard metrics={summary} />

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
        <View style={styles.filterBar}>
          <FilterBar
            items={filterItems}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />
        </View>
      ) : null}

      {/* Dynamic Category Filter Pills (only useful with 2+ categories) */}
      {categories.length > 1 ? (
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

      {/* Non-virtualized Content: Loading, Empty, or Board View */}
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
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={listData}
          renderItem={renderTaskItem}
          keyExtractor={taskKeyExtractor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
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

        {!isLoading && tasks.length > 0 && (
          <FloatingActionButton
            label="New Task"
            accessibilityLabel="Create new task"
            onPress={openCreateModal}
            isTabScreen
          />
        )}

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
  headerContainer: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
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
    marginBottom: Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
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
    minHeight: 36,
    justifyContent: 'center',
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
  completedLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});
