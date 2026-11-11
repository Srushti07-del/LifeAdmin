/**
 * LifeAdmin Mobile — Password Reset & Account Recovery Bottom Sheet
 * Integrates truthfully with backend /api/auth/forgot-password & /api/auth/reset-password/:token.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ModalSheet, Input, Button, getButtonForegroundColor } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export interface PasswordSecurityModalProps {
  isOpen: boolean;
  email: string;
  isGuest: boolean;
  onRequestResetEmail: (email: string) => Promise<{ message: string }>;
  onApplyResetToken: (
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ message: string }>;
  onClose: () => void;
}

export function PasswordSecurityModal({
  isOpen,
  email,
  isGuest,
  onRequestResetEmail,
  onApplyResetToken,
  onClose,
}: PasswordSecurityModalProps) {
  const { colors, isDark } = useAppTheme();

  const [mode, setMode] = useState<'request' | 'token'>('request');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setMode('request');
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setFeedback(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSendEmail = async () => {
    if (isGuest || !email) return;
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await onRequestResetEmail(email);
      setFeedback({
        type: 'success',
        text:
          res.message ||
          'Reset instructions have been sent. Check your inbox for your 30-minute reset token or link.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text:
          err?.message ||
          'Unable to dispatch password reset email right now. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyToken = async () => {
    if (isGuest) return;
    const cleanToken = token.trim();
    if (!cleanToken) {
      setFeedback({ type: 'error', text: 'Enter the reset token from your email.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await onApplyResetToken(cleanToken, newPassword, confirmPassword);
      setFeedback({
        type: 'success',
        text: res.message || 'Your password has been updated securely.',
      });
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Reset token could not be verified or has expired.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Password & Recovery"
      description="LifeAdmin verifies password changes using a 30-minute recovery token sent to your account email."
    >
      <View style={styles.container}>
        {feedback ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor:
                  feedback.type === 'success'
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.16)'
                      : '#ECFDF5'
                    : isDark
                    ? 'rgba(239, 68, 68, 0.16)'
                    : '#FEF2F2',
                borderColor:
                  feedback.type === 'success' ? Colors.status.success : Colors.status.danger,
              },
            ]}
          >
            <SymbolView
              name={{
                ios:
                  feedback.type === 'success'
                    ? 'checkmark.circle.fill'
                    : 'exclamationmark.triangle.fill',
                android: feedback.type === 'success' ? 'check_circle' : 'error',
                web: feedback.type === 'success' ? 'check_circle' : 'error',
              } as any}
              size={18}
              tintColor={
                feedback.type === 'success' ? Colors.status.success : Colors.status.danger
              }
            />
            <ThemedText
              style={[
                styles.bannerText,
                {
                  color:
                    feedback.type === 'success' ? Colors.status.success : Colors.status.danger,
                },
              ]}
            >
              {feedback.text}
            </ThemedText>
          </View>
        ) : null}

        <View style={[styles.modeTabs, { backgroundColor: colors.surfaceSecondary }]}>
          <Pressable
            onPress={() => {
              setMode('request');
              setFeedback(null);
            }}
            style={[
              styles.modeTab,
              mode === 'request' && { backgroundColor: colors.surface },
            ]}
          >
            <ThemedText
              style={[
                styles.modeTabText,
                { color: mode === 'request' ? colors.primary : colors.textSecondary },
              ]}
            >
              Email Reset Link
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('token');
              setFeedback(null);
            }}
            style={[
              styles.modeTab,
              mode === 'token' && { backgroundColor: colors.surface },
            ]}
          >
            <ThemedText
              style={[
                styles.modeTabText,
                { color: mode === 'token' ? colors.primary : colors.textSecondary },
              ]}
            >
              Enter Reset Token
            </ThemedText>
          </Pressable>
        </View>

        {mode === 'request' ? (
          <View style={styles.section}>
            <Input
              label="Account Email"
              value={email}
              editable={false}
              helperText="We will email a secure, single-use reset link valid for 30 minutes."
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isGuest || isSubmitting}
              onPress={handleSendEmail}
              icon={
                <SymbolView
                  name={{ ios: 'envelope.badge', android: 'mail', web: 'mail' } as any}
                  size={17}
                  tintColor={getButtonForegroundColor('primary', colors, isDark)}
                />
              }
            >
              Send Password Reset Email
            </Button>
          </View>
        ) : (
          <View style={styles.section}>
            <Input
              label="Reset Token"
              placeholder="Paste token from reset email"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              rightIcon={
                <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                  <ThemedText style={[styles.toggleText, { color: colors.primary }]}>
                    {showPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </Pressable>
              }
            />

            <Input
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isGuest || isSubmitting}
              onPress={handleApplyToken}
            >
              Apply New Password
            </Button>
          </View>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  bannerText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  modeTabText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
  section: {
    gap: Spacing.three,
  },
  toggleText: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.xs,
  },
});

export default PasswordSecurityModal;
