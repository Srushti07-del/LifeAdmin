/**
 * More Screen (Settings, LifeBuddy, Documents, Account)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getButtonForegroundColor } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { useSafeBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { CompanionSanctuaryModal } from '@/features/companions';
import { settingsService } from '@/features/settings';

interface MenuItem {
  label: string;
  iosIcon: SFSymbol;
  icon: AndroidSymbol;
  desc: string;
  action?: () => void;
  destructive?: boolean;
  /** Inline control rendered instead of a tappable row (e.g. theme selector). */
  control?: React.ReactNode;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const { colors, isDark, themePreference, setThemePreference } = useAppTheme();
  const bottomPadding = useSafeBottomPadding(Spacing.eight, true);
  const { user, isGuest, logout, exitGuest, restartOnboarding, updateUser } = useAuth();
  const router = useRouter();
  const [isSanctuaryVisible, setIsSanctuaryVisible] = useState(false);

  const handleSetTheme = async (next: typeof themePreference) => {
    if (next === themePreference) return;
    setThemePreference(next);
    try {
      const { user: remoteUser } = await settingsService.savePreferences(
        { theme: next },
        user?.id,
        isGuest
      );
      if (remoteUser) {
        await updateUser(remoteUser);
      } else {
        await updateUser({ theme: next });
      }
    } catch {
      // ThemeContext preserves unsynced local preference automatically
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of LifeAdmin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleExitGuest = () => {
    Alert.alert(
      'Exit Demo Session',
      'This will end your temporary guest session and purge seeded demo data from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit & Clear Data',
          style: 'destructive',
          onPress: () => exitGuest(),
        },
      ]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Features',
      items: [
        {
          label: 'LifeBuddy Companions',
          iosIcon: 'heart.fill',
          icon: 'favorite',
          desc: 'Virtual positive reinforcement companions',
          action: () => setIsSanctuaryVisible(true),
        },
        {
          label: 'AI Assistant',
          iosIcon: 'sparkles',
          icon: 'smart_toy',
          desc: 'Planning and intelligent summaries',
          action: () => router.push('/ai' as any),
        },
      ],
    },
    {
      title: 'Records',
      items: [
        {
          label: 'Appointments',
          iosIcon: 'calendar.badge.clock',
          icon: 'event_available',
          desc: 'Consultations, doctor visits & meetings',
          action: () => router.push('/appointments' as any),
        },
        {
          label: 'Documents Vault',
          iosIcon: 'folder.fill',
          icon: 'folder',
          desc: 'Secure storage & expiry dates',
          action: () => router.push('/documents' as any),
        },
        {
          label: 'Reminders Timeline',
          iosIcon: 'bell.fill',
          icon: 'notifications',
          desc: 'Time-sensitive nudges & native alerts',
          action: () => router.push('/reminders' as any),
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          label: 'Settings & Profile',
          iosIcon: 'gearshape.fill',
          icon: 'settings',
          desc: 'Profile, currency, categories, notifications & security',
          action: () => router.push('/settings' as any),
        },
        {
          label: 'Appearance',
          iosIcon: isDark ? 'moon.fill' : 'sun.max.fill',
          icon: isDark ? 'dark_mode' : 'light_mode',
          desc: '',
          control: (
            <SegmentedControl
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={themePreference}
              onChange={handleSetTheme}
            />
          ),
        },
        {
          label: 'Setup & Onboarding',
          iosIcon: 'slider.horizontal.3',
          icon: 'auto_awesome',
          desc: 'Revisit domains, alert pacing & companion selection',
          action: restartOnboarding,
        },
        {
          label: 'Privacy, Export & Security',
          iosIcon: 'checkmark.shield.fill',
          icon: 'verified_user',
          desc: 'Password recovery, JSON backup & account controls',
          action: () => router.push('/settings' as any),
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: colors.text }]}>More</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Workspace settings & personal account
            </ThemedText>
          </View>

          {/* User Profile / Session Card */}
          <Pressable
            onPress={() => router.push('/settings' as any)}
            accessibilityRole="button"
            accessibilityLabel="Open Settings and Profile"
            style={({ pressed }) => [
              styles.userCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.avatarText,
                  { color: getButtonForegroundColor('primary', colors, isDark) },
                ]}
              >
                {(user?.name?.charAt(0) || 'U').toUpperCase()}
              </ThemedText>
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.userNameRow}>
                <ThemedText style={[styles.userName, { color: colors.text }]}>
                  {user?.name || 'LifeAdmin User'}
                </ThemedText>
                {isGuest && (
                  <View
                    style={[
                      styles.guestBadge,
                      {
                        backgroundColor: isDark
                          ? Colors.urgency.dueSoon.darkBg
                          : Colors.urgency.dueSoon.lightBg,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.guestBadgeText,
                        {
                          color: isDark
                            ? Colors.urgency.dueSoon.darkText
                            : Colors.urgency.dueSoon.lightText,
                        },
                      ]}
                    >
                      Demo Guest
                    </ThemedText>
                  </View>
                )}
              </View>

              <ThemedText style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user?.email || 'Tap to manage profile & settings'}
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={18}
              tintColor={colors.textMuted}
            />
          </Pressable>

          {menuSections.map((sec, idx) => (
            <View key={idx} style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {sec.title}
              </ThemedText>
              <View
                style={[
                  styles.menuList,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {sec.items.map((item, itemIdx) => (
                  item.control ? (
                    <View
                      key={itemIdx}
                      style={[
                        styles.controlRow,
                        itemIdx < sec.items.length - 1 && [styles.menuDivider, { borderBottomColor: colors.borderSubtle }],
                      ]}
                    >
                      <ThemedText style={[styles.menuLabel, { color: colors.text }]}>
                        {item.label}
                      </ThemedText>
                      {item.control}
                    </View>
                  ) : (
                    <Pressable
                      key={itemIdx}
                      onPress={item.action}
                      style={({ pressed }) => [
                        styles.menuRow,
                        itemIdx < sec.items.length - 1 && [styles.menuDivider, { borderBottomColor: colors.borderSubtle }],
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: item.destructive
                              ? isDark
                                ? Colors.urgency.critical.darkBg
                                : Colors.urgency.critical.lightBg
                              : colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <SymbolView
                          name={{ ios: item.iosIcon, android: item.icon, web: item.icon }}
                          size={18}
                          tintColor={
                            item.destructive
                              ? isDark
                                ? Colors.urgency.critical.darkText
                                : Colors.urgency.critical.accent
                              : colors.primary
                          }
                        />
                      </View>
                      <View style={styles.menuText}>
                        <ThemedText
                          style={[
                            styles.menuLabel,
                            {
                              color: item.destructive
                                ? isDark
                                  ? Colors.urgency.critical.darkText
                                  : Colors.urgency.critical.lightText
                                : colors.text,
                            },
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                        <ThemedText style={[styles.menuDesc, { color: colors.textSecondary }]}>
                          {item.desc}
                        </ThemedText>
                      </View>
                      <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={16}
                        tintColor={colors.textMuted}
                      />
                    </Pressable>
                  )
                ))}
              </View>
            </View>
          ))}

          {/* Quiet account footer */}
          <View style={styles.accountFooter}>
            <Pressable
              onPress={isGuest ? handleExitGuest : handleLogout}
              accessibilityRole="button"
              accessibilityLabel={isGuest ? 'Exit Guest Demo' : 'Sign Out'}
              hitSlop={8}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : Colors.urgency.critical.lightBg,
                  borderColor: isDark
                    ? Colors.urgency.critical.darkBg
                    : Colors.urgency.critical.lightBg,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <SymbolView
                name={{
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: 'logout',
                  web: 'logout',
                }}
                size={16}
                tintColor={
                  isDark
                    ? Colors.urgency.critical.accent
                    : Colors.urgency.critical.lightText
                }
              />
              <ThemedText
                style={[
                  styles.signOutText,
                  {
                    color: isDark
                      ? Colors.urgency.critical.accent
                      : Colors.urgency.critical.lightText,
                  },
                ]}
              >
                {isGuest ? 'Exit Guest Demo' : 'Sign Out'}
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.accountCaption, { color: colors.textMuted }]}>
              {isGuest
                ? 'Ends the demo and clears temporary server data'
                : `Signed in as ${user?.email || 'User'}`}
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>

      <CompanionSanctuaryModal
        visible={isSanctuaryVisible}
        onClose={() => setIsSanctuaryVisible(false)}
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
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingTop: Spacing.two,
  },
  header: {
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    lineHeight: 34,
    fontFamily: Typography.fontFamilies.editorial,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
    marginTop: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 20,
  },
  userInfoCol: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  userName: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.base,
  },
  guestBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  guestBadgeText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  userEmail: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  menuList: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 2,
    gap: Spacing.three,
  },
  menuDivider: {
    borderBottomWidth: 1,
  },
  controlRow: {
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
  },
  accountFooter: {
    alignItems: 'center',
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  signOutButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  signOutText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  accountCaption: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 11,
    textAlign: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  menuDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: 11,
    marginTop: 2,
  },
});
