/**
 * Dashboard Skeleton Placeholder Component
 * Displays loading skeleton pulses while fetching dashboard overview.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Spacing, Radius } from '@/constants/spacing';

export function DashboardSkeleton() {
  const { colors, isDark } = useAppTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacityAnim]);

  const blockColor = isDark ? colors.surfaceSecondary : colors.surfaceSecondary;

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.headerLeft}>
          <Animated.View
            style={[
              styles.skeletonBlock,
              { width: 120, height: 16, backgroundColor: blockColor, opacity: opacityAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonBlock,
              { width: 180, height: 28, backgroundColor: blockColor, opacity: opacityAnim, marginTop: 8 },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.skeletonCircle,
            { width: 44, height: 44, backgroundColor: blockColor, opacity: opacityAnim },
          ]}
        />
      </View>

      {/* Metrics Row Skeleton */}
      <View style={styles.metricsRow}>
        {[1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.metricCard,
              { backgroundColor: blockColor, opacity: opacityAnim },
            ]}
          />
        ))}
      </View>

      {/* Needs Attention Section Skeleton */}
      <View style={styles.section}>
        <Animated.View
          style={[
            styles.skeletonBlock,
            { width: 150, height: 22, backgroundColor: blockColor, opacity: opacityAnim, marginBottom: 16 },
          ]}
        />
        {[1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.itemCard,
              { backgroundColor: blockColor, opacity: opacityAnim, marginBottom: 12 },
            ]}
          />
        ))}
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.section}>
        <Animated.View
          style={[
            styles.skeletonBlock,
            { width: 130, height: 22, backgroundColor: blockColor, opacity: opacityAnim, marginBottom: 16 },
          ]}
        />
        <View style={styles.actionsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.actionCard,
                { backgroundColor: blockColor, opacity: opacityAnim },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  headerLeft: {
    flex: 1,
  },
  skeletonBlock: {
    borderRadius: Radius.sm,
  },
  skeletonCircle: {
    borderRadius: Radius.full,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  metricCard: {
    flex: 1,
    height: 72,
    borderRadius: Radius.lg,
  },
  section: {
    marginBottom: Spacing.six,
  },
  itemCard: {
    height: 96,
    borderRadius: Radius.xl,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    height: 84,
    borderRadius: Radius.lg,
  },
});

export default DashboardSkeleton;
