/**
 * More Screen (Settings, LifeBuddy, Documents, Account)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { BottomTabInset } from '@/constants/theme';
import { CompanionSanctuaryModal } from '@/features/companions';
import { settingsService } from '@/features/settings';

interface MenuItem {
  label: string;
  icon: string;
  desc: string;
  action?: () => void;
  destructive?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const { colors, isDark, themePreference, setThemePreference } = useAppTheme();
  const { user, isGuest, logout, exitGuest, restartOnboarding, updateUser } = useAuth();
  const router = useRouter();
  const [isSanctuaryVisible, setIsSanctuaryVisible] = useState(false);

  const handleCycleTheme = async () => {
    const next =
      themePreference === 'light'
        ? 'dark'
        : themePreference === 'dark'
        ? 'system'
        : 'light';
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
      title: 'Companions & AI',
      items: [
        {
          label: 'LifeBuddy Companions',
          icon: 'favorite',
          desc: 'Virtual positive reinforcement companions',
          action: () => setIsSanctuaryVisible(true),
        },
        {
          label: 'AI Assistant',
          icon: 'smart_toy',
          desc: 'Planning and intelligent summaries',
          action: () => router.push('/ai' as any),
        },
      ],
    },
    {
      title: 'Responsibilities & Records',
      items: [
        {
          label: 'Appointments',
          icon: 'calendar_month',
          desc: 'Consultations, doctor visits & meetings',
          action: () => router.push('/appointments' as any),
        },
        {
          label: 'Documents Vault',
          icon: 'folder',
          desc: 'Secure storage & expiry dates',
          action: () => router.push('/documents' as any),
        },
        {
          label: 'Reminders Timeline',
          icon: 'notifications',
          desc: 'Time-sensitive nudges & native alerts',
          action: () => router.push('/reminders' as any),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Settings & Profile',
          icon: 'tune',
          desc: 'Profile, currency, categories, notifications & security',
          action: () => router.push('/settings' as any),
        },
        {
          label: `Theme: ${themePreference.charAt(0).toUpperCase() + themePreference.slice(1)}`,
          icon: isDark ? 'dark_mode' : 'light_mode',
          desc: 'Toggle light, dark, or system mode',
          action: handleCycleTheme,
        },
        {
          label: 'Setup & Onboarding',
          icon: 'auto_awesome',
          desc: 'Revisit domains, alert pacing & companion selection',
          action: restartOnboarding,
        },
      ],
    },
    {
      title: 'Account & Session',
      items: [
        {
          label: 'Privacy, Export & Security',
          icon: 'shield',
          desc: 'Password recovery, JSON backup & account controls',
          action: () => router.push('/settings' as any),
        },
        isGuest
          ? {
              label: 'Exit Guest Demo',
              icon: 'logout',
              desc: 'End demo session and clear temporary server data',
              action: handleExitGuest,
              destructive: true,
            }
          : {
              label: 'Sign Out',
              icon: 'logout',
              desc: `Signed in as ${user?.email || 'User'}`,
              action: handleLogout,
              destructive: true,
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
            { paddingBottom: BottomTabInset + Spacing.eight },
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
              <ThemedText style={styles.avatarText}>
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
                      { backgroundColor: isDark ? '#5C4813' : '#FEF3C7' },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.guestBadgeText,
                        { color: isDark ? '#FDE68A' : '#92400E' },
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
              <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {sec.title}
              </ThemedText>
              <View style={[styles.menuList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {sec.items.map((item, itemIdx) => (
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
                              ? 'rgba(239, 68, 68, 0.15)'
                              : '#FEE2E2'
                            : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'circle.fill', android: item.icon, web: item.icon } as any}
                        size={18}
                        tintColor={item.destructive ? colors.notification : colors.primary}
                      />
                    </View>
                    <View style={styles.menuText}>
                      <ThemedText
                        style={[
                          styles.menuLabel,
                          {
                            color: item.destructive
                              ? colors.notification
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
                ))}
              </View>
            </View>
          ))}
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
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.five,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  guestBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  menuList: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 2,
    gap: Spacing.three,
  },
  menuDivider: {
    borderBottomWidth: 1,
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
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
