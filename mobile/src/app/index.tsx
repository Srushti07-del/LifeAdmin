/**
 * LifeAdmin Mobile Dashboard Screen
 * Production-quality personal command center.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import {
  DashboardHeader,
  StatsOverview,
  NeedsAttentionSection,
  QuickActionsSection,
  UpcomingTimelineSection,
  QuickActionModal,
  DashboardSkeleton,
  DashboardErrorState,
  LifeBuddyWidget,
  DashboardOverview,
  AttentionItem,
  UpcomingItem,
  QuickActionType,
  fetchDashboardOverview,
  markTaskCompleted,
  markBillPaid,
} from '@/features/dashboard';
import { ApiError } from '@/types/api';

export default function DashboardScreen() {
  const { colors, isDark } = useAppTheme();
  const { user, isGuest, exitGuest, refreshUser } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Quick Action Modal State
  const [quickActionType, setQuickActionType] = useState<QuickActionType | null>(null);
  const [isQuickActionVisible, setIsQuickActionVisible] = useState(false);

  // Notifications summary sheet state
  const [isNotifSheetVisible, setIsNotifSheetVisible] = useState(false);

  const loadDashboard = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [result] = await Promise.all([
        fetchDashboardOverview(),
        refreshUser().catch(() => {}),
      ]);
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle Action button on Attention Cards (e.g., Mark Done, Pay Bill)
  const handleItemAction = async (item: AttentionItem) => {
    try {
      if (item.type === 'task') {
        await markTaskCompleted(item.id);
        Alert.alert('Task Completed', `"${item.title}" marked as complete.`);
        loadDashboard(true);
      } else if (item.type === 'bill') {
        await markBillPaid(item.id);
        Alert.alert('Bill Paid', `Payment for "${item.title}" recorded.`);
        loadDashboard(true);
      } else if (item.type === 'appointment') {
        router.push('/calendar' as any);
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Could not complete action');
    }
  };

  const handleItemPress = (item: AttentionItem | UpcomingItem) => {
    if (item.type === 'bill') {
      router.push('/bills' as any);
    } else if (item.type === 'appointment' || item.type === 'event') {
      router.push('/calendar' as any);
    } else {
      router.push('/tasks' as any);
    }
  };

  const handleOpenQuickAction = (type: QuickActionType) => {
    setQuickActionType(type);
    setIsQuickActionVisible(true);
  };

  const totalUnreadCount = data
    ? data.stats.overdueCount + data.stats.dueSoonCount + (data.reminders?.length || 0)
    : 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {loading && !refreshing ? (
          <DashboardSkeleton />
        ) : error && !data ? (
          <DashboardErrorState
            message={error.message}
            onRetry={() => loadDashboard()}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: BottomTabInset + Spacing.eight },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDashboard(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* 1. Header with greeting, user info, notification bell */}
            <DashboardHeader
              userName={user?.name || 'Friend'}
              unreadCount={totalUnreadCount}
              onNotificationPress={() => setIsNotifSheetVisible(true)}
              onAvatarPress={() => router.push('/more' as any)}
            />

            {/* Guest Demo Session Banner */}
            {isGuest && (
              <View
                style={[
                  styles.guestBanner,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated || '#285968' : '#D3EAE7',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.guestBannerLeft}>
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                    size={16}
                    tintColor={colors.primary}
                  />
                  <ThemedText style={[styles.guestBannerText, { color: colors.text }]}>
                    Guest Demo Session • Temporary workspace
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Exit Demo Session',
                      'This will end your guest session and clear ephemeral demo data on the server.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Exit Demo',
                          style: 'destructive',
                          onPress: () => exitGuest(),
                        },
                      ]
                    );
                  }}
                  hitSlop={8}
                >
                  <ThemedText style={[styles.exitDemoBtn, { color: colors.notification }]}>
                    Exit
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* Quick Metrics Bar */}
            {data?.stats && (
              <StatsOverview
                stats={data.stats}
                onStatPress={(filter) => {
                  if (filter === 'upcoming') router.push('/calendar' as any);
                  else router.push('/tasks' as any);
                }}
              />
            )}

            {/* LifeBuddy Companion Command Widget */}
            <LifeBuddyWidget />

            {/* 2. Needs Attention Section */}
            <NeedsAttentionSection
              items={data?.needsAttention || []}
              onItemPress={handleItemPress}
              onActionPress={handleItemAction}
            />

            {/* 3. Quick Actions Grid */}
            <QuickActionsSection onActionPress={handleOpenQuickAction} />

            {/* 4. Upcoming Activities Timeline */}
            <UpcomingTimelineSection
              items={data?.upcoming || []}
              onItemPress={handleItemPress}
            />
          </ScrollView>
        )}

        {/* Quick Action Modal Bottom Sheet */}
        <QuickActionModal
          visible={isQuickActionVisible}
          type={quickActionType}
          onClose={() => setIsQuickActionVisible(false)}
          onSuccess={() => loadDashboard(true)}
        />

        {/* Notifications Quick Summary Sheet */}
        <Modal
          visible={isNotifSheetVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNotifSheetVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsNotifSheetVisible(false)}>
            <View
              style={[
                styles.notifSheet,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.notifHeader}>
                <ThemedText style={[styles.notifTitle, { color: colors.text }]}>
                  Action Alerts ({totalUnreadCount})
                </ThemedText>
                <Pressable
                  onPress={() => setIsNotifSheetVisible(false)}
                  style={({ pressed }) => [styles.closeIcon, pressed && { opacity: 0.7 }]}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={20}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <ScrollView style={styles.notifList}>
                {data?.needsAttention && data.needsAttention.length > 0 ? (
                  data.needsAttention.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.notifItem,
                        { borderBottomColor: colors.borderSubtle },
                      ]}
                    >
                      <ThemedText style={[styles.notifItemTitle, { color: colors.text }]}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={[styles.notifItemDesc, { color: colors.textSecondary }]}>
                        {item.reason}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <View style={styles.noNotifs}>
                    <ThemedText style={{ color: colors.textSecondary }}>
                      No unread alerts or overdue items.
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  notifSheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 480,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  notifTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamilies.editorial,
  },
  closeIcon: {
    padding: Spacing.one,
  },
  notifList: {
    maxHeight: 360,
  },
  notifItem: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifItemTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  notifItemDesc: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  noNotifs: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  guestBannerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  exitDemoBtn: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    paddingHorizontal: Spacing.two,
  },
});
