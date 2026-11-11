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
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
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
              createShadow(isDark, 'card'),
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
              <ThemedText style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {sec.title}
              </ThemedText>
              <View
                style={[
                  styles.menuList,
                  createShadow(isDark, 'card'),
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
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
                              ? Colors.urgency.critical.darkBg
                              : Colors.urgency.critical.lightBg
                            : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'circle.fill', android: item.icon, web: item.icon } as any}
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
    fontSize: 11,
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
