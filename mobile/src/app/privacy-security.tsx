/**
 * LifeAdmin Mobile — Privacy, Export & Security Screen
 * Dedicated screen for account credentials, encryption, personal data export, session & danger zone.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSnackbar } from '@/context/SnackbarContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button, HeaderBackButton } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { useSafeBottomPadding } from '@/hooks/use-safe-bottom-padding';
import { authService } from '@/features/auth/services/authService';
import {
  DeleteAccountModal,
  PasswordSecurityModal,
  SettingsSectionCard,
  countExportRecords,
  getAccountModeInfo,
  settingsService,
} from '@/features/settings';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { user, logout, deleteAccount } = useAuth();
  const { showSnackbar } = useSnackbar();
  const bottomPadding = useSafeBottomPadding(Spacing.eight, false);

  const [isExporting, setIsExporting] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountMode = useMemo(() => getAccountModeInfo(user), [user]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/more');
    }
  };

  const avatarInitials = useMemo(() => {
    const raw = (user?.name || 'LA').trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [user?.name]);

  // Export personal records JSON via device Share
  const handleExportData = async () => {
    if (!accountMode.canExportData) {
      showSnackbar({
        variant: 'info',
        title: 'Export Unavailable',
        message: 'Data export is only available for registered user accounts.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const payload = await settingsService.exportUserData();
      const summary = countExportRecords(payload);
      const formattedJson = JSON.stringify(payload, null, 2);
      const summaryLine = `Tasks: ${summary.tasks} • Bills: ${summary.bills} • Appointments: ${summary.appointments} • Reminders: ${summary.reminders} • Docs: ${summary.documents}`;

      try {
        const result = await Share.share({
          title: 'LifeAdmin Personal Data Export',
          message: formattedJson,
        });
        if (result.action === Share.sharedAction) {
          showSnackbar({
            variant: 'success',
            title: 'Backup Exported',
            message: `Exported ${summary.total} records. ${summaryLine}`,
          });
        } else {
          showSnackbar({
            variant: 'info',
            title: 'Export Prepared',
            message: `Prepared ${summary.total} records.`,
          });
        }
      } catch {
        showSnackbar({
          variant: 'info',
          title: 'Export Prepared',
          message: `Prepared ${summary.total} records (${summaryLine}). Device share sheet could not be opened.`,
          duration: 5000,
        });
      }
    } catch (err: any) {
      showSnackbar({
        variant: 'error',
        title: 'Export Failed',
        message: err?.message || 'Failed to export account data.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Sign out confirmation
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of LifeAdmin on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  // Confirm and execute account deletion
  const handleConfirmDeleteAccount = async () => {
    if (!accountMode.canDeleteAccount) return;
    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <HeaderBackButton
            onPress={handleBack}
            accessibilityLabel="Back to More"
          />

          <View style={styles.headerTextCol}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
              Privacy & Security
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Credentials, data export, session & account safety
            </ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: ACCOUNT SECURITY & ENCRYPTION */}
          <SettingsSectionCard
            title="Privacy, Security & Account"
            subtitle="Encryption standards, session isolation, and account status"
            icon={{ ios: 'lock.shield', android: 'shield' }}
          >
            {/* Identity Row */}
            <View style={styles.profileSummaryRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <ThemedText
                  style={[styles.avatarText, { color: isDark ? '#143440' : '#FFFFFF' }]}
                >
                  {avatarInitials}
                </ThemedText>
              </View>
              <View style={styles.profileMetaCol}>
                <ThemedText style={[styles.profileNameText, { color: colors.text }]}>
                  {user?.name || 'LifeAdmin Member'}
                </ThemedText>
                <ThemedText style={[styles.profileEmailText, { color: colors.textSecondary }]}>
                  {accountMode.emailLabel}
                </ThemedText>
                <View style={styles.metaBadgeRow}>
                  <View style={[styles.metaChip, { backgroundColor: colors.primarySoft }]}>
                    <ThemedText style={[styles.metaChipText, { color: colors.primary }]}>
                      Protected Account
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.memberSinceText, { color: colors.textMuted }]}>
                    • {accountMode.memberSinceLabel}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Security Explanation Box */}
            <View
              style={[
                styles.securityInfoBox,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <SymbolView
                name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' } as any}
                size={18}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.securityInfoText, { color: colors.textSecondary }]}>
                {accountMode.securityNote}
              </ThemedText>
            </View>
          </SettingsSectionCard>

          {/* SECTION 2: PASSWORD & ACCOUNT RECOVERY */}
          <SettingsSectionCard
            title="Password & Account Recovery"
            subtitle="Manage your authentication credentials and account recovery"
            icon={{ ios: 'key.horizontal', android: 'vpn_key' }}
          >
            <Pressable
              disabled={!accountMode.canRequestPasswordReset}
              onPress={() => setIsPasswordModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open password and account recovery"
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
                  borderColor: colors.border,
                  opacity: accountMode.canRequestPasswordReset ? (pressed ? 0.8 : 1) : 0.5,
                },
              ]}
            >
              <View
                style={[
                  styles.actionIconCircle,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <SymbolView
                  name={{ ios: 'key.horizontal', android: 'vpn_key', web: 'vpn_key' } as any}
                  size={18}
                  tintColor={colors.primary}
                />
              </View>
              <View style={styles.actionRowTextCol}>
                <ThemedText style={[styles.actionRowTitle, { color: colors.text }]}>
                  Reset or Update Password
                </ThemedText>
                <ThemedText style={[styles.actionRowDesc, { color: colors.textSecondary }]}>
                  Receive a secure password reset link at your registered email address.
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>
          </SettingsSectionCard>

          {/* SECTION 3: EXPORT PERSONAL DATA */}
          <SettingsSectionCard
            title="Export Personal Data"
            subtitle="Download an unencrypted portable JSON backup of your records"
            icon={{ ios: 'square.and.arrow.up', android: 'download' }}
          >
            <ThemedText style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Export all your personal data — including Tasks, Bills, Appointments, Reminders,
              Documents metadata, and AI interactions — in a standard JSON format via your device share sheet.
            </ThemedText>

            <Pressable
              disabled={!accountMode.canExportData || isExporting}
              onPress={handleExportData}
              accessibilityRole="button"
              accessibilityLabel="Export Personal Data JSON"
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
                  borderColor: colors.border,
                  opacity: accountMode.canExportData ? (pressed ? 0.8 : 1) : 0.5,
                },
              ]}
            >
              <View
                style={[
                  styles.actionIconCircle,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <SymbolView
                  name={{ ios: 'square.and.arrow.up', android: 'download', web: 'download' } as any}
                  size={18}
                  tintColor={colors.primary}
                />
              </View>
              <View style={styles.actionRowTextCol}>
                <ThemedText style={[styles.actionRowTitle, { color: colors.text }]}>
                  {isExporting ? 'Preparing JSON Backup...' : 'Generate JSON Backup'}
                </ThemedText>
                <ThemedText style={[styles.actionRowDesc, { color: colors.textSecondary }]}>
                  {accountMode.canExportData
                    ? 'Tap to compile and share your complete workspace archive'
                    : 'Create a free registered account to export permanent backups'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={colors.textMuted}
              />
            </Pressable>
          </SettingsSectionCard>

          {/* SECTION 4: ACTIVE SESSION */}
          <SettingsSectionCard
            title="Active Session"
            subtitle="Manage your current device connection"
            icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          >
            <Button
              variant="outline"
              size="md"
              fullWidth
              onPress={handleSignOut}
            >
              Sign Out of LifeAdmin
            </Button>
          </SettingsSectionCard>

          {/* SECTION 5: DANGER ZONE (Registered Accounts Only) */}
          {accountMode.canDeleteAccount ? (
            <SettingsSectionCard
              title="Danger Zone"
              subtitle="Permanently delete your account and erase all stored data"
              icon={{ ios: 'trash', android: 'delete_forever' }}
              accentTone="danger"
            >
              <ThemedText style={[styles.dangerWarningText, { color: colors.textSecondary }]}>
                Permanently deletes your profile, credentials, documents, bills, tasks, reminders,
                and companions. This action is irreversible. We strongly recommend exporting your
                personal JSON backup first.
              </ThemedText>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onPress={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
              >
                Delete Account Forever
              </Button>
            </SettingsSectionCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Password Reset Modal */}
      <PasswordSecurityModal
        isOpen={isPasswordModalOpen}
        email={user?.email || ''}
        onRequestResetEmail={(email) => settingsService.requestPasswordResetEmail(email)}
        onApplyResetToken={(tok, password, confirmPassword) =>
          authService.resetPassword(tok, { password, confirmPassword })
        }
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Account Deletion Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        isDeleting={isDeletingAccount}
        error={deleteError}
        onConfirmDelete={handleConfirmDeleteAccount}
        onClose={() => setIsDeleteModalOpen(false)}
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
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.lg,
  },
  profileMetaCol: {
    flex: 1,
  },
  profileNameText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.base,
  },
  profileEmailText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metaChipText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.micro,
  },
  memberSinceText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  securityInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  securityInfoText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  sectionDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowTextCol: {
    flex: 1,
  },
  actionRowTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  actionRowDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  dangerWarningText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
});
