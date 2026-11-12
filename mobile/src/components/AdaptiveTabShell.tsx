/**
 * LifeAdmin Mobile — Adaptive Tablet & Large-Screen Navigation Shell
 * - `tablet-drawer` (768–1023px): Collapsible left drawer (68px rail strip <-> 244px labeled drawer overlay)
 * - `desktop-rail` (1024px+): Permanent compact 92px side navigation rail
 * Strictly adheres to Ocean Teal & Deep Ocean tokens from DESIGN.md.
 */

import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppTheme } from '@/context/ThemeContext';
import type { NavigationLayoutMode } from '@/utils/navigationLayout';

interface PrimaryTabItem {
  name: string;
  href: '/' | '/tasks' | '/calendar' | '/bills' | '/more';
  label: string;
  androidIcon: string;
  iosIconDefault: 'house' | 'checkmark.square' | 'calendar' | 'creditcard' | 'ellipsis.circle';
  iosIconSelected: 'house.fill' | 'checkmark.square.fill' | 'calendar' | 'creditcard.fill' | 'ellipsis.circle.fill';
}

const PRIMARY_TAB_ITEMS: readonly PrimaryTabItem[] = [
  {
    name: 'index',
    href: '/',
    label: 'Home',
    androidIcon: 'home',
    iosIconDefault: 'house',
    iosIconSelected: 'house.fill',
  },
  {
    name: 'tasks',
    href: '/tasks',
    label: 'Tasks',
    androidIcon: 'checklist',
    iosIconDefault: 'checkmark.square',
    iosIconSelected: 'checkmark.square.fill',
  },
  {
    name: 'calendar',
    href: '/calendar',
    label: 'Calendar',
    androidIcon: 'calendar_month',
    iosIconDefault: 'calendar',
    iosIconSelected: 'calendar',
  },
  {
    name: 'bills',
    href: '/bills',
    label: 'Bills',
    androidIcon: 'receipt_long',
    iosIconDefault: 'creditcard',
    iosIconSelected: 'creditcard.fill',
  },
  {
    name: 'more',
    href: '/more',
    label: 'More',
    androidIcon: 'pending',
    iosIconDefault: 'ellipsis.circle',
    iosIconSelected: 'ellipsis.circle.fill',
  },
];

const COLLAPSED_RAIL_WIDTH = 68;
const EXPANDED_DRAWER_WIDTH = 244;
const PERMANENT_RAIL_WIDTH = 92;

interface AdaptiveTabShellProps {
  layoutMode: Exclude<NavigationLayoutMode, 'phone-tabs'>;
}

export function AdaptiveTabShell({ layoutMode }: AdaptiveTabShellProps) {
  const { colors, isDark } = useAppTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isDrawerMode = layoutMode === 'tablet-drawer';
  const showExpandedDrawer = isDrawerMode && isDrawerOpen;

  // Collapse drawer automatically when transitioning into permanent rail mode
  useEffect(() => {
    if (!isDrawerMode && isDrawerOpen) {
      setIsDrawerOpen(false);
    }
  }, [isDrawerMode, isDrawerOpen]);

  // Close expanded tablet drawer on Android hardware / predictive back press first
  useEffect(() => {
    if (!showExpandedDrawer) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsDrawerOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [showExpandedDrawer]);

  return (
    <Tabs asChild>
      <View style={[styles.root, styles.shellRow, { backgroundColor: colors.background }]}>
        {/* Main routed tab content area (offset by collapsed rail strip in drawer mode so content never shifts) */}
        <View
          style={[
            styles.contentArea,
            isDrawerMode && styles.contentAreaWithCollapsedStrip,
          ]}
        >
          <TabSlot style={styles.slot} />

          {showExpandedDrawer ? (
            <Pressable
              onPress={() => setIsDrawerOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close navigation drawer"
              style={[
                StyleSheet.absoluteFill,
                styles.drawerBackdrop,
                {
                  backgroundColor: isDark
                    ? 'rgba(10, 24, 30, 0.56)'
                    : 'rgba(24, 59, 61, 0.30)',
                },
              ]}
            />
          ) : null}
        </View>

        {/* Adaptive Left Rail / Collapsible Drawer Container (direct child of Tabs for TabRouter discovery) */}
        <TabList asChild>
          <SideNavigationContainer
            isDrawerMode={isDrawerMode}
            isDrawerExpanded={showExpandedDrawer}
            onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
          >
            {PRIMARY_TAB_ITEMS.map((item) => (
              <TabTrigger
                key={item.name}
                name={item.name}
                href={item.href}
                asChild
              >
                <SideNavButton
                  item={item}
                  showExpandedLabels={showExpandedDrawer}
                  isCompactRail={!isDrawerMode}
                  onAfterSelect={
                    isDrawerMode ? () => setIsDrawerOpen(false) : undefined
                  }
                />
              </TabTrigger>
            ))}
          </SideNavigationContainer>
        </TabList>
      </View>
    </Tabs>
  );
}

interface SideNavigationContainerProps extends TabListProps {
  isDrawerMode: boolean;
  isDrawerExpanded: boolean;
  onToggleDrawer: () => void;
}

function SideNavigationContainer({
  isDrawerMode,
  isDrawerExpanded,
  onToggleDrawer,
  children,
  ...props
}: SideNavigationContainerProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sidebarSurface = isDark ? colors.surfaceSecondary : colors.surface;

  const containerStyle = [
    styles.sidebarBase,
    {
      backgroundColor: sidebarSurface,
      borderRightColor: colors.border,
      paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two,
      paddingBottom: Math.max(insets.bottom, Spacing.four),
      paddingLeft: Math.max(insets.left, Spacing.two),
      paddingRight: Spacing.two,
    },
    isDrawerMode
      ? [
          styles.drawerOverlayBase,
          {
            width: isDrawerExpanded ? EXPANDED_DRAWER_WIDTH : COLLAPSED_RAIL_WIDTH,
          },
        ]
      : styles.permanentRail,
  ];

  return (
    <View {...props} style={containerStyle}>
      {/* Top Header: Drawer Toggle (768–1023px) or Compact Brand Mark (1024px+) */}
      {isDrawerMode ? (
        <View
          style={[
            styles.drawerHeaderRow,
            isDrawerExpanded && styles.drawerHeaderRowExpanded,
          ]}
        >
          {isDrawerExpanded ? (
            <View style={styles.brandRow}>
              <View style={[styles.brandBadge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.brandBadgeText, { color: colors.primary }]}>LA</Text>
              </View>
              <Text style={[styles.brandTitle, { color: colors.text }]} numberOfLines={1}>
                LifeAdmin
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={onToggleDrawer}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isDrawerExpanded ? 'Collapse navigation drawer' : 'Expand navigation drawer'
            }
            accessibilityState={{ expanded: isDrawerExpanded }}
            style={({ pressed }) => [
              styles.drawerToggleBtn,
              {
                backgroundColor: isDark ? colors.surface : colors.surfaceSecondary,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: isDrawerExpanded ? 'xmark' : 'sidebar.left',
                android: isDrawerExpanded ? 'menu_open' : 'menu',
              }}
              size={20}
              tintColor={colors.primary}
            />
          </Pressable>
        </View>
      ) : (
        <View style={styles.railHeader}>
          <View style={[styles.brandBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.brandBadgeText, { color: colors.primary }]}>LA</Text>
          </View>
        </View>
      )}

      {/* Navigation Items Stack */}
      <View style={styles.navStack}>{children}</View>
    </View>
  );
}

interface SideNavButtonProps extends TabTriggerSlotProps {
  item: PrimaryTabItem;
  showExpandedLabels: boolean;
  isCompactRail: boolean;
  onAfterSelect?: () => void;
}

function SideNavButton({
  item,
  isFocused,
  showExpandedLabels,
  isCompactRail,
  onAfterSelect,
  ...props
}: SideNavButtonProps) {
  const { colors } = useAppTheme();
  const { ref: _ref, onPress: triggerOnPress, ...pressableProps } = props as any;
  const active = Boolean(isFocused);
  const tint = active ? colors.primary : colors.textMuted;

  return (
    <Pressable
      {...pressableProps}
      onPress={(event) => {
        triggerOnPress?.(event);
        onAfterSelect?.();
      }}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.navItemBase,
        showExpandedLabels ? styles.navItemDrawerExpanded : styles.navItemVertical,
        active && {
          backgroundColor: colors.primarySoft,
        },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{
          ios: active ? item.iosIconSelected : item.iosIconDefault,
          android: item.androidIcon as any,
        }}
        size={22}
        tintColor={tint}
      />

      {showExpandedLabels ? (
        <Text
          numberOfLines={1}
          style={[
            styles.drawerLabel,
            {
              color: tint,
              fontFamily: active
                ? Typography.fontFamilies.sansSemiBold
                : Typography.fontFamilies.sansMedium,
            },
          ]}
        >
          {item.label}
        </Text>
      ) : isCompactRail ? (
        <Text
          numberOfLines={1}
          style={[
            styles.railLabel,
            {
              color: tint,
              fontFamily: active
                ? Typography.fontFamilies.sansSemiBold
                : Typography.fontFamilies.sansMedium,
            },
          ]}
        >
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  shellRow: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  contentAreaWithCollapsedStrip: {
    marginLeft: COLLAPSED_RAIL_WIDTH,
  },
  slot: {
    flex: 1,
  },
  drawerBackdrop: {
    zIndex: 15,
  },
  sidebarBase: {
    borderRightWidth: 1,
    alignItems: 'stretch',
  },
  drawerOverlayBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
  },
  permanentRail: {
    width: PERMANENT_RAIL_WIDTH,
    flexShrink: 0,
  },
  drawerHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  drawerHeaderRowExpanded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  railHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    marginRight: Spacing.two,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.base,
  },
  brandTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.xl,
  },
  drawerToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navStack: {
    gap: Spacing.two,
  },
  navItemBase: {
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  navItemVertical: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    gap: 4,
  },
  navItemDrawerExpanded: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  railLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  drawerLabel: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
